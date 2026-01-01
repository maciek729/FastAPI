import { useEffect, useState, useRef } from "react";
import { LogOut } from "lucide-react";
import UserMenu from "./UserMenu";
import styles from "../../../css/layout/SidebarFooter.module.css";

const UserFooterCollapsed = ({ userData, handleLogout, onSettingsClick, onGoToSection }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    const toggleMenu = () => setIsMenuOpen((prev) => !prev);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

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
            <div className={styles.userProfileWrapper} ref={menuRef}>
                <div
                    className={styles.userAvatarCollapsed}
                    onClick={toggleMenu}
                    role="button"
                    tabIndex="0"
                    title={userData?.username || "User"}
                >
                    {renderAvatarContent()}
                </div>

                {isMenuOpen && (
                    <UserMenu
                        isCollapsed
                        onGoToSection={onGoToSection}
                        onSettingsClick={onSettingsClick}
                        onClose={() => setIsMenuOpen(false)}
                    />
                )}
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