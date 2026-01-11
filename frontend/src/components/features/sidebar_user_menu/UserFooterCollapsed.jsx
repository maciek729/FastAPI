import { useEffect, useState, useRef } from "react";
import { LogOut } from "lucide-react";
import UserMenu from "./UserMenu";
import styles from "../../../css/layout/SidebarFooter.module.css";

const UserFooterCollapsed = ({ userData, handleLogout, onSettingsClick, onGoToSection, onExpandAndOpen }) => {

    const renderAvatarContent = () => {
        if (userData?.avatar_url) {
            return (
                <img 
                    src={userData.avatar_url} 
                    alt="User" 
                    className={styles.userAvatarImg} 
                />
            );
        }
        return userData?.username?.charAt(0).toUpperCase() || "U";
    };

    return (
        <>
            <div className={styles.userProfileWrapper}>
                <div
                    className={styles.userAvatarCollapsed}
                    onClick={onExpandAndOpen}
                    role="button"
                    tabIndex="0"
                    title={userData?.username || "User"}
                >
                    {renderAvatarContent()}
                </div>
            </div>

            <button 
                className={styles.logoutBtnCollapsed} 
                onClick={handleLogout} 
                title="Wyloguj"
            >
                <LogOut size={18} />
            </button>
        </>
    );
};

export default UserFooterCollapsed;