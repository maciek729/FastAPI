import React from "react";
import { Settings, User, Palette, HelpCircle } from "lucide-react";
import styles from "../../../css/layout/Sidebar.module.css";

const UserMenu = ({ isCollapsed = false, onSettingsClick, onClose }) => {
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
            onClick: () => {
                console.log("Otwórz motywy");
                onClose();
            }
        },
        {
            id: 'settings',
            label: 'Ustawienia',
            icon: Settings,
            onClick: () => {
                onSettingsClick();
                onClose();
            }
        },
        {
            id: 'help',
            label: 'Pomoc',
            icon: HelpCircle,
            onClick: () => {
                console.log("Otwórz pomoc");
                onClose();
            }
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
                        onClick={item.onClick}
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