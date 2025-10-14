import { useState } from 'react';
import axios from "axios";
import styles from "../../../css/features/NotebookView.module.css";

export default function FilesView({ details, userData, refreshNotebook }) {
    const [showAddNoteModal, setShowAddNoteModal] = useState(false);
    const [newNote, setNewNote] = useState({
        title: '',
        content: '',
        type: 'Notatka' 
    });

    if (!details) return <div className={styles.loading}>Ładowanie notatnika...</div>;

    const handleAddNote = async (e) => {
        e.preventDefault();
        
        if (!newNote.title.trim() || !newNote.content.trim()) {
            alert("Wypełnij wszystkie pola!");
            return;
        }

        try {
            await axios.post("http://localhost:8000/notes/create", {
                user_id: userData.id,
                notebook_id: details.id,
                title: newNote.title,
                content: newNote.content,
                type: newNote.type,
                is_shared: false
            });
            
            alert("Notatka dodana!");
            setNewNote({ title: '', content: '', type: 'Notatka' });
            setShowAddNoteModal(false);
            refreshNotebook();
        } catch (err) {
            console.error(err);
            alert("Błąd dodawania notatki");
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Dziś';
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return '1 dzień temu';
        if (diffDays <= 7) return `${diffDays} dni temu`;
        return date.toLocaleDateString('pl-PL');
    };

    const getTypeColor = (type) => {
        switch(type?.toLowerCase()) {
            case 'notatka': return '#6c63ff';
            case 'test': return '#4cafef';
            case 'fiszki': return '#ff6f61';
            default: return '#6c63ff';
        }
    };

    return (
        <div className={styles.filesView}>
            <div className={styles.headerSection}>
                <div className={styles.headerMain}>
                    <h1 className={styles.notebookTitle}>{details.name}</h1>
                    <button 
                        className={styles.addNoteBtn}
                        onClick={() => setShowAddNoteModal(true)}
                    >
                        + Dodaj notatkę
                    </button>
                </div>
            </div>

            <div className={styles.cardsContainer}>
                {details.notes && Array.isArray(details.notes) && details.notes.length > 0 ? (
                    details.notes.map((note) => (
                        <div key={note.id} className={styles.noteCard}>
                            <div className={styles.noteCardHeader}>
                                <h3 className={styles.noteTitle}>{note.title}</h3>
                                <span 
                                    className={styles.noteType}
                                    style={{ backgroundColor: getTypeColor(note.type) }}
                                >
                                    {note.type}
                                </span>
                            </div>
                            <p className={styles.noteContent}>
                                {note.content?.substring(0, 120)}
                                {note.content?.length > 120 ? '...' : ''}
                            </p>
                            <div className={styles.noteFooter}>
                                <span className={styles.noteDate}>
                                    {formatDate(note.created_at)}
                                </span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className={styles.emptyState}>
                        <p>Brak notatek. Dodaj pierwszą!</p>
                    </div>
                )}
            </div>

            {/* Add Note Modal */}
            {showAddNoteModal && (
                <div className={styles.modalOverlay} onClick={() => setShowAddNoteModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.modalTitle}>Dodaj nową notatkę</h2>
                        <form onSubmit={handleAddNote}>
                            <div className={styles.formGroup}>
                                <label>Tytuł</label>
                                <input
                                    type="text"
                                    value={newNote.title}
                                    onChange={(e) => setNewNote({...newNote, title: e.target.value})}
                                    placeholder="Tytuł notatki"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Treść</label>
                                <textarea
                                    value={newNote.content}
                                    onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                                    placeholder="Treść notatki..."
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Typ</label>
                                <select
                                    value={newNote.type}
                                    onChange={(e) => setNewNote({...newNote, type: e.target.value})}
                                >
                                    <option value="Notatka">Notatka</option>
                                    <option value="Test">Test</option>
                                    <option value="Fiszki">Fiszki</option>
                                </select>
                            </div>
                            <div className={styles.modalActions}>
                                <button 
                                    type="button" 
                                    className={styles.btnCancel}
                                    onClick={() => setShowAddNoteModal(false)}
                                >
                                    Anuluj
                                </button>
                                <button type="submit" className={styles.btnSubmit}>
                                    Dodaj
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}