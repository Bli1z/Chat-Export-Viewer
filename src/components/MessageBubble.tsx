import { useState, useEffect } from 'react';
import { Message } from '../types';
import { format } from 'date-fns';
import * as storage from '../services/storage';
import { ImageLightbox } from './ImageLightbox';
import { VideoLightbox } from './VideoLightbox';
import './MessageBubble.css';

interface MessageBubbleProps {
    message: Message;
    currentUser?: string;
    currentViewAs?: string; // POV: who is viewing the chat
    showSender: boolean;
    isGrouped: boolean;
    searchTerm?: string; // For highlighting
    isSearchResult?: boolean; // Is this a search result
    isCurrentSearchResult?: boolean; // Is this the currently focused search result
}

export function MessageBubble({
    message,
    currentUser,
    currentViewAs,
    showSender,
    isGrouped,
    searchTerm,
    isSearchResult,
    isCurrentSearchResult
}: MessageBubbleProps) {
    // WHY: Don't use message.mediaUrl as initial state!
    // Blob URLs from import don't persist across page reloads, so any stored
    // mediaUrl from IndexedDB will be stale/invalid. Always load fresh from storage.
    const [mediaUrl, setMediaUrl] = useState<string | null>(null);
    const [mediaLoading, setMediaLoading] = useState(false);
    const [mediaError, setMediaError] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [videoLightboxOpen, setVideoLightboxOpen] = useState(false);

    const isSystem = message.type === 'system';
    const isMedia = message.type === 'media';
    const hasMedia = isMedia && (mediaUrl || message.mediaFileName);

    // Detect stickers: STK- prefix or .webp sticker files
    const isSticker = hasMedia && (
        message.mediaFileName?.startsWith('STK-') ||
        (message.mediaFileName?.toLowerCase().endsWith('.webp') &&
            message.content.toLowerCase().includes('sticker'))
    );

    // Load media URL from storage if not already set
    useEffect(() => {
        let mounted = true;

        const loadMediaUrl = async () => {
            // Skip if we already have a URL or no media filename
            if (mediaUrl || !message.mediaFileName) {
                return;
            }

            setMediaLoading(true);
            try {
                const url = await storage.getMedia(message.id);
                if (mounted && url) {
                    setMediaUrl(url);
                }
            } catch (err) {
                console.error('Failed to load media:', err);
                if (mounted) {
                    setMediaError(true);
                }
            } finally {
                if (mounted) {
                    setMediaLoading(false);
                }
            }
        };

        loadMediaUrl();

        return () => {
            mounted = false;
        };
    }, [message.id, message.mediaFileName, mediaUrl]);

    // Determine if this message is "sent" based on POV
    const effectiveUser = currentViewAs || currentUser;
    const isSent = message.sender === effectiveUser;

    if (isSystem) {
        return (
            <div className={`message-system ${isCurrentSearchResult ? 'search-highlight-current' : isSearchResult ? 'search-highlight' : ''}`}>
                <span className="message-system-text">
                    {highlightText(message.content, searchTerm)}
                </span>
            </div>
        );
    }

    const formattedTime = format(new Date(message.timestamp), 'HH:mm');

    const renderMedia = () => {
        if (!hasMedia) return null;

        // Loading state
        if (mediaLoading) {
            return (
                <div className="message-media-loading">
                    <div className="media-spinner"></div>
                    <span>Loading media...</span>
                </div>
            );
        }

        // Error state
        if (mediaError || (!mediaUrl && message.mediaFileName)) {
            return (
                <div className="message-media-placeholder">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                    </svg>
                    <span>{message.mediaFileName || 'Media unavailable'}</span>
                </div>
            );
        }

        // Render actual media
        if (mediaUrl) {
            switch (message.mediaType) {
                case 'image':
                    return (
                        <>
                            <div
                                className="message-media-container"
                                onClick={() => setLightboxOpen(true)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && setLightboxOpen(true)}
                            >
                                <img
                                    src={mediaUrl}
                                    alt={message.mediaFileName || 'Image'}
                                    className="message-media-image"
                                    loading="lazy"
                                    onError={() => setMediaError(true)}
                                />
                            </div>
                            {lightboxOpen && (
                                <ImageLightbox
                                    src={mediaUrl}
                                    alt={message.mediaFileName || 'Image'}
                                    onClose={() => setLightboxOpen(false)}
                                />
                            )}
                        </>
                    );
                case 'video':
                    return (
                        <>
                            <div className="message-media-container message-video-container">
                                {/* Native controls enabled - CSS hides fullscreen button */}
                                <video
                                    src={mediaUrl}
                                    controls
                                    preload="metadata"
                                    className="message-media-video"
                                    onError={() => setMediaError(true)}
                                    playsInline
                                >
                                    Your browser does not support the video tag.
                                </video>
                                {/* Custom Enlarge button - opens fullscreen lightbox */}
                                <button
                                    className="video-enlarge-button"
                                    onClick={() => setVideoLightboxOpen(true)}
                                    aria-label="Enlarge video"
                                    title="Enlarge video"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                                    </svg>
                                </button>
                            </div>
                            {videoLightboxOpen && mediaUrl && (
                                <VideoLightbox
                                    src={mediaUrl}
                                    onClose={() => setVideoLightboxOpen(false)}
                                />
                            )}
                        </>
                    );
                case 'audio':
                    return (
                        <div className="message-media-audio">
                            <audio
                                src={mediaUrl}
                                controls
                                preload="metadata"
                                className="message-audio-player"
                                onError={() => setMediaError(true)}
                            >
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                    );
                case 'document':
                    return (
                        <a
                            href={mediaUrl}
                            download={message.mediaFileName}
                            className="message-media-document"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                            </svg>
                            <span>{message.mediaFileName || 'Document'}</span>
                        </a>
                    );
                default:
                    return (
                        <div className="message-media-placeholder">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
                            </svg>
                            <span>{message.mediaFileName || 'File'}</span>
                        </div>
                    );
            }
        }

        // Fallback placeholder
        return (
            <div className="message-media-placeholder">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                </svg>
                <span>Media</span>
            </div>
        );
    };

    // Hide media placeholder text (like "filename.jpg (file attached)") when we have actual media
    const isMediaPlaceholder = message.content.match(/^<Media omitted>$|omitted$/i) ||
        message.content.match(/\(file attached\)$/i);
    const showContent = !(isMedia && mediaUrl && isMediaPlaceholder);

    // Stickers render without the bubble background
    if (isSticker && mediaUrl) {
        return (
            <div className={`message-wrapper ${isSent ? 'sent' : 'received'} ${isGrouped ? 'grouped' : ''} sticker-wrapper`}>
                <div className="sticker-container">
                    <img
                        src={mediaUrl}
                        alt={message.mediaFileName || 'Sticker'}
                        className="sticker-image"
                        loading="lazy"
                        onError={() => setMediaError(true)}
                    />
                    <div className="sticker-time">{formattedTime}</div>
                </div>
            </div>
        );
    }

    return (
        <div className={`message-wrapper ${isSent ? 'sent' : 'received'} ${isGrouped ? 'grouped' : ''} ${isCurrentSearchResult ? 'search-highlight-current' : isSearchResult ? 'search-highlight' : ''}`}>
            <div className={`message-bubble ${isSent ? 'sent' : 'received'}`}>
                {showSender && message.sender && (
                    <div className="message-sender">{message.sender}</div>
                )}
                <div className="message-content">
                    {renderMedia()}
                    {showContent && message.content && (
                        <p className="message-text">
                            {highlightText(message.content, searchTerm)}
                        </p>
                    )}
                </div>
                <div className="message-time">{formattedTime}</div>
            </div>
        </div>
    );
}

// Helper function to highlight search terms in text
function highlightText(text: string, searchTerm?: string): React.ReactNode {
    if (!searchTerm || !searchTerm.trim()) {
        return text;
    }

    const parts: React.ReactNode[] = [];
    const normalizedTerm = searchTerm.toLowerCase();
    const normalizedText = text.toLowerCase();

    let lastIndex = 0;
    let index = normalizedText.indexOf(normalizedTerm);

    while (index !== -1) {
        // Add text before the match
        if (index > lastIndex) {
            parts.push(text.substring(lastIndex, index));
        }

        // Add highlighted match
        const matchedText = text.substring(index, index + searchTerm.length);
        parts.push(
            <mark key={`match-${index}`} className="search-match">
                {matchedText}
            </mark>
        );

        lastIndex = index + searchTerm.length;
        index = normalizedText.indexOf(normalizedTerm, lastIndex);
    }

    // Add remaining text
    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return <>{parts}</>;
}
