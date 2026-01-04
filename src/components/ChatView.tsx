import { useMemo, useState, useEffect, useRef } from 'react';
import { Message } from '../types';
import { MessageList } from './MessageList';
import { POVSelector } from './POVSelector';
import { SearchBar, SearchResult } from './SearchBar';
import './ChatView.css';

interface ChatViewProps {
    chatName: string;
    isGroup: boolean;
    messages: Message[];
    loading: boolean;
    currentViewAs: string | undefined;
    onViewAsChange: (viewAs: string | undefined) => void;
    onBack?: () => void;
}

export function ChatView({
    chatName,
    isGroup,
    messages,
    loading,
    currentViewAs,
    onViewAsChange,
    onBack
}: ChatViewProps) {
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [currentResultIndex, setCurrentResultIndex] = useState(-1);
    const [searchExpanded, setSearchExpanded] = useState(false);
    const scrollTargetRef = useRef<string | null>(null);

    // Extract unique participants from messages with message counts
    const { participants, defaultParticipant } = useMemo(() => {
        const participantCounts = new Map<string, number>();
        messages.forEach(msg => {
            if (msg.sender && msg.type !== 'system') {
                participantCounts.set(msg.sender, (participantCounts.get(msg.sender) || 0) + 1);
            }
        });

        // Sort by name for the dropdown
        const sortedParticipants = Array.from(participantCounts.keys()).sort();

        // Find participant with most messages (likely the exporter/owner)
        let maxCount = 0;
        let topParticipant = sortedParticipants[0];
        participantCounts.forEach((count, name) => {
            if (count > maxCount) {
                maxCount = count;
                topParticipant = name;
            }
        });

        return { participants: sortedParticipants, defaultParticipant: topParticipant };
    }, [messages]);

    // Auto-select the participant with most messages as "you" (likely the exporter)
    // This ensures their messages appear on the right side like in WhatsApp
    useEffect(() => {
        if (currentViewAs === undefined && defaultParticipant) {
            onViewAsChange(defaultParticipant);
        }
    }, [currentViewAs, defaultParticipant, onViewAsChange]);

    // When current result changes, scroll to it
    useEffect(() => {
        if (currentResultIndex >= 0 && currentResultIndex < searchResults.length) {
            const result = searchResults[currentResultIndex];
            scrollTargetRef.current = result.messageId;
        }
    }, [currentResultIndex, searchResults]);

    const handleSearchResults = (results: SearchResult[]) => {
        setSearchResults(results);
        setCurrentResultIndex(results.length > 0 ? 0 : -1);
    };

    const handleCurrentResultChange = (index: number) => {
        setCurrentResultIndex(index);
    };

    return (
        <div className="chat-view">
            <div className="chat-header">
                {onBack && (
                    <button className="chat-back-btn" onClick={onBack} aria-label="Back to chat list">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                        </svg>
                    </button>
                )}
                <div className="chat-header-avatar">
                    {isGroup ? (
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                        </svg>
                    ) : (
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                    )}
                </div>
                <div className="chat-header-info">
                    <h2 className="chat-header-title">{chatName}</h2>
                    <p className="chat-header-subtitle">
                        {messages.length.toLocaleString()} messages
                        {currentViewAs && (
                            <span className="pov-indicator">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                                </svg>
                                Viewing as {currentViewAs}
                            </span>
                        )}
                    </p>
                </div>

                <button
                    className={`search-toggle-btn ${searchExpanded ? 'active' : ''}`}
                    onClick={() => setSearchExpanded(!searchExpanded)}
                    aria-label={searchExpanded ? "Collapse search" : "Expand search"}
                    aria-expanded={searchExpanded}
                    title="Search messages"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                    </svg>
                </button>

                {participants.length > 0 && (
                    <POVSelector
                        participants={participants}
                        currentViewAs={currentViewAs}
                        onViewAsChange={onViewAsChange}
                    />
                )}
            </div>

            <SearchBar
                messages={messages}
                onSearchResults={handleSearchResults}
                onCurrentResultChange={handleCurrentResultChange}
                currentResultIndex={currentResultIndex}
                totalResults={searchResults.length}
                isExpanded={searchExpanded}
                onToggle={() => setSearchExpanded(!searchExpanded)}
            />

            <div className="chat-messages">
                {loading ? (
                    <div className="chat-loading">
                        <div className="loading-spinner"></div>
                        <p>Loading messages...</p>
                    </div>
                ) : (
                    <MessageList
                        messages={messages}
                        isGroup={isGroup}
                        currentViewAs={currentViewAs}
                        searchResults={searchResults}
                        currentResultIndex={currentResultIndex}
                        scrollToMessageId={scrollTargetRef.current}
                    />
                )}
            </div>
        </div>
    );
}
