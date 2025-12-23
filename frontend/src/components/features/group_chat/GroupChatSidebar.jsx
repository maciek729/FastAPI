import React, { useState, useRef, useEffect } from 'react';
import { X, ArrowDownCircle } from "lucide-react";
import styles from "../../../css/features/groupchat/GroupChat.module.css";
import MessageList from "./MessageList";
import ChatInput from './ChatInput';

const GroupChatSidebar = ({ isOpen, onClose, width, onResizeStart, notebookId, userData, t, chatName }) => {
    const autoScrollObjKey = 'groupChat_autoscroll_states';

    const [messages, setMessages] = useState([]);
    
    const [autoScroll, setAutoScroll] = useState(() => {
        if (!notebookId) return true;
        const saved = localStorage.getItem(autoScrollObjKey);
        if (saved) {
            const states = JSON.parse(saved);
            return states[notebookId] !== undefined ? states[notebookId] : true;
        }
        return true;
    });

    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const fetchHistory = async () => {
            if (isOpen && notebookId) {
                try {
                    const response = await fetch(`http://localhost:8000/group-chat/${notebookId}/history`);
                    const data = await response.json();
                    setMessages(data);
                } catch (error) {
                    console.error("Błąd pobierania historii:", error);
                }
            }
        };

        fetchHistory();
    }, [isOpen, notebookId]);

    useEffect(() => {
        if (isOpen && notebookId && userData?.id) {
            const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
            const wsUrl = `${protocol}://localhost:8000/group-chat/ws/${notebookId}/${userData.id}`;
            
            socketRef.current = new WebSocket(wsUrl);

            socketRef.current.onmessage = (event) => {
                const newMessage = JSON.parse(event.data);
                setMessages((prev) => {
                    if (prev.find(m => m.id === newMessage.id)) return prev;
                    return [...prev, newMessage];
                });
            };

            return () => {
                if (socketRef.current) {
                    socketRef.current.close();
                }
            };
        }
    }, [isOpen, notebookId, userData?.id]);

    const scrollToBottom = () => {
        if (autoScroll && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    };

    useEffect(() => {
        if (notebookId) {
            const saved = localStorage.getItem(autoScrollObjKey);
            const states = saved ? JSON.parse(saved) : {};
            states[notebookId] = autoScroll;
            localStorage.setItem(autoScrollObjKey, JSON.stringify(states));
        }
    }, [autoScroll, notebookId]);

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen, autoScroll]);

    const handleSendMessage = (content, type = 'text') => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            const payload = {
                text: content,
                senderName: userData.username || userData.name || "Użytkownik",
                type: type
            };

            socketRef.current.send(JSON.stringify(payload));
        }
    };

    if (!isOpen) return null;

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