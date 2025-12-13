import { useState, useContext } from "react";
import { MessageCircle, FileText, Zap, ClipboardCheck } from "lucide-react";
import Chat from "../chat/Chat";
import FilesView from "../notebook/FilesView";
import FlashcardsView from "../flashcard/FlashcardsView";
import TestsView from "../tests/TestsView";
import styles from "../../../css/features/NotebookView.module.css";
import { Headphones } from "lucide-react";
import PodcastView from "../podcast/PodcastView";
import { LanguageContext } from "../../../translations/LanguageContext";
import translations from "../../../translations/translation.json";

export default function NotebookView({ details, userData, refreshNotebook, isSidebarOpen }) {
    const [activeTab, setActiveTab] = useState("files");
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
            </div>

            {/* Tab Content */}
            <div className={styles.tabContainer}>
                {activeTab === "chat" && <Chat userId={userData.id} notebookId = {details?.id}/>}
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
        </div>
    );
}