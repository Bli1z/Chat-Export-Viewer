import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useRef, useEffect, useMemo } from 'react';
import { Message } from '../types';
import { MessageBubble } from './MessageBubble';
import { SearchResult } from './SearchBar';
import { isDifferentDay, formatDateSeparator } from '../utils/dateFormatters';
import './MessageList.css';

interface MessageListProps {
    messages: Message[];
    currentUser?: string;
    isGroup: boolean;
    currentViewAs?: string;
    searchResults?: SearchResult[];
    currentResultIndex?: number;
    scrollToMessageId?: string | null;
}

// A union type for list items: either a message or a date separator
type ListItem =
    | { type: 'message'; message: Message; index: number }
    | { type: 'date-separator'; date: string; timestamp: number };

export function MessageList({
    messages,
    currentUser,
    isGroup,
    currentViewAs,
    searchResults = [],
    currentResultIndex = -1,
    scrollToMessageId
}: MessageListProps) {
    const virtuosoRef = useRef<VirtuosoHandle>(null);

    // Build list items with date separators inserted
    const listItems = useMemo<ListItem[]>(() => {
        const items: ListItem[] = [];

        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            const prevMessage = i > 0 ? messages[i - 1] : null;

            // Insert date separator if this is first message or different day from previous
            if (!prevMessage || isDifferentDay(prevMessage.timestamp, message.timestamp)) {
                items.push({
                    type: 'date-separator',
                    date: formatDateSeparator(message.timestamp),
                    timestamp: message.timestamp
                });
            }

            items.push({
                type: 'message',
                message,
                index: i
            });
        }

        return items;
    }, [messages]);

    // Map message IDs to list item indices for scrolling
    const messageIdToItemIndex = useMemo(() => {
        const map = new Map<string, number>();
        listItems.forEach((item, idx) => {
            if (item.type === 'message') {
                map.set(item.message.id, idx);
            }
        });
        return map;
    }, [listItems]);

    // Scroll to current search result
    useEffect(() => {
        if (scrollToMessageId && virtuosoRef.current) {
            const targetIndex = messageIdToItemIndex.get(scrollToMessageId);
            if (targetIndex !== undefined) {
                virtuosoRef.current.scrollToIndex({
                    index: targetIndex,
                    align: 'center',
                    behavior: 'smooth'
                });
            }
        }
    }, [scrollToMessageId, messageIdToItemIndex]);

    if (messages.length === 0) {
        return (
            <div className="message-list-empty">
                <p>No messages to display</p>
            </div>
        );
    }

    // Create a set of search result message IDs for quick lookup
    const searchResultIds = new Set(searchResults.map(r => r.messageId));
    const currentResultId = currentResultIndex >= 0 && currentResultIndex < searchResults.length
        ? searchResults[currentResultIndex].messageId
        : null;

    // Get search term from first result if available
    const searchTerm = searchResults.length > 0 ? searchResults[0].matchText : undefined;

    return (
        <div className="message-list-container">
            <Virtuoso
                ref={virtuosoRef}
                data={listItems}
                className="message-list"
                // WHY: Start at the bottom of the chat (most recent messages) like WhatsApp
                initialTopMostItemIndex={listItems.length - 1}
                // FIX: Pre-render 2000px of items outside viewport for large lists (300k+ messages)
                overscan={2000}
                // FIX: Use Footer for bottom spacing - Virtuoso accounts for this mathematically
                components={{
                    Footer: () => <div style={{ height: '20px' }} />
                }}
                itemContent={(_index: number, item: ListItem) => {
                    if (item.type === 'date-separator') {
                        return (
                            <div className="date-separator">
                                <span className="date-separator-text">{item.date}</span>
                            </div>
                        );
                    }

                    const { message, index: msgIndex } = item;
                    const prevMessage = msgIndex > 0 ? messages[msgIndex - 1] : null;

                    // Check if grouped (same sender, within 1 minute, same day)
                    const isGrouped = !!(
                        prevMessage &&
                        prevMessage.sender === message.sender &&
                        message.type !== 'system' &&
                        prevMessage.type !== 'system' &&
                        (message.timestamp - prevMessage.timestamp) < 60000 &&
                        !isDifferentDay(prevMessage.timestamp, message.timestamp)
                    );

                    const isSearchResult = searchResultIds.has(message.id);
                    const isCurrentSearchResult = message.id === currentResultId;

                    return (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            currentUser={currentUser}
                            currentViewAs={currentViewAs}
                            showSender={isGroup && !isGrouped}
                            isGrouped={isGrouped}
                            searchTerm={searchTerm}
                            isSearchResult={isSearchResult}
                            isCurrentSearchResult={isCurrentSearchResult}
                        />
                    );
                }}
                followOutput="smooth"
            />
        </div>
    );
}
