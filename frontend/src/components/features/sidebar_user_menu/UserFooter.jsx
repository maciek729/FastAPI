import { useEffect, useState, useRef } from "react";
import { LogOut } from "lucide-react";
import UserMenu from "./UserMenu";
import styles from "../../../css/layout/Sidebar.module.css";

const UserFooter = ({ userData, handleLogout, onSettingsClick }) => {
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
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <>
            <div className={styles.userProfileWrapper} ref={menuRef}>
                <div className={styles.userProfile} onClick={toggleMenu}>
                    <div className={styles.userAvatar}>
                        {userData?.name?.charAt(0) || userData?.username?.charAt(0) || "U"}
                    </div>
                    <div className={styles.userInfo}>
                        <div className={styles.userName}>{userData?.username || "User"}</div>
                    </div>
                </div>

                {isMenuOpen && (
                    <UserMenu
                        onSettingsClick={onSettingsClick}
                        onClose={() => setIsMenuOpen(false)}
                    />
                )}
            </div>

            <button className={styles.logoutBtn} onClick={handleLogout} title="Wyloguj">
                <LogOut size={16} />
            </button>
        </>
    );
};

export default UserFooter;