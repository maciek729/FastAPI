import React, { useState, useRef, useEffect } from 'react';
import { X, ArrowDownCircle, FileText, ClipboardCheck, Layers, Mic, Pin } from "lucide-react";
import styles from "../../../css/features/groupchat/GroupChat.module.css";
import MessageList from "./MessageList";
import ChatInput from './ChatInput';
import * as chatService from '../../../services/groupChatService';

const GroupChatSidebar = ({ 
    isOpen, 
    onClose, 
    width, 
    onResizeStart, 
    notebookId, 
    userData, 
    t, 
    chatName, 
    onNavigateToResource,
    highlightMessageId
}) => {
    const autoScrollObjKey = 'groupChat_autoscroll_states';

    const [members, setMembers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
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
    const [localScrollId, setLocalScrollId] = useState(null);
    const [pinnedMessage, setPinnedMessage] = useState(null);

    const fetchInitialData = async () => {
        if (!notebookId || !isOpen) return;
        setIsLoading(true);
        try {
            const [history, chatMembers, pinned] = await Promise.all([
                chatService.getChatHistory(notebookId).catch(() => []),
                chatService.getChatMembers(notebookId).catch(() => []),
                chatService.getPinnedMessage(notebookId).catch(() => null)
            ]);
            setMessages(history);
            setMembers([{ id: 'everyone', username: 'wszyscy' }, ...chatMembers]);
            setPinnedMessage(pinned);
        } catch (error) {
            console.error("Błąd inicjalizacji:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchResources = async () => {
        if (!notebookId) return;
        try {
            const data = await chatService.getAvailableResources(notebookId);
            setAvailableResources(data);
        } catch (error) {
            console.error("Błąd ładowania zasobów:", error);
        }
    };

    const handleSendMessage = (content, type = 'text') => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
                text: content,
                senderName: userData?.username || "Użytkownik",
                type: type
            }));
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

    const handleEditMessage = async (messageId, newText) => {
        if (!userData?.id) return;
        try {
            await chatService.editMessage(messageId, userData.id, newText);
        } catch (error) {
            console.error("Błąd edycji:", error);
            alert("Nie udało się edytować wiadomości.");
        }
    };

    useEffect(() => {
        if (isOpen) fetchInitialData();
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
                    if (pinnedMessage?.id === data.messageId) setPinnedMessage(null);
                } else if (data.type === 'message_edit') {
                    setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, text: data.newText, is_edited: true } : m));
                } else if (data.type === 'message_pin') {
                    setPinnedMessage(data.pinnedMessage);
                } else if (data.type === 'message_unpin') {
                    setPinnedMessage(null); 
                } else {
                    setMessages(prev => prev.find(m => m.id === data.id) ? prev : [...prev, data]);
                }
            };
            return () => { if (socketRef.current) socketRef.current.close(); };
        }
    }, [isOpen, notebookId, userData?.id]);

    useEffect(() => {
        if (isOpen && autoScroll && !highlightMessageId && !localScrollId) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isOpen, autoScroll, highlightMessageId, localScrollId]);

    if (!isOpen) return null;

    return (
        <aside className={styles.sideGroupChat} style={{ width: `${width}px` }}>
            <div className={styles.resizer} onMouseDown={onResizeStart} />

            <div className={styles.fixedTopSection}>
                <div className={styles.sideChatHeader}>
                    <div className={styles.sideChatTitle}><span>{chatName}</span></div>
                    <div className={styles.headerActions}>
                        <button 
                            onClick={() => setAutoScroll(!autoScroll)} 
                            data-tooltip={autoScroll ? t('group_chat.autoScrollOff') : t('group_chat.autoScrollOn')}
                            className={`${styles.toggleScrollBtn} ${autoScroll ? styles.scrollActive : ""}`}
                        >
                            <ArrowDownCircle size={18} />
                        </button>
                        <button onClick={onClose} className={styles.sideChatCloseBtn}><X size={20} /></button>
                    </div>
                </div>

                {pinnedMessage && (
                    <div className={styles.pinnedMessageBar} onClick={() => setLocalScrollId(pinnedMessage.id)}>
                        <Pin size={14} className={styles.pinIcon} />
                        <div className={styles.pinnedContent}>
                            <span className={styles.pinnedLabel}>Przypięte</span>
                            <p className={styles.pinnedText}>{pinnedMessage.text}</p>
                        </div>
                        <div className={styles.unpinAction} onClick={(e) => { 
                            e.stopPropagation();
                            chatService.unpinAllMessages(notebookId);
                        }}>
                            <X size={14} />
                        </div>
                    </div>
                )}
            </div>
            
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
                        {Object.values(availableResources).every(arr => arr.length === 0) && (
                            <div className={styles.noResources}>Brak materiałów w notatniku.</div>
                        )}
                    </div>
                </div>
            )}

            <div className={styles.sideChatContent}>
                {isLoading ? (
                    <div className={styles.loaderContainer}>Wczytywanie historii...</div>
                ) : messages.length === 0 ? (
                    <div className={styles.emptyChatContainer}>
                        <div className={styles.emptyChatIcon}>💬</div>
                        <h3 className={styles.emptyChatTitle}>{t('group_chat.emptyTitle')}</h3>
                        <p className={styles.emptyChatSubtitle}>{t('group_chat.emptySubtitle')}</p>
                    </div>
                ) : (
                    <MessageList 
                        messages={messages} 
                        currentUserId={userData?.id} 
                        onDelete={(id) => chatService.deleteMessage(id, userData?.id)}
                        onEdit={handleEditMessage}
                        onOpenResource={onNavigateToResource}
                        userData={userData}
                        highlightMessageId={highlightMessageId || localScrollId}
                        setHighlightMessageId={setLocalScrollId}
                        onPin={(id) => chatService.pinMessage(id, userData?.id)}
                        t={t}
                        notebookId={notebookId}
                    />
                )}
                <div ref={messagesEndRef} />
            </div>

            <ChatInput 
                onSendMessage={handleSendMessage} 
                t={t}
                members={members}
                onOpenResourcePicker={() => { 
                    fetchResources(); 
                    setIsResourcePickerOpen(true); 
                }}
            />
        </aside>
    );
};

export default GroupChatSidebar;