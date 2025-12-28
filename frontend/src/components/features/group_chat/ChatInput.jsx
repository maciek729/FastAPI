import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, Smile, Image as ImageIcon, Plus, FileText } from "lucide-react";
import styles from "../../../css/features/groupchat/ChatInput.module.css";

const ChatInput = ({ onSendMessage, t, onOpenResourcePicker }) => {
    const [text, setText] = useState("");
    const [isMenuOpen, setIsMenuOpen] = useState(false);
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
            setIsMenuOpen(false);
        }
    };

    return (
        <div className={styles.inputArea} ref={menuRef}>
            {isMenuOpen && (
                <div className={styles.attachmentMenu}>
                    <button 
                        type="button"
                        className={styles.menuItem} 
                        onClick={() => { console.log("Emoji"); setIsMenuOpen(false); }}
                    >
                        <Smile size={18} />
                        <span>Emoji</span>
                    </button>
                    <button 
                        type="button"
                        className={styles.menuItem} 
                        onClick={() => { console.log("GIF"); setIsMenuOpen(false); }}
                    >
                        <ImageIcon size={18} />
                        <span>GIF</span>
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
                        <span>Zasób</span>
                    </button>
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
                    onFocus={() => setIsMenuOpen(false)}
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