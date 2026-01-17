import React, { useContext, useEffect, useState } from "react";
import { Settings, User, Palette, HelpCircle, Bell } from "lucide-react";
import styles from "../../../css/layout/SidebarFooter.module.css";
import { LanguageContext } from "../../../translations/LanguageContext";
import translations from "../../../translations/translation.json";
import * as notifService from "../../../services/notificationService";

const UserMenu = ({ isCollapsed = false, onGoToSection, onClose, userData, isMobile, onCloseMobileMenu }) => {
    const { language } = useContext(LanguageContext);
    const [hasUnread, setHasUnread] = useState(false);

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

    const handleMenuClick = (id) => {
        if (onGoToSection) {
            onGoToSection(id);
        }
        onClose();
        if (isMobile && onCloseMobileMenu) {
            onCloseMobileMenu();
        }
    }

    const menuItems = [
        {
            id: 'user_settings',
            label: t('userMenu.profile'),
            icon: User
        },
        {
            id: 'settings',
            label: t('userMenu.settings'),
            icon: Settings,
        },
        {
            id: 'notifications',
            label: t('userMenu.notifications'),
            icon: Bell,
        },
        {
            id: 'help',
            label: t('userMenu.help'),
            icon: HelpCircle,
        }
    ];

    useEffect(() => {
        const checkNotifications = async () => {
            if (userData?.id) {
                try {
                    const data = await notifService.getUserNotifications(userData.id);
                    const unreadExists = data.some(n => !n.is_read);
                    setHasUnread(unreadExists);
                } catch (error) {
                }
            }
        };

        checkNotifications();
    }, [userData?.id]);

    return (
        <div className={isCollapsed ? styles.userMenuCollapsed : styles.userMenu}>
            {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                    <button
                        key={item.id}
                        className={styles.menuItem}
                        onClick={() => handleMenuClick(item.id)}
                    >
                        <div className={styles.iconContainer}>
                            <Icon size={16} />
                            {item.id === 'notifications' && hasUnread && (
                                <span className={styles.notificationBadge} />
                            )}
                        </div>
                        <span>{item.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default UserMenu;