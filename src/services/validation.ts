/**
 * Input validation service for WhatsApp chat imports.
 * Validates file types, formats, and structures before processing.
 */

// Allowed file extensions for media
const ALLOWED_MEDIA_EXTENSIONS = new Set([
    // Images
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif',
    // Videos
    'mp4', 'mov', 'avi', 'mkv', 'webm', '3gp',
    // Audio
    'mp3', 'ogg', 'opus', 'wav', 'm4a', 'aac',
    // Documents
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'
]);

// Maximum file sizes
const MAX_TEXT_FILE_SIZE = 500 * 1024 * 1024; // 500MB for chat files
const MAX_SINGLE_MEDIA_SIZE = 2 * 1024 * 1024 * 1024; // 2GB per media file

// WhatsApp timestamp patterns (same as parser.ts)
const WHATSAPP_LINE_PATTERNS = [
    /^\[?\d{1,2}[\/\.]\d{1,2}[\/\.]\d{2,4},?\s+\d{1,2}:\d{2}/,
    /^\d{1,2}[\/\.]\d{1,2}[\/\.]\d{2,4},?\s+\d{1,2}:\d{2}/,
];

export interface ValidationResult {
    valid: boolean;
    error?: string;
    warnings: string[];
    fileType: 'txt' | 'folder' | 'zip' | 'unknown';
    details?: {
        txtFile?: File;
        mediaFiles?: File[];
        estimatedMessages?: number;
    };
}

export interface FileValidationOptions {
    strictMode?: boolean; // Require minimum messages
    minMessages?: number; // Minimum valid lines (default: 5)
}

/**
 * Validates a single .txt file as a WhatsApp chat export.
 */
export async function validateTextFile(
    file: File,
    options: FileValidationOptions = {}
): Promise<ValidationResult> {
    const { strictMode = false, minMessages = 5 } = options;
    const warnings: string[] = [];

    // Check file extension
    if (!file.name.toLowerCase().endsWith('.txt')) {
        return {
            valid: false,
            error: 'File must be a .txt file',
            warnings: [],
            fileType: 'unknown'
        };
    }

    // Check file size
    if (file.size === 0) {
        return {
            valid: false,
            error: 'File is empty',
            warnings: [],
            fileType: 'txt'
        };
    }

    if (file.size > MAX_TEXT_FILE_SIZE) {
        return {
            valid: false,
            error: `File is too large (max ${MAX_TEXT_FILE_SIZE / (1024 * 1024)}MB)`,
            warnings: [],
            fileType: 'txt'
        };
    }

    // Read a sample of the file to validate format
    try {
        const sample = await readFileSample(file, 10000); // First 10KB
        const lines = sample.split('\n').filter(line => line.trim());

        let validLineCount = 0;
        for (const line of lines.slice(0, 50)) { // Check first 50 non-empty lines
            if (isWhatsAppLine(line)) {
                validLineCount++;
            }
        }

        // Calculate rough estimate of total messages
        const sampleRatio = file.size / sample.length;
        const estimatedMessages = Math.floor((validLineCount / Math.min(lines.length, 50)) * sampleRatio * lines.length);

        if (validLineCount === 0) {
            return {
                valid: false,
                error: 'File does not appear to be a WhatsApp chat export. No valid message timestamps found.',
                warnings: [],
                fileType: 'txt'
            };
        }

        if (strictMode && validLineCount < minMessages) {
            return {
                valid: false,
                error: `File contains too few messages (found ${validLineCount}, minimum ${minMessages})`,
                warnings: [],
                fileType: 'txt'
            };
        }

        // Check for potential issues
        if (validLineCount < lines.length * 0.3) {
            warnings.push('Many lines do not match WhatsApp format - some messages may not be parsed correctly');
        }

        return {
            valid: true,
            warnings,
            fileType: 'txt',
            details: {
                txtFile: file,
                estimatedMessages
            }
        };
    } catch (err) {
        return {
            valid: false,
            error: `Failed to read file: ${err instanceof Error ? err.message : 'Unknown error'}`,
            warnings: [],
            fileType: 'txt'
        };
    }
}

/**
 * Validates a folder containing chat export and media files.
 */
export async function validateFolder(
    files: FileList
): Promise<ValidationResult> {
    const warnings: string[] = [];

    if (files.length === 0) {
        return {
            valid: false,
            error: 'Folder is empty',
            warnings: [],
            fileType: 'folder'
        };
    }

    // Separate txt files and media files
    const txtFiles: File[] = [];
    const mediaFiles: File[] = [];
    const skippedFiles: string[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = getFileExtension(file.name);

        if (ext === 'txt') {
            txtFiles.push(file);
        } else if (ALLOWED_MEDIA_EXTENSIONS.has(ext)) {
            if (file.size > MAX_SINGLE_MEDIA_SIZE) {
                warnings.push(`Skipping ${file.name}: file too large (max 2GB)`);
                skippedFiles.push(file.name);
            } else {
                mediaFiles.push(file);
            }
        } else if (ext && !['ds_store', 'thumbs.db', 'desktop.ini'].includes(ext.toLowerCase())) {
            skippedFiles.push(file.name);
        }
    }

    if (txtFiles.length === 0) {
        return {
            valid: false,
            error: 'No WhatsApp chat .txt file found in folder',
            warnings,
            fileType: 'folder'
        };
    }

    if (txtFiles.length > 1) {
        warnings.push(`Found ${txtFiles.length} .txt files - will use the first one: ${txtFiles[0].name}`);
    }

    // Validate the main txt file
    const txtValidation = await validateTextFile(txtFiles[0]);
    if (!txtValidation.valid) {
        return {
            valid: false,
            error: txtValidation.error,
            warnings: [...txtValidation.warnings, ...warnings],
            fileType: 'folder'
        };
    }

    if (skippedFiles.length > 0 && skippedFiles.length <= 5) {
        warnings.push(`Skipped unsupported files: ${skippedFiles.join(', ')}`);
    } else if (skippedFiles.length > 5) {
        warnings.push(`Skipped ${skippedFiles.length} unsupported files`);
    }

    return {
        valid: true,
        warnings: [...txtValidation.warnings, ...warnings],
        fileType: 'folder',
        details: {
            txtFile: txtFiles[0],
            mediaFiles,
            estimatedMessages: txtValidation.details?.estimatedMessages
        }
    };
}

/**
 * Validates a ZIP file containing chat export.
 * Note: Actual extraction happens during import, not validation.
 */
export async function validateZipFile(file: File): Promise<ValidationResult> {
    const warnings: string[] = [];

    // Check extension
    if (!file.name.toLowerCase().endsWith('.zip')) {
        return {
            valid: false,
            error: 'File must be a .zip file',
            warnings: [],
            fileType: 'unknown'
        };
    }

    // Check file size
    if (file.size === 0) {
        return {
            valid: false,
            error: 'ZIP file is empty',
            warnings: [],
            fileType: 'zip'
        };
    }

    // Check for ZIP magic bytes (PK header)
    try {
        const header = await readFileHeader(file, 4);
        const view = new DataView(header);
        const signature = view.getUint32(0, true);

        // ZIP files start with 0x04034b50 (PK\x03\x04)
        if (signature !== 0x04034b50) {
            return {
                valid: false,
                error: 'File is not a valid ZIP archive',
                warnings: [],
                fileType: 'zip'
            };
        }
    } catch (err) {
        return {
            valid: false,
            error: `Failed to read ZIP file: ${err instanceof Error ? err.message : 'Unknown error'}`,
            warnings: [],
            fileType: 'zip'
        };
    }

    // ZIP is valid structurally; contents will be validated after extraction
    warnings.push('ZIP contents will be validated after extraction');

    return {
        valid: true,
        warnings,
        fileType: 'zip',
        details: {}
    };
}

/**
 * Auto-detect file type and validate accordingly.
 */
export async function validateInput(
    input: File | FileList
): Promise<ValidationResult> {
    // Check if it's a FileList (from folder upload)
    if (input instanceof FileList) {
        return validateFolder(input);
    }

    // Single file
    const file = input as File;
    const ext = getFileExtension(file.name);

    if (ext === 'txt') {
        return validateTextFile(file);
    } else if (ext === 'zip') {
        return validateZipFile(file);
    } else {
        return {
            valid: false,
            error: `Unsupported file type: .${ext}. Please upload a .txt or .zip file.`,
            warnings: [],
            fileType: 'unknown'
        };
    }
}

// Helper functions

function getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

function isWhatsAppLine(line: string): boolean {
    const trimmed = line.trim();
    return WHATSAPP_LINE_PATTERNS.some(pattern => pattern.test(trimmed));
}

async function readFileSample(file: File, bytes: number): Promise<string> {
    const slice = file.slice(0, bytes);
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(slice);
    });
}

async function readFileHeader(file: File, bytes: number): Promise<ArrayBuffer> {
    const slice = file.slice(0, bytes);
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(slice);
    });
}
