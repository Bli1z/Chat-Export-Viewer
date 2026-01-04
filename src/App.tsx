import { useState, useEffect } from 'react';
import { useChats } from './hooks/useChats';
import { useMessages } from './hooks/useMessages';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { ImportModal } from './components/ImportModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { DisclaimerBanner } from './components/DisclaimerBanner';
import * as storage from './services/storage';
import './App.css';

function App() {
    const { chats, loadChats, deleteChat, updateChatLastOpened } = useChats();
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [deleteModalChatId, setDeleteModalChatId] = useState<string | null>(null);

    const { messages, loading } = useMessages(selectedChatId);
    const selectedChat = chats.find(c => c.id === selectedChatId);
    const chatToDelete = deleteModalChatId ? chats.find(c => c.id === deleteModalChatId) : null;

    const handleSelectChat = (chatId: string) => {
        setSelectedChatId(chatId);
        updateChatLastOpened(chatId);
    };

    // Open delete confirmation modal instead of native confirm()
    const handleDeleteChat = (chatId: string) => {
        setDeleteModalChatId(chatId);
    };

    // Actually perform the deletion with progress tracking
    const confirmDeleteChat = async (onProgress: (deleted: number, total: number) => void) => {
        if (!deleteModalChatId) return;
        await deleteChat(deleteModalChatId, onProgress);
        if (selectedChatId === deleteModalChatId) {
            setSelectedChatId(null);
        }
        setDeleteModalChatId(null);
    };

    const handleImportSuccess = () => {
        loadChats();
    };

    const handleViewAsChange = async (viewAs: string | undefined) => {
        if (!selectedChat) return;

        // Update the chat object with new POV
        const updatedChat = {
            ...selectedChat,
            currentViewAs: viewAs,
        };

        // Persist to storage
        await storage.saveChat(updatedChat);

        // Reload chats to reflect the change
        await loadChats();
    };

    // Handle window resize
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const showChatView = selectedChatId && selectedChat;
    const showSidebar = !isMobile || !showChatView;
    const showChat = !isMobile || showChatView;

    return (
        <div className="app">
            <div className="app-layout">
                {showSidebar && (
                    <div className="app-sidebar">
                        <Sidebar
                            chats={chats}
                            selectedChatId={selectedChatId}
                            onSelectChat={handleSelectChat}
                            onDeleteChat={handleDeleteChat}
                            onImport={() => setImportModalOpen(true)}
                        />
                    </div>
                )}

                {showChat && (
                    <div className="app-chat">
                        {selectedChat ? (
                            <ChatView
                                chatName={selectedChat.name}
                                isGroup={selectedChat.isGroup}
                                messages={messages}
                                loading={loading}
                                currentViewAs={selectedChat.currentViewAs}
                                onViewAsChange={handleViewAsChange}
                                onBack={isMobile ? () => setSelectedChatId(null) : undefined}
                            />
                        ) : (
                            <div className="app-empty">
                                <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
                                </svg>
                                <h2>Select a chat to view</h2>
                                <p>Choose a chat from the sidebar to see the messages</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <ImportModal
                isOpen={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                onSuccess={handleImportSuccess}
            />

            <DeleteConfirmModal
                isOpen={!!chatToDelete}
                chatName={chatToDelete?.name || ''}
                messageCount={chatToDelete?.messageCount || 0}
                onConfirm={confirmDeleteChat}
                onCancel={() => setDeleteModalChatId(null)}
            />

            <DisclaimerBanner />
        </div>
    );
}

export default App;
