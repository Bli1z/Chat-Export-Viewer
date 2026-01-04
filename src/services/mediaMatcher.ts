/**
 * Media matching service for WhatsApp chat exports.
 * Matches media files to messages using timestamp and filename correlation.
 */

import { Message, MediaFile } from '../types';

// WhatsApp media filename patterns
// Examples: IMG-20231225-WA0012.jpg, VID-20231225-WA0003.mp4, PTT-20231225-WA0001.opus
const WHATSAPP_MEDIA_PATTERN = /^(IMG|VID|AUD|PTT|DOC|STK)-(\d{8})-WA(\d+)\./i;

// Alternative pattern: WhatsApp Image 2023-12-25 at 10.30.15.jpeg
const WHATSAPP_ALT_PATTERN = /^WhatsApp\s+(Image|Video|Audio|Document)\s+(\d{4}-\d{2}-\d{2})\s+at\s+(\d{1,2}\.\d{2}\.\d{2})/i;

// Media type detection by extension
const EXTENSION_TO_TYPE: Record<string, 'image' | 'video' | 'audio' | 'document'> = {
    // Images
    'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image',
    'webp': 'image', 'heic': 'image', 'heif': 'image',
    // Videos
    'mp4': 'video', 'mov': 'video', 'avi': 'video', 'mkv': 'video',
    'webm': 'video', '3gp': 'video',
    // Audio
    'mp3': 'audio', 'ogg': 'audio', 'opus': 'audio', 'wav': 'audio',
    'm4a': 'audio', 'aac': 'audio',
    // Documents
    'pdf': 'document', 'doc': 'document', 'docx': 'document',
    'xls': 'document', 'xlsx': 'document', 'ppt': 'document', 'pptx': 'document',
    'txt': 'document',
};

export interface MediaMatchResult {
    matchedMessages: Message[];
    unmatchedMedia: File[];
    matchCount: number;
    totalMedia: number;
}

/**
 * Extract timestamp from WhatsApp-style filename.
 */
function extractTimestampFromFilename(filename: string): number | null {
    // Try WhatsApp standard pattern: IMG-20231225-WA0012.jpg
    const waMatch = filename.match(WHATSAPP_MEDIA_PATTERN);
    if (waMatch) {
        const dateStr = waMatch[2]; // YYYYMMDD
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1;
        const day = parseInt(dateStr.substring(6, 8));
        return new Date(year, month, day).getTime();
    }

    // Try alternative pattern: WhatsApp Image 2023-12-25 at 10.30.15.jpeg
    const altMatch = filename.match(WHATSAPP_ALT_PATTERN);
    if (altMatch) {
        const [, , dateStr, timeStr] = altMatch;
        const [year, month, day] = dateStr.split('-').map(Number);
        const [hour, minute, second] = timeStr.split('.').map(Number);
        return new Date(year, month - 1, day, hour, minute, second).getTime();
    }

    return null;
}

/**
 * Get media type from file extension.
 */
function getMediaType(filename: string): 'image' | 'video' | 'audio' | 'document' {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return EXTENSION_TO_TYPE[ext] || 'document';
}

/**
 * Build a lookup map from media files for efficient matching.
 */
function buildMediaLookup(mediaFiles: File[]): Map<string, MediaFile> {
    const lookup = new Map<string, MediaFile>();

    for (const file of mediaFiles) {
        const mediaFile: MediaFile = {
            file,
            type: getMediaType(file.name),
            timestamp: extractTimestampFromFilename(file.name) || undefined,
            matched: false,
        };
        lookup.set(file.name.toLowerCase(), mediaFile);
    }

    return lookup;
}

/**
 * Check if a message content references a specific media file.
 * WhatsApp exports sometimes include the filename in the message.
 */
function findReferencedFilename(content: string): string | null {
    // Pattern: "filename.ext (file attached)" or just the filename
    const patterns = [
        /([^\s<>]+\.(jpg|jpeg|png|gif|webp|mp4|mov|mp3|ogg|opus|pdf|doc|docx))\s*\(file attached\)/i,
        /^([A-Z]{3}-\d{8}-WA\d+\.(jpg|jpeg|png|gif|webp|mp4|mov|mp3|ogg|opus|pdf))/i,
    ];

    for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
            return match[1];
        }
    }

    return null;
}

