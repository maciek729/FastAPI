import { useEffect, useState, useRef } from "react";
import { LogOut } from "lucide-react";
import UserMenu from "./UserMenu";
import styles from "../../../css/layout/SidebarFooter.module.css";

const UserFooterCollapsed = ({ userData, handleLogout, onSettingsClick }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(null); // Stan na avatar
    const menuRef = useRef(null);

    const toggleMenu = () => setIsMenuOpen((prev) => !prev);

    const loadAvatar = () => {
        const localAvatar = localStorage.getItem('user_avatar');
        if (localAvatar) {
            setAvatarUrl(localAvatar);
        } else if (userData?.avatarUrl) {
            setAvatarUrl(userData.avatarUrl);
        } else {
            setAvatarUrl(null);
        }
    };

    useEffect(() => {
        loadAvatar();
        
        window.addEventListener("storage", loadAvatar);

        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("storage", loadAvatar);
        };
    }, [userData]);

    return (
        <>
            <div className={styles.userProfileWrapper} ref={menuRef}>
                <div
                    className={styles.userAvatarCollapsed}
                    onClick={toggleMenu}
                    title={userData?.username || "User"}
                >
                    {avatarUrl ? (
                        <img 
                            src={avatarUrl} 
                            alt="User" 
                            className={styles.userAvatarImg} 
                        />
                    ) : (
                        userData?.name?.charAt(0) || userData?.username?.charAt(0) || "U"
                    )}
                </div>

                {isMenuOpen && (
                    <UserMenu
                        isCollapsed
                        onSettingsClick={onSettingsClick}
                        onClose={() => setIsMenuOpen(false)}
                    />
                )}
            </div>

            <button className={styles.logoutBtnCollapsed} onClick={handleLogout} title="Wyloguj">
                <LogOut size={18} />
            </button>
        </>
    );
};

export default UserFooterCollapsed;