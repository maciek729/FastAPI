import { useEffect, useState, useContext, useCallback } from "react";
import { Lock, Users, Plus, ChevronRight, Sparkles, LogOut, PanelLeftClose, PanelLeft } from "lucide-react";
import styles from "../../css/layout/Sidebar.module.css";
import UserFooter from "../features/sidebar_user_menu/UserFooter";
import UserFooterCollapsed from "../features/sidebar_user_menu/UserFooterCollapsed";
import { LanguageContext } from "../../translations/LanguageContext";
import translations from "../../translations/translation.json";
import { getNotebooks, createNotebook } from "../../services/notebookService";
import ENDPOINTS from "../../api/endpoints";

const Sidebar = ({ isSidebarOpen, toggleSidebar, userData, handleLogout, onSelectNotebook, onGoToDashboard, onGoToSection }) => {
    const { language } = useContext(LanguageContext);
    
    const t = useCallback((key, params = {}) => {
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
    }, [language]);

    const [spaces, setSpaces] = useState([]);
    const [expandedSpaces, setExpandedSpaces] = useState(['personal', 'shared']);
    const [notebooks, setNotebooks] = useState({});
    const [selectedNotebook, setSelectedNotebook] = useState(null);
    const [dragOverNotebook, setDragOverNotebook] = useState(null);

    useEffect(() => {
        setSpaces([
            { id: 'personal', name: t('sidebar.personalSpace'), icon: Lock },
            { id: 'shared', name: t('sidebar.sharedSpace'), icon: Users }
        ]);
    }, [t]);

    useEffect(() => {
        if (userData?.id) {
            fetchNotebooks('personal');
            fetchNotebooks('shared');
        }
    }, [userData?.id]);

    const fetchNotebooks = async (spaceType) => {
        try {
            const data = await getNotebooks(userData.id, spaceType);
            setNotebooks(prev => ({ ...prev, [spaceType]: data }));
        } catch (error) {
            console.error(t('sidebar.errors.fetchNotebooks'), error);
        }
    };

    const handleAddNotebook = async (spaceType) => {
        const name = prompt(t('sidebar.notebookNamePrompt'));
        if (!name) return;
        try {
            await createNotebook({
                name: name,
                created_by: userData.id,
                space_type: spaceType,
                is_shared: spaceType === 'shared'
            });
            fetchNotebooks(spaceType);
        } catch (error) {
            alert(t('sidebar.errors.addNotebook') + ': ' + error.message);
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

    const handleNotebookClick = (notebook, spaceId) => {
        if (!isSidebarOpen) return;

        const notebookWithSpace = { 
            ...notebook, 
            space_type: spaceId, 
            is_shared: spaceId === 'shared'
        };

        setSelectedNotebook(notebookWithSpace);
        onSelectNotebook(notebookWithSpace); 
    };

    const handleBrandClick = () => {
        setSelectedNotebook(null);
        if (onGoToDashboard) {
            onGoToDashboard();
        }
    };

    const handleDragOver = (e, notebook) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverNotebook(notebook.id);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverNotebook(null);
    };

    const handleDrop = async (e, targetNotebook) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverNotebook(null);

        try {
            const dragData = JSON.parse(e.dataTransfer.getData('application/json'));

            if (dragData.type === 'test') {
                if (dragData.sourceNotebookId === targetNotebook.id) {
                    return;
                }

                await fetch(ENDPOINTS.TESTS.COPY(dragData.testId), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        target_notebook_id: targetNotebook.id,
                        user_id: dragData.userId
                    })
                });

                alert(t('sidebar.copySuccess.test', { notebookName: targetNotebook.name }));
            }
            else if (dragData.type === 'folder') {
                if (dragData.sourceNotebookId === targetNotebook.id) {
                    return;
                }

                await fetch(ENDPOINTS.FOLDERS.TESTS.COPY(dragData.folderId), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        target_notebook_id: targetNotebook.id,
                        user_id: dragData.userId
                    })
                });

                alert(t('sidebar.copySuccess.folder', { notebookName: targetNotebook.name }));
            }
            else if (dragData.type === 'note') {
                if (dragData.sourceNotebookId === targetNotebook.id) {
                    return;
                }

                await fetch(ENDPOINTS.NOTES.COPY(dragData.noteId), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        target_notebook_id: targetNotebook.id,
                        user_id: dragData.userId
                    })
                });

                alert(t('sidebar.copySuccess.note', { notebookName: targetNotebook.name }));
            }
            else if (dragData.type === 'note-folder') {
                if (dragData.sourceNotebookId === targetNotebook.id) {
                    return;
                }

                await fetch(ENDPOINTS.FOLDERS.NOTES.COPY(dragData.folderId), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        target_notebook_id: targetNotebook.id,
                        user_id: dragData.userId
                    })
                });

                alert(t('sidebar.copySuccess.noteFolder', { notebookName: targetNotebook.name }));
            }
            else if (dragData.type === 'flashcard-set') {
                if (dragData.sourceNotebookId === targetNotebook.id) {
                    return;
                }

                await fetch(ENDPOINTS.FLASHCARDS.COPY_SET(dragData.setId), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        target_notebook_id: targetNotebook.id,
                        user_id: dragData.userId
                    })
                });

                alert(t('sidebar.copySuccess.flashcardSet', { notebookName: targetNotebook.name }));
            }
            else if (dragData.type === 'flashcard-set-folder') {
                if (dragData.sourceNotebookId === targetNotebook.id) {
                    return;
                }

                await fetch(ENDPOINTS.FOLDERS.FLASHCARDS.COPY(dragData.folderId), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        target_notebook_id: targetNotebook.id,
                        user_id: dragData.userId
                    })
                });

                alert(t('sidebar.copySuccess.flashcardSetFolder', { notebookName: targetNotebook.name }));
            }
        } catch (error) {
            console.error(t('sidebar.errors.copy'), error);
            alert(t('sidebar.errors.copy'));
        }
    };

    return (
        <aside className={`${styles.sidebar} ${!isSidebarOpen ? styles.collapsed : ''}`}>
            <div className={styles.sidebarInner}>

                <div className={styles.sidebarHeader}>
                    <div 
                        className={styles.brandContainer}
                        onClick={handleBrandClick}
                        style={{ cursor: 'pointer' }}
                        title={t('sidebar.dashboard')}
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
                        title={isSidebarOpen ? t('sidebar.collapseSidebar') : t('sidebar.expandSidebar')}
                    >
                        {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
                    </button>
                </div>

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
                                            title={space.id === 'personal' ? t('sidebar.addPersonalNotebook') : t('sidebar.addSharedNotebook')}
                                        >
                                            <Plus size={16} />
                                        </button>
                                    )}
                                </div>

                                {isExpanded && isSidebarOpen && (
                                    <div className={styles.notebookList}>
                                        {notebooks[space.id]?.map((notebook) => (
                                            <div
                                                key={notebook.id}
                                                className={`${styles.notebookItem} ${selectedNotebook?.id === notebook.id ? styles.active : ''} ${dragOverNotebook === notebook.id ? styles.dragOver : ''}`}
                                                onClick={() => handleNotebookClick(notebook, space.id)}
                                                onDragOver={(e) => handleDragOver(e, notebook)}
                                                onDragLeave={handleDragLeave}
                                                onDrop={(e) => handleDrop(e, notebook)}
                                                title={notebook.name}
                                            >
                                                <span className={styles.notebookName}>{notebook.name}</span>
                                            </div>
                                        ))}
                                        {(!notebooks[space.id] || notebooks[space.id].length === 0) && (
                                            <div className={styles.emptyNotebooks}>
                                                {t('sidebar.noNotebooks')}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className={styles.sidebarFooter}>
                    {isSidebarOpen ? (
                        <UserFooter
                            userData={userData}
                            handleLogout={handleLogout}
                            onGoToSection={onGoToSection}
                            onSettingsClick={() => console.log(t('sidebar.userMenu.settings'))}
                        />
                    ) : (
                        <UserFooterCollapsed
                            userData={userData}
                            handleLogout={handleLogout}
                            onGoToSection={onGoToSection}
                            onSettingsClick={() => console.log(t('sidebar.userMenu.settings'))}
                        />
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;