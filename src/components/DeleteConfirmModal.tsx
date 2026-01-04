import { useState } from 'react';
import './DeleteConfirmModal.css';

interface DeleteProgress {
    deleted: number;
    total: number;
}

interface DeleteConfirmModalProps {
    isOpen: boolean;
    chatName: string;
    messageCount: number;
    onConfirm: (onProgress: (deleted: number, total: number) => void) => Promise<void>;
    onCancel: () => void;
}

export function DeleteConfirmModal({
    isOpen,
    chatName,
    messageCount,
    onConfirm,
    onCancel
}: DeleteConfirmModalProps) {
    const [deleting, setDeleting] = useState(false);
    const [progress, setProgress] = useState<DeleteProgress | null>(null);

    const handleConfirm = async () => {
        setDeleting(true);
        setProgress({ deleted: 0, total: messageCount });

        try {
            await onConfirm((deleted, total) => {
                setProgress({ deleted, total });
            });

            // Brief delay to show 100%
            setTimeout(() => {
                setDeleting(false);
                setProgress(null);
                onCancel(); // Close modal
            }, 300);
        } catch (error) {
            console.error('Delete failed:', error);
            setDeleting(false);
            setProgress(null);
        }
    };

    if (!isOpen) return null;

    const percentage = progress
        ? Math.round((progress.deleted / progress.total) * 100)
        : 0;

    return (
        <div className="delete-modal-overlay" onClick={deleting ? undefined : onCancel}>
            <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="delete-modal-header">
                    <h3>Delete Chat</h3>
                </div>

                <div className="delete-modal-body">
                    {!deleting ? (
                        <>
                            <p className="delete-modal-message">
                                Are you sure you want to delete <strong>"{chatName}"</strong>?
                            </p>
                            <p className="delete-modal-warning">
                                This will permanently remove {messageCount.toLocaleString()} messages.
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="delete-modal-message">
                                Deleting {progress?.deleted.toLocaleString() || 0} of {progress?.total.toLocaleString() || messageCount.toLocaleString()}...
                            </p>
                            <div className="delete-progress-bar">
                                <div
                                    className="delete-progress-fill"
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                            <p className="delete-progress-text">{percentage}%</p>
                        </>
                    )}
                </div>

                {!deleting && (
                    <div className="delete-modal-footer">
                        <button className="delete-btn-cancel" onClick={onCancel}>
                            Cancel
                        </button>
                        <button className="delete-btn-confirm" onClick={handleConfirm}>
                            Delete
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
