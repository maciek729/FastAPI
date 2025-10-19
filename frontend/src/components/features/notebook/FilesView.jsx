import { useState, useEffect } from 'react';
import axios from "axios";
import { UserPlus, X } from 'lucide-react';
import NoteEditor from './NoteEditor';
import styles from "../../../css/features/NotebookView.module.css";

export default function FilesView({ details, userData, refreshNotebook }) {
    const [showAddNoteModal, setShowAddNoteModal] = useState(false);
    const [showCollaboratorModal, setShowCollaboratorModal] = useState(false);
    const [showNoteEditor, setShowNoteEditor] = useState(false);
    const [selectedNote, setSelectedNote] = useState(null);
    const [collaboratorUsername, setCollaboratorUsername] = useState('');
    const [collaborators, setCollaborators] = useState([]);
    const [newNote, setNewNote] = useState({
        title: '',
        content: '',
        type: 'Notatka' 
    });

    useEffect(() => {
        if (details?.is_shared && details?.id) {
            fetchCollaborators();
        }
    }, [details?.id, details?.is_shared]);

    const fetchCollaborators = async () => {
        try {
            const response = await axios.get(`http://localhost:8000/notebooks/${details.id}/collaborators`);
            setCollaborators(response.data);
        } catch (err) {
            console.error('Error fetching collaborators:', err);
        }
    };

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

    const handleAddCollaborator = async (e) => {
        e.preventDefault();
        if (!collaboratorUsername.trim()) return alert("Podaj nazwę użytkownika");

        try {
            await axios.post(`http://localhost:8000/notebooks/${details.id}/add-collaborator`, {
                username: collaboratorUsername
            });
            alert(`Dodano użytkownika ${collaboratorUsername}`);
            setCollaboratorUsername('');
            setShowCollaboratorModal(false);
            fetchCollaborators();
        } catch (err) {
            alert(err.response?.data?.detail || "Błąd dodawania współtwórcy");
        }
    };

    const handleRemoveCollaborator = async (userId) => {
        if (!window.confirm('Czy na pewno chcesz usunąć tego współtwórcę?')) return;

        try {
            await axios.delete(`http://localhost:8000/notebooks/${details.id}/collaborator/${userId}`);
            alert('Współtwórca usunięty');
            fetchCollaborators();
        } catch (err) {
            alert(err.response?.data?.detail || "Błąd usuwania współtwórcy");
        }
    };

    const handleNoteClick = (note) => {
        setSelectedNote(note);
        setShowNoteEditor(true);
    };

    const handleNoteSave = (updatedNote) => {
        refreshNotebook();
    };

    const handleNoteDelete = (noteId) => {
        refreshNotebook();
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Dziś';
        const date = new Date(dateString);
        const now = new Date();
        if (
            date.getFullYear() === now.getFullYear() &&
            date.getMonth() === now.getMonth() &&
            date.getDate() === now.getDate()
        ) {
            return 'Dziś';
        }
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) return 'Dziś'; 
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
        <>
            <div className={styles.filesView}>
                <div className={styles.headerSection}>
                    <div className={styles.headerMain}>
                        <h1 className={styles.notebookTitle}>{details.name}</h1>
                        <div className={styles.headerActions}>
                            {details.is_shared && (
                                <button 
                                    className={styles.collaboratorBtn}
                                    onClick={() => setShowCollaboratorModal(true)}
                                >
                                    <UserPlus size={18} />
                                    <span>Współtwórcy</span>
                                </button>
                            )}
                            <button 
                                className={styles.addNoteBtn}
                                onClick={() => setShowAddNoteModal(true)}
                            >
                                + Dodaj notatkę
                            </button>
                        </div>
                    </div>
                </div>

                <div className={styles.cardsContainer}>
                    {details.notes && details.notes.length > 0 ? (
                        details.notes.map((note) => (
                            <div 
                                key={note.id} 
                                className={styles.noteCard}
                                onClick={() => handleNoteClick(note)}
                            >
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
                                    {note.content?.substring(0, 120).replace(/<[^>]*>/g, '')}
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

                {/* Modal dodawania notatki */}
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

                {/* Modal współtwórców */}
                {showCollaboratorModal && (
                    <div className={styles.modalOverlay} onClick={() => setShowCollaboratorModal(false)}>
                        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                            <div className={styles.modalHeader}>
                                <h2 className={styles.modalTitle}>Zarządzaj współtwórcami</h2>
                                <button 
                                    className={styles.closeBtn}
                                    onClick={() => setShowCollaboratorModal(false)}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleAddCollaborator} className={styles.addCollaboratorForm}>
                                <div className={styles.formGroup}>
                                    <label>Dodaj nowego współtwórcę</label>
                                    <div className={styles.inputWithButton}>
                                        <input
                                            type="text"
                                            value={collaboratorUsername}
                                            onChange={(e) => setCollaboratorUsername(e.target.value)}
                                            placeholder="Nazwa użytkownika"
                                        />
                                        <button type="submit" className={styles.btnAdd}>
                                            <UserPlus size={18} />
                                            Dodaj
                                        </button>
                                    </div>
                                </div>
                            </form>

                            <div className={styles.collaboratorsList}>
                                <h3 className={styles.collaboratorsTitle}>
                                    Współtwórcy ({collaborators.length})
                                </h3>
                                {collaborators.length > 0 ? (
                                    <div className={styles.collaboratorsItems}>
                                        {collaborators.map((collab) => (
                                            <div key={collab.id} className={styles.collaboratorItem}>
                                                <div className={styles.collaboratorAvatar}>
                                                    {collab.username.charAt(0).toUpperCase()}
                                                </div>
                                                <span className={styles.collaboratorName}>
                                                    {collab.username}
                                                </span>
                                                <button
                                                    className={styles.btnRemove}
                                                    onClick={() => handleRemoveCollaborator(collab.id)}
                                                    title="Usuń współtwórcę"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={styles.emptyCollaborators}>
                                        <p>Brak współtwórców. Dodaj pierwszego!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Note Editor */}
                {showNoteEditor && selectedNote && (
                    <NoteEditor
                        note={selectedNote}
                        userData={userData}
                        onClose={() => {
                            setShowNoteEditor(false);
                            setSelectedNote(null);
                        }}
                        onSave={handleNoteSave}
                        onDelete={handleNoteDelete}
                    />
                )}
            </div>
        </>
    );
}