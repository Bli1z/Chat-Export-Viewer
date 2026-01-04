import { useState } from 'react';
import { parseWhatsAppChat } from '../services/parser';
import { matchMediaToMessages, createMediaUrls } from '../services/mediaMatcher';
import * as storage from '../services/storage';
import { Chat, ParseProgress, Message } from '../types';

export interface ImportOptions {
    txtFile: File;
    mediaFiles?: File[];
}

export function useImport() {
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState<ParseProgress | null>(null);
    const [error, setError] = useState<string | null>(null);

    /**
     * Import a chat with optional media files.
     * If mediaFiles are provided, they will be matched to messages.
     */
    const importChatWithMedia = async (options: ImportOptions): Promise<Chat | null> => {
        const { txtFile, mediaFiles = [] } = options;

        setImporting(true);
        setError(null);
        setProgress({
            total: 100,
            processed: 0,
            percentage: 0,
            status: 'parsing',
        });

        try {
            // Parse the chat
            const result = await parseWhatsAppChat(txtFile, (prog) => {
                setProgress(prog);
            });

            let finalMessages: Message[] = result.messages;

            // If media files are provided, match them to messages
            if (mediaFiles.length > 0) {
                console.log('=== MEDIA IMPORT DEBUG ===');
                console.log(`Media files received: ${mediaFiles.length}`);
                console.log('Media file names:', mediaFiles.map(f => f.name));

                const mediaMsgs = result.messages.filter(m => m.type === 'media');
                console.log(`Messages identified as media type: ${mediaMsgs.length}`);
                console.log('First few media messages:', mediaMsgs.slice(0, 5).map(m => ({ content: m.content, mediaFileName: m.mediaFileName })));

                setProgress({
                    total: 100,
                    processed: 100,
                    percentage: 100,
                    status: 'storing', // Repurpose for "matching media"
                });

                const matchResult = matchMediaToMessages(result.messages, mediaFiles);
                finalMessages = matchResult.matchedMessages;

                // Create object URLs for matched media and update messages
                const urlMap = createMediaUrls(finalMessages, mediaFiles);
                console.log(`URLs created for ${urlMap.size} messages`);

                // Update messages with their media URLs
                finalMessages = finalMessages.map(msg => {
                    const url = urlMap.get(msg.id);
                    if (url) {
                        return { ...msg, mediaUrl: url };
                    }
                    return msg;
                });

                // Log matching stats for debugging
                console.log(`Media matching: ${matchResult.matchCount}/${matchResult.totalMedia} files matched`);
                if (matchResult.unmatchedMedia.length > 0) {
                    console.log('Unmatched media:', matchResult.unmatchedMedia.map(f => f.name));
                }
                console.log('=== END MEDIA DEBUG ===');
            }

            // Find the last message timestamp - use reduce instead of Math.max(...) for large file safety
            const lastMessageTimestamp = finalMessages.length > 0
                ? finalMessages.reduce((max, m) => m.timestamp > max ? m.timestamp : max, finalMessages[0].timestamp)
                : Date.now();

            // Create chat object
            const chat: Chat = {
                id: `chat-${Date.now()}`,
                name: result.chatName,
                messageCount: finalMessages.length,
                lastOpened: Date.now(),
                created: Date.now(),
                isGroup: result.isGroup,
                lastMessageTimestamp,
            };

            // Save to storage
            setProgress({
                total: finalMessages.length,
                processed: 0,
                percentage: 0,
                status: 'storing',
            });

            await storage.saveChat(chat);

            // Debug: Log messages with mediaFileName before saving
            const msgsWithMedia = finalMessages.filter(m => m.mediaFileName);
            console.log(`[SAVE DEBUG] Saving ${finalMessages.length} messages, ${msgsWithMedia.length} have mediaFileName`);
            if (msgsWithMedia.length > 0) {
                console.log('[SAVE DEBUG] First 3 media messages:', msgsWithMedia.slice(0, 3).map(m => ({ id: m.id, mediaFileName: m.mediaFileName, mediaType: m.mediaType })));
            }

            // Save messages with progress tracking
            await storage.saveMessages(finalMessages, chat.id, (saved, total) => {
                setProgress({
                    total,
                    processed: saved,
                    percentage: Math.round((saved / total) * 100),
                    status: 'storing',
                });
            });

            // Save media blobs to storage for persistence
            if (mediaFiles.length > 0) {
                const fileMap = new Map<string, File>();
                for (const file of mediaFiles) {
                    fileMap.set(file.name.toLowerCase(), file);
                }

                let savedCount = 0;
                for (const msg of finalMessages) {
                    if (msg.mediaFileName) {
                        const file = fileMap.get(msg.mediaFileName.toLowerCase());
                        if (file) {
                            await storage.saveMedia(msg.id, file, file.name, file.type);
                            savedCount++;
                        }
                    }
                }
                console.log(`[SAVE DEBUG] Saved ${savedCount} media blobs to IndexedDB`);
            }

            setProgress({
                total: 100,
                processed: 100,
                percentage: 100,
                status: 'complete',
            });

            setImporting(false);
            return chat;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to import chat';
            setError(errorMessage);
            setProgress({
                total: 100,
                processed: 0,
                percentage: 0,
                status: 'error',
                error: errorMessage,
            });
            setImporting(false);
            return null;
        }
    };

    /**
     * Simple import with just a text file (backwards compatible).
     */
    const importChat = async (file: File): Promise<Chat | null> => {
        return importChatWithMedia({ txtFile: file });
    };

    const reset = () => {
        setImporting(false);
        setProgress(null);
        setError(null);
    };

    return {
        importing,
        progress,
        error,
        importChat,
        importChatWithMedia,
        reset,
    };
}
