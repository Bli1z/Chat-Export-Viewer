// Core types for the WhatsApp Chat Viewer

export interface Message {
    id: string;
    timestamp: number; // Unix timestamp in milliseconds
    sender?: string; // undefined for system messages
    content: string;
    type: 'text' | 'media' | 'system';
    mediaUrl?: string; // local object URL for media
    mediaType?: 'image' | 'video' | 'audio' | 'document';
    mediaFileName?: string;
}

export interface Chat {
    id: string;
    name: string;
    messageCount: number;
    lastOpened: number;
    created: number;
    isGroup: boolean;
    currentViewAs?: string; // POV: name of participant to view as (undefined = auto/me)
    lastMessageTimestamp?: number; // Timestamp of the last message in the chat
}

export interface ParseProgress {
    total: number;
    processed: number;
    percentage: number;
    status: 'reading' | 'parsing' | 'storing' | 'complete' | 'error';
    error?: string;
}

export interface MediaFile {
    file: File;
    type: 'image' | 'video' | 'audio' | 'document';
    timestamp?: number; // extracted from filename or file metadata
    matched: boolean;
    messageId?: string;
}

export interface SearchResult {
    messageId: string;
    chatId: string;
    snippet: string;
    highlightedSnippet: string;
    timestamp: number;
    sender?: string;
}

export interface FilterOptions {
    dateStart?: number;
    dateEnd?: number;
    sender?: string;
    messageType?: 'text' | 'media' | 'system' | 'all';
    searchQuery?: string;
}