/**
 * Match media files to messages.
 * Uses multiple strategies:
 * 1. Exact filename match if found in message content
 * 2. Timestamp proximity matching (same day)
 * 3. Sequential matching for consecutive media messages
 */
export function matchMediaToMessages(
    messages: Message[],
    mediaFiles: File[]
): MediaMatchResult {
    if (mediaFiles.length === 0) {
        return {
            matchedMessages: messages,
            unmatchedMedia: [],
            matchCount: 0,
            totalMedia: 0
        };
    }

    const mediaLookup = buildMediaLookup(mediaFiles);
    // Use slice() instead of spread [...messages] for large file safety (300k+ messages)
    const matchedMessages = messages.slice();
    const usedMedia = new Set<string>();

    // Strategy 1: Direct filename reference in message content
    for (let i = 0; i < matchedMessages.length; i++) {
        const msg = matchedMessages[i];
        if (msg.type !== 'media') continue;

        const referencedFile = findReferencedFilename(msg.content);
        if (referencedFile) {
            const mediaFile = mediaLookup.get(referencedFile.toLowerCase());
            if (mediaFile && !mediaFile.matched) {
                matchedMessages[i] = {
                    ...msg,
                    mediaFileName: mediaFile.file.name,
                    mediaType: mediaFile.type,
                };
                mediaFile.matched = true;
                mediaFile.messageId = msg.id;
                usedMedia.add(referencedFile.toLowerCase());
            }
        }
    }

    // Strategy 2: Timestamp-based matching (same day, ordered by sequence)
    const unmatched = Array.from(mediaLookup.values()).filter(m => !m.matched);
    const unmatchedWithTimestamp = unmatched.filter(m => m.timestamp);

    // Sort media by timestamp
    unmatchedWithTimestamp.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    // Get unmatched media messages
    const unmatchedMediaMsgs = matchedMessages
        .map((msg, idx) => ({ msg, idx }))
        .filter(({ msg }) => msg.type === 'media' && !msg.mediaFileName);

    // Match by proximity (same day)
    for (const { msg, idx } of unmatchedMediaMsgs) {
        const msgDate = new Date(msg.timestamp);
        const msgDay = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate()).getTime();

        // Find matching media from same day
        const candidates = unmatchedWithTimestamp.filter(m => {
            if (m.matched || !m.timestamp) return false;
            const mediaDay = new Date(
                new Date(m.timestamp).getFullYear(),
                new Date(m.timestamp).getMonth(),
                new Date(m.timestamp).getDate()
            ).getTime();
            return mediaDay === msgDay;
        });

        if (candidates.length > 0) {
            // Pick the first unmatched one from the same day
            const match = candidates[0];
            matchedMessages[idx] = {
                ...msg,
                mediaFileName: match.file.name,
                mediaType: match.type,
            };
            match.matched = true;
            match.messageId = msg.id;
            usedMedia.add(match.file.name.toLowerCase());
        }
    }

    // Collect unmatched media
    const unmatchedMedia = Array.from(mediaLookup.values())
        .filter(m => !m.matched)
        .map(m => m.file);

    const matchCount = Array.from(mediaLookup.values()).filter(m => m.matched).length;

    return {
        matchedMessages,
        unmatchedMedia,
        matchCount,
        totalMedia: mediaFiles.length
    };
}

/**
 * Create object URLs for matched media files.
 * Returns a map of messageId -> objectURL.
 */
export function createMediaUrls(
    messages: Message[],
    mediaFiles: File[]
): Map<string, string> {
    const urlMap = new Map<string, string>();
    const fileMap = new Map<string, File>();

    // Build filename -> file map
    for (const file of mediaFiles) {
        fileMap.set(file.name.toLowerCase(), file);
    }

    // Create URLs for matched messages
    for (const msg of messages) {
        if (msg.mediaFileName) {
            const file = fileMap.get(msg.mediaFileName.toLowerCase());
            if (file) {
                const url = URL.createObjectURL(file);
                urlMap.set(msg.id, url);
            }
        }
    }

    return urlMap;
}

/**
 * Revoke all created object URLs to free memory.
 */
export function revokeMediaUrls(urlMap: Map<string, string>): void {
    for (const url of urlMap.values()) {
        URL.revokeObjectURL(url);
    }
    urlMap.clear();
}
