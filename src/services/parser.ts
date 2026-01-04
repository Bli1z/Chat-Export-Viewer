import { Message, ParseProgress } from '../types';

// WhatsApp date/time patterns
// Supports formats like:
// - [DD/MM/YYYY, HH:MM:SS] (iOS/Android)
// - [M/D/YY, H:MM AM/PM] (US format)
// - [DD.MM.YY, HH:MM:SS] (European format)
const TIMESTAMP_PATTERNS = [
    // [DD/MM/YYYY, HH:MM:SS] or [DD/MM/YY, HH:MM:SS]
    /^\[?(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\]?\s*-?\s*/,
    // [M/D/YY, H:MM AM/PM]
    /^\[?(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)\]?\s*-?\s*/,
    // [DD.MM.YY, HH:MM:SS]
    /^\[?(\d{1,2})\.(\d{1,2})\.(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\]?\s*-?\s*/,
    // DD/MM/YYYY, HH:MM - (without brackets)
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*-\s*/,
];

const SYSTEM_MESSAGE_PATTERNS = [
    /^Messages and calls are end-to-end encrypted/,
    /^You deleted this message/,
    /^This message was deleted/,
    /^You created group/,
    /^You added/,
    /^You removed/,
    /^You left/,
    /^.+ created group/,
    /^.+ added .+/,
    /^.+ removed .+/,
    /^.+ left$/,
    /^.+ changed the subject/,
    /^.+ changed this group's icon/,
    /^.+ changed the group description/,
    /^Security code changed/,
    /^Missed .+ call/,
];

const MEDIA_PATTERNS = [
    /^<Media omitted>$/,
    /^image omitted$/i,
    /^video omitted$/i,
    /^audio omitted$/i,
    /^document omitted$/i,
    /^sticker omitted$/i,
    /^GIF omitted$/i,
    /^\(file attached\)$/i,
    // Match: filename.ext (file attached) - WhatsApp's actual format
    /^.+\.(jpg|jpeg|png|gif|webp|heic|mp4|mov|avi|mkv|webm|3gp|mp3|ogg|opus|wav|m4a|aac|pdf|doc|docx|xls|xlsx|ppt|pptx)\s*\(file attached\)$/i,
];

export interface ParseResult {
    messages: Message[];
    chatName: string;
    isGroup: boolean;
}

function parseTimestamp(match: RegExpMatchArray, patternIndex: number): number {
    let day: number, month: number, year: number, hour: number, minute: number, second: number = 0;

    if (patternIndex === 1) {
        // AM/PM format
        day = parseInt(match[1]);
        month = parseInt(match[2]);
        year = parseInt(match[3]);
        hour = parseInt(match[4]);
        minute = parseInt(match[5]);
        const isPM = match[6].toUpperCase() === 'PM';

        if (isPM && hour !== 12) hour += 12;
        if (!isPM && hour === 12) hour = 0;
    } else {
        // 24-hour format
        day = parseInt(match[1]);
        month = parseInt(match[2]);
        year = parseInt(match[3]);
        hour = parseInt(match[4]);
        minute = parseInt(match[5]);
        second = match[6] ? parseInt(match[6]) : 0;
    }

    // Handle 2-digit years
    if (year < 100) {
        year += year < 50 ? 2000 : 1900;
    }

    // Create date (month is 0-indexed in JS)
    const date = new Date(year, month - 1, day, hour, minute, second);
    return date.getTime();
}

function tryParseMessageLine(line: string): { timestamp: number; remainder: string } | null {
    for (let i = 0; i < TIMESTAMP_PATTERNS.length; i++) {
        const pattern = TIMESTAMP_PATTERNS[i];
        const match = line.match(pattern);

        if (match) {
            const timestamp = parseTimestamp(match, i);
            const remainder = line.slice(match[0].length);
            return { timestamp, remainder };
        }
    }

    return null;
}

function isSystemMessage(content: string): boolean {
    return SYSTEM_MESSAGE_PATTERNS.some(pattern => pattern.test(content));
}

function isMediaMessage(content: string): boolean {
    return MEDIA_PATTERNS.some(pattern => pattern.test(content));
}

/**
 * Extract media filename from message content.
 * Matches patterns like: "IMG-20250825-WA0003.jpg (file attached)"
 */
function extractMediaFileName(content: string): string | undefined {
    // Pattern: filename.ext (file attached)
    const match = content.match(/^(.+\.(jpg|jpeg|png|gif|webp|heic|mp4|mov|avi|mkv|webm|3gp|mp3|ogg|opus|wav|m4a|aac|pdf|doc|docx|xls|xlsx|ppt|pptx))\s*\(file attached\)$/i);
    if (match) {
        return match[1].trim();
    }
    return undefined;
}

/**
 * Determine media type from filename extension.
 */
function getMediaTypeFromFilename(filename: string): 'image' | 'video' | 'audio' | 'document' | undefined {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (!ext) return undefined;

    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];
    const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm', '3gp'];
    const audioExts = ['mp3', 'ogg', 'opus', 'wav', 'm4a', 'aac'];

    if (imageExts.includes(ext)) return 'image';
    if (videoExts.includes(ext)) return 'video';
    if (audioExts.includes(ext)) return 'audio';
    return 'document';
}

export async function parseWhatsAppChat(
    file: File,
    onProgress?: (progress: ParseProgress) => void
): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        // Track file read progress (Stage 1)
        reader.onprogress = (e) => {
            if (e.lengthComputable && onProgress) {
                onProgress({
                    total: e.total,
                    processed: e.loaded,
                    percentage: Math.round((e.loaded / e.total) * 100),
                    status: 'reading',
                });
            }
        };

        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                const lines = text.split('\n');
                const messages: Message[] = [];

                let currentMessage: Message | null = null;
                const senderSet = new Set<string>();

                const totalLines = lines.length;
                const CHUNK_SIZE = 2000; // Process 2000 lines per chunk for UI responsiveness

                // Reset progress for parsing stage (Stage 2)
                if (onProgress) {
                    onProgress({
                        total: totalLines,
                        processed: 0,
                        percentage: 0,
                        status: 'parsing',
                    });
                }

                // Helper to yield to UI thread
                const yieldToUI = () => new Promise<void>(resolve => setTimeout(resolve, 0));

                // Process lines in chunks to prevent UI freeze
                for (let chunkStart = 0; chunkStart < lines.length; chunkStart += CHUNK_SIZE) {
                    const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, lines.length);

                    // Process this chunk synchronously
                    for (let i = chunkStart; i < chunkEnd; i++) {
                        const line = lines[i].trim();

                        // Skip empty lines
                        if (!line) {
                            if (currentMessage) {
                                currentMessage.content += '\n';
                            }
                            continue;
                        }

                        // Try to parse as new message
                        const parsed = tryParseMessageLine(line);

                        if (parsed) {
                            // Save previous message if exists
                            if (currentMessage) {
                                currentMessage.content = currentMessage.content.trim();
                                messages.push(currentMessage);
                            }

                            // Extract sender and content
                            const { timestamp, remainder } = parsed;
                            const senderMatch = remainder.match(/^([^:]+):\s*(.*)$/);

                            if (senderMatch) {
                                // Regular message with sender
                                const sender = senderMatch[1].trim();
                                const content = senderMatch[2].trim();

                                senderSet.add(sender);

                                const isMedia = isMediaMessage(content);
                                const type = isMedia ? 'media' : 'text';

                                // Extract media filename and type if it's a media message
                                const mediaFileName = isMedia ? extractMediaFileName(content) : undefined;
                                const mediaType = mediaFileName ? getMediaTypeFromFilename(mediaFileName) : undefined;

                                currentMessage = {
                                    id: `msg-${timestamp}-${messages.length}`,
                                    timestamp,
                                    sender,
                                    content,
                                    type,
                                    ...(mediaFileName && { mediaFileName }),
                                    ...(mediaType && { mediaType }),
                                };
                            } else {
                                // System message or message without sender
                                const content = remainder.trim();
                                const type = isSystemMessage(content) ? 'system' : 'text';

                                currentMessage = {
                                    id: `msg-${timestamp}-${messages.length}`,
                                    timestamp,
                                    content,
                                    type,
                                };
                            }
                        } else {
                            // Continuation of previous message
                            if (currentMessage) {
                                currentMessage.content += '\n' + line;
                            }
                        }
                    }

                    // After each chunk: report progress and yield to UI
                    if (onProgress) {
                        onProgress({
                            total: totalLines,
                            processed: chunkEnd,
                            percentage: Math.round((chunkEnd / totalLines) * 100),
                            status: 'parsing',
                        });
                    }

                    // Yield to UI thread so progress bar can update
                    await yieldToUI();
                }

                // Add last message
                if (currentMessage) {
                    currentMessage.content = currentMessage.content.trim();
                    messages.push(currentMessage);
                }

                // Determine if group chat
                const isGroup = senderSet.size > 2;

                // Try to extract chat name from filename
                const chatNameGuess = file.name.replace(/\.txt$/i, '').replace(/^WhatsApp Chat with /, '');

                if (onProgress) {
                    onProgress({
                        total: totalLines,
                        processed: totalLines,
                        percentage: 100,
                        status: 'complete',
                    });
                }

                resolve({
                    messages,
                    chatName: chatNameGuess || 'Imported Chat',
                    isGroup,
                });
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsText(file);
    });
}
