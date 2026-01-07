import { useState, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
import { confirmModal } from '../../../utils/confirmModal';
import { promptModal } from '../../../utils/promptModal';
import axios from "axios";
import { UserPlus, X, Pin, Folder, ArrowLeft, MoreVertical, Search, Trash2, Plus, Filter } from 'lucide-react';
import NoteEditor from './NoteEditor';
import styles from "../../../css/features/NotebookView.module.css";
import generatorStyles from "../../../css/features/FlashcardGenerator.module.css";
import { getCollaborators, addCollaborator, removeCollaborator } from '../../../services/notebookService';
import { createNote, updateNotePosition } from '../../../services/noteService';
import ENDPOINTS from '../../../api/endpoints';
import { LanguageContext } from '../../../translations/LanguageContext';
import translations from '../../../translations/translation.json';

export default function FilesView({ details, userData, refreshNotebook, highlightedItemId }) {
    // showAddNoteModal removed: we now open the full NoteEditor for creating notes
    const [showCollaboratorModal, setShowCollaboratorModal] = useState(false);
    const [showNoteEditor, setShowNoteEditor] = useState(false);
    const [selectedNote, setSelectedNote] = useState(null);
    const [collaboratorUsername, setCollaboratorUsername] = useState('');
    const [collaborators, setCollaborators] = useState([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(true);
    // new note will be created via opening NoteEditor with isNew=true
    const { language } = useContext(LanguageContext);


    const t = (key, params = {}) => {
        const keys = key.split('.');
        let translation = translations[language];

        for (const k of keys) {
            translation = translation?.[k];
            if (!translation) return key;
        }

        if (typeof translation === 'string' && Object.keys(params).length > 0) {
            return translation.replace(/\{(\w+)\}/g, (_, k) => params[k] || `{${k}}`);
        }

        return translation || key;
    };

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

    // Search and sort state
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('date_desc');
    const [showFilters, setShowFilters] = useState(window.innerWidth > 768);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) {
                setShowFilters(true);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

    useEffect(() => {
        if (highlightedItemId) {
            // Krótkie opóźnienie, aby komponent zdążył się wyrenderować
            const timer = setTimeout(() => {
                const element = document.getElementById(`note-card-${highlightedItemId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [highlightedItemId]);

    useEffect(() => {
        if (highlightedItemId && notes.length > 0 && folders.length > 0) {
            // 1. Znajdź notatkę, która ma być podświetlona
            const targetNote = notes.find(n => n.id === highlightedItemId);
            
            if (targetNote) {
                // 2. Jeśli notatka jest w folderze, a my nie jesteśmy w tym folderze...
                if (targetNote.folder_id && (!currentFolder || currentFolder.id !== targetNote.folder_id)) {
                    const folderToOpen = folders.find(f => f.id === targetNote.folder_id);
                    if (folderToOpen) {
                        console.log("Automatyczne otwieranie folderu dla notatki:", folderToOpen.name);
                        setCurrentFolder(folderToOpen); // Teraz to zadziała, bo jesteśmy w FilesView
                    }
                } 
                // 3. Jeśli notatka jest w widoku głównym, a my jesteśmy w jakimś folderze...
                else if (!targetNote.folder_id && currentFolder !== null) {
                    setCurrentFolder(null);
                }
            }
        }
    }, [highlightedItemId, notes, folders]);

    const fetchFolders = async () => {
        try {
            const response = await axios.get(ENDPOINTS.FOLDERS.NOTES.LIST(details.id, userData.id));
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
                <p>{t('filesView.loading')}</p>
            </div>
        );
    }

    if (!details) return <div className={styles.loading}>{t('filesView.loading')}</div>;

    const handleCreateNewNote = () => {
        const emptyNote = {
            id: null,
            title: '',
            content: '',
            type: 'Notatka',
            user_id: userData.id,
            notebook_id: details.id,
            is_shared: false,
            created_at: new Date().toISOString()
        };
        setSelectedNote(emptyNote);
        setShowNoteEditor(true);
    };

    const handleDeleteNote = async (noteId) => {
        const confirmed = await confirmModal(t('filesView.confirmDelete'));
        if (!confirmed) return;

        try{
            await axios.delete(ENDPOINTS.NOTES.DELETE(noteId), {
                params: { user_id: userData.id }
            });
            toast.success(t('filesView.deleteSuccess'));
            refreshNotebook();
        } catch (err) {
            console.error('Error deleting note:', err);
            toast.error(t('filesView.deleteError'));
        }
    };

    const handleAddCollaborator = async (e) => {
        e.preventDefault();
        if (!collaboratorUsername.trim()) {
            toast.error(t('filesView.userError'));
            return;
        }

        try {
            await addCollaborator(details.id, collaboratorUsername);
            toast.success(t('filesVIew.userAdded', { username: collaboratorUsername }));
            setCollaboratorUsername('');
            setShowCollaboratorModal(false);
            fetchCollaborators();
        } catch (err) {
            console.error('Błąd dodawania:', err);
            toast.error(err.message || t('filesView.addColError'));
        }
    };

    const handleRemoveCollaborator = async (userId) => {
        const confirmed = await confirmModal(t('filesView.deleteColConfirm'));
        if (!confirmed) return;

        try {
            await removeCollaborator(details.id, userId);

            toast.success(t('filesView.deleteColSuccess'));
            fetchCollaborators();
        } catch (err) {
            console.error('Błąd usuwania:', err);
            toast.error(err.message || t('filesView.deleteColError'));
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

    const formatDate = (dateString, t) => {
        if (!dateString) return t('filesView.today');

        const date = new Date(dateString);
        const now = new Date();

        if (
            date.getFullYear() === now.getFullYear() &&
            date.getMonth() === now.getMonth() &&
            date.getDate() === now.getDate()
        ) {
            return t('filesView.today');
        }
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) return 'Dziś';
        if (diffDays === 1) return '1 dzień temu';
        if (diffDays <= 7) return `${diffDays} dni temu`;
        return date.toLocaleDateString('pl-PL');
    };

    const getTypeColor = (type) => {
        switch (type?.toLowerCase()) {
            case t('filesView.note'): return '#6c63ff';
            case t('filesView.test'): return '#4cafef';
            case t('filesView.flashcard'): return '#ff6f61';
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

        if (searchQuery) {
            filtered = filtered.filter(note =>
                note.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
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
                if (sortBy === 'custom') {
                    if (a.grid_position !== null && b.grid_position !== null) {
                        return a.grid_position - b.grid_position;
                    }
                } else if (sortBy === 'date_desc') {
                    return new Date(b.created_at) - new Date(a.created_at);
                } else if (sortBy === 'date_asc') {
                    return new Date(a.created_at) - new Date(b.created_at);
                } else if (sortBy === 'name_asc') {
                    return a.title.localeCompare(b.title);
                } else if (sortBy === 'name_desc') {
                    return b.title.localeCompare(a.title);
                }
            }

            return 0;
        });

        return filtered;
    };

    const handleTogglePin = async (noteId, isPinned, e) => {
        e.stopPropagation();
        try {
            await axios.patch(ENDPOINTS.NOTES.TOGGLE_PIN(noteId), {
                is_pinned: isPinned
            });
            setNotes(prevNotes =>
                prevNotes.map(note =>
                    note.id === noteId ? { ...note, is_pinned: isPinned } : note
                )
            );
        } catch (err) {
            console.error('Error toggling pin:', err);
            toast.error(t('filesView.pinError'));
        }
    };

    const handleCreateFolder = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;

        try {
            await axios.post(ENDPOINTS.FOLDERS.NOTES.CREATE, {
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
            toast.error(t('flashcardsView.createFolderError'));
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
        const confirmed = await confirmModal(t('filesView.deleteFolderConfirm'));
        if (!confirmed) return;

        try {
            await axios.delete(ENDPOINTS.FOLDERS.NOTES.DELETE(folderId));
            if (currentFolder?.id === folderId) {
                setCurrentFolder(null);
            }
            fetchFolders();
            refreshNotebook();
        } catch (err) {
            console.error('Error deleting folder:', err);
            toast.error(t('flashcardsView.deleteFolderError'));
        }
    };

    const handleRenameFolder = async (e) => {
        e.preventDefault();
        if (!editingFolder || !editingFolder.name.trim()) return;

        try {
            await axios.patch(ENDPOINTS.FOLDERS.NOTES.RENAME(editingFolder.id), {
                name: editingFolder.name
            });
            setEditingFolder(null);
            fetchFolders();
        } catch (err) {
            console.error('Error renaming folder:', err);
            toast.error(t('flashcardsView.renameFolderError'));
        }
    };

    const handleMoveNoteToFolder = async (noteId, folderId) => {
        try {
            console.log('Moving note:', noteId, 'to folder:', folderId);
            const response = await axios.post(ENDPOINTS.FOLDERS.NOTES.MOVE_ITEM, {
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
            toast.error(t('filesView.noteMoveError'));
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
                    updateNotePosition(note.id, note.grid_position)
                )
            );
        } catch (err) {
            console.error('Error updating note positions:', err);
            toast.error(t('filesView.notePosError'));
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
                    axios.patch(ENDPOINTS.FOLDERS.NOTES.UPDATE_POSITION(folder.id), {
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
                await axios.patch(ENDPOINTS.FOLDERS.NOTES.MOVE(draggedFolder.folder.id), {
                    parent_folder_id: folderId
                });
                setDraggedFolder(null);
                await fetchFolders();
                refreshNotebook();
            } catch (err) {
                console.error('Error moving folder into folder:', err);
                toast.error(t('flashcardsView.moveFolderError'));
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
                await axios.patch(ENDPOINTS.FOLDERS.NOTES.MOVE(draggedFolder.folder.id), {
                    parent_folder_id: parentFolderId
                });
                setDraggedFolder(null);
                await fetchFolders();
                refreshNotebook();
            } catch (err) {
                console.error('Error moving folder to parent:', err);
                toast.error(t('flashcardsView.moveFolderError'));
            }
        }
    };

    return (
        <>
            <div className={styles.filesView}>
                <div className={styles.headerSection}>
                    <div className={styles.leftSection}>
                        {currentFolder && (
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
                                {t('flashcardsView.back')}
                            </button>
                        )}
                        <h1
                            className={styles.notebookTitle}
                            style={{
                                padding: currentFolder ? '0.5rem' : '0',
                                borderRadius: '8px',
                                transition: 'all 0.2s ease',
                                backgroundColor: dragOverBreadcrumb ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                                border: dragOverBreadcrumb ? '2px dashed #f59e0b' : '2px solid transparent'
                            }}
                            onDragOver={currentFolder ? handleBreadcrumbDragOver : undefined}
                            onDragLeave={currentFolder ? handleBreadcrumbDragLeave : undefined}
                            onDrop={currentFolder ? handleBreadcrumbDrop : undefined}
                        >
                            {currentFolder ? (
                                <span style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                    <Folder size={24} style={{color: '#f59e0b'}} />
                                    {currentFolder.name}
                                </span>
                            ) : (
                                t('filesView.myFiles')
                            )}
                        </h1>
                        <div className={styles.searchBox}>
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder= {t('filesView.searchNotePlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={styles.searchInput}
                            />
                        </div>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className={styles.filterSelect}
                        >
                            <option value="date_desc">{t('flashcardsView.sortNewest')}</option>
                            <option value="date_asc">{t('flashcardsView.sortOldest')}</option>
                            <option value="name_asc">{t('flashcardsView.sortNameAsc')}</option>
                            <option value="name_desc">{t('flashcardsView.sortNameDesc')}</option>
                        </select>
                    </div>
                    {showFilters && (
                        <div className={styles.filtersRow}>
                            <div className={styles.searchBox}>
                                <Search size={16} />
                                <input
                                    type="text"
                                    placeholder={t('filesView.searchNotePlaceholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={styles.searchInput}
                                />
                            </div>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className={styles.filterSelect}
                            >
                                <option value="date_desc">{t('flashcardsView.sortNewest')}</option>
                                <option value="date_asc">{t('flashcardsView.sortOldest')}</option>
                                <option value="name_asc">{t('flashcardsView.sortNameAsc')}</option>
                                <option value="name_desc">{t('flashcardsView.sortNameDesc')}</option>
                            </select>
                        </div>
                    )}
                    <div className={styles.headerActions}>
                        <button
                            className={styles.filterToggleBtn}
                            onClick={() => setShowFilters(!showFilters)}
                            title={t('flashcardsView.filters')}
                        >
                            <Filter size={18} />
                        </button>
                        <button
                            className={styles.addFolderBtn}
                            onClick={() => setShowCreateFolderModal(true)}
                        >
                            <Folder size={18} />
                            {t('flashcardsView.newFolder')}
                        </button>
                        {details.is_shared && (
                            <button
                                className={styles.collaboratorBtn}
                                onClick={() => setShowCollaboratorModal(true)}
                            >
                                <UserPlus size={18} />
                                <span>{t('filesView.col')}</span>
                            </button>
                        )}
                        <button
                            className={styles.addNoteBtn}
                            onClick={handleCreateNewNote}
                        >
                            <Plus size={18} />
                            {t('filesView.addNote')}
                        </button>
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
                                            {t('flashcardsView.newName')}
                                        </button>
                                        <button
                                            className={styles.deleteFolderBtn}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteFolder(folder.id);
                                                setFolderMenuOpen(null);
                                            }}
                                        >
                                            {t('filesView.deleteFolder')}
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
                            const isHighlighted = highlightedItemId === note.id;

                            return (
                                <div
                                    key={note.id}
                                    id={`note-card-${note.id}`}
                                    className={`
                                        ${styles.noteCard}
                                        ${note.is_pinned ? styles.pinnedCard : ''}
                                        ${isDragOver ? styles.dragOver : ''}
                                        ${isDragNotAllowed ? styles.dragNotAllowed : ''}
                                        ${isHighlighted ? styles.highlighted : ''}
                                    `}
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
                                                title={note.is_pinned 
                                                    ? t('filesView.notesView.unpinNote') 
                                                    : t('filesView.notesView.pinNote')}

                                            >
                                                <Pin size={16} />
                                            </button>
                                            <button
                                                className={styles.deleteNoteBtn}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteNote(note.id);
                                                }}
                                                title={t('filesView.deleteNote')}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <p className={styles.noteContent}>
                                        {note.content?.substring(0, 120).replace(/<[^>]*>/g, '')}
                                        {note.content?.length > 120 ? '...' : ''}
                                    </p>
                                    <div className={styles.noteFooter}>
                                        <span className={styles.noteDate}>
                                            {formatDate(note.created_at, t)}
                                        </span>
                                        <span
                                            className={styles.noteType}
                                            style={{ backgroundColor: getTypeColor(note.type) }}
                                        >
                                            {note.type}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        folders.filter(f => currentFolder ? f.parent_folder_id === currentFolder.id : !f.parent_folder_id).length === 0 && (
                            <div className={styles.emptyState}>
                               <p>{currentFolder ? t('filesView.emptyFolder') : t('filesView.noFiles')}</p>
                            </div>
                        )
                    )}
                </div>

                {/* Add-note modal replaced by opening NoteEditor for new notes */}

                {showCollaboratorModal && (
                    <div className={generatorStyles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setShowCollaboratorModal(false)}>
                        <div className={generatorStyles.modalContainer} onClick={(e) => e.stopPropagation()}>
                            <div className={generatorStyles.header}>
                                <h2 className={generatorStyles.title}>{t('filesView.manageCol')}</h2>
                                <button
                                    className={generatorStyles.closeBtn}
                                    onClick={() => setShowCollaboratorModal(false)}
                                    title="Zamknij"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ padding: '0 2rem 2rem 2rem', display: 'flex', flexDirection: 'column', gap: '2rem', flex: 1, overflowY: 'auto' }}>
                                <div className={generatorStyles.formSection}>
                                    <h3 className={generatorStyles.sectionTitle}>{t('filesView.addCol')}</h3>
                                    <form onSubmit={handleAddCollaborator}>
                                        <div className={styles.inputWithButton}>
                                            <input
                                                type="text"
                                                value={collaboratorUsername}
                                                onChange={(e) => setCollaboratorUsername(e.target.value)}
                                                placeholder={t('filesView.nameCol')}
                                                style={{
                                                    background: 'var(--inner_inner_section_bg)',
                                                    color: 'var(--title)',
                                                    padding: '0.75rem 1rem',
                                                    border: '2px solid var(--white_btn_box_shadow)',
                                                    borderRadius: '10px',
                                                    fontSize: '1rem',
                                                    flex: 1,
                                                    fontFamily: 'inherit'
                                                }}
                                            />
                                            <button type="submit" className={styles.btnAdd}>
                                                <UserPlus size={18} />
                                                {t('filesView.add')}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                <div className={generatorStyles.formSection}>
                                    <h3 className={generatorStyles.sectionTitle}>
                                        {t('filesView.col')} ({collaborators.length})
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
                                                        title={t('filesView.deleteCol')}
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className={styles.emptyCollaborators}>
                                            <p>{t('filesView.noCol')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Create Folder Modal */}
                {showCreateFolderModal && (
                    <div className={generatorStyles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setShowCreateFolderModal(false)}>
                        <div className={generatorStyles.modalContainer} onClick={(e) => e.stopPropagation()}>
                            <div className={generatorStyles.header}>
                                <h2 className={generatorStyles.title}>{t('flashcardsView.createFolder')}</h2>
                                <button
                                    className={generatorStyles.closeBtn}
                                    onClick={() => setShowCreateFolderModal(false)}
                                    title={t('flashcardsView.close')}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleCreateFolder} className={generatorStyles.form}>
                                <div className={generatorStyles.formSection}>
                                    <div className={generatorStyles.formGroup}>
                                        <label>{t('flashcardsView.folderName')}</label>
                                        <input
                                            type="text"
                                            value={newFolderName}
                                            onChange={(e) => setNewFolderName(e.target.value)}
                                            placeholder={t('flashcardsView.folderNamePlaceholder')}
                                            autoFocus
                                            required
                                        />
                                    </div>
                                </div>
                                <div className={generatorStyles.formActions}>
                                    <button
                                        type="button"
                                        className={generatorStyles.btnCancel}
                                        onClick={() => setShowCreateFolderModal(false)}
                                    >
                                        {t('flashcardsView.cancel')}
                                    </button>
                                    <button type="submit" className={generatorStyles.btnSubmit}>
                                        {t('flashcardsView.createFolder')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Rename Folder Modal */}
                {editingFolder && (
                    <div className={generatorStyles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setEditingFolder(null)}>
                        <div className={generatorStyles.modalContainer} onClick={(e) => e.stopPropagation()}>
                            <div className={generatorStyles.header}>
                                <h2 className={generatorStyles.title}>{t('flashcardsView.renameFolderName')}</h2>
                                <button
                                    className={generatorStyles.closeBtn}
                                    onClick={() => setEditingFolder(null)}
                                    title={t('flashcardsView.close')}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleRenameFolder} className={generatorStyles.form}>
                                <div className={generatorStyles.formSection}>
                                    <div className={generatorStyles.formGroup}>
                                        <label>{t('flashcardsView.newNameFolder')}</label>
                                        <input
                                            type="text"
                                            value={editingFolder.name}
                                            onChange={(e) => setEditingFolder({ ...editingFolder, name: e.target.value })}
                                            placeholder={t('flashcardsView.folderNamePlaceholder')}
                                            autoFocus
                                            required
                                        />
                                    </div>
                                </div>
                                <div className={generatorStyles.formActions}>
                                    <button
                                        type="button"
                                        className={generatorStyles.btnCancel}
                                        onClick={() => setEditingFolder(null)}
                                    >
                                        {t('flashcardsView.cancel')}
                                    </button>
                                    <button type="submit" className={generatorStyles.btnSubmit}>
                                        {t('flashcardsView.newName')}
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
                        isNew={selectedNote.id === null}
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