import { useEffect, useState } from "react";
import axios from "axios";
import { Lock, Users, Plus, ChevronRight, Sparkles, LogOut, PanelLeftClose, PanelLeft } from "lucide-react";
import styles from '../css/Sidebar.module.css';

const Sidebar = ({ isSidebarOpen, toggleSidebar, userData, handleLogout, onSelectNotebook }) => {
    const [spaces] = useState([
        { id: 'personal', name: 'Osobista', icon: Lock },
        { id: 'shared', name: 'Wspólna', icon: Users }
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
        if (!isSidebarOpen) return; // Don't toggle when sidebar is collapsed
        setExpandedSpaces(prev =>
            prev.includes(spaceId)
                ? prev.filter(id => id !== spaceId)
                : [...prev, spaceId]
        );
    };

    const handleNotebookClick = (notebook) => {
        if (!isSidebarOpen) return; // Don't select when sidebar is collapsed
        setSelectedNotebook(notebook);
        onSelectNotebook(notebook); 
    };

    return (
        <aside className={`${styles.sidebar} ${!isSidebarOpen ? styles.collapsed : ''}`}>
            <div className={styles.sidebarInner}>

                {/* Header with Toggle */}
                <div className={styles.sidebarHeader}>
                    <div className={styles.brandContainer}>
                        <div className={styles.brandIcon}>
                            <Sparkles size={20} />
                        </div>
                        {isSidebarOpen && (
                            <div className={styles.brandText}>
                                <h1>zdAI to!</h1>
                            </div>
                        )}
                    </div>
                    <button 
                        className={styles.toggleBtn}
                        onClick={toggleSidebar}
                        title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                    >
                        {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
                    </button>
                </div>

                {/* Content */}
                <div className={styles.sidebarContent}>
                    {spaces.map((space) => {
                        const SpaceIcon = space.icon;
                        const isExpanded = expandedSpaces.includes(space.id);
                        
                        return (
                            <div 
                                key={space.id} 
                                className={`${styles.sidebarSection} ${isExpanded ? styles.expanded : ''}`}
                            >
                                <div className={styles.sectionHeader}>
                                    <div
                                        className={styles.sectionTitle}
                                        onClick={() => {
                                            if (!isSidebarOpen) {
                                                toggleSidebar(); // Open sidebar when collapsed
                                            } else {
                                                toggleSpace(space.id); // Toggle space when expanded
                                            }
                                        }}
                                        title={space.name}
                                    >
                                        <SpaceIcon size={16} className={styles.sectionIcon} />
                                        {isSidebarOpen && (
                                            <>
                                                <span className={styles.sectionName}>{space.name}</span>
                                                <ChevronRight 
                                                    size={14} 
                                                    className={`${styles.chevronIcon} ${isExpanded ? styles.open : ''}`}
                                                />
                                            </>
                                        )}
                                    </div>
                                    {isSidebarOpen && (
                                        <button
                                            className={styles.addBtn}
                                            onClick={(e) => {
                                                e.stopPropagation(); 
                                                handleAddNotebook(space.id);
                                            }}
                                            title="Dodaj notatnik"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    )}
                                </div>

                                {isSidebarOpen && isExpanded && (
                                    <ul className={styles.notebooksList}>
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
                        );
                    })}
                </div>

                {/* User Section */}
                <div className={styles.userSection}>
                    {isSidebarOpen ? (
                        <>
                            <div className={styles.userProfile}>
                                <div className={styles.userAvatar}>
                                    {userData?.name?.charAt(0) || userData?.username?.charAt(0) || 'U'}
                                </div>
                                <div className={styles.userInfo}>
                                    <div className={styles.userName}>{userData?.username || 'User'}</div>
                                </div>
                            </div>
                            <button className={styles.logoutBtn} onClick={handleLogout} title="Logout">
                                <LogOut size={16} />
                            </button>
                        </>
                    ) : (
                        <div className={styles.collapsedUserSection}>
                            <div className={styles.userAvatarCollapsed} title={userData?.username || 'User'}>
                                {userData?.name?.charAt(0) || userData?.username?.charAt(0) || 'U'}
                            </div>
                            <button className={styles.logoutBtnCollapsed} onClick={handleLogout} title="Logout">
                                <LogOut size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;