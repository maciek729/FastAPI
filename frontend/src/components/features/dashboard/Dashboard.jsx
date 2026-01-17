import React, { useState, useEffect, useContext } from 'react';
import { Bell, Clock } from 'lucide-react';
import styles from "../../../css/features/Dashboard.module.css";
import { LanguageContext } from "../../../translations/LanguageContext";
import translations from "../../../translations/translation.json";
import * as notifService from "../../../services/notificationService";
import NotificationModal from '../settings/notifications/NotificationModal';

export default function Dashboard({ userData, onNavigateToResource }) {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { language } = useContext(LanguageContext);

  const t = (key, params = {}) => {
    const keys = key.split('.');
    let translation = translations[language];
    
    for (const k of keys) {
      translation = translation?.[k];
      if (!translation) return key;
    }
    
    if (typeof translation === 'string' && Object.keys(params).length > 0) {
      return translation.replace(/\{(\w+)\}/g, (match, key) => {
        return params[key] || match;
      });
    }
    
    return translation || key;
  };

  useEffect(() => {
    if (userData) {
      fetchNotifications();
    }
  }, [userData]);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const data = await notifService.getUserNotifications(userData.id);
      setNotifications(data.slice(0, 5));
    } catch {
    } finally {
      setIsLoading(false);
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

      if (onNavigateToResource) {
        onNavigateToResource({
          type: notification.redirect_type,
          notebookId: notification.notebook_id,
          tab: notification.tab_target,
          targetId: notification.item_id
        });
      }

    } catch (error) {
      if (onNavigateToResource) {
        onNavigateToResource({
          type: notification.redirect_type,
          notebookId: notification.notebook_id,
          tab: notification.tab_target,
          targetId: notification.item_id
        });
      }
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await notifService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch {
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greetings.morning');
    if (hour < 18) return t('dashboard.greetings.afternoon');
    return t('dashboard.greetings.evening');
  };

  const formatNotificationTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('dashboard.timeFormats.now');
    if (diffMins < 60) return t('dashboard.timeFormats.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('dashboard.timeFormats.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('dashboard.timeFormats.daysAgo', { count: diffDays });
    return date.toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-US');
  };

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.contentWrapper}>
        <div className={styles.welcomeSection}>
          <h1 className={styles.greeting}>
            {getGreeting()}, <span className={styles.gradientText}>{userData?.username}</span>! 👋
          </h1>
          <p className={styles.subtitle}>{t('dashboard.readyToStudy')}</p>
          <p className={styles.description}>{t('dashboard.startLearning')}</p>
        </div>

        <div className={styles.notificationsSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleWrapper}>
              <Bell className={styles.sectionIcon} size={24} />
              <h2 className={styles.sectionTitle}>{t('dashboard.recentNotifications')}</h2>
            </div>
          </div>

          <div className={styles.notificationsList}>
            {isLoading ? (
              <div className={styles.loading}>{t('notifications.loading')}</div>
            ) : notifications.length === 0 ? (
              <div className={styles.emptyNotifications}>
                <Bell size={32} className={styles.emptyIcon} />
                <p>{t('dashboard.noNotifications')}</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationModal 
                  key={notification.id}
                  notification={notification}
                  onDelete={() => handleDeleteNotification(notification.id)}
                  onClick={() => handleNotificationClick(notification)}
                  t={t}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}