import './AboutModal.css';

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
    if (!isOpen) return null;

    return (
        <div className="about-modal-overlay" onClick={onClose}>
            <div className="about-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="about-modal-header">
                    <h2>About</h2>
                    <button className="about-modal-close" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </div>

                <div className="about-modal-body">
                    <div className="about-app-info">
                        <div className="about-app-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
                                <path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z" />
                            </svg>
                        </div>
                        <h3 className="about-app-name">Chat Export Viewer</h3>
                        <p className="about-app-version">Version 1.0.0</p>
                    </div>

                    <div className="about-disclaimer">
                        <p>
                            This is an independent tool for viewing chat exports.
                            Not affiliated with, endorsed, or sponsored by WhatsApp Inc. or Meta Platforms.
                        </p>
                        <p className="about-trademark">
                            WhatsApp™ is a trademark of Meta Platforms, Inc.
                        </p>
                    </div>

                    <div className="about-features">
                        <h4>Features</h4>
                        <ul>
                            <li>🔒 100% offline processing</li>
                            <li>📱 View exported chat history</li>
                            <li>🖼️ Media file support</li>
                            <li>🔍 Search messages</li>
                            <li>👁️ POV switching</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
