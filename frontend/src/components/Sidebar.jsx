import { useEffect, useState } from "react";
import axios from "axios";
import styles from '../css/Sidebar.module.css';

const Sidebar = ({ isSidebarOpen, toggleSidebar, userData, handleLogout, onSelectNotebook }) => {
    const [spaces] = useState([
        { id: 'personal', name: 'Przestrzeń Osobista', icon: '🔒' },
        { id: 'shared', name: 'Przestrzeń Wspólna', icon: '👥' }
    ]);
    const [expandedSpaces, setExpandedSpaces] = useState(['personal', 'shared']);
    const [notebooks, setNotebooks] = useState({});
    const [selectedNotebook, setSelectedNotebook] = useState(null);

    useEffect(() => {
        if (userData?.id) {
            fetchNotebooks('personal');
            fetchNotebooks('shared');
        }
    }, [userData?.id]);

    const fetchNotebooks = async (spaceType) => {
        try {
            const response = await axios.get('http://localhost:8000/notebooks/list', {
                params: {
                    created_by: userData.id,
                    space_type: spaceType 
                }
            });
            setNotebooks(prev => ({ ...prev, [spaceType]: response.data }));
        } catch (error) {
            console.error('Błąd pobierania notatników:', error);
        }
    };

    const handleAddNotebook = async (spaceType) => {
        const name = prompt('Podaj nazwę notatnika:');
        if (!name) return;
        try {
            await axios.post('http://localhost:8000/notebooks/create', {
                name: name,
                created_by: userData.id,
                space_type: spaceType,
                is_shared: spaceType === 'shared'
            });
            fetchNotebooks(spaceType);
        } catch (error) {
            alert('Błąd dodawania notatnika: ' + (error.response?.data?.detail || error.message));
        }
    };

    const toggleSpace = (spaceId) => {
        setExpandedSpaces(prev =>
            prev.includes(spaceId)
                ? prev.filter(id => id !== spaceId)
                : [...prev, spaceId]
        );
    };

    const handleNotebookClick = (notebook) => {
        setSelectedNotebook(notebook);
        onSelectNotebook(notebook); 
    };

    return (
        <aside className={`${styles.sidebar} ${!isSidebarOpen ? styles.collapsed : ''}`}>
            <div className={styles.sidebarInner}>

                {/* Header */}
                <div className={styles.sidebarHeader}>
                    <div className={styles.brandContainer}>
                        <div className={styles.brandIcon}>
                            🧠
                        </div>
                        <div className={styles.brandText}>
                            <h1>zdAI to!</h1>
                            <p>Twój inteligentny system nauki</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className={styles.sidebarContent}>
                    {spaces.map((space) => (
                        <div 
                            key={space.id} 
                            className={`${styles.sidebarSection} ${expandedSpaces.includes(space.id) ? styles.expanded : ''}`}
                        >
                            <div className={styles.sidebarSectionTitleContainer}>
                                <div
                                    className={styles.sidebarSectionTitle}
                                    onClick={() => toggleSpace(space.id)}
                                >
                                    <div className={styles.spaceInfo}>
                                        <div className={styles.spaceIcon}>{space.icon}</div>
                                        <div className={styles.spaceName}>{space.name}</div>
                                    </div>
                                    <button
                                        className={styles.addNotebookIconBtn}
                                        onClick={(e) => {
                                            e.stopPropagation(); 
                                            handleAddNotebook(space.id);
                                        }}
                                        title="Dodaj notatnik"
                                    >
                                        ➕
                                    </button>
                                </div>                              
                            </div>

                            {expandedSpaces.includes(space.id) && (
                                <ul className={styles.jsSubmenu}>
                                    {(notebooks[space.id] || []).map(notebook => (
                                        <li
                                            key={notebook.id}
                                            className={`${styles.notebookItem} ${selectedNotebook?.id === notebook.id ? styles.selected : ''}`}
                                            onClick={() => handleNotebookClick(notebook)}
                                        >
                                            <span className={styles.notebookName}>{notebook.name}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                </div>

                {/* User Section */}
                <div className={styles.sidebarOptions}>
                    <div className={styles.userProfile}>
                        <div className={styles.userAvatar}>
                            {userData?.name?.charAt(0) || userData?.username?.charAt(0) || 'A'}
                        </div>
                        <div className={styles.userInfo}>
                            <div className={styles.userName}>{userData?.username || 'unknown'}</div>
                            <div className={styles.userEmail}>{userData?.email || 'unknown@failed'}</div>
                        </div>
                    </div>
                    <button className={styles.logoutBtn} onClick={handleLogout}>
                        Wyloguj się
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;