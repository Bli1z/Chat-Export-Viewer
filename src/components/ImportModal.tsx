import { useRef, useState } from 'react';
import { useImport } from '../hooks/useImport';
import { validateInput, ValidationResult } from '../services/validation';
import { extractZipFile } from '../services/zipExtractor';
import './ImportModal.css';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
    const { importing, progress, error, importChatWithMedia, reset } = useImport();
    const [isDragging, setIsDragging] = useState(false);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [validating, setValidating] = useState(false);
    const [extractionStatus, setExtractionStatus] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleValidationComplete = async (result: ValidationResult): Promise<void> => {
        setValidationResult(result);

        if (result.valid && result.details?.txtFile) {
            // Proceed with import, including media files if available
            const importResult = await importChatWithMedia({
                txtFile: result.details.txtFile,
                mediaFiles: result.details.mediaFiles,
            });
            if (importResult) {
                setTimeout(() => {
                    handleReset();
                    onSuccess();
                    onClose();
                }, 1000);
            }
        }
    };

    const handleFileSelect = async (file: File | null): Promise<void> => {
        if (!file) return;

        setValidating(true);
        setValidationResult(null);
        setExtractionStatus(null);

        try {
            const ext = file.name.split('.').pop()?.toLowerCase();

            if (ext === 'zip') {
                // Handle ZIP file extraction
                const extractResult = await extractZipFile(file, (progress) => {
                    setExtractionStatus(progress.phase);
                });

                if (extractResult.success && extractResult.data) {
                    // Create a validation result from the extracted data
                    const result: ValidationResult = {
                        valid: true,
                        warnings: extractResult.data.warnings,
                        fileType: 'zip',
                        details: {
                            txtFile: extractResult.data.txtFile,
                            mediaFiles: extractResult.data.mediaFiles,
                            estimatedMessages: extractResult.validation?.details?.estimatedMessages
                        }
                    };
                    await handleValidationComplete(result);
                } else {
                    setValidationResult({
                        valid: false,
                        error: extractResult.error || 'Failed to extract ZIP file',
                        warnings: [],
                        fileType: 'zip'
                    });
                }
            } else {
                // Handle regular file
                const result = await validateInput(file);
                await handleValidationComplete(result);
            }
        } finally {
            setValidating(false);
            setExtractionStatus(null);
        }
    };

    const handleFolderSelect = async (files: FileList | null): Promise<void> => {
        if (!files || files.length === 0) return;

        setValidating(true);
        setValidationResult(null);

        try {
            const result = await validateInput(files);
            await handleValidationComplete(result);
        } finally {
            setValidating(false);
        }
    };

    const handleDrop = async (e: React.DragEvent): Promise<void> => {
        e.preventDefault();
        setIsDragging(false);

        const items = e.dataTransfer.items;
        const files = e.dataTransfer.files;

        // Check if it's a folder drop (using DataTransferItem for folder detection)
        if (items && items.length > 0) {
            const item = items[0];
            if (item.webkitGetAsEntry) {
                const entry = item.webkitGetAsEntry();
                if (entry?.isDirectory) {
                    // It's a folder - but we can't easily get FileList from drag & drop
                    // Show message to use the folder button instead
                    setValidationResult({
                        valid: false,
                        error: 'Folder drag & drop is not supported. Please use the "Upload Folder" button.',
                        warnings: [],
                        fileType: 'folder'
                    });
                    return;
                }
            }
        }

        // Single file drop
        if (files.length > 0) {
            const file = files[0];
            const ext = file.name.split('.').pop()?.toLowerCase();

            if (ext === 'txt' || ext === 'zip') {
                await handleFileSelect(file);
            } else {
                setValidationResult({
                    valid: false,
                    error: `Unsupported file type: .${ext}. Please drop a .txt or .zip file.`,
                    warnings: [],
                    fileType: 'unknown'
                });
            }
        }
    };

    const handleDragOver = (e: React.DragEvent): void => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (): void => {
        setIsDragging(false);
    };

    const handleReset = (): void => {
        reset();
        setValidationResult(null);
        setValidating(false);
    };

    const handleClose = (): void => {
        if (!importing && !validating) {
            handleReset();
            onClose();
        }
    };



    const showMainUI = !importing && !progress && !validating;
    const hasValidationError = validationResult && !validationResult.valid;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Import WhatsApp Chat</h2>
                    {!importing && !validating && (
                        <button className="modal-close" onClick={handleClose} aria-label="Close">
                            ×
                        </button>
                    )}
                </div>

                <div className="modal-body">
                    {showMainUI && !hasValidationError && (
                        <>
                            <div
                                className={`dropzone ${isDragging ? 'dragging' : ''}`}
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="dropzone-icon">
                                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                                </svg>
                                <p className="dropzone-text">Drag & drop or click to upload</p>
                                <p className="dropzone-subtext">Supports .txt and .zip files</p>
                            </div>

                            <p className="folder-upload-hint">
                                Have a folder with media? <button
                                    className="folder-upload-link"
                                    onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
                                >
                                    Upload folder instead
                                </button>
                            </p>

                            {/* Hidden file inputs */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".txt,.zip"
                                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                                style={{ display: 'none' }}
                            />
                            <input
                                ref={folderInputRef}
                                type="file"
                                // @ts-expect-error - webkitdirectory is not in React types but works in browsers
                                webkitdirectory=""
                                directory=""
                                multiple
                                onChange={(e) => handleFolderSelect(e.target.files)}
                                style={{ display: 'none' }}
                            />
                        </>
                    )}

                    {validating && (
                        <div className="import-progress">
                            <div className="typewriter-loader">
                                <div className="slide"><i></i></div>
                                <div className="paper"></div>
                                <div className="keyboard"></div>
                            </div>
                            <p className="progress-text">
                                {extractionStatus || 'Validating file...'}
                            </p>
                        </div>
                    )}

                    {importing && progress && (
                        <div className="import-progress">
                            {/* Labels above the bar */}
                            <div className="progress-labels">
                                <span className="progress-status">
                                    {progress.status === 'reading' && 'Reading file...'}
                                    {progress.status === 'parsing' && `Parsing line ${progress.processed.toLocaleString()} of ${progress.total.toLocaleString()}...`}
                                    {progress.status === 'storing' && `Saving ${progress.processed.toLocaleString()} of ${progress.total.toLocaleString()} to database...`}
                                    {progress.status === 'complete' && '✓ Import complete!'}
                                </span>
                                <span className="progress-percentage">{progress.percentage}%</span>
                            </div>
                            {/* Modern glow progress bar */}
                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${progress.percentage}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {(error || hasValidationError) && (
                        <div className="import-error">
                            <p className="error-text">⚠ {error || validationResult?.error}</p>
                            {validationResult?.warnings && validationResult.warnings.length > 0 && (
                                <ul className="warning-list">
                                    {validationResult.warnings.map((warning, i) => (
                                        <li key={i} className="warning-item">⚠️ {warning}</li>
                                    ))}
                                </ul>
                            )}
                            <button className="btn-secondary" onClick={handleReset}>
                                Try Again
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
