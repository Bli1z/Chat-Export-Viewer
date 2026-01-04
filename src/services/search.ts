import { Message, SearchResult, FilterOptions } from '../types';

export function searchMessages(
    messages: Message[],
    query: string,
    chatId: string
): SearchResult[] {
    if (!query.trim()) {
        return [];
    }

    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const message of messages) {
        const lowerContent = message.content.toLowerCase();

        if (lowerContent.includes(lowerQuery)) {
            // Find the position of the match
            const matchIndex = lowerContent.indexOf(lowerQuery);

            // Create a snippet with context (50 chars before and after)
            const snippetStart = Math.max(0, matchIndex - 50);
            const snippetEnd = Math.min(message.content.length, matchIndex + query.length + 50);
            let snippet = message.content.slice(snippetStart, snippetEnd);

            if (snippetStart > 0) snippet = '...' + snippet;
            if (snippetEnd < message.content.length) snippet = snippet + '...';

            // Create highlighted version
            const highlightedSnippet = snippet.replace(
                new RegExp(escapeRegExp(query), 'gi'),
                (match) => `<mark>${match}</mark>`
            );

            results.push({
                messageId: message.id,
                chatId,
                snippet,
                highlightedSnippet,
                timestamp: message.timestamp,
                sender: message.sender,
            });
        }
    }

    return results;
}

export function filterMessages(
    messages: Message[],
    filters: FilterOptions
): Message[] {
    return messages.filter(message => {
        // Date range filter
        if (filters.dateStart && message.timestamp < filters.dateStart) {
            return false;
        }
        if (filters.dateEnd && message.timestamp > filters.dateEnd) {
            return false;
        }

        // Sender filter
        if (filters.sender && message.sender !== filters.sender) {
            return false;
        }

        // Message type filter
        if (filters.messageType && filters.messageType !== 'all' && message.type !== filters.messageType) {
            return false;
        }

        // Search query filter
        if (filters.searchQuery) {
            const lowerQuery = filters.searchQuery.toLowerCase();
            const lowerContent = message.content.toLowerCase();
            if (!lowerContent.includes(lowerQuery)) {
                return false;
            }
        }

        return true;
    });
}

export function getSenders(messages: Message[]): string[] {
    const senderSet = new Set<string>();

    for (const message of messages) {
        if (message.sender) {
            senderSet.add(message.sender);
        }
    }

    return Array.from(senderSet).sort();
}

function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
