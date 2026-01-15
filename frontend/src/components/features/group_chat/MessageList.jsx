import React, { useState, useEffect, useRef, Fragment } from 'react';
import { Pencil, Trash2, X, Check, FileText, ClipboardCheck, Layers, Mic, Pin } from "lucide-react";
import styles from "../../../css/features/groupchat/MessageList.module.css";

const MessageList = ({ 
    messages, 
    currentUserId, 
    onDelete, 
    onEdit, 
    onPin, 
    onOpenResource, 
    userData, 
    highlightMessageId, 
    setHighlightMessageId, 
    t, 
    notebookId 
}) => {
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState("");
    const editRef = useRef(null);

    const adjustEditHeight = () => {
        const textarea = editRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
        }
    };

    const handleStartEdit = (msg) => {
        setEditingId(msg.id);
        setEditText(msg.text);
    };

    useEffect(() => {
        if (editingId) {
            adjustEditHeight();
            const timer = setTimeout(() => {
                const textarea = editRef.current;
                if (textarea) {
                    textarea.focus({ preventScroll: true });
                    const length = textarea.value.length;
                    textarea.setSelectionRange(length, length);
                }
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [editingId]);

    useEffect(() => {
        if (!highlightMessageId) return;

        let attempts = 0;
        const checkExist = setInterval(() => {
            const element = document.getElementById(`msg-${highlightMessageId}`);
            attempts++;

            if (element) {
                clearInterval(checkExist);
                element.scrollIntoView({ behavior: "smooth", block: "center" });
                element.classList.add(styles.jumpHighlight);
                
                setTimeout(() => {
                    element.classList.remove(styles.jumpHighlight);
                    setHighlightMessageId(null);
                }, 3000);
            }

            if (attempts > 20) {
                clearInterval(checkExist);
                setHighlightMessageId(null);
            }
        }, 100);

        return () => clearInterval(checkExist);
    }, [highlightMessageId, messages, setHighlightMessageId]);

    const formatDisplayTime = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        date.setHours(date.getHours() + 1);
        return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    };

    const formatSeparatorDate = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        date.setHours(date.getHours() + 1);
        return date.toLocaleDateString('pl-PL', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
        });
    };

    const formatText = (text) => {
        if (!text || typeof text !== 'string') return "";
        const regex = /(https?:\/\/[^\s]+|@\w+|@wszyscy)/g;
        const parts = text.split(regex);

        return parts.map((part, index) => {
            if (/^https?:\/\//.test(part)) {
                return (
                    <a key={index} href={part} target="_blank" rel="noopener noreferrer" className={styles.messageLink}>
                        {part}
                    </a>
                );
            }
            if (part.startsWith('@')) {
                return <span key={index} className={styles.mentionInText}>{part}</span>;
            }
            return part;
        });
    };

    const handleSaveEdit = (id) => {
        if (editText.trim()) {
            onEdit(id, editText);
            setEditingId(null);
        }
    };

    const handleKeyDown = (e, id) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSaveEdit(id);
        } else if (e.key === 'Escape') {
            setEditingId(null);
        }
    };

    const renderMessageContent = (msg) => {
        if (msg.type === 'resource_share') {
            try {
                const resource = JSON.parse(msg.text);
                return (
                    <div className={styles.resourceCard}>
                        <div className={styles.resourceHeader}>
                            {resource.itemType === 'note' && <FileText size={18} className={styles.noteIcon} />}
                            {resource.itemType === 'test' && <ClipboardCheck size={18} className={styles.testIcon} />}
                            {resource.itemType === 'flashcards' && <Layers size={18} className={styles.flashIcon} />}
                            {resource.itemType === 'podcast' && <Mic size={18} className={styles.podcastIcon} />}
                            <span className={styles.resourceLabel}>
                                {resource.itemType === 'note' ? 'Notatka' : 
                                 resource.itemType === 'test' ? 'Test' : 
                                 resource.itemType === 'flashcards' ? 'Fiszki' :
                                 resource.itemType === 'podcast' ? 'Podcasty': 'Zasób'}
                            </span>
                        </div>
                        <p className={styles.resourceTitle}>{resource.itemTitle}</p>
                        <button 
                            className={styles.openResourceBtn} 
                            onClick={() => onOpenResource(resource)}
                        >
                            {t('group_chat.openR')}
                        </button>
                    </div>
                );
            } catch (e) {
                return <span>{msg.text}</span>;
            }
        }
        
        return (
            <div className={styles.messageText}>
                {formatText(msg.text)}
                {msg.is_edited && <span className={styles.editedTag}> ({t('group_chat.edited') ||t('group_chat.edited')})</span>}
            </div>
        );
    };

    return (
        <div className={styles.messagesContainer}>
            {messages.map((msg, index) => {
                const isMe = msg.senderId === currentUserId;
                const isEditing = editingId === msg.id;
                const isDeleted = msg.is_deleted || false;

                const currentDate = msg.timestamp?.split('T')[0];
                const previousDate = index > 0 ? messages[index - 1].timestamp?.split('T')[0] : null;
                const isNewDay = currentDate !== previousDate;
                
                const isUserMentioned = msg.text && typeof msg.text === 'string' && (
                    (userData?.username && msg.text.includes(`@${userData.username}`)) || 
                    msg.text.includes(t('group_chat.all'))
                );

                if (isDeleted) {
                    return (
                        <div key={msg.id} className={`${styles.messageWrapper} ${isMe ? styles.ownMessage : styles.otherMessage}`}>
                            {!isMe && <span className={styles.senderName}>{msg.senderName}</span>}
                            <div className={`${styles.bubble} ${styles.deletedBubble}`}>
                                <span className={styles.deletedText}>
                                    {isMe ? t('group_chat.youDeleted') : t('group_chat.messageDeleted')}
                                </span>
                                <span className={styles.messageTime}>{formatDisplayTime(msg.timestamp)}</span>
                            </div>
                        </div>
                    );
                }

                return (
                    <Fragment key={msg.id}>
                        {isNewDay && (
                            <div className={styles.dateSeparator}>
                                <span>{formatSeparatorDate(msg.timestamp)}</span>
                            </div>
                        )}
                        <div 
                            key={msg.id}
                            id={`msg-${msg.id}`}
                            className={`
                                ${styles.messageWrapper} 
                                ${isMe ? styles.ownMessage : styles.otherMessage} 
                                ${isUserMentioned ? styles.mentionedWrapper : ""}
                            `}
                        >
                            {!isMe && <span className={styles.senderName}>{msg.senderName}</span>}
                            <div className={styles.bubbleGroup}>
                                <div className={`
                                    ${styles.bubble} 
                                    ${isUserMentioned ? styles.mentionedBubble : ""}
                                `}>
                                    {isEditing ? (
                                        <div className={styles.editForm}>
                                            <textarea 
                                                ref={editRef}
                                                className={styles.editInput}
                                                value={editText} 
                                                onChange={(e) => { setEditText(e.target.value); adjustEditHeight(); }}
                                                onKeyDown={(e) => handleKeyDown(e, msg.id)}
                                                rows="1"
                                            />
                                            <div className={styles.editActions}>
                                                <Check size={20} className={styles.saveIcon} onClick={() => handleSaveEdit(msg.id)}/>
                                                <X size={20} className={styles.cancelIcon} onClick={() => setEditingId(null)}/>
                                            </div>
                                        </div>
                                    ) : (
                                        renderMessageContent(msg)
                                    )}
                                    
                                    <div className={styles.bubbleBottom}>
                                        {!isEditing && (
                                            <div className={styles.bubbleActions}>
                                                {msg.type === 'text' && (
                                                    <button 
                                                        onClick={() => onPin(msg.id)} 
                                                        className={`${styles.smallActionBtn} ${styles.pinBtn}`} 
                                                        data-tooltip={t('group_chat.pin')}
                                                    >
                                                        <Pin size={10} style={{ transform: 'rotate(45deg)' }} />
                                                    </button>
                                                )}

                                                {isMe && (
                                                    <>
                                                        {msg.type === 'text' && (
                                                            <button 
                                                                onClick={() => handleStartEdit(msg)} 
                                                                className={`${styles.smallActionBtn} ${styles.editBtn}`}
                                                                data-tooltip={t('flashcardSetManager.editSet')}
                                                            >
                                                                <Pencil size={10} />
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => onDelete(msg.id)} 
                                                            className={`${styles.smallActionBtn} ${styles.deleteBtn}`}
                                                            data-tooltip={t('flashcardSetManager.delete')}
                                                        >
                                                            <Trash2 size={10} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        <span className={styles.messageTime}>{formatDisplayTime(msg.timestamp)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Fragment>
                );
            })}
        </div>
    );
};

export default MessageList;