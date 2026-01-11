import { useEffect, useState, useRef, useContext } from "react";
import { LogOut } from "lucide-react";
import UserMenu from "./UserMenu";
import styles from "../../../css/layout/SidebarFooter.module.css";
import { LanguageContext } from "../../../translations/LanguageContext";
import translations from "../../../translations/translation.json";

const UserFooter = ({ userData, handleLogout, onSettingsClick, onGoToSection, isUserMenuOpen, setIsUserMenuOpen }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);
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

    useEffect(() => {
        if (isUserMenuOpen) {
            setIsMenuOpen(true);
            setIsUserMenuOpen(false);
        }
    }, [isUserMenuOpen, setIsUserMenuOpen]);

    const renderAvatarContent = () => {
        if (userData?.avatar_url) {
            return (
                <img 
                    src={userData.avatar_url} 
                    alt="User Avatar" 
                    className={styles.userAvatarImg} 
                />
            );
        }
        return userData?.username?.charAt(0).toUpperCase() || "U";
    };

    return (
        <>
            <div className={styles.userProfileWrapper} ref={menuRef}>
                <div className={styles.userProfile} onClick={toggleMenu}>
                    <div className={styles.userAvatar}>
                        {renderAvatarContent()}
                    </div>
                    <div className={styles.userInfo}>
                        <div className={styles.userName}>{userData?.username || "User"}</div>
                    </div>
                </div>

                {isMenuOpen && (
                    <UserMenu
                        onGoToSection={onGoToSection}
                        onClose={() => setIsMenuOpen(false)}
                        userData={userData}
                    />
                )}
            </div>

            <button 
                className={styles.logoutBtn} 
                onClick={handleLogout} 
                title={t('sidebar.userMenu.logout')}
            >
                <LogOut size={16} />
            </button>
        </>
    );
};

export default UserFooter;