import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Chat, Message } from '../types';

// Extended Message type for IndexedDB storage (includes chatId for indexing)
interface StoredMessage extends Message {
    chatId: string;
}

interface WhatsAppViewerDB extends DBSchema {
    chats: {
        key: string;
        value: Chat;
        indexes: { 'by-lastOpened': number };
    };
    messages: {
        key: string;
        value: Message;
        indexes: {
            'by-chatId': string;
            'by-timestamp': number;
            'by-sender': string;
        };
    };
    media: {
        key: string;
        value: {
            messageId: string;
            blob: Blob;
            fileName: string;
            type: string;
        };
    };
}

const DB_NAME = 'whatsapp-viewer-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<WhatsAppViewerDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<WhatsAppViewerDB>> {
    if (dbInstance) {
        return dbInstance;
    }

    dbInstance = await openDB<WhatsAppViewerDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Create chats store
            if (!db.objectStoreNames.contains('chats')) {
                const chatStore = db.createObjectStore('chats', { keyPath: 'id' });
                chatStore.createIndex('by-lastOpened', 'lastOpened');
            }

            // Create messages store
            if (!db.objectStoreNames.contains('messages')) {
                const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
                messageStore.createIndex('by-chatId', 'chatId');
                messageStore.createIndex('by-timestamp', 'timestamp');
                messageStore.createIndex('by-sender', 'sender');
            }

            // Create media store
            if (!db.objectStoreNames.contains('media')) {
                db.createObjectStore('media', { keyPath: 'messageId' });
            }
        },
    });

    return dbInstance;
}

// Chat operations
export async function saveChat(chat: Chat): Promise<void> {
    const db = await getDB();
    await db.put('chats', chat);
}

export async function getChat(chatId: string): Promise<Chat | undefined> {
    const db = await getDB();
    return db.get('chats', chatId);
}

export async function getAllChats(): Promise<Chat[]> {
    const db = await getDB();
    const chats = await db.getAll('chats');
    // Sort by created date (upload order), most recent first
    return chats.sort((a, b) => b.created - a.created);
}

export async function deleteChat(
    chatId: string,
    onProgress?: (deleted: number, total: number) => void
): Promise<void> {
    const db = await getDB();
    const BATCH_SIZE = 20000; // Delete 20k messages at a time

    // Helper to yield to UI thread
    const yieldToUI = () => new Promise<void>(resolve => setTimeout(resolve, 0));

    // First, delete the chat metadata
    await db.delete('chats', chatId);

    // Collect all message IDs for this chat first
    // This allows us to know the total count and batch the deletions
    const messageStore = db.transaction('messages', 'readonly').objectStore('messages');
    const messageIds: string[] = [];

    let cursor = await messageStore.index('by-chatId').openCursor(IDBKeyRange.only(chatId));
    while (cursor) {
        messageIds.push(cursor.value.id);
        cursor = await cursor.continue();
    }

    const total = messageIds.length;
    if (total === 0) return;

    // Report initial progress
    if (onProgress) {
        onProgress(0, total);
    }

    // Delete in batches to keep UI responsive
    for (let batchStart = 0; batchStart < messageIds.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, messageIds.length);
        const batch = messageIds.slice(batchStart, batchEnd);

        // Create a new transaction for each batch
        const tx = db.transaction(['messages', 'media'], 'readwrite');
        const msgStore = tx.objectStore('messages');
        const mediaStore = tx.objectStore('media');

        // Queue all deletes in this batch (no await on individual deletes)
        for (const msgId of batch) {
            msgStore.delete(msgId);
            mediaStore.delete(msgId);
        }

        // Wait for this batch to complete
        await tx.done;

        // Report progress after each batch
        if (onProgress) {
            onProgress(batchEnd, total);
        }

        // Yield to UI thread so progress bar can update
        await yieldToUI();
    }
}

// Message operations
export async function saveMessages(
    messages: Message[],
    chatId: string,
    onProgress?: (saved: number, total: number) => void
): Promise<void> {
    const db = await getDB();
    const total = messages.length;
    const CHUNK_SIZE = 1000; // Save 1000 messages per transaction for performance

    // Helper to yield to UI thread
    const yieldToUI = () => new Promise<void>(resolve => setTimeout(resolve, 0));

    // Process in chunks to allow UI updates
    for (let chunkStart = 0; chunkStart < messages.length; chunkStart += CHUNK_SIZE) {
        const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, messages.length);
        const chunk = messages.slice(chunkStart, chunkEnd);

        // Create a new transaction for each chunk
        const tx = db.transaction('messages', 'readwrite');

        for (const msg of chunk) {
            // Add chatId to each message
            tx.store.put({ ...msg, chatId } as StoredMessage);
        }

        await tx.done;

        // Report progress after each chunk
        if (onProgress) {
            onProgress(chunkEnd, total);
        }

        // Yield to UI thread so progress bar can update
        await yieldToUI();
    }
}

export async function getMessagesForChat(chatId: string): Promise<Message[]> {
    const db = await getDB();
    return db.getAllFromIndex('messages', 'by-chatId', chatId);
}

export async function getMessage(messageId: string): Promise<Message | undefined> {
    const db = await getDB();
    return db.get('messages', messageId);
}

// Media operations
export async function saveMedia(messageId: string, blob: Blob, fileName: string, type: string): Promise<void> {
    const db = await getDB();
    await db.put('media', { messageId, blob, fileName, type });
}

export async function getMedia(messageId: string): Promise<string | null> {
    const db = await getDB();
    const media = await db.get('media', messageId);

    if (media) {
        return URL.createObjectURL(media.blob);
    }

    return null;
}

export async function deleteMedia(messageId: string): Promise<void> {
    const db = await getDB();
    await db.delete('media', messageId);
}
