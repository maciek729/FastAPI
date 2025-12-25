import { useState, useContext, useCallback, useEffect } from "react";
import { Users, MessageCircle, FileText, Zap, ClipboardCheck, Headphones } from "lucide-react";
import Chat from "../chat/Chat";
import FilesView from "../notebook/FilesView";
import FlashcardsView from "../flashcard/FlashcardsView";
import TestsView from "../tests/TestsView";
import styles from "../../../css/features/NotebookView.module.css";
import PodcastView from "../podcast/PodcastView";
import { LanguageContext } from "../../../translations/LanguageContext";
import translations from "../../../translations/translation.json";
import GroupChatSidebar from "../group_chat/GroupChatSidebar";

export default function NotebookView({ details, userData, refreshNotebook, isSidebarOpen }) {
    const notebookId = details?.id;
    const [highlightedItemId, setHighlightedItemId] = useState(null);
    
    const [activeTab, setActiveTab] = useState("files");
    const [isGroupChatOpen, setIsGroupChatOpen] = useState(() => {
        if (!notebookId) return false;
        const savedStates = localStorage.getItem('groupChat_open_states');
        if (savedStates) {
            const states = JSON.parse(savedStates);
            return states[notebookId] || false;
        }
        return false;
    });

    const handleNavigateToResource = (resourceData) => {
        const type = resourceData.itemType;
        const id = resourceData.itemId;

        setHighlightedItemId(id);
        
        if (type === 'note') setActiveTab('files');
        else if (type === 'test') setActiveTab('tests');
        else if (type === 'flashcards') setActiveTab('flashcards');
        else if (type === 'podcast') setActiveTab('podcasts');
        
        // Opcjonalnie: tutaj możesz dodać logikę, która przekaże resourceData.itemId 
        // do konkretnego widoku, aby go podświetlić, jeśli Twoje widoki to obsługują.
        setTimeout(() => setHighlightedItemId(null), 10000);
    };
    
    const [chatWidth, setChatWidth] = useState(() => {
        if (!notebookId) return 350;
        const saved = localStorage.getItem('groupChat_widths');
        const widths = saved ? JSON.parse(saved) : {};
        return widths[notebookId] || 350;
    });

    const [isResizing, setIsResizing] = useState(false);

    const { language } = useContext(LanguageContext);

    const isShared = details?.space_type === 'shared' || details?.is_shared === true;
    
    const startResizing = useCallback((e) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((e) => {
        if (isResizing) {
            const newWidth = window.innerWidth - e.clientX;
            
            if (newWidth > 250 && newWidth < window.innerWidth * 0.5) {
                setChatWidth(newWidth);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        if (!notebookId) return;

        const savedStates = localStorage.getItem('groupChat_open_states');
        const states = savedStates ? JSON.parse(savedStates) : {};
        
        states[notebookId] = isGroupChatOpen;
        
        localStorage.setItem('groupChat_open_states', JSON.stringify(states));
    }, [isGroupChatOpen, notebookId]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener("mousemove", resize);
            window.addEventListener("mouseup", stopResizing);
            document.body.style.cursor = 'col-resize';
        } else {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
            document.body.style.cursor = 'default';
        }

        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [isResizing, resize, stopResizing]);

    useEffect(() => {
        if (notebookId) {
            const saved = localStorage.getItem('groupChat_widths');
            const widths = saved ? JSON.parse(saved) : {};
            setChatWidth(widths[notebookId] || 350);
        }
    }, [notebookId]);

    useEffect(() => {
        if (!notebookId) return;
        const saved = localStorage.getItem('groupChat_widths');
        const widths = saved ? JSON.parse(saved) : {};
        widths[notebookId] = chatWidth;
        localStorage.setItem('groupChat_widths', JSON.stringify(widths));
    }, [chatWidth, notebookId]);

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

    const tabs = [
        { id: "chat", label: t('notebook.tabs.chat'), icon: MessageCircle },
        { id: "files", label: t('notebook.tabs.files'), icon: FileText },
        { id: "flashcards", label: t('notebook.tabs.flashcards'), icon: Zap },
        { id: "tests", label: t('notebook.tabs.tests'), icon: ClipboardCheck },
        { id: "podcasts", label: t('notebook.tabs.podcasts'), icon: Headphones }
    ];

    return (
        <div className={styles.notebookView}>
            {/* Tabs Bar */}
            <div className={styles.tabsBar}>
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ""}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <Icon size={18} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
                {isShared && (
                    <>
                        <div className={styles.separator} />
                        <button
                            className={`${styles.tab} ${isGroupChatOpen ? styles.active : ""}`}
                            onClick={() => setIsGroupChatOpen(!isGroupChatOpen)}
                        >
                            <Users size={18} />
                            <span>{t('Czat grupowy')}</span>
                        </button>
                    </>
                )}
            </div>

            {/* Tab Content & Sidebar */}
            <div className={styles.mainLayout}>
                <div className={styles.tabContainer}>
                    {activeTab === "chat" && <Chat userId={userData.id} notebookId={details?.id}/>}
                    {activeTab === "files" && (
                        <FilesView
                            details={details}
                            userData={userData}
                            refreshNotebook={refreshNotebook}
                        />
                    )}
                    {activeTab === "flashcards" && (
                        <FlashcardsView
                            notebookId={details?.id}
                            userData={userData}
                            highlightedItemId={highlightedItemId}
                        />
                    )}
                    {activeTab === "tests" && <TestsView userData={userData} notebookId={details?.id} isSidebarOpen={isSidebarOpen} />}
                    {activeTab === "podcasts" && (
                        <PodcastView 
                            notebookId={details?.id} 
                            userData={userData} 
                        />
                    )}
                </div>

                <GroupChatSidebar 
                    isOpen={isGroupChatOpen} 
                    onClose={() => setIsGroupChatOpen(false)}
                    notebookId={details?.id}
                    userData={userData}
                    t={t}
                    width={chatWidth}
                    onResizeStart={startResizing}
                    chatName = {details?.name}
                    isShared={isShared}
                    onNavigateToResource={handleNavigateToResource}
                />
            </div>
        </div>
    );
}