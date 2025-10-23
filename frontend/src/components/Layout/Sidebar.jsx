import { useEffect, useState } from "react";
import axios from "axios";
import { Lock, Users, Plus, ChevronRight, Sparkles, LogOut, PanelLeftClose, PanelLeft } from "lucide-react";
import styles from "../../css/layout/Sidebar.module.css";
import UserFooter from "../features/sidebar_user_menu/UserFooter";
import UserFooterCollapsed from "../features/sidebar_user_menu/UserFooterCollapsed";

const Sidebar = ({ isSidebarOpen, toggleSidebar, userData, handleLogout, onSelectNotebook, onGoToDashboard }) => {
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
        if (!isSidebarOpen) return;
        setExpandedSpaces(prev =>
            prev.includes(spaceId)
                ? prev.filter(id => id !== spaceId)
                : [...prev, spaceId]
        );
    };

    const handleNotebookClick = (notebook) => {
        if (!isSidebarOpen) return;
        setSelectedNotebook(notebook);
        onSelectNotebook(notebook); 
    };

    const handleBrandClick = () => {
        setSelectedNotebook(null);
        if (onGoToDashboard) {
            onGoToDashboard();
        }
    };

    return (
        <aside className={`${styles.sidebar} ${!isSidebarOpen ? styles.collapsed : ''}`}>
            <div className={styles.sidebarInner}>

                {/* Header with Toggle */}
                <div className={styles.sidebarHeader}>
                    <div 
                        className={styles.brandContainer}
                        onClick={handleBrandClick}
                        style={{ cursor: 'pointer' }}
                        title="Go to Dashboard"
                    >
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
                                                toggleSidebar();
                                            } else {
                                                toggleSpace(space.id);
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
                                            onClick={() => handleAddNotebook(space.id)}
                                            title={`Add ${space.name} notebook`}
                                        >
                                            <Plus size={16} />
                                        </button>
                                    )}
                                </div>

                                {/* Notebook List */}
                                {isExpanded && isSidebarOpen && (
                                    <div className={styles.notebookList}>
                                        {notebooks[space.id]?.map((notebook) => (
                                            <div
                                                key={notebook.id}
                                                className={`${styles.notebookItem} ${selectedNotebook?.id === notebook.id ? styles.active : ''}`}
                                                onClick={() => handleNotebookClick(notebook)}
                                                title={notebook.name}
                                            >
                                                <span className={styles.notebookName}>{notebook.name}</span>
                                            </div>
                                        ))}
                                        {(!notebooks[space.id] || notebooks[space.id].length === 0) && (
                                            <div className={styles.emptyNotebooks}>
                                                No notebooks yet
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* User Footer */}
                <div className={styles.sidebarFooter}>
                    {isSidebarOpen ? (
                        <UserFooter
                            userData={userData}
                            handleLogout={handleLogout}
                            onSettingsClick={() => console.log("Otwórz ustawienia")}
                        />
                    ) : (
                        <UserFooterCollapsed
                            userData={userData}
                            handleLogout={handleLogout}
                            onSettingsClick={() => console.log("Otwórz ustawienia")}
                        />
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;