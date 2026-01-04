import { useState } from 'react';
import { Chat } from '../types';
import { formatChatDate } from '../utils/dateFormatters';
import { AboutModal } from './AboutModal';
import './Sidebar.css';

interface SidebarProps {
    chats: Chat[];
    selectedChatId: string | null;
    onSelectChat: (chatId: string) => void;
    onDeleteChat: (chatId: string) => void;
    onImport: () => void;
}

export function Sidebar({ chats, selectedChatId, onSelectChat, onDeleteChat, onImport }: SidebarProps) {
    const [aboutOpen, setAboutOpen] = useState(false);

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-title-group">
                    <h1 className="sidebar-title">Chat Viewer</h1>
                    <button
                        className="btn-about"
                        onClick={() => setAboutOpen(true)}
                        aria-label="About"
                        title="About this app"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                        </svg>
                    </button>
                </div>
                <button
                    className="btn-import"
                    onClick={onImport}
                    aria-label="Import chat"
                    title="Import chat"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    </svg>
                </button>
            </div>

            <div className="chat-list">
                {chats.length === 0 ? (
                    <div className="chat-list-empty">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="empty-icon">
                            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
                        </svg>
                        <p>No chats imported yet</p>
                        <button className="btn-primary" onClick={onImport}>
                            Import Your First Chat
                        </button>
                    </div>
                ) : (
                    chats.map(chat => (
                        <div
                            key={chat.id}
                            className={`chat-item ${selectedChatId === chat.id ? 'active' : ''}`}
                            onClick={() => onSelectChat(chat.id)}
                        >
                            <div className="chat-item-avatar">
                                {chat.isGroup ? (
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                                    </svg>
                                ) : (
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                    </svg>
                                )}
                            </div>
                            <div className="chat-item-content">
                                <div className="chat-item-header">
                                    <h3 className="chat-item-name">{chat.name}</h3>
                                    <span className="chat-item-time">
                                        {formatChatDate(chat.lastMessageTimestamp || chat.created)}
                                    </span>
                                </div>
                                <div className="chat-item-footer">
                                    <p className="chat-item-preview">
                                        {chat.messageCount.toLocaleString()} messages
                                    </p>
                                </div>
                            </div>
                            <button
                                className="chat-item-delete"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteChat(chat.id);
                                }}
                                aria-label="Delete chat"
                                title="Delete chat"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                </svg>
                            </button>
                        </div>
                    ))
                )}
            </div>

            <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
        </div>
    );
}
