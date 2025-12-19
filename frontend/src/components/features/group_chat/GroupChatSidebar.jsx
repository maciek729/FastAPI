import React, { useState, useRef, useEffect } from 'react';
import { X, ArrowDownCircle } from "lucide-react";
import styles from "../../../css/features/groupchat/GroupChat.module.css";
import MessageList from "./MessageList";
import ChatInput from './ChatInput';

const GroupChatSidebar = ({ isOpen, onClose, width, onResizeStart, notebookId, userData, t, chatName, isShared }) => {
    const storageKey = `groupChat_autoScroll_${notebookId}`;

    const [autoScroll, setAutoScroll] = useState(() => {
        if (!notebookId) return true;
        const savedState = localStorage.getItem(storageKey);
        return savedState !== null ? JSON.parse(savedState) : true;
    });

    const [messages, setMessages] = useState([
        { id: 1, senderId: "2", senderName: "Ania", text: "Cześć wszystkim! Macie już notatki?", timestamp: "12:45", type: 'text' },
    ]);

    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        if (autoScroll) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    };

    useEffect(() => {
        if (notebookId) {
            localStorage.setItem(storageKey, JSON.stringify(autoScroll));
        }
    }, [autoScroll, notebookId, storageKey]);

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen, autoScroll]);

    if (!isOpen) return null;

    const handleSendMessage = (content, type = 'text') => {
        const newMessage = {
            id: Date.now(),
            senderId: userData.id,
            senderName: userData.name,
            text: content,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: type
        };

        setMessages([...messages, newMessage]);

        if (!autoScroll) {
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
    };

    return (
        <aside 
            className={styles.sideGroupChat} 
            style={{ width: `${width}px` }}
        >
            <div 
                className={styles.resizer} 
                onMouseDown={onResizeStart} 
            />

            <div className={styles.sideChatHeader}>
                <div className={styles.sideChatTitle}>
                    <span>{chatName}</span>
                </div>
                <div className={styles.headerActions}>
                    <button 
                        onClick={() => setAutoScroll(!autoScroll)}
                        className={`${styles.toggleScrollBtn} ${autoScroll ? styles.scrollActive : ""}`}
                        title={autoScroll ? t('Wyłącz auto-scroll') : t('Włącz auto-scroll')}
                    >
                        <ArrowDownCircle size={18} />
                    </button>

                    <button onClick={onClose} className={styles.sideChatCloseBtn}>
                        <X size={20} />
                    </button>
                </div>
            </div>
            
            <div className={styles.sideChatContent}>
                <MessageList 
                    messages={messages} 
                    currentUserId={userData.id} 
                />
                <div ref={messagesEndRef} />
            </div>
            <ChatInput onSendMessage={handleSendMessage} t={t} notebookId={notebookId} />
        </aside>
    );
};

export default GroupChatSidebar;