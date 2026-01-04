import { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import './VideoLightbox.css';

interface VideoLightboxProps {
    src: string;
    onClose: () => void;
}

export function VideoLightbox({ src, onClose }: VideoLightboxProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    // Close on Escape key
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        // Prevent body scroll when lightbox is open
        document.body.style.overflow = 'hidden';

        // Auto-play the video when lightbox opens
        if (videoRef.current) {
            videoRef.current.play().catch(() => {
                // Autoplay might be blocked, user can click play
            });
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [handleKeyDown]);

    // Use portal to render at body level, outside component hierarchy
    // WHY: This escapes all stacking contexts (transform, filter, overflow)
    // that would trap the video inside the chat bubble
    return createPortal(
        <div className="video-lightbox-overlay" onClick={onClose}>
            <button className="video-lightbox-close" onClick={onClose} aria-label="Close">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
            </button>

            <div className="video-lightbox-content" onClick={(e) => e.stopPropagation()}>
                <video
                    ref={videoRef}
                    src={src}
                    controls
                    autoPlay
                    className="video-lightbox-video"
                />
            </div>
        </div>,
        document.body
    );
}
