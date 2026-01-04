import { useState, useEffect } from "react";
import toast from 'react-hot-toast';
import { confirmModal } from '../../../utils/confirmModal';
import { Layers, Trash2, Play, Brain, Settings, Pin, Folder, MoreVertical } from "lucide-react";
import styles from "../../../css/features/FlashcardsView.module.css";
import { getFlashcardProgress, deleteFlashcardSet, pinFlashcardSet, updateFlashcardSetPosition, updateFlashcardFolderPosition, moveFlashcardFolder } from '../../../services/flashcardService';

export default function FlashcardSetsList({ sets, loading, userId, notebookId, folders, currentFolder, highlightedItemId, sortBy, onStartLearning, onManageSet, onDelete, onRefreshFolders, onOpenFolder, onDeleteFolder, onRenameFolder, onMoveSetToFolder, onDragStateChange }) {
    const [progress, setProgress] = useState({});
    const [loadingProgress, setLoadingProgress] = useState({});

    const [draggedSet, setDraggedSet] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [dragNotAllowedIndex, setDragNotAllowedIndex] = useState(null);
    const [localSets, setLocalSets] = useState([]);

    const [draggedFolder, setDraggedFolder] = useState(null);
    const [dragOverFolder, setDragOverFolder] = useState(null);
    const [dragOverFolderIndex, setDragOverFolderIndex] = useState(null);
    const [folderMenuOpen, setFolderMenuOpen] = useState(null);

    useEffect(() => {
        if (onDragStateChange) {
            onDragStateChange({ draggedSet, draggedFolder });
        }
    }, [draggedSet, draggedFolder, onDragStateChange]);

    useEffect(() => {
        // Only update localSets if the sets prop has meaningfully changed
        // Don't compare with localSets to avoid resetting optimistic updates
        setLocalSets(prevLocalSets => {
            // Sort by ID before comparing to avoid order differences
            const sortById = (a, b) => a.id - b.id;
            const setsString = JSON.stringify(sets.map(s => ({ id: s.id, grid_position: s.grid_position, is_pinned: s.is_pinned, folder_id: s.folder_id })).sort(sortById));
            const localSetsString = JSON.stringify(prevLocalSets.map(s => ({ id: s.id, grid_position: s.grid_position, is_pinned: s.is_pinned, folder_id: s.folder_id })).sort(sortById));

            // Only update if the data has actually changed
            if (setsString !== localSetsString) {
                return sets;
            }
            return prevLocalSets;
        });
    }, [sets]);

    useEffect(() => {
        if (localSets.length > 0 && userId) {
            localSets.forEach(set => {
                fetchProgress(set.id);
            });
        }
    }, [localSets, userId]);

    useEffect(() => {
        // Zmieniono z highlightedId na highlightedItemId
        if (highlightedItemId) { 
            // Małe opóźnienie, aby upewnić się, że folder zdążył się otworzyć
            const timer = setTimeout(() => {
                // Zmieniono z highlightedId na highlightedItemId
                const element = document.getElementById(`set-card-${highlightedItemId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [highlightedItemId]);

    const fetchProgress = async (setId) => {
        if (progress[setId] !== undefined) return;

        try {
            setLoadingProgress(prev => ({...prev, [setId]: true}));
            const data = await getFlashcardProgress(userId, setId);
            setProgress(prev => ({...prev, [setId]: data}));
        } catch (error) {
            setProgress(prev => ({...prev, [setId]: { progress_percentage: 0 }}));
        } finally {
            setLoadingProgress(prev => ({...prev, [setId]: false}));
        }
    };

    const getSortedSets = () => {
        let filtered = currentFolder
            ? localSets.filter(set => set.folder_id === currentFolder.id)
            : localSets.filter(set => !set.folder_id);

        const sorted = [...filtered].sort((a, b) => {
            // First, pinned sets always come first
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;

            if (sortBy === 'date_desc') {
                // For date_desc, use grid_position if available
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
            }

            // For other sort types, ignore grid_position and use the selected sort
            if (sortBy === 'date_asc') {
                return new Date(a.created_at) - new Date(b.created_at);
            } else if (sortBy === 'name_asc') {
                return a.title.localeCompare(b.title);
            } else if (sortBy === 'name_desc') {
                return b.title.localeCompare(a.title);
            }

            return 0;
        });

        return sorted;
    };

    const handleTogglePin = async (setId, isPinned, e) => {
        e.stopPropagation();
        try {
            await pinFlashcardSet(setId, isPinned);
            setLocalSets(prevSets =>
                prevSets.map(set =>
                    set.id === setId ? { ...set, is_pinned: isPinned } : set
                )
            );
        } catch (err) {
            console.error('Error toggling pin:', err);
            toast.error("Błąd przypinania zestawu fiszek");
        }
    };

    const handleDragStart = (e, set, index) => {
        setDraggedSet({ set, index });
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.style.opacity = '0.5';
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

        if (draggedSetData.is_pinned !== targetSet.is_pinned) {
            setDragOverIndex(null);
            return;
        }
        const newSets = [...sortedSets];
        const [removed] = newSets.splice(draggedSet.index, 1);
        newSets.splice(dropIndex, 0, removed);
        const updatedSets = newSets.map((set, idx) => ({
            ...set,
            grid_position: idx
        }));

        // Find only the sets whose position actually changed
        const setsToUpdate = updatedSets.filter(set => {
            const originalSet = sortedSets.find(s => s.id === set.id);
            return originalSet && originalSet.grid_position !== set.grid_position;
        });

        // Update local state immediately
        setLocalSets(prevSets => {
            const allSets = [...prevSets];
            updatedSets.forEach(updated => {
                const idx = allSets.findIndex(s => s.id === updated.id);
                if (idx !== -1) {
                    allSets[idx] = updated;
                }
            });
            return allSets;
        });

        try {
            // Only update sets whose position actually changed
            await Promise.all(
                setsToUpdate.map(set =>
                    updateFlashcardSetPosition(set.id, set.grid_position)
                )
            );
        } catch (err) {
            console.error('Error updating flashcard set positions:', err);
            setLocalSets(sets);
        }

        setDragOverIndex(null);
    };

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
                    updateFlashcardFolderPosition(folder.id, folder.grid_position)
                )
            );
        } catch (err) {
            console.error('Error updating folder positions:', err);
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

        // Handle set drop
        if (draggedSet) {
            try {
                await onMoveSetToFolder(draggedSet.set.id, folderId);
                setDraggedSet(null);
            } catch (err) {
                console.error('Error dropping set into folder:', err);
            }
        }

        // Handle folder drop
        if (draggedFolder) {
            try {
                await moveFlashcardFolder(draggedFolder.folder.id, folderId);
                setDraggedFolder(null);
                await onRefreshFolders(); // Refresh folders
                onDelete(); // Refresh flashcard sets
            } catch (err) {
                console.error('Error moving folder into folder:', err);
                toast.error("Błąd przenoszenia folderu");
            }
        }
    };

    const handleDelete = async (setId) => {
        const confirmed = await confirmModal("Czy na pewno chcesz usunąć ten zestaw fiszek?");
        if (!confirmed) return;

        try {
            await deleteFlashcardSet(setId);
            toast.success("Zestaw usunięty!");
            onDelete();
        } catch (error) {
            toast.error("Błąd podczas usuwania zestawu");
        }
    };

    const getDifficultyText = (difficulty) => {
        const difficultyMap = {
            "łatwy": { color: "#4CAF50", label: "Łatwy" },
            "średni": { color: "#FF9800", label: "Średni" },
            "trudny": { color: "#F44336", label: "Trudny" }
        };
        const config = difficultyMap[difficulty] || difficultyMap["średni"];
        return (
            <span style={{ color: config.color, fontWeight: 700, fontSize: '0.875rem' }}>
                {config.label}
            </span>
        );
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Ładowanie fiszek...</p>
            </div>
        );
    }

    const currentFolders = folders.filter(f =>
        currentFolder ? f.parent_folder_id === currentFolder.id : !f.parent_folder_id
    );
    const currentSets = getSortedSets();

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
                                    handleFolderDrop(e, folder.id);
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
                                    <Folder size={72} style={{color: '#f59e0b', filter: 'drop-shadow(0 2px 4px rgba(245, 158, 11, 0.15))'}} />
                                    <h3>{folder.name}</h3>
                                    <span className={styles.folderCount}>
                                        {setsInFolder} {setsInFolder === 1 ? 'zestaw' : setsInFolder > 1 && setsInFolder < 5 ? 'zestawy' : 'zestawów'}
                                    </span>
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
                const isHighlighted = highlightedItemId === set.id;

                return (
                    <div
                        id={`set-card-${set.id}`}
                        key={set.id}
                        className={`
                            ${styles.setCard} 
                            ${set.is_pinned ? styles.pinnedCard : ''} 
                            ${isDragOver ? styles.dragOver : ''} 
                            ${isDragNotAllowed ? styles.dragNotAllowed : ''}
                            ${isHighlighted ? styles.highlighted : ''}
                        `}
                        draggable
                        onDragStart={(e) => handleDragStart(e, set, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index)}
                    >
                        <div className={styles.setHeader}>
                            <div className={styles.setTitle}>
                                <Layers size={20} />
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
                                <button
                                    className={styles.deleteSetBtn}
                                    onClick={(e) => { e.stopPropagation(); handleDelete(set.id); }}
                                    title="Usuń zestaw"
                                >
                                    <Trash2 size={16} />
                                </button>
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
                                <span className={styles.statLabel}>Poziom</span>
                                <span className={styles.statValue}>
                                    {getDifficultyText(set.difficulty)}
                                </span>
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
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
