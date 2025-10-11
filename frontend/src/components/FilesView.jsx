import { useState } from 'react';
import axios from "axios";
import styles from '../css/NotebookView.module.css';

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
                    details.notes.map(note => (
                        <div key={note.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <span 
                                    className={styles.tag} 
                                    style={{ backgroundColor: getTypeColor(note.type) }}
                                >
                                    {note.type || 'Notatka'}
                                </span>
                                <span className={styles.date}>
                                    {formatDate(note.created_at)}
                                </span>
                            </div>
                            
                            <h3 className={styles.cardTitle}>{note.title}</h3>
                            <p className={styles.cardDescription}>
                                {note.content?.length > 100 
                                    ? note.content.substring(0, 100) + '...' 
                                    : note.content
                                }
                            </p>
                        </div>
                    ))
                ) : (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>📝</div>
                        <h3>Brak notatek</h3>
                        <p>Dodaj pierwszą notatkę do tego notatnika</p>
                        <button 
                            className={styles.addFirstNoteBtn}
                            onClick={() => setShowAddNoteModal(true)}
                        >
                            Dodaj notatkę
                        </button>
                    </div>
                )}
            </div>

            {showAddNoteModal && (
                <div className={styles.modalOverlay} onClick={() => setShowAddNoteModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Dodaj nową notatkę</h2>
                            <button 
                                className={styles.closeBtn}
                                onClick={() => setShowAddNoteModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        
                        <form onSubmit={handleAddNote} className={styles.noteForm}>
                            <div className={styles.formGroup}>
                                <label htmlFor="noteTitle">Tytuł notatki</label>
                                <input
                                    id="noteTitle"
                                    type="text"
                                    value={newNote.title}
                                    onChange={(e) => setNewNote({...newNote, title: e.target.value})}
                                    placeholder="Wprowadź tytuł notatki..."
                                    required
                                />
                            </div>
                            
                            <div className={styles.formGroup}>
                                <label htmlFor="noteType">Typ notatki</label>
                                <select
                                    id="noteType"
                                    value={newNote.type}
                                    onChange={(e) => setNewNote({...newNote, type: e.target.value})}
                                >
                                    <option value="Notatka">Notatka</option>
                                    <option value="Test">Test</option>
                                    <option value="Fiszki">Fiszki</option>
                                </select>
                            </div>
                            
                            <div className={styles.formGroup}>
                                <label htmlFor="noteContent">Treść notatki</label>
                                <textarea
                                    id="noteContent"
                                    value={newNote.content}
                                    onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                                    placeholder="Wprowadź treść notatki..."
                                    rows="8"
                                    required
                                />
                            </div>
                            
                            <div className={styles.formActions}>
                                <button 
                                    type="button" 
                                    className={styles.cancelBtn}
                                    onClick={() => setShowAddNoteModal(false)}
                                >
                                    Anuluj
                                </button>
                                <button type="submit" className={styles.submitBtn}>
                                    Dodaj notatkę
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}