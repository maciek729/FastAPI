import { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Search, X, Folder } from "lucide-react";
import FlashcardGenerator from "./FlashcardGenerator";
import FlashcardSetsList from "./FlashcardSetsList";
import FlashcardLearning from "./FlashcardLearning";
import FlashcardSetManager from "./FlashcardSetManager";
import styles from "../../../css/features/FlashcardsView.module.css";

export default function FlashcardsView({ notebookId, userData }) {
    const [view, setView] = useState("list");
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [flashcardSets, setFlashcardSets] = useState([]);
    const [selectedSet, setSelectedSet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDifficulty, setFilterDifficulty] = useState('all');
    const [sortBy, setSortBy] = useState('date_desc');

    // Folder state
    const [folders, setFolders] = useState([]);
    const [currentFolder, setCurrentFolder] = useState(null);
    const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [folderMenuOpen, setFolderMenuOpen] = useState(null);
    const [editingFolder, setEditingFolder] = useState(null);
    const [dragOverBreadcrumb, setDragOverBreadcrumb] = useState(false);
    const [draggedSet, setDraggedSet] = useState(null);
    const [draggedFolder, setDraggedFolder] = useState(null);

    useEffect(() => {
        if (notebookId) {
            fetchFlashcardSets();
            fetchFolders();
        }
    }, [notebookId]);

    const fetchFlashcardSets = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`http://localhost:8000/flashcards/sets/${notebookId}`);
            setFlashcardSets(response.data);
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    const fetchFolders = async () => {
        try {
            const response = await axios.get('http://localhost:8000/flashcard-set-folders/list', {
                params: {
                    notebook_id: notebookId,
                    user_id: userData.id
                }
            });
            setFolders(response.data);
        } catch (err) {
            console.error('Error fetching folders:', err);
        }
    };

    const handleGenerateSuccess = () => {
        fetchFlashcardSets();
        setShowGenerateModal(false);
    };

    const handleStartLearning = (set) => {
        setSelectedSet(set);
        setView("learning");
    };

    const handleBackToList = () => {
        setView("list");
        setSelectedSet(null);
        fetchFlashcardSets();
    };

    const handleManageSet = (set) => {
        setSelectedSet(set);
        setView("manage");
    };

    const hasActiveFilters = () => {
        return searchQuery !== '' || filterDifficulty !== 'all' || sortBy !== 'date_desc';
    };

    const clearFilters = () => {
        setSearchQuery('');
        setFilterDifficulty('all');
        setSortBy('date_desc');
    };

    // Folder handlers
    const handleCreateFolder = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;

        try {
            await axios.post('http://localhost:8000/flashcard-set-folders/create', {
                notebook_id: notebookId,
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
        if (!window.confirm('Czy na pewno chcesz usunąć ten folder? Zestawy fiszek zostaną przeniesione do głównego widoku.')) return;

        try {
            await axios.delete(`http://localhost:8000/flashcard-set-folders/${folderId}`);
            if (currentFolder?.id === folderId) {
                setCurrentFolder(null);
            }
            fetchFolders();
            fetchFlashcardSets();
        } catch (err) {
            console.error('Error deleting folder:', err);
            alert("Błąd usuwania folderu");
        }
    };

    const handleRenameFolder = async (e) => {
        e.preventDefault();
        if (!editingFolder || !editingFolder.name.trim()) return;

        try {
            await axios.patch(`http://localhost:8000/flashcard-set-folders/${editingFolder.id}/rename`, {
                name: editingFolder.name
            });
            setEditingFolder(null);
            fetchFolders();
        } catch (err) {
            console.error('Error renaming folder:', err);
            alert("Błąd zmiany nazwy folderu");
        }
    };

    const getFilteredAndSortedSets = () => {
        let filtered = flashcardSets;

        if (searchQuery) {
            filtered = filtered.filter(set =>
                set.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (filterDifficulty !== 'all') {
            filtered = filtered.filter(set => set.difficulty === filterDifficulty);
        }

        filtered = [...filtered].sort((a, b) => {
            if (sortBy === 'date_desc') {
                return new Date(b.created_at) - new Date(a.created_at);
            } else if (sortBy === 'date_asc') {
                return new Date(a.created_at) - new Date(b.created_at);
            } else if (sortBy === 'name_asc') {
                return a.title.localeCompare(b.title);
            } else if (sortBy === 'name_desc') {
                return b.title.localeCompare(a.title);
            }
            return 0;
        });

        return filtered;
    };

    // Breadcrumb drag handlers - for dragging items to parent folder
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

        // Handle flashcard set drop
        if (draggedSet) {
            try {
                await axios.post('http://localhost:8000/flashcard-set-folders/move-set', {
                    set_id: draggedSet.set.id,
                    folder_id: parentFolderId
                });

                // Update local state immediately
                setFlashcardSets(prevSets =>
                    prevSets.map(set =>
                        set.id === draggedSet.set.id ? { ...set, folder_id: parentFolderId } : set
                    )
                );

                await fetchFolders();
                setDraggedSet(null);
            } catch (err) {
                console.error('Error moving set to parent folder:', err);
                alert("Błąd przenoszenia zestawu fiszek");
            }
        }

        // Handle folder drop
        if (draggedFolder) {
            try {
                await axios.patch(`http://localhost:8000/flashcard-set-folders/${draggedFolder.folder.id}/move`, {
                    parent_folder_id: parentFolderId
                });
                setDraggedFolder(null);
                await fetchFolders();
                fetchFlashcardSets();
            } catch (err) {
                console.error('Error moving folder to parent:', err);
                alert("Błąd przenoszenia folderu");
            }
        }
    };

    if (view === "learning" && selectedSet) {
        return (
            <FlashcardLearning
                flashcardSet={selectedSet}
                userId={userData.id}
                onBack={handleBackToList}
            />
        );
    }

    if (view === "manage" && selectedSet) {
        return (
            <FlashcardSetManager
                flashcardSet={selectedSet}
                userId={userData.id}
                onBack={handleBackToList}
            />
        );
    }

    return (
        <div className={styles.flashcardsView}>
            <div className={styles.headerSection}>
                <div className={styles.leftSection}>
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
                            'Fiszki'
                        )}
                    </h1>
                    {currentFolder && (
                        <button
                            onClick={closeFolder}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 0.75rem',
                                background: 'transparent',
                                border: '2px solid rgba(245, 158, 11, 0.3)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                color: '#f59e0b',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            ← Powrót
                        </button>
                    )}
                    <div className={styles.searchBox}>
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Szukaj fiszek..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>
                    <select
                        value={filterDifficulty}
                        onChange={(e) => setFilterDifficulty(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="all">Wszystkie poziomy</option>
                        <option value="łatwy">Łatwy</option>
                        <option value="średni">Średni</option>
                        <option value="trudny">Trudny</option>
                    </select>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="date_desc">Najnowsze</option>
                        <option value="date_asc">Najstarsze</option>
                        <option value="name_asc">Nazwa A-Z</option>
                        <option value="name_desc">Nazwa Z-A</option>
                    </select>
                    {hasActiveFilters() && (
                        <button
                            className={styles.clearFiltersBtn}
                            onClick={clearFilters}
                            title="Wyczyść wszystkie filtry"
                        >
                            <X size={16} />
                            Wyczyść filtry
                        </button>
                    )}
                </div>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                    <button
                        className={styles.addFolderBtn}
                        onClick={() => setShowCreateFolderModal(true)}
                    >
                        <Folder size={18} />
                        Nowy folder
                    </button>
                    <button
                        className={styles.addNoteBtn}
                        onClick={() => setShowGenerateModal(true)}
                    >
                        <Plus size={18} />
                        Generuj fiszki
                    </button>
                </div>
            </div>

            <FlashcardSetsList
                sets={getFilteredAndSortedSets()}
                loading={loading}
                userId={userData.id}
                notebookId={notebookId}
                folders={folders}
                currentFolder={currentFolder}
                onStartLearning={handleStartLearning}
                onManageSet={handleManageSet}
                onDelete={fetchFlashcardSets}
                onOpenFolder={openFolder}
                onDeleteFolder={handleDeleteFolder}
                onRenameFolder={(folder) => setEditingFolder(folder)}
                onMoveSetToFolder={async (setId, folderId) => {
                    try {
                        await axios.post('http://localhost:8000/flashcard-set-folders/move-set', {
                            set_id: setId,
                            folder_id: folderId
                        });

                        // Update local state immediately to avoid loading screen
                        setFlashcardSets(prevSets =>
                            prevSets.map(set =>
                                set.id === setId ? { ...set, folder_id: folderId } : set
                            )
                        );

                        // Fetch folders to update counts
                        await fetchFolders();
                    } catch (err) {
                        console.error('Error moving set:', err);
                        alert("Błąd przenoszenia zestawu fiszek");
                    }
                }}
                onDragStateChange={({ draggedSet, draggedFolder }) => {
                    setDraggedSet(draggedSet);
                    setDraggedFolder(draggedFolder);
                }}
            />

            {showGenerateModal && (
                <div className={styles.modalOverlay} onClick={() => setShowGenerateModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <FlashcardGenerator
                            notebookId={notebookId}
                            userId={userData.id}
                            onSuccess={handleGenerateSuccess}
                            onCancel={() => setShowGenerateModal(false)}
                        />
                    </div>
                </div>
            )}

            {/* Create Folder Modal */}
            {showCreateFolderModal && (
                <div className={styles.modalOverlay} onClick={() => setShowCreateFolderModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{maxWidth: '450px'}}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>Utwórz nowy folder</h2>
                            <button
                                className={styles.closeBtn}
                                onClick={() => setShowCreateFolderModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateFolder} style={{padding: '2rem'}}>
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
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{maxWidth: '450px'}}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>Zmień nazwę folderu</h2>
                            <button
                                className={styles.closeBtn}
                                onClick={() => setEditingFolder(null)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleRenameFolder} style={{padding: '2rem'}}>
                            <div className={styles.formGroup}>
                                <label>Nowa nazwa</label>
                                <input
                                    type="text"
                                    value={editingFolder.name}
                                    onChange={(e) => setEditingFolder({...editingFolder, name: e.target.value})}
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
        </div>
    );
}
