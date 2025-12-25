import React, { useState, useRef, useEffect } from 'react';
import { X, ArrowDownCircle, FileText, ClipboardCheck, Layers, Mic } from "lucide-react";
import styles from "../../../css/features/groupchat/GroupChat.module.css";
import MessageList from "./MessageList";
import ChatInput from './ChatInput';

const GroupChatSidebar = ({ isOpen, onClose, width, onResizeStart, notebookId, userData, t, chatName, onNavigateToResource }) => {
    const autoScrollObjKey = 'groupChat_autoscroll_states';
    const API_BASE_URL = "http://localhost:8000";

    const [messages, setMessages] = useState([]);
    const [isResourcePickerOpen, setIsResourcePickerOpen] = useState(false);
    const [availableResources, setAvailableResources] = useState({ 
        notes: [], 
        tests: [], 
        flashcards: [],
        podcasts: [] 
    });

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

    const fetchResources = async () => {
        if (!notebookId) return;
        try {
            const [notesRes, testsRes, flashcardsRes, podcastsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/group-chat/notes/notebook/${notebookId}`),
                fetch(`${API_BASE_URL}/group-chat/tests/notebook/${notebookId}`),
                fetch(`${API_BASE_URL}/group-chat/flashcards/notebook/${notebookId}`),
                fetch(`${API_BASE_URL}/group-chat/podcasts/notebook/${notebookId}`)
            ]);
            
            setAvailableResources({
                notes: await notesRes.json(),
                tests: await testsRes.json(),
                flashcards: await flashcardsRes.json(),
                podcasts: await podcastsRes.json()
            });
        } catch (error) {
            console.error("Błąd ładowania zasobów:", error);
        }
    };

    const handleShareResource = (item, type) => {
        const resourceData = JSON.stringify({
            itemId: item.id,
            itemTitle: item.title || item.name,
            itemType: type
        });
        handleSendMessage(resourceData, 'resource_share');
        setIsResourcePickerOpen(false);
    };

    useEffect(() => {
        const fetchHistory = async () => {
            if (isOpen && notebookId) {
                try {
                    const response = await fetch(`${API_BASE_URL}/group-chat/${notebookId}/history`);
                    const data = await response.json();
                    setMessages(Array.isArray(data) ? data : data.messages || []);
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
                const data = JSON.parse(event.data);
                if (data.type === 'message_delete') {
                    setMessages(prev => prev.filter(m => m.id !== data.messageId));
                } else if (data.type === 'message_edit') {
                    setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, text: data.newText, is_edited: true } : m));
                } else {
                    setMessages((prev) => {
                        if (prev.find(m => m.id === data.id)) return prev;
                        return [...prev, data];
                    });
                }
            };
            return () => { if (socketRef.current) socketRef.current.close(); };
        }
    }, [isOpen, notebookId, userData?.id]);

    const handleSendMessage = (content, type = 'text') => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
                text: content,
                senderName: userData.username || userData.name || "Użytkownik",
                type: type
            }));
        }
    };

    const handleDeleteMessage = async (messageId) => {
        try {
            await fetch(`${API_BASE_URL}/group-chat/message/${messageId}?user_id=${userData.id}`, { method: 'DELETE' });
        } catch (error) { console.error(error); }
    };

    const handleEditMessage = async (messageId, newText) => {
        try {
            await fetch(`${API_BASE_URL}/group-chat/message/${messageId}?user_id=${userData.id}&new_content=${encodeURIComponent(newText)}`, { method: 'PATCH' });
        } catch (error) { console.error(error); }
    };

    useEffect(() => {
        if (isOpen && autoScroll) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isOpen, autoScroll]);

    useEffect(() => {
        if (notebookId) {
            const saved = localStorage.getItem(autoScrollObjKey);
            const states = saved ? JSON.parse(saved) : {};
            states[notebookId] = autoScroll;
            localStorage.setItem(autoScrollObjKey, JSON.stringify(states));
        }
    }, [autoScroll, notebookId]);

    if (!isOpen) return null;

    return (
        <aside className={styles.sideGroupChat} style={{ width: `${width}px` }}>
            <div className={styles.resizer} onMouseDown={onResizeStart} />

            <div className={styles.sideChatHeader}>
                <div className={styles.sideChatTitle}><span>{chatName}</span></div>
                <div className={styles.headerActions}>
                    <button onClick={() => setAutoScroll(!autoScroll)} className={`${styles.toggleScrollBtn} ${autoScroll ? styles.scrollActive : ""}`}>
                        <ArrowDownCircle size={18} />
                    </button>
                    <button onClick={onClose} className={styles.sideChatCloseBtn}><X size={20} /></button>
                </div>
            </div>
            
            <div className={styles.sideChatContent}>
                {isResourcePickerOpen && (
                    <div className={styles.resourcePickerOverlay}>
                        <div className={styles.resourcePickerHeader}>
                            <span>Udostępnij materiały</span>
                            <X size={18} className={styles.closePicker} onClick={() => setIsResourcePickerOpen(false)} />
                        </div>
                        <div className={styles.resourcePickerList}>
                            {availableResources.notes.length > 0 && <h4>Notatki</h4>}
                            {availableResources.notes.map(note => (
                                <div key={note.id} className={styles.resourceItem} onClick={() => handleShareResource(note, 'note')}>
                                    <FileText size={16} /> <span>{note.title}</span>
                                </div>
                            ))}
                            {availableResources.tests.length > 0 && <h4>Testy</h4>}
                            {availableResources.tests.map(test => (
                                <div key={test.id} className={styles.resourceItem} onClick={() => handleShareResource(test, 'test')}>
                                    <ClipboardCheck size={16} /> <span>{test.title}</span>
                                </div>
                            ))}
                            {availableResources.flashcards.length > 0 && <h4>Fiszki</h4>}
                            {availableResources.flashcards.map(set => (
                                <div key={set.id} className={styles.resourceItem} onClick={() => handleShareResource(set, 'flashcards')}>
                                    <Layers size={16} /> <span>{set.title}</span>
                                </div>
                            ))}
                            {availableResources.podcasts.length > 0 && <h4>Podcasty</h4>}
                            {availableResources.podcasts.map(podcast => (
                                <div key={podcast.id} className={styles.resourceItem} onClick={() => handleShareResource(podcast, 'podcast')}>
                                    <Mic size={16} /> <span>{podcast.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <MessageList 
                    messages={messages} 
                    currentUserId={userData.id} 
                    onDelete={handleDeleteMessage}
                    onEdit={handleEditMessage}
                    // WYWOŁUJEMY PRZEKIEROWANIE ZAMIAST MODALA
                    onOpenResource={onNavigateToResource} 
                />
                <div ref={messagesEndRef} />
            </div>

            <ChatInput 
                onSendMessage={handleSendMessage} 
                t={t} 
                onOpenResourcePicker={() => { fetchResources(); setIsResourcePickerOpen(true); }}
            />
        </aside>
    );
};

export default GroupChatSidebar;