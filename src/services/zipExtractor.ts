/**
 * ZIP extraction service for WhatsApp chat exports.
 * Extracts and processes ZIP archives containing chat exports.
 */

import JSZip from 'jszip';
import { validateTextFile, ValidationResult } from './validation';

export interface ExtractedFiles {
    txtFile: File;
    mediaFiles: File[];
    warnings: string[];
}

export interface ZipExtractionResult {
    success: boolean;
    error?: string;
    data?: ExtractedFiles;
    validation?: ValidationResult;
}

/**
 * Extract and validate a ZIP file containing WhatsApp chat export.
 */
export async function extractZipFile(
    zipFile: File,
    onProgress?: (progress: { phase: string; percentage: number }) => void
): Promise<ZipExtractionResult> {
    const warnings: string[] = [];

    try {
        onProgress?.({ phase: 'Reading ZIP file...', percentage: 10 });

        // Load the ZIP file
        const zip = await JSZip.loadAsync(zipFile);
        const fileNames = Object.keys(zip.files);

        if (fileNames.length === 0) {
            return {
                success: false,
                error: 'ZIP archive is empty'
            };
        }

        onProgress?.({ phase: 'Extracting files...', percentage: 30 });

        // Separate files by type
        const txtFileNames: string[] = [];
        const mediaFileNames: string[] = [];
        const skippedFiles: string[] = [];

        for (const fileName of fileNames) {
            const file = zip.files[fileName];

            // Skip directories
            if (file.dir) continue;

            // Get file extension
            const ext = getFileExtension(fileName);
            const baseName = getBaseName(fileName);

            // Skip hidden files and system files
            if (baseName.startsWith('.') || baseName.startsWith('__MACOSX')) {
                continue;
            }

            if (ext === 'txt') {
                txtFileNames.push(fileName);
            } else if (isAllowedMediaExtension(ext)) {
                mediaFileNames.push(fileName);
            } else if (ext && !['ds_store', 'thumbs.db', 'desktop.ini'].includes(ext.toLowerCase())) {
                skippedFiles.push(baseName);
            }
        }

        if (txtFileNames.length === 0) {
            return {
                success: false,
                error: 'No WhatsApp chat .txt file found in ZIP archive'
            };
        }

        if (txtFileNames.length > 1) {
            warnings.push(`Found ${txtFileNames.length} .txt files - using: ${getBaseName(txtFileNames[0])}`);
        }

        onProgress?.({ phase: 'Processing chat file...', percentage: 50 });

        // Extract the main txt file
        const txtZipEntry = zip.files[txtFileNames[0]];
        const txtBlob = await txtZipEntry.async('blob');
        const txtFile = new File([txtBlob], getBaseName(txtFileNames[0]), { type: 'text/plain' });

        // Validate the txt file
        const validation = await validateTextFile(txtFile);
        if (!validation.valid) {
            return {
                success: false,
                error: validation.error,
                validation
            };
        }

        onProgress?.({ phase: 'Extracting media files...', percentage: 70 });

        // Extract media files
        const mediaFiles: File[] = [];
        let extractedCount = 0;

        for (const mediaFileName of mediaFileNames) {
            try {
                const mediaZipEntry = zip.files[mediaFileName];
                const mediaBlob = await mediaZipEntry.async('blob');
                const baseName = getBaseName(mediaFileName);
                const mimeType = getMimeType(getFileExtension(mediaFileName));

                const mediaFile = new File([mediaBlob], baseName, { type: mimeType });
                mediaFiles.push(mediaFile);

                extractedCount++;
                if (extractedCount % 10 === 0) {
                    const percentage = 70 + Math.floor((extractedCount / mediaFileNames.length) * 25);
                    onProgress?.({ phase: `Extracting media... (${extractedCount}/${mediaFileNames.length})`, percentage });
                }
            } catch (err) {
                warnings.push(`Failed to extract: ${getBaseName(mediaFileName)}`);
            }
        }

        if (skippedFiles.length > 0 && skippedFiles.length <= 5) {
            warnings.push(`Skipped unsupported files: ${skippedFiles.join(', ')}`);
        } else if (skippedFiles.length > 5) {
            warnings.push(`Skipped ${skippedFiles.length} unsupported files`);
        }

        onProgress?.({ phase: 'Complete!', percentage: 100 });

        return {
            success: true,
            data: {
                txtFile,
                mediaFiles,
                warnings: [...validation.warnings, ...warnings]
            },
            validation
        };

    } catch (err) {
        return {
            success: false,
            error: `Failed to extract ZIP: ${err instanceof Error ? err.message : 'Unknown error'}`
        };
    }
}

// Helper functions

function getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

function getBaseName(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1];
}

function isAllowedMediaExtension(ext: string): boolean {
    const allowed = new Set([
        // Images
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif',
        // Videos
        'mp4', 'mov', 'avi', 'mkv', 'webm', '3gp',
        // Audio
        'mp3', 'ogg', 'opus', 'wav', 'm4a', 'aac',
        // Documents
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'
    ]);
    return allowed.has(ext.toLowerCase());
}

function getMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
        // Images
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'heic': 'image/heic',
        'heif': 'image/heif',
        // Videos
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
        'mkv': 'video/x-matroska',
        'webm': 'video/webm',
        '3gp': 'video/3gpp',
        // Audio
        'mp3': 'audio/mpeg',
        'ogg': 'audio/ogg',
        'opus': 'audio/opus',
        'wav': 'audio/wav',
        'm4a': 'audio/mp4',
        'aac': 'audio/aac',
        // Documents
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };
    return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
}
