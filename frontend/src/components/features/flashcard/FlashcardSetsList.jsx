import { useState, useEffect } from "react";
import axios from "axios";
import { BookOpen, Trash2, Play, Brain, Settings, Pin, Folder, MoreVertical } from "lucide-react";
import styles from "../../../css/features/FlashcardsView.module.css";

export default function FlashcardSetsList({ sets, loading, userId, notebookId, folders, currentFolder, onStartLearning, onManageSet, onDelete, onOpenFolder, onDeleteFolder, onRenameFolder, onMoveSetToFolder, onDragStateChange }) {
    const [progress, setProgress] = useState({});
    const [loadingProgress, setLoadingProgress] = useState({});

    // Drag and drop state
    const [draggedSet, setDraggedSet] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [dragNotAllowedIndex, setDragNotAllowedIndex] = useState(null);
    const [localSets, setLocalSets] = useState([]);

    // Folder drag state
    const [draggedFolder, setDraggedFolder] = useState(null);
    const [dragOverFolder, setDragOverFolder] = useState(null);
    const [dragOverFolderIndex, setDragOverFolderIndex] = useState(null);
    const [folderMenuOpen, setFolderMenuOpen] = useState(null);

    // Notify parent component of drag state changes
    useEffect(() => {
        if (onDragStateChange) {
            onDragStateChange({ draggedSet, draggedFolder });
        }
    }, [draggedSet, draggedFolder, onDragStateChange]);

    useEffect(() => {
        setLocalSets(sets);
    }, [sets]);

    useEffect(() => {
        if (localSets.length > 0 && userId) {
            localSets.forEach(set => {
                fetchProgress(set.id);
            });
        }
    }, [localSets, userId]);

    const fetchProgress = async (setId) => {
        if (progress[setId] !== undefined) return;

        try {
            setLoadingProgress(prev => ({...prev, [setId]: true}));
            const response = await axios.get(`http://localhost:8000/flashcards/progress/${userId}/${setId}`);
            setProgress(prev => ({...prev, [setId]: response.data}));
        } catch (error) {
            setProgress(prev => ({...prev, [setId]: { progress_percentage: 0 }}));
        } finally {
            setLoadingProgress(prev => ({...prev, [setId]: false}));
        }
    };

    // Get filtered and sorted flashcard sets
    const getSortedSets = () => {
        // Filter by current folder context
        let filtered = currentFolder
            ? localSets.filter(set => set.folder_id === currentFolder.id)
            : localSets.filter(set => !set.folder_id);

        // Sort sets: pinned first, then by grid_position, then by date
        const sorted = [...filtered].sort((a, b) => {
            // First, pinned sets always come first
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;

            // For pinned sets, sort by grid_position
            if (a.is_pinned && b.is_pinned) {
                if (a.grid_position !== null && b.grid_position !== null) {
                    return a.grid_position - b.grid_position;
                }
            }

            // For non-pinned sets, sort by grid_position
            if (!a.is_pinned && !b.is_pinned) {
                if (a.grid_position !== null && b.grid_position !== null) {
                    return a.grid_position - b.grid_position;
                }
            }

            // Default to date
            return new Date(b.created_at) - new Date(a.created_at);
        });

        return sorted;
    };

    // Pin toggle handler
    const handleTogglePin = async (setId, isPinned, e) => {
        e.stopPropagation();
        try {
            await axios.patch(`http://localhost:8000/flashcards/set/${setId}/pin`, {
                is_pinned: isPinned
            });
            // Update local state
            setLocalSets(prevSets =>
                prevSets.map(set =>
                    set.id === setId ? { ...set, is_pinned: isPinned } : set
                )
            );
        } catch (err) {
            console.error('Error toggling pin:', err);
            alert("Błąd przypinania zestawu fiszek");
        }
    };

    // Drag handlers
    const handleDragStart = (e, set, index) => {
        setDraggedSet({ set, index });
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.style.opacity = '0.5';

        // Add flashcard set data to dataTransfer for drag-to-copy to sidebar
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'flashcard-set',
            setId: set.id,
            userId: userId,
            sourceNotebookId: set.notebook_id
        }));
    };

    const handleDragEnd = (e) => {
        e.currentTarget.style.opacity = '1';
        setDraggedSet(null);
        setDragOverIndex(null);
        setDragNotAllowedIndex(null);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();

        const sortedSets = getSortedSets();
        const targetSet = sortedSets[index];
        const draggedSetData = draggedSet?.set;

        // Allow drag over only if both sets have same pinned status
        if (draggedSetData && targetSet) {
            if (draggedSetData.is_pinned === targetSet.is_pinned) {
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

        if (!draggedSet || draggedSet.index === dropIndex) {
            setDragOverIndex(null);
            return;
        }

        const sortedSets = getSortedSets();
        const draggedSetData = draggedSet.set;
        const targetSet = sortedSets[dropIndex];

        // Prevent dropping pinned set on unpinned set and vice versa
        if (draggedSetData.is_pinned !== targetSet.is_pinned) {
            setDragOverIndex(null);
            return;
        }

        // Reorder sets locally
        const newSets = [...sortedSets];
        const [removed] = newSets.splice(draggedSet.index, 1);
        newSets.splice(dropIndex, 0, removed);

        // Update grid positions
        const updatedSets = newSets.map((set, idx) => ({
            ...set,
            grid_position: idx
        }));

        // Update local state immediately
        setLocalSets(updatedSets);

        // Update backend
        try {
            await Promise.all(
                updatedSets.map(set =>
                    axios.patch(`http://localhost:8000/flashcards/set/${set.id}/position`, {
                        grid_position: set.grid_position
                    })
                )
            );
        } catch (err) {
            console.error('Error updating flashcard set positions:', err);
            setLocalSets(sets); // Revert on error
        }

        setDragOverIndex(null);
    };

    // Folder drag handlers for reordering
    const handleFolderCardDragStart = (e, folder, index) => {
        setDraggedFolder({ folder, index });
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.style.opacity = '0.5';

        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'flashcard-set-folder',
            folderId: folder.id,
            userId: userId,
            sourceNotebookId: notebookId
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

        const foldersList = folders.filter(f => currentFolder ? f.parent_folder_id === currentFolder.id : !f.parent_folder_id);
        const newFolders = [...foldersList];
        const [removed] = newFolders.splice(draggedFolder.index, 1);
        newFolders.splice(dropIndex, 0, removed);

        const updatedFolders = newFolders.map((folder, idx) => ({
            ...folder,
            grid_position: idx
        }));

        try {
            await Promise.all(
                updatedFolders.map(folder =>
                    axios.patch(`http://localhost:8000/flashcard-set-folders/${folder.id}/position`, {
                        grid_position: folder.grid_position
                    })
                )
            );
        } catch (err) {
            console.error('Error updating folder positions:', err);
        }

        setDragOverFolderIndex(null);
    };

    // Drag set to folder handlers
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

        if (draggedSet) {
            try {
                await onMoveSetToFolder(draggedSet.set.id, folderId);
                setDraggedSet(null);
            } catch (err) {
                console.error('Error dropping set into folder:', err);
            }
        }
    };

    const handleDelete = async (setId) => {
        if (!window.confirm("Czy na pewno chcesz usunąć ten zestaw fiszek?")) return;

        try {
            await axios.delete(`http://localhost:8000/flashcards/set/${setId}`);
            alert("Zestaw usunięty!");
            onDelete();
        } catch (error) {
            alert("Błąd podczas usuwania zestawu");
        }
    };

    const getDifficultyColor = (difficulty) => {
        switch(difficulty) {
            case "łatwy": return "#4CAF50";
            case "średni": return "#FF9800";
            case "trudny": return "#F44336";
            default: return "#6c63ff";
        }
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Ładowanie fiszek...</p>
            </div>
        );
    }

    // Get filtered folders and sets for current view
    const currentFolders = folders.filter(f =>
        currentFolder ? f.parent_folder_id === currentFolder.id : !f.parent_folder_id
    );
    const currentSets = getSortedSets();

    // Show empty state only if there are no folders AND no sets in current view
    if (currentFolders.length === 0 && currentSets.length === 0) {
        return (
            <div className={styles.emptyState}>
                <Brain className={styles.emptyIcon} size={64} />
                <h3>Brak zestawów fiszek</h3>
                <p>Kliknij "Generuj fiszki", aby stworzyć pierwszy zestaw!</p>
            </div>
        );
    }

    return (
        <div className={styles.setsList}>
            {/* Render folders */}
            {currentFolders
                .sort((a, b) => {
                    if (a.grid_position !== null && b.grid_position !== null) {
                        return a.grid_position - b.grid_position;
                    }
                    return new Date(b.created_at) - new Date(a.created_at);
                })
                .map((folder, index) => {
                    const setsInFolder = localSets.filter(set => set.folder_id === folder.id).length;
                    const isDragOverFolder = dragOverFolder === folder.id;
                    const isDragOverFolderIndex = dragOverFolderIndex === index;

                    return (
                        <div
                            key={`folder-${folder.id}`}
                            className={`${styles.folderCard} ${isDragOverFolder ? styles.dragOverFolder : ''} ${isDragOverFolderIndex ? styles.dragOver : ''}`}
                            draggable
                            onDragStart={(e) => handleFolderCardDragStart(e, folder, index)}
                            onDragEnd={handleFolderCardDragEnd}
                            onDragOver={(e) => {
                                handleFolderCardDragOver(e, index);
                                if (draggedSet) {
                                    handleFolderDragOver(e, folder.id);
                                }
                            }}
                            onDragLeave={(e) => {
                                handleFolderCardDragLeave(e);
                                if (draggedSet) {
                                    handleFolderDragLeave(e);
                                }
                            }}
                            onDrop={(e) => {
                                if (draggedFolder) {
                                    handleFolderCardDrop(e, index);
                                } else if (draggedSet) {
                                    handleFolderDrop(e, folder.id);
                                }
                            }}
                            onClick={(e) => {
                                if (!draggedFolder && !draggedSet && folderMenuOpen !== folder.id) {
                                    onOpenFolder(folder);
                                }
                            }}
                        >
                            <div className={styles.folderHeader}>
                                <div className={styles.folderTitle}>
                                    <Folder size={24} style={{color: '#f59e0b'}} />
                                    <h3>{folder.name}</h3>
                                </div>
                                <button
                                    className={styles.folderMenuBtn}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setFolderMenuOpen(folderMenuOpen === folder.id ? null : folder.id);
                                    }}
                                >
                                    <MoreVertical size={18} />
                                </button>
                            </div>
                            <div className={styles.folderStats}>
                                <span className={styles.folderCount}>
                                    {setsInFolder} {setsInFolder === 1 ? 'zestaw' : setsInFolder > 1 && setsInFolder < 5 ? 'zestawy' : 'zestawów'}
                                </span>
                            </div>

                            {folderMenuOpen === folder.id && (
                                <div className={styles.folderMenu}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRenameFolder(folder);
                                            setFolderMenuOpen(null);
                                        }}
                                        className={styles.menuItem}
                                    >
                                        Zmień nazwę
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteFolder(folder.id);
                                            setFolderMenuOpen(null);
                                        }}
                                        className={styles.menuItemDanger}
                                    >
                                        Usuń
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}

            {/* Render flashcard sets */}
            {currentSets.map((set, index) => {
                const setProgress = progress[set.id];
                const isLoadingProgress = loadingProgress[set.id];
                const isBeingDragged = draggedSet?.set.id === set.id;
                const isDragOver = dragOverIndex === index;
                const isDragNotAllowed = dragNotAllowedIndex === index;

                return (
                    <div
                        key={set.id}
                        className={`${styles.setCard} ${set.is_pinned ? styles.pinnedCard : ''} ${isDragOver ? styles.dragOver : ''} ${isDragNotAllowed ? styles.dragNotAllowed : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, set, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index)}
                    >
                        <div className={styles.setHeader}>
                            <div className={styles.setTitle}>
                                <BookOpen size={20} />
                                <h3>{set.title}</h3>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button
                                    className={`${styles.pinSetBtn} ${set.is_pinned ? styles.pinned : ''}`}
                                    onClick={(e) => handleTogglePin(set.id, !set.is_pinned, e)}
                                    title={set.is_pinned ? "Odepnij zestaw" : "Przypnij zestaw"}
                                >
                                    <Pin size={16} />
                                </button>
                                <span
                                    className={styles.difficultyBadge}
                                    style={{ '--difficulty-color': getDifficultyColor(set.difficulty) }}
                                >
                                    {set.difficulty}
                                </span>
                            </div>
                        </div>

                        {set.description && (
                            <p className={styles.setDescription}>{set.description}</p>
                        )}

                        <div className={styles.setStats}>
                            <div className={styles.stat}>
                                <span className={styles.statLabel}>Fiszek</span>
                                <span className={styles.statValue}>{set.total_cards}</span>
                            </div>
                            <div className={styles.stat}>
                                <span className={styles.statLabel}>Postęp</span>
                                <span className={styles.statValue}>
                                    {setProgress && !isLoadingProgress
                                        ? `${setProgress.progress_percentage ?? 0}%`
                                        : isLoadingProgress
                                        ? '...'
                                        : '0%'}
                                </span>
                            </div>
                        </div>

                        <div className={styles.setActions}>
                            <button
                                className={styles.btnLearn}
                                onClick={() => onStartLearning(set)}
                            >
                                <Play size={18} />
                                Ucz się
                            </button>
                            <button
                                className={styles.btnManage}
                                onClick={() => onManageSet(set)}
                                title="Zarządzaj fiszkami"
                            >
                                <Settings size={18} />
                            </button>
                            <button
                                className={styles.btnDelete}
                                onClick={() => handleDelete(set.id)}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
