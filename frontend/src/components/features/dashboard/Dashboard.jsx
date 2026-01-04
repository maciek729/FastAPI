import React, { useState, useEffect, useContext } from 'react';
import { Bell, Clock } from 'lucide-react';
import styles from "../../../css/features/Dashboard.module.css";
import { LanguageContext } from "../../../translations/LanguageContext";
import translations from "../../../translations/translation.json";
import ENDPOINTS from '../../../api/endpoints';

export default function Dashboard({ userData }) {
  const [notifications, setNotifications] = useState([]);
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
      const response = await fetch(ENDPOINTS.NOTIFICATIONS.LIST(userData.id), {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.slice(0, 5)); // Get last 5 notifications
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
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
      {/* Main Content */}
      <div className={styles.contentWrapper}>
        {/* Left Side - Welcome Section */}
        <div className={styles.welcomeSection}>
          <h1 className={styles.greeting}>
            {getGreeting()}, <span className={styles.gradientText}>{userData?.username}</span>! 👋
          </h1>
          <p className={styles.subtitle}>
            {t('dashboard.readyToStudy')}
          </p>
          <p className={styles.description}>
            {t('dashboard.startLearning')}
          </p>
        </div>

        {/* Right Side - Notifications Section */}
        <div className={styles.notificationsSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleWrapper}>
              <Bell className={styles.sectionIcon} size={24} />
              <h2 className={styles.sectionTitle}>{t('dashboard.recentNotifications')}</h2>
            </div>
          </div>

          <div className={styles.notificationsList}>
            {notifications.length === 0 ? (
              <div className={styles.emptyNotifications}>
                <Bell size={32} className={styles.emptyIcon} />
                <p>{t('dashboard.noNotifications')}</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className={styles.notificationItem}>
                  <div className={styles.notifIcon}>
                    <Bell size={18} />
                  </div>
                  <div className={styles.notifContent}>
                    <p className={styles.notifMessage}>{notif.message}</p>
                    <div className={styles.notifMeta}>
                      <Clock size={14} />
                      <span>{formatNotificationTime(notif.created_at)}</span>
                    </div>
                  </div>
                  {!notif.is_read && <div className={styles.unreadDot}></div>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}