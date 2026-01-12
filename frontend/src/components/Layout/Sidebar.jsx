import { useEffect, useState, useContext, useCallback } from "react";
import toast from 'react-hot-toast';
import { promptModal } from '../../utils/promptModal';
import { User, Users, Plus, ChevronRight, PanelLeft } from "lucide-react";
import styles from "../../css/layout/Sidebar.module.css";
import UserFooter from "../features/sidebar_user_menu/UserFooter";
import UserFooterCollapsed from "../features/sidebar_user_menu/UserFooterCollapsed";
import NotebookMenu from './NotebookMenu';
import { LanguageContext } from "../../translations/LanguageContext";
import translations from "../../translations/translation.json";
import { getNotebooks, createNotebook } from "../../services/notebookService";
import ENDPOINTS from "../../api/endpoints";
import logoDark from "./logodark.png";
import logoLight from "./logolight.png";
import * as chatService from "../../services/groupChatService";

const Sidebar = ({ isSidebarOpen, toggleSidebar, userData, handleLogout, onSelectNotebook, onGoToDashboard, onGoToSection, activeNotebook, hasUnread }) => {
    const { language } = useContext(LanguageContext);
    const sidebarRef = useRef(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    const [unreadNotebookIds, setUnreadNotebookIds] = useState(new Set());

    const checkUnreadMessages = async () => {
        if (!userData?.id) return;

        try {
            const unreadMap = await chatService.getUnreadStatus(userData.id);

            if (!unreadMap) return;

            const newUnreadSet = new Set();
            
            Object.keys(unreadMap).forEach((notebookIdStr) => {
                const notebookId = parseInt(notebookIdStr);
                
                const isCurrentlySelected = activeNotebook?.id === notebookId;
                
                const savedChatStates = localStorage.getItem('groupChat_open_states');
                const chatStates = savedChatStates ? JSON.parse(savedChatStates) : {};
                const isChatOpen = chatStates[notebookId] === true;

                if (isCurrentlySelected && isChatOpen) {
                    // hihi
                } else {
                    newUnreadSet.add(notebookId);
                }
            });

            setUnreadNotebookIds(newUnreadSet);

        } catch (error) {
            console.error("Błąd pobierania statusu:", error);
        }
    };

    useEffect(() => {
        checkUnreadMessages();

        const intervalId = setInterval(() => {
            checkUnreadMessages();
        }, 60000); //60s 60 s

        const handleChatRead = () => checkUnreadMessages();
        window.addEventListener('chatRead', handleChatRead);
        window.addEventListener('focus', checkUnreadMessages);
        window.addEventListener('online', checkUnreadMessages);
        return () => {
            clearInterval(intervalId);
            window.removeEventListener('chatRead', handleChatRead);
            window.removeEventListener('focus', checkUnreadMessages);
            window.removeEventListener('online', checkUnreadMessages);
        };
    }, [userData?.id, activeNotebook]);

    useEffect(() => {
        if (activeNotebook) {
            setSelectedNotebook(activeNotebook);
        } else {
            setSelectedNotebook(null);
        }
    }, [activeNotebook]);

    const [theme, setTheme] = useState(localStorage.getItem('appTheme') || 'light');

    const logoToShow = theme === 'dark' ? logoDark : logoDark;

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
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!isMobile || !isMobileMenuOpen) return;

            if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
                setIsMobileMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isMobile, isMobileMenuOpen]);

    useEffect(() => {
        if (activeNotebook) {
            setSelectedNotebook(activeNotebook);

            const targetSpace = activeNotebook.space_type || (activeNotebook.is_shared ? 'shared' : 'personal');

            setExpandedSpaces(prev => {
                if (!prev.includes(targetSpace)) {
                    return [...prev, targetSpace];
                }
                return prev;
            });
        } else {
            setSelectedNotebook(null);
        }
    }, [activeNotebook]);

    useEffect(() => {
        setSpaces([
            { id: 'personal', name: t('sidebar.personalSpace'), icon: User },
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
        const name = await promptModal(t('sidebar.notebookNamePrompt'));
        if (!name) return;
        try {
            await createNotebook({
                name: name,
                created_by: userData.id,
                space_type: spaceType,
                is_shared: spaceType === 'shared'
            });
            toast.success('Notatnik został utworzony');
            fetchNotebooks(spaceType);
        } catch (error) {
            toast.error(t('sidebar.errors.addNotebook') + ': ' + error.message);
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
        if (!isSidebarOpen && !isMobile) return;

        const notebookWithSpace = { 
            ...notebook, 
            space_type: spaceId, 
            is_shared: spaceId === 'shared'
        };

        setSelectedNotebook(notebookWithSpace);
        onSelectNotebook(notebookWithSpace);

        if (isMobile) {
            setIsMobileMenuOpen(false);
        }
    };

    const handleMobileMenuToggle = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
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

                toast.success(t('sidebar.copySuccess.test', { notebookName: targetNotebook.name }));
            }
            else if (dragData.type === 'podcast') {
                if (dragData.sourceNotebookId === targetNotebook.id) {
                    return;
                }

                await fetch(ENDPOINTS.PODCASTS.COPY(dragData.podcastId), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        target_notebook_id: targetNotebook.id,
                        user_id: dragData.userId
                    })
                });

                toast.success(t('sidebar.copySuccess.podcast', { notebookName: targetNotebook.name }));
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

                toast.success(t('sidebar.copySuccess.folder', { notebookName: targetNotebook.name }));
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

                toast.success(t('sidebar.copySuccess.note', { notebookName: targetNotebook.name }));
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

                toast.success(t('sidebar.copySuccess.noteFolder', { notebookName: targetNotebook.name }));
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

                toast.success(t('sidebar.copySuccess.flashcardSet', { notebookName: targetNotebook.name }));
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

                toast.success(t('sidebar.copySuccess.flashcardSetFolder', { notebookName: targetNotebook.name }));
            }
        } catch (error) {
            console.error(t('sidebar.errors.copy'), error);
            toast.error(t('sidebar.errors.copy'));
        }
    };

    const handleCollapsedUserClick = () => {
        if (!isSidebarOpen) {
            toggleSidebar();
            setIsUserMenuOpen(true);
        }
    };

    return (
        <aside className={`${styles.sidebar} ${!isSidebarOpen ? styles.collapsed : ''}`}>
            <div className={styles.sidebarInner}>
                <div className={styles.sidebarHeader}>
                    <div
                        className={styles.brandContainer}
                        onClick={isSidebarOpen ? handleBrandClick : toggleSidebar}
                        style={{ cursor: 'pointer' }}
                        title={isSidebarOpen ? t('sidebar.dashboard') : t('sidebar.expandSidebar')}
                    >
                        <div className={styles.brandIcon}>
                            {/* <Sparkles size={20} /> */}
                            <img src={theme === 'light' ? logoLight : logoDark} alt="zdAI to logo" className={styles.logoImg} />
                            {!isSidebarOpen && (
                                <div className={styles.expandIconOverlay}>
                                    <PanelLeft size={20} />
                                </div>
                            )}
                        </div>
                        {isSidebarOpen && (
                            <div className={styles.brandText}>
                                <h1>zdAI to!</h1>
                            </div>
                        )}
                    </div>
                    {isSidebarOpen && (
                        <button
                            className={styles.toggleBtn}
                            onClick={toggleSidebar}
                            title={t('sidebar.collapseSidebar')}
                        >
                            <PanelLeft size={20} />
                        </button>
                    )}
                </div>

                <div className={styles.sidebarContent}>
                    {isSidebarOpen && (
                        <div className={styles.spacesLabel}>{t('sidebar.spaces')}</div>
                    )}
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
                                                onClick={(e) => {
                                                    if (e.target.closest('[role="button"]')) return;
                                                    handleNotebookClick(notebook, space.id);
                                                }}
                                                onDragOver={(e) => handleDragOver(e, notebook)}
                                                onDragLeave={handleDragLeave}
                                                onDrop={(e) => handleDrop(e, notebook)}
                                                title={notebook.name}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                                    <span className={styles.notebookName}>{notebook.name}</span>
                                                    
                                                    {unreadNotebookIds.has(notebook.id) && (
                                                        <div style={{
                                                            minWidth: '8px',
                                                            height: '8px',
                                                            backgroundColor: '#ef4444',
                                                            borderRadius: '50%',
                                                            marginLeft: '8px',
                                                            boxShadow: '0 0 4px rgba(239, 68, 68, 0.5)'
                                                        }} />
                                                    )}
                                                </div>
                                                <NotebookMenu
                                                    notebook={notebook}
                                                    spaceType={space.id}
                                                    onRefresh={() => fetchNotebooks(space.id)}
                                                    t={t}
                                                />
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
                            isUserMenuOpen={isUserMenuOpen}
                            setIsUserMenuOpen={setIsUserMenuOpen}
                            hasUnread={hasUnread}
                        />
                    ) : (
                        <UserFooterCollapsed
                            userData={userData}
                            handleLogout={handleLogout}
                            onGoToSection={onGoToSection}
                            onSettingsClick={() => console.log(t('sidebar.userMenu.settings'))}
                            onExpandAndOpen={handleCollapsedUserClick}
                            hasUnread={hasUnread}
                        />
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;