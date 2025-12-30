import React from 'react';
import { X, MessageSquare, AtSign, Share2, Clock, Settings, Bell } from 'lucide-react';
import styles from "../../../../css/features/settings/Notifications.module.css";

export default function NotificationModal({ notification, onDelete, onClick, t }) {
    
    const getIcon = () => {
        if (notification.type === 'mention') return <AtSign size={18} />;
        if (notification.type === 'resource_share') return <Share2 size={18} />;
        
        switch (notification.redirect_type) {
            case 'settings': return <Settings size={18} />;
            case 'notebook': return <MessageSquare size={18} />;
            default: return <Bell size={18} />;
        }
    };

    const formatTimestamp = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString(undefined, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div 
            className={`${styles.notificationCard} ${!notification.is_read ? styles.unread : ''}`}
            onClick={onClick}
        >
            <div className={styles.iconWrapper}>
                {getIcon()}
            </div>

            <div className={styles.contentWrapper}>
                <div className={styles.notificationHeader}>
                    <span className={styles.senderName}>{notification.sender_name || "System"}</span>
                    <span className={styles.timeWrapper}>
                        <Clock size={12} />
                        {formatTimestamp(notification.created_at)}
                    </span>
                </div>
                <p className={styles.notificationText}>{t('notifications.mention', { username: notification.content })}</p>
            </div>

            <button 
                className={styles.deleteBtn} 
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
            >
                <X size={18} />
            </button>
        </div>
    );
}