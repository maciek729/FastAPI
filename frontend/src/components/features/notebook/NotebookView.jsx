import { useState } from "react";
import { MessageCircle, FileText, Zap, ClipboardCheck } from "lucide-react";
import Chat from "../chat/Chat";
import FilesView from "../notebook/FilesView";
import FlashcardsView from "../flashcard/FlashcardsView";
import TestsView from "../notebook/TestsView";
import styles from "../../../css/features/NotebookView.module.css";

export default function NotebookView({ details, userData, refreshNotebook, isSidebarOpen }) {
    const [activeTab, setActiveTab] = useState("files");

    const tabs = [
        { id: "chat", label: "Chat z AI", icon: MessageCircle },
        { id: "files", label: "Moje Pliki", icon: FileText },
        { id: "flashcards", label: "Fiszki", icon: Zap },
        { id: "tests", label: "Sprawdziany", icon: ClipboardCheck }
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
                {activeTab === "chat" && <Chat />}
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
            </div>
        </div>
    );
}