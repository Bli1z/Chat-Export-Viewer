import { useState, useEffect } from 'react';
import { Message } from '../types';
import * as storage from '../services/storage';

/**
 * Hook to load and manage messages for a specific chat.
 * Messages are automatically sorted by timestamp.
 */
export function useMessages(chatId: string | null): {
    messages: Message[];
    loading: boolean;
} {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!chatId) {
            setMessages([]);
            return;
        }

        const loadMessages = async (): Promise<void> => {
            setLoading(true);
            try {
                const msgs = await storage.getMessagesForChat(chatId);
                // Sort by timestamp
                msgs.sort((a, b) => a.timestamp - b.timestamp);
                setMessages(msgs);
            } catch (error) {
                console.error('Failed to load messages:', error);
            } finally {
                setLoading(false);
            }
        };

        loadMessages();
    }, [chatId]);

    return { messages, loading };
}
