import React, { useState, useEffect } from "react";
import styles from "../../../../css/features/settings/Notifications.module.css";
import NotificationModal from "./NotificationModal";
import { Bell, BellOff, Trash2 } from "lucide-react";
import { useLanguage } from "../../../../translations/LanguageContext";
import translations from "../../../../translations/translation.json";
import * as notifService from "../../../../services/notificationService";

export default function NotificationView({ userData, onNavigateToResource }) {
    const { language } = useLanguage();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const t = (key, params = {}) => {
        const keys = key.split('.');
        let translation = translations[language];
        
        for (const k of keys) {
            translation = translation?.[k];
            if (!translation) return key;
        }

        if (typeof translation === 'string' && Object.keys(params).length > 0) {
            return translation.replace(/\{(\w+)\}/g, (match, paramName) => {
                return params[paramName] !== undefined ? params[paramName] : match;
            });
        }
        
        return translation || key;
    };

    useEffect(() => {
        if (userData?.id) {
            fetchNotifications();
        }
    }, [userData?.id]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const data = await notifService.getUserNotifications(userData.id);
            setNotifications(data);
        } catch (error) {
            console.error(t("notifications.downloadError"), error);
        } finally {
            setLoading(false);
        }
    };

    const handleNotificationClick = async (notification) => {
        try {
            if (!notification.is_read) {
                await notifService.markNotificationAsRead(notification.id);
                
                setNotifications(prev => prev.map(n => 
                    n.id === notification.id ? { ...n, is_read: true } : n
                ));
            }

            onNavigateToResource({
                type: notification.redirect_type,
                notebookId: notification.notebook_id,
                tab: notification.tab_target,
                targetId: notification.item_id
            });

        } catch (error) {
            console.error(t("notifications.clickError"), error);
            
            onNavigateToResource({
                type: notification.redirect_type,
                notebookId: notification.notebook_id,
                tab: notification.tab_target,
                targetId: notification.item_id
            });
        }
    };

    const handleDeleteNotification = async (id) => {
        try {
            await notifService.deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error(t("notifications.deleteError"), error);
        }
    };

    const handleClearAll = async () => {
        if (!window.confirm(t('notifications.confirmClear'))) return;
        try {
            await notifService.clearAllNotifications(userData.id);
            setNotifications([]);
        } catch (error) {
            console.error(t("notifications.clearError"), error);
        }
    };

    if (loading) return <div className={styles.loading}>{t('notifications.loading')}</div>;

    return (
        <div className={styles.notificationsMainContainer}>
            <div className={styles.titleContainer}>
                <div className={styles.titleWithIcon}>
                    <Bell size={24} className={styles.headerIcon} />
                    <h2 className={styles.title}>{t('notifications.title')}</h2>
                </div>
                {notifications.length > 0 && (
                    <button className={styles.clearAllBtn} onClick={handleClearAll}>
                        <Trash2 size={16} />
                        {t('notifications.clearAll')}
                    </button>
                )}
            </div>

            <div className={styles.sectionContainer}>
                {notifications.length > 0 ? (
                    notifications.map((notification) => (
                        <NotificationModal 
                            key={notification.id}
                            notification={notification}
                            onDelete={() => handleDeleteNotification(notification.id)}
                            onClick={() => handleNotificationClick(notification)}
                            t={t}
                        />
                    ))
                ) : (
                    <div className={styles.emptyState}>
                        <BellOff size={48} />
                        <p>{t('notifications.noNotifications')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}