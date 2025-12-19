import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, Smile, Image as ImageIcon, Plus } from "lucide-react";
import styles from "../../../css/features/groupchat/ChatInput.module.css";

const ChatInput = ({ onSendMessage, t }) => {
    const [text, setText] = useState("");
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (text.trim()) {
            onSendMessage(text, 'text');
            setText("");
            setShowEmojiPicker(false);
            setIsMenuOpen(false);
        }
    };

    const handleEmojiClick = (emojiData) => {
        setText(prev => prev + emojiData.emoji);
    };

    return (
        <div className={styles.inputArea} ref={menuRef}>
            {isMenuOpen && (
                <div className={styles.attachmentMenu}>
                    <button 
                        className={styles.menuItem} 
                        onClick={() => { setIsMenuOpen(false); }}
                    >
                        <Smile size={18} />
                        <span>Emoji</span>
                    </button>
                    <button 
                        className={styles.menuItem} 
                        onClick={() => { console.log("Otwórz GIF"); setIsMenuOpen(false); }}
                    >
                        <ImageIcon size={18} />
                        <span>GIF</span>
                    </button>
                </div>
            )}

            {showEmojiPicker && (
                <div className={styles.emojiPickerContainer}>
                    <EmojiPicker 
                        onEmojiClick={handleEmojiClick}
                        width="100%"
                        height={350}
                    />
                </div>
            )}

            <form onSubmit={handleSubmit} className={styles.inputWrapper}>
                <button 
                    type="button" 
                    className={`${styles.plusButton} ${isMenuOpen ? styles.plusActive : ""}`}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    <Plus size={22} />
                </button>

                <input 
                    type="text"
                    placeholder={t('Wpisz wiadomość...')}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className={styles.messageInput}
                    onFocus={() => { setIsMenuOpen(false); setShowEmojiPicker(false); }}
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