import { useState, useEffect, useMemo, useContext } from "react";
import toast from "react-hot-toast";
import { confirmModal } from '../../../utils/confirmModal';
import { Plus, Search, X, Folder, ArrowLeft, Filter } from "lucide-react";
import FlashcardGenerator from "./FlashcardGenerator";
import FlashcardSetsList from "./FlashcardSetsList";
import FlashcardLearning from "./FlashcardLearning";
import FlashcardSetManager from "./FlashcardSetManager";
import styles from "../../../css/features/FlashcardsView.module.css";
import generatorStyles from "../../../css/features/FlashcardGenerator.module.css";
import { getFlashcardSets, getFlashcardFolders, createFlashcardFolder, deleteFlashcardFolder, renameFlashcardFolder, moveFlashcardFolder, moveFlashcardSetToFolder } from '../../../services/flashcardService';
import ENDPOINTS from '../../../api/endpoints';
import { LanguageContext } from "../../../translations/LanguageContext";
import translations from "../../../translations/translation.json";

export default function FlashcardsView({ notebookId, userData, highlightedItemId }) {
    const [view, setView] = useState("list");
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [flashcardSets, setFlashcardSets] = useState([]);
    const [selectedSet, setSelectedSet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterSource, setFilterSource] = useState('all');
    const [sortBy, setSortBy] = useState('date_desc');
    const [showFilters, setShowFilters] = useState(window.innerWidth > 768);

    const [folders, setFolders] = useState([]);
    const [currentFolder, setCurrentFolder] = useState(null);
    const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [folderMenuOpen, setFolderMenuOpen] = useState(null);
    const [editingFolder, setEditingFolder] = useState(null);
    const [dragOverBreadcrumb, setDragOverBreadcrumb] = useState(false);
    const [draggedSet, setDraggedSet] = useState(null);
    const [draggedFolder, setDraggedFolder] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const { language } = useContext(LanguageContext);

    const t = (key, params = {}) => {
        const keys = key.split('.');
        let translation = translations[language];
        
        for (const k of keys) {
            translation = translation?.[k];
            if (!translation) return key;
        }
        
        if (typeof translation === 'string' && Object.keys(params).length > 0) {
            return translation.replace(/\{(\w+)\}/g, (match, key) => {
                return params[key] || match;
            });
        }
        
        return translation || key;
    };

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
        if (notebookId) {
            fetchFlashcardSets();
            fetchFolders();
        }
    }, [notebookId]);

    useEffect(() => {
        if (highlightedItemId && flashcardSets.length > 0) {
            const targetSet = flashcardSets.find(s => s.id === highlightedItemId);
            if (targetSet && targetSet.folder_id) {
                const folderToOpen = folders.find(f => f.id === targetSet.folder_id);
                if (folderToOpen) {
                    setCurrentFolder(folderToOpen);
                }
            } else if (targetSet && !targetSet.folder_id) {
                setCurrentFolder(null); // Jeśli element jest w głównym widoku
            }
        }
    }, [highlightedItemId, flashcardSets, folders]);

    const fetchFlashcardSets = async () => {
        try {
            setLoading(true);
            const data = await getFlashcardSets(notebookId);
            setFlashcardSets(data);
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    const fetchFolders = async () => {
        try {
            const data = await getFlashcardFolders(userData.id, notebookId);
            setFolders(data);
        } catch (err) {
            console.error('Error fetching folders:', err);
        }
    };

    const handleGenerateSuccess = () => {
        setIsGenerating(false);
        fetchFlashcardSets();
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
        return searchQuery !== '' || filterSource !== 'all' || sortBy !== 'date_desc';
    };

    const clearFilters = () => {
        setSearchQuery('');
        setFilterSource('all');
        setSortBy('date_desc');
    };

    const handleCreateFolder = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;

        try {
            await createFlashcardFolder({
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
        const confirmed = await confirmModal(t('flashcardsView.deleteFolderConfirm'));
        if (!confirmed) return;

        try {
            await deleteFlashcardFolder(folderId);
            if (currentFolder?.id === folderId) {
                setCurrentFolder(null);
            }
            toast.success(t('flashcardsView.deleteFolderSuccess'));
            fetchFolders();
            fetchFlashcardSets();
        } catch (err) {
            console.error('Error deleting folder:', err);
            toast.error(t('flashcardsView.deleteFolderError'));
        }
    };

    const handleRenameFolder = async (e) => {
        e.preventDefault();
        if (!editingFolder || !editingFolder.name.trim()) return;

        try {
            await renameFlashcardFolder(editingFolder.id, editingFolder.name);
            setEditingFolder(null);
            toast.success(t('flashcardsView.renameFolderSuccess'));
            fetchFolders();
        } catch (err) {
            console.error('Error renaming folder:', err);
            toast.error(t('flashcardsView.renameFolderError'));
        }
    };

    const filteredSets = useMemo(() => {
        let filtered = flashcardSets;

        if (searchQuery) {
            filtered = filtered.filter(set =>
                set.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (filterSource !== 'all') {
            filtered = filtered.filter(set => {
                if (filterSource === 'manual') {
                    return !set.source_notes && !set.source_files;
                } else if (filterSource === 'note') {
                    return set.source_notes && set.source_notes !== '[]';
                } else if (filterSource === 'file') {
                    return set.source_files && set.source_files !== '[]';
                }
                return true;
            });
        }

        return filtered;
    }, [flashcardSets, searchQuery, filterSource]);

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

        if (draggedSet) {
            try {
                await moveFlashcardSetToFolder(draggedSet.set.id, parentFolderId);

                setFlashcardSets(prevSets =>
                    prevSets.map(set =>
                        set.id === draggedSet.set.id ? { ...set, folder_id: parentFolderId } : set
                    )
                );

                await fetchFolders();
                setDraggedSet(null);
            } catch (err) {
                console.error('Error moving set to parent folder:', err);
                toast.error(t('flashcardsView.moveSetError'));
            }
        }

        if (draggedFolder) {
            try {
                await moveFlashcardFolder(draggedFolder.folder.id, parentFolderId);
                setDraggedFolder(null);
                await fetchFolders();
                fetchFlashcardSets();
            } catch (err) {
                console.error('Error moving folder to parent:', err);
                toast.error(t('flashcardsView.moveFolderError'));
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
                            t('flashcardsView.flashcards')
                        )}
                    </h1>
                    <div className={styles.searchBox}>
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder={t('flashcardsView.searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>
                    <select
                        value={filterSource}
                        onChange={(e) => setFilterSource(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="all">{t('testsView.allSource')}</option>
                        <option value="manual">{t('flashcardGenerator.manual')}</option>
                        <option value="file">{t('flashcardGenerator.fromFile')}</option>
                        <option value="note">{t('flashcardGenerator.fromNote')}</option>
                    </select>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="date_desc">{t('flashcardsView.sortNewest')}</option>
                        <option value="date_asc">{t('flashcardsView.sortOldest')}</option>
                        <option value="name_asc">{t('flashcardsView.sortAsc')}</option>
                        <option value="name_desc">{t('flashcardsView.sortDesc')}</option>
                    </select>
                </div>
                {showFilters && (
                    <div className={styles.filtersRow}>
                        <div className={styles.searchBox}>
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder={t('flashcardsView.searchPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={styles.searchInput}
                            />
                        </div>
                        <select
                            value={filterSource}
                            onChange={(e) => setFilterSource(e.target.value)}
                            className={styles.filterSelect}
                        >
                            <option value="all">{t('testsView.allSource')}</option>
                            <option value="manual">{t('flashcardGenerator.manual')}</option>
                            <option value="file">{t('flashcardGenerator.fromFile')}</option>
                            <option value="note">{t('flashcardGenerator.fromNote')}</option>
                        </select>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className={styles.filterSelect}
                        >
                            <option value="date_desc">{t('flashcardsView.sortNewest')}</option>
                            <option value="date_asc">{t('flashcardsView.sortOldest')}</option>
                            <option value="name_asc">{t('flashcardsView.sortAsc')}</option>
                            <option value="name_desc">{t('flashcardsView.sortDesc')}</option>
                        </select>
                        {hasActiveFilters() && (
                            <button
                                className={styles.clearFiltersBtn}
                                onClick={clearFilters}
                                title="Wyczyść wszystkie filtry"
                            >
                                <X size={16} />
                                {t('flashcardsView.clearFilters')}
                            </button>
                        )}
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
                    <button
                        className={styles.addNoteBtn}
                        onClick={() => setShowGenerateModal(true)}
                    >
                        <Plus size={18} />
                        {t('flashcardsView.generateFlashcards')}
                    </button>
                </div>
            </div>

            <FlashcardSetsList
                sets={filteredSets}
                loading={loading}
                userId={userData.id}
                notebookId={notebookId}
                folders={folders}
                currentFolder={currentFolder}
                highlightedItemId={highlightedItemId}
                sortBy={sortBy}
                onStartLearning={handleStartLearning}
                onManageSet={handleManageSet}
                onDelete={fetchFlashcardSets}
                onRefreshFolders={fetchFolders}
                onOpenFolder={openFolder}
                onDeleteFolder={handleDeleteFolder}
                onRenameFolder={(folder) => setEditingFolder(folder)}
                onMoveSetToFolder={async (setId, folderId) => {
                    try {
                        await moveFlashcardSetToFolder(setId, folderId);

                        setFlashcardSets(prevSets =>
                            prevSets.map(set =>
                                set.id === setId ? { ...set, folder_id: folderId } : set
                            )
                        );

                        await fetchFolders();
                    } catch (err) {
                        console.error('Error moving set:', err);
                        toast.error(t('flashcardsView.moveSetError'));
                    }
                }}
                onDragStateChange={({ draggedSet, draggedFolder }) => {
                    setDraggedSet(draggedSet);
                    setDraggedFolder(draggedFolder);
                }}
                isGenerating={isGenerating}
            />

            {showGenerateModal && (
                <FlashcardGenerator
                    notebookId={notebookId}
                    userId={userData.id}
                    onSuccess={handleGenerateSuccess}
                    onCancel={() => setShowGenerateModal(false)}
                    onStartGenerating={() => {
                        setShowGenerateModal(false);
                        setIsGenerating(true);
                    }}
                    onError={() => {
                        setIsGenerating(false);
                    }}
                />
            )}

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
                                    <label>{t('flashcardsView.newName')}</label>
                                    <input
                                        type="text"
                                        value={editingFolder.name}
                                        onChange={(e) => setEditingFolder({...editingFolder, name: e.target.value})}
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
        </div>
    );
}
