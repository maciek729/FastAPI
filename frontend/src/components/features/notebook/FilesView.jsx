import { useState, useEffect } from 'react';
import axios from "axios";
import { UserPlus, X, Pin, Folder, ArrowLeft, MoreVertical } from 'lucide-react';
import NoteEditor from './NoteEditor';
import styles from "../../../css/features/NotebookView.module.css";
import { getCollaborators, addCollaborator, removeCollaborator } from '../../../services/notebookService';
import { createNote} from '../../../services/noteService';

export default function FilesView({ details, userData, refreshNotebook }) {
    const [showAddNoteModal, setShowAddNoteModal] = useState(false);
    const [showCollaboratorModal, setShowCollaboratorModal] = useState(false);
    const [showNoteEditor, setShowNoteEditor] = useState(false);
    const [selectedNote, setSelectedNote] = useState(null);
    const [collaboratorUsername, setCollaboratorUsername] = useState('');
    const [collaborators, setCollaborators] = useState([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(true);
    const [newNote, setNewNote] = useState({
        title: '',
        content: '',
        type: 'Notatka'
    });

    // Drag and drop state
    const [draggedNote, setDraggedNote] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [dragNotAllowedIndex, setDragNotAllowedIndex] = useState(null);
    const [notes, setNotes] = useState([]);

    // Folder state
    const [folders, setFolders] = useState([]);
    const [currentFolder, setCurrentFolder] = useState(null);
    const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [folderMenuOpen, setFolderMenuOpen] = useState(null);
    const [editingFolder, setEditingFolder] = useState(null);
    const [draggedFolder, setDraggedFolder] = useState(null);
    const [dragOverFolder, setDragOverFolder] = useState(null);
    const [dragOverFolderIndex, setDragOverFolderIndex] = useState(null);
    const [dragOverBreadcrumb, setDragOverBreadcrumb] = useState(false);

    useEffect(() => {
        setIsLoadingDetails(true);

        const loadingTimer = setTimeout(() => {
            setIsLoadingDetails(false);
        }, 400);

        return () => clearTimeout(loadingTimer);
    }, [details?.id]);

    useEffect(() => {
        if (details?.is_shared && details?.id && !isLoadingDetails) {
            fetchCollaborators();
        }
    }, [details?.id, details?.is_shared, isLoadingDetails]);

    useEffect(() => {
        if (details?.notes) {
            setNotes(details.notes);
        }
    }, [details?.notes]);

    useEffect(() => {
        if (details?.id && userData?.id) {
            fetchFolders();
        }
    }, [details?.id, userData?.id]);

    const fetchFolders = async () => {
        try {
            const response = await axios.get('http://localhost:8000/folders/notes/list', {
                params: {
                    notebook_id: details.id,
                    user_id: userData.id
                }
            });
            setFolders(response.data);
        } catch (err) {
            console.error('Error fetching folders:', err);
        }
    };

    const fetchCollaborators = async () => {
        try {
            const data = await getCollaborators(details.id);
            setCollaborators(data);
        } catch (err) {
            console.error('Error fetching collaborators:', err);
        }
    };

    if (isLoadingDetails) {
        return (
            <div className={styles.loading}>
                <div className={styles.loadingSpinner}></div>
                <p>Ładowanie notatnika...</p>
            </div>
        );
    }

    if (!details) return <div className={styles.loading}>Ładowanie notatnika...</div>;

    const handleAddNote = async (e) => {
        e.preventDefault();

        if (!newNote.title.trim() || !newNote.content.trim()) {
            alert("Wypełnij wszystkie pola!");
            return;
        }

        const notePayload = {
            user_id: userData.id,
            notebook_id: details.id,
            title: newNote.title,
            content: newNote.content,
            type: newNote.type,
            is_shared: false
        };

        try {
            const responseData = await createNote(notePayload);

            if (currentFolder) {
                await handleMoveNoteToFolder(responseData.id, currentFolder.id);
            }

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
            await addCollaborator(details.id, collaboratorUsername);
            alert(`Dodano użytkownika ${collaboratorUsername}`);
            setCollaboratorUsername('');
            setShowCollaboratorModal(false);
            fetchCollaborators();
        } catch (err) {
            console.error('Błąd dodawania:', err);
            alert(err.message || "Błąd dodawania współtwórcy");
        }
    };

    const handleRemoveCollaborator = async (userId) => {
        if (!window.confirm('Czy na pewno chcesz usunąć tego współtwórcę?')) return;

        try {
            await removeCollaborator(details.id, userId);

            alert('Współtwórca usunięty');
            fetchCollaborators();
        } catch (err) {
            console.error('Błąd usuwania:', err);
            alert(err.message || "Błąd usuwania współtwórcy");
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
        switch (type?.toLowerCase()) {
            case 'notatka': return '#6c63ff';
            case 'test': return '#4cafef';
            case 'fiszki': return '#ff6f61';
            default: return '#6c63ff';
        }
    };

    // Get filtered and sorted notes
    const getFilteredAndSortedNotes = () => {
        let filtered = notes.filter(note => note.type !== "Fiszki");

        // Filter by current folder context
        if (currentFolder) {
            filtered = filtered.filter(note => note.folder_id === currentFolder.id);
        } else {
            filtered = filtered.filter(note => !note.folder_id);
        }

        filtered = [...filtered].sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;

            if (a.is_pinned && b.is_pinned) {
                if (a.grid_position !== null && b.grid_position !== null) {
                    return a.grid_position - b.grid_position;
                }
            }

            if (!a.is_pinned && !b.is_pinned) {
                if (a.grid_position !== null && b.grid_position !== null) {
                    return a.grid_position - b.grid_position;
                }
            }

            return new Date(b.created_at) - new Date(a.created_at);
        });

        return filtered;
    };

    const handleTogglePin = async (noteId, isPinned, e) => {
        e.stopPropagation();
        try {
            await axios.patch(`http://localhost:8000/notes/${noteId}/pin`, {
                is_pinned: isPinned
            });
            setNotes(prevNotes =>
                prevNotes.map(note =>
                    note.id === noteId ? { ...note, is_pinned: isPinned } : note
                )
            );
        } catch (err) {
            console.error('Error toggling pin:', err);
            alert("Błąd przypinania notatki");
        }
    };

    const handleCreateFolder = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;

        try {
            await axios.post('http://localhost:8000/folders/notes/create', {
                notebook_id: details.id,
                user_id: userData.id,
                name: newFolderName,
                parent_folder_id: currentFolder?.id || null
            });
            setNewFolderName('');
            setShowCreateFolderModal(false);
            fetchFolders();
        } catch (err) {
            console.error('Error creating folder:', err);
            alert("Błąd tworzenia folderu");
        }
    };

    const openFolder = (folder) => {
        setCurrentFolder(folder);
    };

    const closeFolder = () => {
        if (currentFolder?.parent_folder_id) {
            const parentFolder = folders.find(f => f.id === currentFolder.parent_folder_id);
            setCurrentFolder(parentFolder);
        } else {
            setCurrentFolder(null);
        }
    };

    const handleDeleteFolder = async (folderId) => {
        if (!window.confirm('Czy na pewno chcesz usunąć ten folder? Notatki zostaną przeniesione do głównego widoku.')) return;

        try {
            await axios.delete(`http://localhost:8000/folders/notes/${folderId}`);
            if (currentFolder?.id === folderId) {
                setCurrentFolder(null);
            }
            fetchFolders();
            refreshNotebook();
        } catch (err) {
            console.error('Error deleting folder:', err);
            alert("Błąd usuwania folderu");
        }
    };

    const handleRenameFolder = async (e) => {
        e.preventDefault();
        if (!editingFolder || !editingFolder.name.trim()) return;

        try {
            await axios.patch(`http://localhost:8000/folders/notes/${editingFolder.id}/rename`, {
                name: editingFolder.name
            });
            setEditingFolder(null);
            fetchFolders();
        } catch (err) {
            console.error('Error renaming folder:', err);
            alert("Błąd zmiany nazwy folderu");
        }
    };

    const handleMoveNoteToFolder = async (noteId, folderId) => {
        try {
            console.log('Moving note:', noteId, 'to folder:', folderId);
            const response = await axios.post('http://localhost:8000/folders/notes/move-item', {
                note_id: noteId,
                folder_id: folderId
            });
            console.log('Backend response:', response.data);

            setNotes(prevNotes => {
                const updated = prevNotes.map(note =>
                    note.id === noteId ? { ...note, folder_id: folderId } : note
                );
                console.log('Updated local notes:', updated.find(n => n.id === noteId));
                return updated;
            });

            await fetchFolders();

            await refreshNotebook();

        } catch (err) {
            console.error('Error moving note:', err);
            alert("Błąd przenoszenia notatki");
        }
    };

    const handleDragStart = (e, note, index) => {
        setDraggedNote({ note, index });
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.style.opacity = '0.5';

        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'note',
            noteId: note.id,
            userId: userData.id,
            sourceNotebookId: details.id
        }));
    };

    const handleDragEnd = (e) => {
        e.currentTarget.style.opacity = '1';
        setDraggedNote(null);
        setDragOverIndex(null);
        setDragNotAllowedIndex(null);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();

        const filteredNotes = getFilteredAndSortedNotes();
        const targetNote = filteredNotes[index];
        const draggedNoteData = draggedNote?.note;

        if (draggedNoteData && targetNote) {
            if (draggedNoteData.is_pinned === targetNote.is_pinned) {
                e.dataTransfer.dropEffect = 'move';
                setDragOverIndex(index);
                setDragNotAllowedIndex(null);
            } else {
                e.dataTransfer.dropEffect = 'none';
                setDragOverIndex(null);
                setDragNotAllowedIndex(index);
            }
        }
    };

    const handleDragLeave = () => {
        setDragOverIndex(null);
        setDragNotAllowedIndex(null);
    };

    const handleDrop = async (e, dropIndex) => {
        e.preventDefault();
        setDragNotAllowedIndex(null);

        if (!draggedNote || draggedNote.index === dropIndex) {
            setDragOverIndex(null);
            return;
        }

        const filteredNotes = getFilteredAndSortedNotes();
        const draggedNoteData = draggedNote.note;
        const targetNote = filteredNotes[dropIndex];

        if (draggedNoteData.is_pinned !== targetNote.is_pinned) {
            setDragOverIndex(null);
            return;
        }

        const newNotes = [...filteredNotes];
        const [removed] = newNotes.splice(draggedNote.index, 1);
        newNotes.splice(dropIndex, 0, removed);

        const updatedNotes = newNotes.map((note, idx) => ({
            ...note,
            grid_position: idx
        }));

        setNotes(prevNotes => {
            const allNotes = [...prevNotes];
            updatedNotes.forEach(updated => {
                const idx = allNotes.findIndex(n => n.id === updated.id);
                if (idx !== -1) {
                    allNotes[idx] = updated;
                }
            });
            return allNotes;
        });

        try {
            await Promise.all(
                updatedNotes.map(note =>
                    axios.patch(`http://localhost:8000/notes/${note.id}/position`, {
                        grid_position: note.grid_position
                    })
                )
            );
        } catch (err) {
            console.error('Error updating note positions:', err);
            refreshNotebook();
        }

        setDragOverIndex(null);
    };

    const handleFolderCardDragStart = (e, folder, index) => {
        setDraggedFolder({ folder, index });
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.style.opacity = '0.5';

        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'note-folder',
            folderId: folder.id,
            userId: userData.id,
            sourceNotebookId: details.id
        }));
    };

    const handleFolderCardDragEnd = (e) => {
        e.currentTarget.style.opacity = '1';
        setDraggedFolder(null);
        setDragOverFolderIndex(null);
    };

    const handleFolderCardDragOver = (e, index) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverFolderIndex(index);
    };

    const handleFolderCardDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverFolderIndex(null);
    };

    const handleFolderCardDrop = async (e, dropIndex) => {
        e.preventDefault();
        e.stopPropagation();

        if (!draggedFolder || draggedFolder.index === dropIndex) {
            setDragOverFolderIndex(null);
            return;
        }

        const foldersList = folders.filter(f => !f.parent_folder_id);
        const newFolders = [...foldersList];
        const [removed] = newFolders.splice(draggedFolder.index, 1);
        newFolders.splice(dropIndex, 0, removed);

        const updatedFolders = newFolders.map((folder, idx) => ({
            ...folder,
            grid_position: idx
        }));

        setFolders(prevFolders => {
            const allFolders = [...prevFolders];
            updatedFolders.forEach(updated => {
                const idx = allFolders.findIndex(f => f.id === updated.id);
                if (idx !== -1) {
                    allFolders[idx] = updated;
                }
            });
            return allFolders;
        });

        try {
            await Promise.all(
                updatedFolders.map(folder =>
                    axios.patch(`http://localhost:8000/folders/notes/${folder.id}/position`, {
                        grid_position: folder.grid_position
                    })
                )
            );
        } catch (err) {
            console.error('Error updating folder positions:', err);
            fetchFolders();
        }

        setDragOverFolderIndex(null);
    };

    const handleFolderDragOver = (e, folderId) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverFolder(folderId);
    };

    const handleFolderDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverFolder(null);
    };

    const handleFolderDrop = async (e, folderId) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverFolder(null);

        // Handle note drop
        if (draggedNote) {
            try {
                await handleMoveNoteToFolder(draggedNote.note.id, folderId);
                setDraggedNote(null);
            } catch (err) {
                console.error('Error dropping note into folder:', err);
            }
        }

        // Handle folder drop
        if (draggedFolder) {
            try {
                await axios.patch(`http://localhost:8000/folders/notes/${draggedFolder.folder.id}/move`, {
                    parent_folder_id: folderId
                });
                setDraggedFolder(null);
                await fetchFolders();
                refreshNotebook();
            } catch (err) {
                console.error('Error moving folder into folder:', err);
                alert("Błąd przenoszenia folderu");
            }
        }
    };

    const handleBreadcrumbDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverBreadcrumb(true);
    };

    const handleBreadcrumbDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverBreadcrumb(false);
    };

    const handleBreadcrumbDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverBreadcrumb(false);

        const parentFolderId = currentFolder?.parent_folder_id || null;

        // Handle note drop
        if (draggedNote) {
            try {
                await handleMoveNoteToFolder(draggedNote.note.id, parentFolderId);
                setDraggedNote(null);
            } catch (err) {
                console.error('Error moving note to parent folder:', err);
            }
        }

        // Handle folder drop
        if (draggedFolder) {
            try {
                await axios.patch(`http://localhost:8000/folders/notes/${draggedFolder.folder.id}/move`, {
                    parent_folder_id: parentFolderId
                });
                setDraggedFolder(null);
                await fetchFolders();
                refreshNotebook();
            } catch (err) {
                console.error('Error moving folder to parent:', err);
                alert("Błąd przenoszenia folderu");
            }
        }
    };

    return (
        <>
            <div className={styles.filesView}>
                <div className={styles.headerSection}>
                    <div className={styles.headerMain}>
                        {currentFolder ? (
                            <>
                                <button
                                    onClick={closeFolder}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.5rem',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#f59e0b',
                                        fontWeight: 600,
                                        fontSize: '1rem',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(-3px)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                                >
                                    <ArrowLeft size={20} />
                                    Powrót
                                </button>
                                <h1
                                    className={styles.notebookTitle}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.5rem',
                                        borderRadius: '8px',
                                        transition: 'all 0.2s ease',
                                        backgroundColor: dragOverBreadcrumb ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                                        border: dragOverBreadcrumb ? '2px dashed #f59e0b' : '2px solid transparent'
                                    }}
                                    onDragOver={handleBreadcrumbDragOver}
                                    onDragLeave={handleBreadcrumbDragLeave}
                                    onDrop={handleBreadcrumbDrop}
                                >
                                    <Folder size={24} style={{ color: '#f59e0b' }} />
                                    {currentFolder.name}
                                </h1>
                            </>
                        ) : (
                            <h1 className={styles.notebookTitle}>{details.name}</h1>
                        )}
                        <div className={styles.headerActions}>
                            <button
                                className={styles.addFolderBtn}
                                onClick={() => setShowCreateFolderModal(true)}
                            >
                                <Folder size={18} />
                                Nowy folder
                            </button>
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
                    {/* Folder Cards */}
                    {folders.filter(f => currentFolder ? f.parent_folder_id === currentFolder.id : !f.parent_folder_id).map((folder, index) => {
                        const folderNotes = notes.filter(n => n.folder_id === folder.id);
                        const subfolders = folders.filter(f => f.parent_folder_id === folder.id);
                        const totalItems = folderNotes.length + subfolders.length;

                        return (
                            <div
                                key={`folder-${folder.id}`}
                                className={`${styles.folderCard} ${dragOverFolder === folder.id ? styles.folderDragOver : ''} ${dragOverFolderIndex === index ? styles.dragOver : ''}`}
                                onClick={(e) => {
                                    if (!draggedNote) {
                                        openFolder(folder);
                                    }
                                }}
                                draggable={true}
                                onDragStart={(e) => handleFolderCardDragStart(e, folder, index)}
                                onDragEnd={handleFolderCardDragEnd}
                                onDragOver={(e) => {
                                    if (draggedFolder) {
                                        handleFolderCardDragOver(e, index);
                                    } else if (draggedNote) {
                                        handleFolderDragOver(e, folder.id);
                                    }
                                }}
                                onDragLeave={(e) => {
                                    if (draggedFolder) {
                                        handleFolderCardDragLeave(e);
                                    } else if (draggedNote) {
                                        handleFolderDragLeave(e);
                                    }
                                }}
                                onDrop={(e) => {
                                    if (draggedFolder) {
                                        handleFolderDrop(e, folder.id);
                                    } else if (draggedNote) {
                                        handleFolderDrop(e, folder.id);
                                    }
                                }}
                            >
                                <div className={styles.folderHeader}>
                                    <div className={styles.folderLeft}>
                                        <Folder size={72} />
                                        <span className={styles.folderName}>{folder.name}</span>
                                        <span className={styles.folderCount}>({totalItems})</span>
                                    </div>
                                    <button
                                        className={styles.btnFolderOptions}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFolderMenuOpen(folderMenuOpen === folder.id ? null : folder.id);
                                        }}
                                    >
                                        <MoreVertical size={18} />
                                    </button>
                                </div>
                                {folderMenuOpen === folder.id && (
                                    <div className={styles.folderMenu}>
                                        <button onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingFolder(folder);
                                            setFolderMenuOpen(null);
                                        }}>
                                            Zmień nazwę
                                        </button>
                                        <button
                                            className={styles.deleteFolderBtn}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteFolder(folder.id);
                                                setFolderMenuOpen(null);
                                            }}
                                        >
                                            Usuń folder
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Note Cards */}
                    {notes && notes.length > 0 ? (
                        getFilteredAndSortedNotes().map((note, index) => {
                            const isBeingDragged = draggedNote?.note.id === note.id;
                            const isDragOver = dragOverIndex === index;
                            const isDragNotAllowed = dragNotAllowedIndex === index;

                            return (
                                <div
                                    key={note.id}
                                    className={`${styles.noteCard} ${note.is_pinned ? styles.pinnedCard : ''} ${isDragOver ? styles.dragOver : ''} ${isDragNotAllowed ? styles.dragNotAllowed : ''}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, note, index)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, index)}
                                    onClick={() => handleNoteClick(note)}
                                >
                                    <div className={styles.noteCardHeader}>
                                        <h3 className={styles.noteTitle}>{note.title}</h3>
                                        <div className={styles.noteCardActions}>
                                            <button
                                                className={`${styles.pinNoteBtn} ${note.is_pinned ? styles.pinned : ''}`}
                                                onClick={(e) => handleTogglePin(note.id, !note.is_pinned, e)}
                                                title={note.is_pinned ? "Odepnij notatkę" : "Przypnij notatkę"}
                                            >
                                                <Pin size={16} />
                                            </button>
                                            <span
                                                className={styles.noteType}
                                                style={{ backgroundColor: getTypeColor(note.type) }}
                                            >
                                                {note.type}
                                            </span>
                                        </div>
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
                            );
                        })
                    ) : (
                        folders.filter(f => currentFolder ? f.parent_folder_id === currentFolder.id : !f.parent_folder_id).length === 0 && (
                            <div className={styles.emptyState}>
                                <p>{currentFolder ? 'Ten folder jest pusty. Przeciągnij notatki tutaj lub utwórz nowe!' : 'Brak notatek. Dodaj pierwszą!'}</p>
                            </div>
                        )
                    )}
                </div>

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
                                        onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                                        placeholder="Tytuł notatki"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Treść</label>
                                    <textarea
                                        value={newNote.content}
                                        onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                                        placeholder="Treść notatki..."
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Typ</label>
                                    <select
                                        value={newNote.type}
                                        onChange={(e) => setNewNote({ ...newNote, type: e.target.value })}
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

                {/* Create Folder Modal */}
                {showCreateFolderModal && (
                    <div className={styles.modalOverlay} onClick={() => setShowCreateFolderModal(false)}>
                        <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                            <div className={styles.modalHeader}>
                                <h2 className={styles.modalTitle}>Utwórz nowy folder</h2>
                                <button
                                    className={styles.closeBtn}
                                    onClick={() => setShowCreateFolderModal(false)}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleCreateFolder} style={{ padding: '2rem' }}>
                                <div className={styles.formGroup}>
                                    <label>Nazwa folderu</label>
                                    <input
                                        type="text"
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        placeholder="Wpisz nazwę folderu..."
                                        autoFocus
                                        required
                                    />
                                </div>
                                <div className={styles.modalActions}>
                                    <button
                                        type="button"
                                        className={styles.btnCancel}
                                        onClick={() => setShowCreateFolderModal(false)}
                                    >
                                        Anuluj
                                    </button>
                                    <button type="submit" className={styles.btnSubmit}>
                                        Utwórz folder
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Rename Folder Modal */}
                {editingFolder && (
                    <div className={styles.modalOverlay} onClick={() => setEditingFolder(null)}>
                        <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                            <div className={styles.modalHeader}>
                                <h2 className={styles.modalTitle}>Zmień nazwę folderu</h2>
                                <button
                                    className={styles.closeBtn}
                                    onClick={() => setEditingFolder(null)}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleRenameFolder} style={{ padding: '2rem' }}>
                                <div className={styles.formGroup}>
                                    <label>Nowa nazwa</label>
                                    <input
                                        type="text"
                                        value={editingFolder.name}
                                        onChange={(e) => setEditingFolder({ ...editingFolder, name: e.target.value })}
                                        placeholder="Wpisz nową nazwę folderu..."
                                        autoFocus
                                        required
                                    />
                                </div>
                                <div className={styles.modalActions}>
                                    <button
                                        type="button"
                                        className={styles.btnCancel}
                                        onClick={() => setEditingFolder(null)}
                                    >
                                        Anuluj
                                    </button>
                                    <button type="submit" className={styles.btnSubmit}>
                                        Zmień nazwę
                                    </button>
                                </div>
                            </form>
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