import React, { useState } from 'react';
import { Pencil, Trash2, X, Check, FileText, ClipboardCheck, Layers, Mic } from "lucide-react";
import styles from "../../../css/features/groupchat/MessageList.module.css";

const MessageList = ({ messages, currentUserId, onDelete, onEdit, onOpenResource }) => {
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState("");

    const formatText = (text) => {
        if (!text) return "";
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);
        return parts.map((part, index) => {
            if (/^https?:\/\//.test(part)) {
                return (
                    <a key={index} href={part} target="_blank" rel="noopener noreferrer" className={styles.messageLink}>
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    const handleStartEdit = (msg) => {
        setEditingId(msg.id);
        setEditText(msg.text);
    };

    const handleSaveEdit = (id) => {
        if (editText.trim()) {
            onEdit(id, editText);
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
                                 resource.itemType === 'flashcards' ? 'Fiszki' : 'Podcast'}
                            </span>
                        </div>
                        <p className={styles.resourceTitle}>{resource.itemTitle}</p>
                        <button 
                            className={styles.openResourceBtn} 
                            onClick={() => onOpenResource(resource)}
                        >
                            Otwórz zasób
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
            </div>
        );
    };

    return (
        <div className={styles.messagesContainer}>
            {messages.map((msg) => {
                const isMe = msg.senderId === currentUserId;
                const isEditing = editingId === msg.id;
                const isDeleted = msg.is_deleted || false;
                const isEdited = msg.is_edited || false;
                const isLong = msg.text && msg.text.length > 80;

                if (isDeleted) {
                    return (
                        <div key={msg.id} className={`${styles.messageWrapper} ${isMe ? styles.ownMessage : styles.otherMessage}`}>
                            {!isMe && <span className={styles.senderName}>{msg.senderName}</span>}
                            <div className={`${styles.bubble} ${styles.deletedBubble}`}>
                                <span className={styles.deletedText}>
                                    {isMe ? "Usunąłeś tę wiadomość" : "Wiadomość została usunięta"}
                                </span>
                                <span className={styles.messageTime}>{msg.timestamp}</span>
                            </div>
                        </div>
                    );
                }

                return (
                    <div key={msg.id} className={`${styles.messageWrapper} ${isMe ? styles.ownMessage : styles.otherMessage} ${isLong ? styles.isLong : ""}`}>
                        {!isMe && <span className={styles.senderName}>{msg.senderName}</span>}
                        <div className={styles.bubbleGroup}>
                            <div className={styles.bubble}>
                                {isEditing ? (
                                    <div className={styles.editForm}>
                                        <input 
                                            autoFocus 
                                            className={styles.editInput}
                                            value={editText} 
                                            onChange={(e) => setEditText(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(msg.id)}
                                        />
                                        <div className={styles.editActions}>
                                            <Check size={16} className={styles.saveIcon} onClick={() => handleSaveEdit(msg.id)} />
                                            <X size={16} className={styles.cancelIcon} onClick={() => setEditingId(null)} />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {renderMessageContent(msg)}
                                        {isEdited && msg.type === 'text' && <span className={styles.editedTag}> (edytowano)</span>}
                                    </>
                                )}
                                
                                <div className={styles.bubbleBottom}>
                                    {isMe && !isEditing && (
                                        <div className={styles.bubbleActions}>
                                            {msg.type === 'text' && (
                                                <button onClick={() => handleStartEdit(msg)} className={styles.smallActionBtn}>
                                                    <Pencil size={11} />
                                                </button>
                                            )}
                                            <button onClick={() => onDelete(msg.id)} className={styles.smallActionBtn}>
                                                <Trash2 size={11} />
                                            </button>
                                        </div>
                                    )}
                                    <span className={styles.messageTime}>{msg.timestamp}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default MessageList;