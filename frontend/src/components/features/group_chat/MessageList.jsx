import React from 'react';
import styles from "../../../css/features/groupchat/MessageList.module.css";

const MessageList = ({ messages, currentUserId }) => {

    const formatText = (text) => {
        if (!text) return "";

        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);

        return parts.map((part, index) => {
            if (/^https?:\/\//.test(part)) {
                return (
                    <a 
                        key={index} 
                        href={part} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className={styles.messageLink}
                    >
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    return (
        <div className={styles.messagesContainer}>
            {messages.map((msg) => {
                const isMe = msg.senderId === currentUserId;

                return (
                    <div 
                        key={msg.id} 
                        className={`${styles.messageWrapper} ${isMe ? styles.ownMessage : styles.otherMessage}`}
                    >
                        {!isMe && <span className={styles.senderName}>{msg.senderName}</span>}
                        
                        <div className={styles.bubble}>
                            {/* Używamy div zamiast p, jeśli formatText zwraca skomplikowaną strukturę */}
                            <div className={styles.messageText}>
                                {formatText(msg.text)}
                            </div>
                            <span className={styles.messageTime}>{msg.timestamp}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default MessageList;