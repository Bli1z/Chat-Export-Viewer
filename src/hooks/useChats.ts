import { useState, useEffect } from 'react';
import { Chat } from '../types';
import * as storage from '../services/storage';

export function useChats(): {
    chats: Chat[];
    loading: boolean;
    loadChats: () => Promise<void>;
    deleteChat: (chatId: string, onProgress?: (deleted: number, total: number) => void) => Promise<void>;
    updateChatLastOpened: (chatId: string) => Promise<void>;
} {
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);

    const loadChats = async (): Promise<void> => {
        setLoading(true);
        try {
            const allChats = await storage.getAllChats();
            setChats(allChats);
        } catch (error) {
            console.error('Failed to load chats:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadChats();
    }, []);

    const deleteChat = async (
        chatId: string,
        onProgress?: (deleted: number, total: number) => void
    ): Promise<void> => {
        try {
            await storage.deleteChat(chatId, onProgress);
            await loadChats();
        } catch (error) {
            console.error('Failed to delete chat:', error);
        }
    };

    const updateChatLastOpened = async (chatId: string): Promise<void> => {
        try {
            const chat = await storage.getChat(chatId);
            if (chat) {
                chat.lastOpened = Date.now();
                await storage.saveChat(chat);
                // Don't reload chats - prevents list from reshuffling
            }
        } catch (error) {
            console.error('Failed to update chat:', error);
        }
    };

    return {
        chats,
        loading,
        loadChats,
        deleteChat,
        updateChatLastOpened,
    };
}

