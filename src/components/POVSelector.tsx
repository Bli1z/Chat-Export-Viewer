import { useEffect, useRef, useState } from 'react';
import './POVSelector.css';

interface POVSelectorProps {
    participants: string[]; // List of all participants in the chat
    currentViewAs: string | undefined; // Current POV
    onViewAsChange: (participantName: string | undefined) => void;
}

export function POVSelector({ participants, currentViewAs, onViewAsChange }: POVSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (participant: string | undefined) => {
        onViewAsChange(participant);
        setIsOpen(false);

        // Announce to screen readers
        const announcement = participant
            ? `Now viewing as ${participant}. Messages from ${participant} will appear on the right.`
            : `Now viewing as you. Your messages will appear on the right.`;
        announceToScreenReader(announcement);
    };

    const handleKeyDown = (e: React.KeyboardEvent, participant: string | undefined) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSelect(participant);
        }
    };

    const displayName = currentViewAs || 'Me';

    return (
        <div className="pov-selector" ref={dropdownRef}>
            <button
                className="pov-toggle"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label="Change point of view"
                title="Change point-of-view to read the chat as a specific participant (flips sent/received sides)"
            >
                <span className="pov-label">View as:</span>
                <span className="pov-current">{displayName}</span>
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className={`pov-arrow ${isOpen ? 'open' : ''}`}
                >
                    <path d="M7 10l5 5 5-5z" />
                </svg>
            </button>

            {isOpen && (
                <div className="pov-dropdown" role="listbox" aria-label="Select point of view">
                    {participants.map((participant) => (
                        <div
                            key={participant}
                            className={`pov-option ${currentViewAs === participant ? 'active' : ''}`}
                            onClick={() => handleSelect(participant)}
                            onKeyDown={(e) => handleKeyDown(e, participant)}
                            role="option"
                            aria-selected={currentViewAs === participant}
                            tabIndex={0}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                            <span>{participant}</span>
                            {currentViewAs === participant && <span className="pov-checkmark">✓</span>}
                        </div>
                    ))}
                </div>
            )}

            {/* Screen reader announcements */}
            <div className="sr-only" role="status" aria-live="polite" aria-atomic="true" id="pov-announcer"></div>
        </div>
    );
}

// Helper function to announce changes to screen readers
function announceToScreenReader(message: string) {
    const announcer = document.getElementById('pov-announcer');
    if (announcer) {
        announcer.textContent = message;
        // Clear after announcement
        setTimeout(() => {
            announcer.textContent = '';
        }, 1000);
    }
}
