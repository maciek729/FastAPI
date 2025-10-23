import React from "react";
import { Settings } from "lucide-react";
import styles from "../../css/layout/Sidebar.module.css";

const UserMenu = ({ isCollapsed = false, onSettingsClick, onClose }) => {
    return (
        <div className={isCollapsed ? styles.userMenuCollapsed : styles.userMenu}>
            <button
                className={styles.menuItem}
                onClick={() => {
                    onSettingsClick();
                    onClose();
                }}
            >
                <Settings size={16} />
                <span>Ustawienia</span>
            </button>
        </div>
    );
};

export default UserMenu;
