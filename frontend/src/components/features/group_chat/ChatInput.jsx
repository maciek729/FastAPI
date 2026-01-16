import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, Smile, Plus, FileText, X } from "lucide-react";
import styles from "../../../css/features/groupchat/ChatInput.module.css";
import EmojiPicker, { Theme } from 'emoji-picker-react';
import ENDPOINTS from '../../../api/endpoints';

const ChatInput = ({ onSendMessage, t, members, onOpenResourcePicker }) => {
    const [text, setText] = useState("");
    const [showMentions, setShowMentions] = useState(false);
    const [mentionFilter, setMentionFilter] = useState("");
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    
    const inputRef = useRef(null);
    const menuRef = useRef(null);

    const adjustHeight = () => {
        const textarea = inputRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            const scrollHeight = textarea.scrollHeight;
            textarea.style.height = `${Math.min(scrollHeight, 150)}px`;
        }
    };

    const handleTextChange = (e) => {
        const value = e.target.value;
        setText(value);
        adjustHeight();

        const cursorPos = e.target.selectionStart;
        const textBeforeCursor = value.slice(0, cursorPos);
        const words = textBeforeCursor.split(/\s/);
        const lastWord = words[words.length - 1];

        if (lastWord.startsWith('@')) {
            setMentionFilter(lastWord.slice(1).toLowerCase());
            setShowMentions(true);
        } else {
            setShowMentions(false);
        }
    };

    const onEmojiClick = (emojiData) => {
        const textarea = inputRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        const newText = text.substring(0, start) + emojiData.emoji + text.substring(end);
        setText(newText);

        setTimeout(() => {
            textarea.focus();
            const newPos = start + emojiData.emoji.length;
            textarea.setSelectionRange(newPos, newPos);
            adjustHeight();
        }, 0);
        
        setShowEmojiPicker(false);
    };

    const insertMention = (username) => {
        if (!inputRef.current) return;

        const cursorPos = inputRef.current.selectionStart;
        const textBefore = text.slice(0, cursorPos);
        const textAfter = text.slice(cursorPos);

        const words = textBefore.split(/\s/);
        words[words.length - 1] = `@${username} `; 

        const newText = words.join(' ') + textAfter;
        setText(newText);
        setShowMentions(false);
        
        setTimeout(() => {
            inputRef.current.focus();
            adjustHeight();
        }, 0);
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        if (text.trim()) {
            onSendMessage(text, 'text');
            setText("");
            setIsMenuOpen(false);
            setShowMentions(false);
            setShowEmojiPicker(false);
            if (inputRef.current) {
                inputRef.current.style.height = 'auto';
            }
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            if (showMentions) return;
            e.preventDefault();
            handleSubmit();
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
                setShowMentions(false);
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className={styles.inputArea} ref={menuRef}>
            {showMentions && (
                <div className={styles.mentionMenu}>
                    {members
                        .filter(m => m.username.toLowerCase().includes(mentionFilter))
                        .map(member => (
                            <div 
                                key={member.id} 
                                className={styles.mentionItem}
                                onClick={() => insertMention(member.username)}
                            >
                                <div className={styles.mentionAvatarWrapper}>
                                    {member.username === 'wszyscy' ? (
                                        <div className={styles.avatarAnnouncement}>📢</div>
                                    ) : member.avatar_url ? (
                                        <img 
                                            src={member.avatar_url} 
                                            alt={member.username}
                                            className={styles.avatarImage}
                                            onError={(e) => {
                                                // Jeśli obrazek nie zadziała, pokazujemy inicjał
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                    ) : null}
                                    
                                    {/* Fallback (widoczny gdy nie ma URL lub gdy obrazek rzuci błąd) */}
                                    {member.username !== 'wszyscy' && (
                                        <div 
                                            className={styles.avatarFallback} 
                                            style={{ display: member.avatar_url ? 'none' : 'flex' }}
                                        >
                                            {member.username[0].toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <span className={styles.mentionUsername}>
                                    {member.username}
                                </span>
                            </div>
                        ))
                    }
                </div>
            )}

            {showEmojiPicker && (
                <div className={styles.emojiPickerContainer}>
                    <EmojiPicker 
                        onEmojiClick={onEmojiClick}
                        autoFocusSearch={false}
                        theme={Theme.DARK}
                        width="100%"
                        height={350}
                    />
                </div>
            )}

            {isMenuOpen && (
                <div className={styles.attachmentMenu}>
                    <button 
                        type="button"
                        className={styles.menuItem} 
                        onClick={() => { setShowEmojiPicker(true); setIsMenuOpen(false); }}
                    >
                        <Smile size={18} />
                        <span>Emoji</span>
                    </button>
                    <button 
                        type="button"
                        className={styles.menuItem} 
                        onClick={() => { 
                            onOpenResourcePicker(); 
                            setIsMenuOpen(false); 
                        }}
                    >
                        <FileText size={18} />
                        <span>{t('group_chat.Resource')}</span>
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className={styles.inputWrapper}>
                <button 
                    type="button" 
                    className={`${styles.plusButton} ${isMenuOpen ? styles.plusActive : ""}`}
                    onClick={() => {
                        setIsMenuOpen(!isMenuOpen);
                        setShowEmojiPicker(false);
                    }}
                >
                    {isMenuOpen ? <X size={22} /> : <Plus size={22} />}
                </button>

                <textarea
                    ref={inputRef}
                    rows="1"
                    placeholder={t('group_chat.textPH')}
                    value={text}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                    className={styles.messageInput}
                    onFocus={() => {
                        setIsMenuOpen(false);
                        setShowEmojiPicker(false);
                    }}
                />

                <button 
                    type="submit" 
                    className={styles.sendButton}
                    disabled={!text.trim()}
                >
                    <SendHorizontal size={20} />
                </button>
            </form>
        </div>
    );
};

export default ChatInput;