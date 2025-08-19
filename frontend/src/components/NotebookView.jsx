import { useState } from 'react';
import axios from "axios";
import '../css/NotebookView.css';

export default function NotebookView({ details, userData, refreshNotebook }) {
    const [showAddNoteModal, setShowAddNoteModal] = useState(false);
    const [newNote, setNewNote] = useState({
        title: '',
        content: '',
        type: 'Notatka' 
    });

    if (!details) return <div className="loading">Ładowanie notatnika...</div>;

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
        <div className="notebook-view">
            <div className="header-section">
                <div className="header-top">
                    <div className="breadcrumb">
                        <span className="breadcrumb-item">← Chat z AI</span>
                        <span className="breadcrumb-current">📁 Moje Pliki</span>
                    </div>
                </div>
                
                <div className="header-main">
                    <h1 className="notebook-title">{details.name}</h1>
                    <button 
                        className="add-note-btn"
                        onClick={() => setShowAddNoteModal(true)}
                    >
                        + Dodaj notatkę
                    </button>
                </div>
            </div>

            <div className="cards-container">
                {details.notes && Array.isArray(details.notes) && details.notes.length > 0 ? (
                    details.notes.map(note => (
                        <div key={note.id} className="card">
                            <div className="card-header">
                                <span 
                                    className="tag" 
                                    style={{ backgroundColor: getTypeColor(note.type) }}
                                >
                                    {note.type || 'Notatka'}
                                </span>
                                <span className="date">
                                    {formatDate(note.created_at)}
                                </span>
                            </div>
                            
                            <h3 className="card-title">{note.title}</h3>
                            <p className="card-description">
                                {note.content?.length > 100 
                                    ? note.content.substring(0, 100) + '...' 
                                    : note.content
                                }
                            </p>
                        </div>
                    ))
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">📝</div>
                        <h3>Brak notatek</h3>
                        <p>Dodaj pierwszą notatkę do tego notatnika</p>
                        <button 
                            className="add-first-note-btn"
                            onClick={() => setShowAddNoteModal(true)}
                        >
                            Dodaj notatkę
                        </button>
                    </div>
                )}
            </div>

            {/* Modal for adding new note */}
            {showAddNoteModal && (
                <div className="modal-overlay" onClick={() => setShowAddNoteModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Dodaj nową notatkę</h2>
                            <button 
                                className="close-btn"
                                onClick={() => setShowAddNoteModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        
                        <form onSubmit={handleAddNote} className="note-form">
                            <div className="form-group">
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
                            
                            <div className="form-group">
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
                            
                            <div className="form-group">
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
                            
                            <div className="form-actions">
                                <button 
                                    type="button" 
                                    className="cancel-btn"
                                    onClick={() => setShowAddNoteModal(false)}
                                >
                                    Anuluj
                                </button>
                                <button type="submit" className="submit-btn">
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