import { useState } from "react";
import Chat from "./Chat";
import FilesView from "./FilesView";
import FlashcardsView from "./FlashcardsView";
import TestsView from "./TestsView";
import styles from "../css/NotebookView.module.css";

export default function NotebookView({ details, userData, refreshNotebook }) {
    const [activeTab, setActiveTab] = useState("files"); 
    // "chat" | "files" | "flashcards" | "tests"

    return (
        <div className={styles.notebookView}>
            {/* Pasek z zakładkami */}
            <div className={styles.tabsBar}>
                <button 
                    className={`${styles.tab} ${activeTab === "chat" ? styles.active : ""}`} 
                    onClick={() => setActiveTab("chat")}
                >
                    💬 Chat z AI
                </button>
                <button 
                    className={`${styles.tab} ${activeTab === "files" ? styles.active : ""}`} 
                    onClick={() => setActiveTab("files")}
                >
                    📁 Moje Pliki
                </button>
                <button 
                    className={`${styles.tab} ${activeTab === "flashcards" ? styles.active : ""}`} 
                    onClick={() => setActiveTab("flashcards")}
                >
                    🎯 Fiszki
                </button>
                <button 
                    className={`${styles.tab} ${activeTab === "tests" ? styles.active : ""}`} 
                    onClick={() => setActiveTab("tests")}
                >
                    📄 Sprawdziany
                </button>
            </div>

            {/* Wyświetlanie aktywnego widoku */}
            <div className={styles.tabContainer}>
                {activeTab === "chat" && <Chat />}
                {activeTab === "files" && (
                    <FilesView 
                        details={details} 
                        userData={userData} 
                        refreshNotebook={refreshNotebook} 
                    />
                )}
                {activeTab === "flashcards" && <FlashcardsView />}
                {activeTab === "tests" && <TestsView />}
            </div>
        </div>
    );
}