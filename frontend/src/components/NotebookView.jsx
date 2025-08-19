import { useState } from "react";
import Chat from "./Chat";
import FilesView from "./FilesView";
import FlashcardsView from "./FlashcardsView";
import TestsView from "./TestsView";
import "../css/NotebookView.css";

export default function NotebookView({ details, userData, refreshNotebook }) {
    const [activeTab, setActiveTab] = useState("files"); 
    // "chat" | "files" | "flashcards"

    return (
        <div className="notebook-view">
            {/* Pasek z zakładkami */}
            <div className="tabs-bar">
                <button 
                    className={`tab ${activeTab === "chat" ? "active" : ""}`} 
                    onClick={() => setActiveTab("chat")}
                >
                    💬 Chat z AI
                </button>
                <button 
                    className={`tab ${activeTab === "files" ? "active" : ""}`} 
                    onClick={() => setActiveTab("files")}
                >
                    📁 Moje Pliki
                </button>
                <button 
                    className={`tab ${activeTab === "flashcards" ? "active" : ""}`} 
                    onClick={() => setActiveTab("flashcards")}
                >
                    🎯 Fiszki
                </button>
                <button 
                    className={`tab ${activeTab === "tests" ? "active" : ""}`} 
                    onClick={() => setActiveTab("tests")}
                >
                    📄 Sprawdziany
                </button>
            </div>

            {/* Wyświetlanie aktywnego widoku */}
            <div className="tab-container">
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