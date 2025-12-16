import { useEffect, useState, useRef, useContext } from "react";
import { LogOut } from "lucide-react";
import UserMenu from "./UserMenu";
import styles from "../../../css/layout/SidebarFooter.module.css";
import { LanguageContext } from "../../../translations/LanguageContext";
import translations from "../../../translations/translation.json";

const UserFooter = ({ userData, handleLogout, onSettingsClick, onGoToSection }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(null); // Stan na avatar
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
    }, [userData]); // Dodajemy userData, żeby odświeżyć jeśli dane przyjdą z backendu

    return (
        <>
            <div className={styles.userProfileWrapper} ref={menuRef}>
                <div className={styles.userProfile} onClick={toggleMenu}>
                    <div className={styles.userAvatar}>
                        {avatarUrl ? (
                            <img 
                                src={avatarUrl} 
                                alt="User Avatar" 
                                className={styles.userAvatarImg} 
                            />
                        ) : (
                            userData?.name?.charAt(0) || userData?.username?.charAt(0) || "U"
                        )}
                    </div>
                    <div className={styles.userInfo}>
                        <div className={styles.userName}>{userData?.username || "User"}</div>
                    </div>
                </div>

                {isMenuOpen && (
                    <UserMenu
                        onGoToSection={onGoToSection}
                        onClose={() => setIsMenuOpen(false)}
                    />
                )}
            </div>

            <button className={styles.logoutBtn} onClick={handleLogout} title={t('sidebar.userMenu.logout')}>
                <LogOut size={16} />
            </button>
        </>
    );
};

export default UserFooter;