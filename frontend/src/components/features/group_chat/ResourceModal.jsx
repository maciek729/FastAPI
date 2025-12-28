import React, { useEffect, useState } from 'react';
import { X } from "lucide-react";
import styles from "../../../css/features/groupchat/ResourceModal.module.css";

const ResourceModal = ({ isOpen, onClose, resourceData }) => {
    if (!isOpen || !resourceData) return null;

    const { itemId, itemType, itemTitle } = resourceData;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContainer} onClick={e => e.stopPropagation()}>
                <header className={styles.modalHeader}>
                    <h3>{itemTitle}</h3>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={24} />
                    </button>
                </header>
                
                <div className={styles.modalContent}>
                    {/* Tutaj renderujemy odpowiedni widok w zależności od typu */}
                    {itemType === 'note' && <div className={styles.noteViewer}>Ładowanie treści notatki #{itemId}...</div>}
                    {itemType === 'test' && <div className={styles.testViewer}>Ładowanie testu #{itemId}...</div>}
                    {itemType === 'flashcards' && <div className={styles.flashcardsViewer}>Ładowanie fiszek #{itemId}...</div>}
                    
                    {/* Tutaj docelowo możesz wrzucić swoje gotowe komponenty:
                        <NoteContent id={itemId} /> itp.
                    */}
                </div>
            </div>
        </div>
    );
};

export default ResourceModal;