import { useState, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
import { confirmModal } from '../../../utils/confirmModal';
import { Trash2, Pin, Folder, MoreVertical, X } from 'lucide-react';
import styles from "../../../css/features/TestsView.module.css";
import * as testsService from '../../../services/testsService';
import { LanguageContext } from '../../../translations/LanguageContext';
import translations from '../../../translations/translation.json';

export default function TestsList({
    tests,
    setTests,
    folders,
    currentFolder,
    searchQuery,
    filterSource,
    sortBy,
    userData,
    notebookId,
    onShowDetails,
    onRefreshFolders,
    draggedTest,
    setDraggedTest,
    draggedFolder,
    setDraggedFolder,
    folderMenuOpen,
    setFolderMenuOpen,
    editingFolder,
    setEditingFolder,
    onOpenFolder,
    onDeleteFolder,
    onRenameFolder,
    isGenerating,
    loading
}) {
    const { language } = useContext(LanguageContext);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [dragNotAllowedIndex, setDragNotAllowedIndex] = useState(null);
    const [dragOverFolder, setDragOverFolder] = useState(null);
    const [dragOverFolderIndex, setDragOverFolderIndex] = useState(null);

    const t = (key) => {
        const keys = key.split('.');
        let translation = translations[language];
        for (const k of keys) {
            translation = translation?.[k];
            if (!translation) return key;
        }
        return translation || key;
    };

    const getSourceLabel = (sourceType) => {
        const labels = {
            'manual': {
                text: 'Ręczny opis',
                color: 'var(--purple_brighter)',
                bg: 'var(--purple_brighter_bg)',
                border: 'var(--purple_brighter_border)'
            },
            'file': {
                text: 'Z pliku',
                color: '#3b82f6',
                bg: '#3b82f615',
                border: '#3b82f640'
            },
            'note': {
                text: 'Z notatki',
                color: '#10b981',
                bg: '#10b98115',
                border: '#10b98140'
            }
        };
        return labels[sourceType] || labels['manual'];
    };

    const handleTogglePin = async (testId, isPinned) => {
        try {
            await testsService.togglePinTest(testId, isPinned);
            setTests(prevTests =>
                prevTests.map(test =>
                    test.id === testId ? { ...test, is_pinned: isPinned } : test
                )
            );
        } catch (err) {
            console.error('Error toggling pin:', err);
            toast.error("Błąd przypinania testu");
        }
    };

    const handleDeleteTest = async (testId) => {
        const confirmed = await confirmModal('Czy na pewno chcesz usunąć ten test?');
        if (!confirmed) return;

        try {
            await testsService.deleteTest(testId, userData.id);
            toast.success('Test usunięty');
            setTests(prevTests => prevTests.filter(t => t.id !== testId));
        } catch (err) {
            console.error('Error deleting test:', err);
            toast.error("Błąd usuwania testu");
        }
    };

    const getFilteredAndSortedTests = () => {
        let filtered = tests;

        // Filter by current folder context
        if (currentFolder) {
            filtered = filtered.filter(test => test.folder_id === currentFolder.id);
        } else {
            filtered = filtered.filter(test => !test.folder_id);
        }

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter(test =>
                test.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Filter by source type
        if (filterSource !== 'all') {
            filtered = filtered.filter(test => test.source_type === filterSource);
        }

        // Sort
        filtered = [...filtered].sort((a, b) => {
            // First, pinned tests always come first
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;

            if (sortBy === 'date_desc') {
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

            if (sortBy === 'date_asc') {
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

    // Test drag handlers
    const handleDragStart = (e, test, index) => {
        setDraggedTest({ test, index });
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.style.opacity = '0.5';

        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'test',
            testId: test.id,
            userId: userData.id,
            sourceNotebookId: notebookId
        }));
    };

    const handleDragEnd = (e) => {
        e.currentTarget.style.opacity = '1';
        setDraggedTest(null);
        setDragOverIndex(null);
        setDragNotAllowedIndex(null);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();

        const filteredTests = getFilteredAndSortedTests();
        const targetTest = filteredTests[index];
        const draggedTestData = draggedTest?.test;

        if (draggedTestData && targetTest) {
            if (draggedTestData.is_pinned === targetTest.is_pinned) {
                e.dataTransfer.dropEffect = 'move';
                setDragOverIndex(index);
                setDragNotAllowedIndex(null);
            } else {
                e.dataTransfer.dropEffect = 'none';
                setDragOverIndex(null);
                setDragNotAllowedIndex(index);
            }
        } else {
            e.dataTransfer.dropEffect = 'move';
            setDragOverIndex(index);
            setDragNotAllowedIndex(null);
        }
    };

    const handleDrop = async (e, dropIndex) => {
        e.preventDefault();
        setDragNotAllowedIndex(null);

        if (!draggedTest || draggedTest.index === dropIndex) {
            setDragOverIndex(null);
            return;
        }

        const filteredTests = getFilteredAndSortedTests();
        const draggedTestData = draggedTest.test;
        const targetTest = filteredTests[dropIndex];

        if (draggedTestData.is_pinned !== targetTest.is_pinned) {
            setDragOverIndex(null);
            return;
        }

        const newTests = [...filteredTests];
        const [removed] = newTests.splice(draggedTest.index, 1);
        newTests.splice(dropIndex, 0, removed);

        const updatedTests = newTests.map((test, idx) => ({
            ...test,
            grid_position: idx
        }));

        // Update local state immediately
        setTests(prevTests => {
            const allTests = [...prevTests];
            updatedTests.forEach(updated => {
                const idx = allTests.findIndex(t => t.id === updated.id);
                if (idx !== -1) {
                    allTests[idx] = updated;
                }
            });
            return allTests;
        });

        try {
            await Promise.all(
                updatedTests.map(test =>
                    testsService.updateTestPosition(test.id, test.grid_position)
                )
            );
        } catch (err) {
            console.error('Error updating test positions:', err);
            // Revert on error - could fetch fresh data here
        }

        setDragOverIndex(null);
    };

    // Folder drag handlers
    const handleMoveTestToFolder = async (testId, folderId) => {
        try {
            await testsService.moveTestToFolder(testId, folderId);
            setTests(prevTests =>
                prevTests.map(test =>
                    test.id === testId ? { ...test, folder_id: folderId } : test
                )
            );
        } catch (err) {
            console.error('Error moving test:', err);
            toast.error("Błąd przenoszenia testu");
        }
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

        if (draggedTest) {
            await handleMoveTestToFolder(draggedTest.test.id, folderId);
            setDraggedTest(null);
        }

        if (draggedFolder) {
            try {
                await testsService.moveTestFolder(draggedFolder.folder.id, folderId);
                setDraggedFolder(null);
                await onRefreshFolders();
            } catch (err) {
                console.error('Error moving folder into folder:', err);
                toast.error("Błąd przenoszenia folderu");
            }
        }
    };

    // Folder card drag handlers
    const handleFolderCardDragStart = (e, folder, index) => {
        setDraggedFolder({ folder, index });
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.style.opacity = '0.5';

        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'folder',
            folderId: folder.id,
            userId: userData.id,
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

        if (draggedFolder) {
            e.dataTransfer.dropEffect = 'move';
            setDragOverFolderIndex(index);
        }
    };

    const handleFolderCardDrop = async (e, dropIndex) => {
        e.preventDefault();
        e.stopPropagation();

        if (!draggedFolder || draggedFolder.index === dropIndex) {
            setDragOverFolderIndex(null);
            return;
        }

        const foldersList = currentFolder
            ? folders.filter(f => f.parent_folder_id === currentFolder.id)
            : folders.filter(f => !f.parent_folder_id);

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
                    testsService.updateTestFolderPosition(folder.id, folder.grid_position)
                )
            );
            await onRefreshFolders();
        } catch (err) {
            console.error('Error updating folder positions:', err);
        }

        setDragOverFolderIndex(null);
    };

    const getCurrentFolders = () => {
        if (currentFolder) {
            return folders.filter(f => f.parent_folder_id === currentFolder.id);
        }
        return folders.filter(f => !f.parent_folder_id);
    };

    const filteredAndSortedTests = getFilteredAndSortedTests();
    const currentFolders = getCurrentFolders();

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>{t('testGenerator.loadingTests')}</p>
            </div>
        );
    }

    return (
        <div className={styles.cardsContainer}>
            {/* Folders */}
            {currentFolders.map((folder, index) => {
                const folderTests = tests.filter(t => t.folder_id === folder.id);
                const subfolders = folders.filter(f => f.parent_folder_id === folder.id);
                const totalItems = folderTests.length + subfolders.length;

                return (
                    <div
                        key={`folder-${folder.id}`}
                        className={`${styles.folderCard} ${dragOverFolder === folder.id ? styles.folderDragOver : ''} ${dragOverFolderIndex === index ? styles.dragOver : ''}`}
                        onClick={() => onOpenFolder(folder)}
                        draggable={true}
                        onDragStart={(e) => handleFolderCardDragStart(e, folder, index)}
                        onDragEnd={handleFolderCardDragEnd}
                        onDragOver={(e) => {
                            handleFolderDragOver(e, folder.id);
                            handleFolderCardDragOver(e, index);
                        }}
                        onDragLeave={handleFolderDragLeave}
                        onDrop={(e) => {
                            handleFolderDrop(e, folder.id);
                            handleFolderCardDrop(e, index);
                        }}
                    >
                        <div className={styles.folderHeader}>
                            <div className={styles.folderLeft}>
                                <Folder size={24} />
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
                                        onDeleteFolder(folder.id);
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

            {/* Generating Skeleton Card */}
            {isGenerating && (
                <div className={`${styles.testCard} ${styles.skeletonCard}`}>
                    <div className={styles.testCardHeader}>
                        <div className={`${styles.skeleton} ${styles.skeletonTitle}`}></div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <div className={`${styles.skeleton} ${styles.skeletonButton}`}></div>
                            <div className={`${styles.skeleton} ${styles.skeletonButton}`}></div>
                        </div>
                    </div>
                    <div className={styles.testStats}>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>Pytań</span>
                            <div className={`${styles.skeleton} ${styles.skeletonText}`}></div>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>Źródło</span>
                            <div className={`${styles.skeleton} ${styles.skeletonChip}`}></div>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>Wyniki</span>
                            <div className={`${styles.skeleton} ${styles.skeletonText}`}></div>
                        </div>
                    </div>
                    <div className={styles.generatingText}>
                        <div className={styles.spinner}></div>
                        <span>{t('testGenerator.generatingTest')}</span>
                    </div>
                </div>
            )}

            {/* Tests */}
            {filteredAndSortedTests.length > 0 ? (
                filteredAndSortedTests.map((test, index) => (
                    <div
                        key={test.id}
                        className={`${styles.testCard} ${dragOverIndex === index ? styles.dragOver : ''} ${dragNotAllowedIndex === index ? styles.dragNotAllowed : ''} ${test.is_pinned ? styles.pinnedCard : ''}`}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, test, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                    >
                        <div className={styles.testCardHeader}>
                            <h3 className={styles.testTitle}>{test.title}</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button
                                    className={`${styles.pinTestBtn} ${test.is_pinned ? styles.pinned : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleTogglePin(test.id, !test.is_pinned);
                                    }}
                                    title={test.is_pinned ? "Odepnij test" : "Przypnij test"}
                                >
                                    <Pin size={16} />
                                </button>
                                <button
                                    className={styles.deleteTestBtn}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteTest(test.id);
                                    }}
                                    title="Usuń test"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        <div className={styles.testStats}>
                            <div className={styles.stat}>
                                <span className={styles.statLabel}>Pytań</span>
                                <span className={styles.statValue}>{test.questions?.length || 0}</span>
                            </div>
                            <div className={styles.stat}>
                                <span className={styles.statLabel}>Źródło</span>
                                <span className={styles.statValue}>
                                    <span
                                        className={styles.sourceChip}
                                        style={{
                                            backgroundColor: getSourceLabel(test.source_type).bg,
                                            color: getSourceLabel(test.source_type).color,
                                            border: `1px solid ${getSourceLabel(test.source_type).border}`
                                        }}
                                    >
                                        {getSourceLabel(test.source_type).text}
                                    </span>
                                </span>
                            </div>
                            <div className={styles.stat}>
                                <span className={styles.statLabel}>Wyniki</span>
                                <span className={styles.statValue}>{test.last_result || '-'}</span>
                            </div>
                        </div>
                        <button
                            className={styles.btnDetails}
                            onClick={() => onShowDetails(test)}
                        >
                            Szczegóły
                        </button>
                    </div>
                ))
            ) : currentFolders.length === 0 ? (
                <div className={styles.emptyState}>
                    <p>{currentFolder ? "Ten folder jest pusty. Przeciągnij testy tutaj lub utwórz nowe!" : "Brak testów. Wygeneruj pierwszy test używając AI!"}</p>
                </div>
            ) : null}
        </div>
    );
}
