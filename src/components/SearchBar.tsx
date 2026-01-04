import { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import './SearchBar.css';

export interface SearchResult {
    messageId: string;
    messageIndex: number;
    matchText: string;
}

interface SearchBarProps {
    messages: Message[];
    onSearchResults: (results: SearchResult[]) => void;
    onCurrentResultChange: (index: number) => void;
    currentResultIndex: number;
    totalResults: number;
    isExpanded: boolean;
    onToggle: () => void;
}

export function SearchBar({
    messages,
    onSearchResults,
    onCurrentResultChange,
    currentResultIndex,
    totalResults,
    isExpanded,
}: SearchBarProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [dateStart, setDateStart] = useState<string>('');
    const [dateEnd, setDateEnd] = useState<string>('');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const announcerRef = useRef<HTMLDivElement>(null);

    // Perform search whenever term or date filters change
    useEffect(() => {
        if (!searchTerm.trim()) {
            onSearchResults([]);
            return;
        }

        const results = performSearch(searchTerm, messages, dateStart, dateEnd);
        onSearchResults(results);

        // Announce results to screen readers
        announceResults(results.length);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, dateStart, dateEnd, messages]);

    const performSearch = (term: string, msgs: Message[], dateFrom: string, dateTo: string): SearchResult[] => {
        const normalizedTerm = term.toLowerCase();
        const results: SearchResult[] = [];

        // Parse dates
        const startTimestamp = dateFrom ? new Date(dateFrom).getTime() : null;
        const endTimestamp = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : null;

        msgs.forEach((msg, index) => {
            // Apply date filters
            if (startTimestamp && msg.timestamp < startTimestamp) return;
            if (endTimestamp && msg.timestamp > endTimestamp) return;

            // Search in content
            const normalizedContent = msg.content.toLowerCase();
            if (normalizedContent.includes(normalizedTerm)) {
                results.push({
                    messageId: msg.id,
                    messageIndex: index,
                    matchText: term
                });
            }
        });

        return results;
    };

    const announceResults = (count: number) => {
        if (announcerRef.current) {
            announcerRef.current.textContent = count === 0
                ? `No matches found for "${searchTerm}"`
                : `${count} result${count === 1 ? '' : 's'} found. ${currentResultIndex >= 0 ? `Showing ${currentResultIndex + 1} of ${count}.` : ''}`;
        }
    };

    const handlePrevious = () => {
        if (totalResults === 0) return;
        const newIndex = currentResultIndex <= 0 ? totalResults - 1 : currentResultIndex - 1;
        onCurrentResultChange(newIndex);
    };

    const handleNext = () => {
        if (totalResults === 0) return;
        const newIndex = currentResultIndex >= totalResults - 1 ? 0 : currentResultIndex + 1;
        onCurrentResultChange(newIndex);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                handlePrevious();
            } else {
                handleNext();
            }
        }
    };

    const handleClear = () => {
        setSearchTerm('');
        onSearchResults([]);
        onCurrentResultChange(-1);
    };

    if (!isExpanded) {
        return null;
    }

    return (
        <div className="search-panel">
            <div className="search-row">
                <div className="search-input-wrapper">
                    <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                    </svg>
                    <input
                        ref={searchInputRef}
                        type="text"
                        className="search-input"
                        placeholder="Search messages..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleKeyDown}
                        aria-label="Search messages"
                    />
                    {searchTerm && (
                        <button
                            className="search-clear"
                            onClick={handleClear}
                            aria-label="Clear search"
                        >
                            ×
                        </button>
                    )}
                </div>

                {searchTerm && totalResults > 0 && (
                    <div className="search-nav">
                        <span className="search-count">
                            {currentResultIndex + 1} / {totalResults}
                        </span>
                        <button
                            className="search-nav-btn"
                            onClick={handlePrevious}
                            aria-label="Previous result"
                            title="Previous (Shift+Enter)"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                            </svg>
                        </button>
                        <button
                            className="search-nav-btn"
                            onClick={handleNext}
                            aria-label="Next result"
                            title="Next (Enter)"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {searchTerm && totalResults === 0 && (
                <div className="search-no-results">No matches found</div>
            )}

            <div className="search-filters-row">
                <div className="date-filter">
                    <label htmlFor="date-from" className="date-label">From:</label>
                    <input
                        id="date-from"
                        type="date"
                        className="date-input"
                        value={dateStart}
                        onChange={(e) => setDateStart(e.target.value)}
                        aria-label="Start date"
                    />
                </div>
                <div className="date-filter">
                    <label htmlFor="date-to" className="date-label">To:</label>
                    <input
                        id="date-to"
                        type="date"
                        className="date-input"
                        value={dateEnd}
                        onChange={(e) => setDateEnd(e.target.value)}
                        aria-label="End date"
                    />
                </div>
            </div>

            {/* Screen reader announcer */}
            <div ref={announcerRef} className="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
        </div>
    );
}
