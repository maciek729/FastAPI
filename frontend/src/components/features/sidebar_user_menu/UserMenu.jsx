import React from "react";
import { Settings, User, Palette, HelpCircle, Bell} from "lucide-react";
import styles from "../../../css/layout/Sidebar.module.css";

const UserMenu = ({ isCollapsed = false, onGoToSection, onClose }) => {

    const handleMenuClick = (id) => {
        if (onGoToSection) {
            onGoToSection(id);
        }
        onClose();
    }

    const menuItems = [
        {
            id: 'profile',
            label: 'Profil',
            icon: User,
            onClick: () => {
                console.log("Otwórz profil");
                onClose();
            }
        },
        {
            id: 'themes',
            label: 'Motywy',
            icon: Palette,
        },
        {
            id: 'settings',
            label: 'Ustawienia',
            icon: Settings,
        },
        {
            id: 'notifications',
            label: 'Powiadomienia',
            icon: Bell,
        },
        {
            id: 'help',
            label: 'Pomoc',
            icon: HelpCircle,
        }
    ];

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
                        <Icon size={16} />
                        <span>{item.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default UserMenu;