import { useState, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
import { confirmModal } from '../../../utils/confirmModal';
import { Plus, Search, Filter, X, Folder, ArrowLeft } from 'lucide-react';
import styles from "../../../css/features/TestsView.module.css";
import generatorStyles from "../../../css/features/FlashcardGenerator.module.css";
import * as testsService from '../../../services/testsService';
import TestsList from './TestsList';
import TestGenerator from './TestGenerator';
import TestTaking from './TestTaking';
import TestResults from './TestResults';
import TestDetails from './TestDetails';
import { LanguageContext } from '../../../translations/LanguageContext';
import translations from '../../../translations/translation.json';

export default function TestsView({ userData, notebookId, isSidebarOpen }) {
    const [tests, setTests] = useState([]);
    const [folders, setFolders] = useState([]);
    const [currentFolder, setCurrentFolder] = useState(null);
    const [notes, setNotes] = useState([]);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showTakeTestModal, setShowTakeTestModal] = useState(false);
    const [showResultsModal, setShowResultsModal] = useState(false);
    const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [currentTest, setCurrentTest] = useState(null);
    const [currentQuestions, setCurrentQuestions] = useState([]);
    const [testResults, setTestResults] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterSource, setFilterSource] = useState('all');
    const [sortBy, setSortBy] = useState('date_desc');
    const [showFilters, setShowFilters] = useState(window.innerWidth > 768);
    const [draggedTest, setDraggedTest] = useState(null);
    const [draggedFolder, setDraggedFolder] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedTest, setSelectedTest] = useState(null);
    const [folderMenuOpen, setFolderMenuOpen] = useState(null);
    const [editingFolder, setEditingFolder] = useState(null);
    const [dragOverBreadcrumb, setDragOverBreadcrumb] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [loading, setLoading] = useState(true);
    
    // Kontekst językowy (tylko raz!)
    const { language } = useContext(LanguageContext);

    // Funkcja tłumaczeń (tylko raz!)
    const t = (key, params = {}) => {
        const keys = key.split('.');
        let translation = translations[language];

        for (const k of keys) {
            translation = translation?.[k];
            if (!translation) return key;
        }

            if (typeof translation === 'string' && Object.keys(params).length > 0) {
                return translation.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
            }

        return translation || key;
    };

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 768) {
                setShowFilters(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (userData?.id && notebookId) {
            fetchTests();
            fetchFolders();
            fetchNotes();
        }
    }, [userData?.id, notebookId]);

    const fetchTests = async () => {
        if (!notebookId) return;

        try {
            setLoading(true);
            const data = await testsService.fetchTests(userData.id, notebookId);
            setTests(data);
        } catch (err) {
        } finally {
            setLoading(false);
        }
    };

    const fetchFolders = async () => {
        if (!notebookId) return;

        try {
            const data = await testsService.fetchTestFolders(userData.id, notebookId);
            setFolders(data);
        } catch (err) {
        }
    };

    const fetchNotes = async () => {
        if (!notebookId) return;

        try {
            const data = await testsService.fetchNotes(notebookId);
            setNotes(data);
        } catch (err) {
        }
    };

    const handleShowDetails = (test) => {
        setSelectedTest(test);
        setShowDetailsModal(true);
    };

    const handleStartTest = async (test) => {
        setShowDetailsModal(false);
        try {
            const data = await testsService.getTest(test.id);
            setCurrentTest(data);
            setCurrentQuestions(data.questions);
            setShowTakeTestModal(true);
        } catch (err) {
            toast.error(t('testsView.loadingError'));
        }
    };

    const handleViewResults = async (test) => {
        setShowDetailsModal(false);
        try {
            const results = await testsService.getTestResults(test.id, userData.id);
            setTestResults(results);
            setShowResultsModal(true);
        } catch (err) {
            toast.error(t('testsView.resultsError'));
        }
    };

    const handleTestSubmitComplete = (results) => {
        setTestResults(results);
        setShowTakeTestModal(false);
        setShowResultsModal(true);
        fetchTests(); // Odśwież listę testów aby pokazać nowy wynik
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
            await testsService.createTestFolder({
                notebook_id: notebookId,
                user_id: userData.id,
                name: newFolderName,
                parent_folder_id: currentFolder?.id || null
            });
            setNewFolderName('');
            setShowCreateFolderModal(false);
            fetchFolders();
        } catch (err) {
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
        const confirmed = await confirmModal(t('testsView.deleteFolderConfirm'));
        if (!confirmed) return;

        try {
            await testsService.deleteTestFolder(folderId);
            toast.success(t('flashcardsView.deleteFolderSuccess'));
            fetchFolders();
            fetchTests();
        } catch (err) {
            toast.error(t('flashcardsView.deleteFolderError'));
        }
    };

    const handleRenameFolder = async (e) => {
        e.preventDefault();
        if (!editingFolder || !editingFolder.name.trim()) return;

        try {
            await testsService.renameTestFolder(editingFolder.id, editingFolder.name);
            setEditingFolder(null);
            toast.success(t('flashcardsView.renameFolderSuccess'));
            fetchFolders();
        } catch (err) {
            toast.error(t('flashcardsView.renameFolderError'));
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

        if (draggedTest) {
            try {
                await testsService.moveTestToFolder(draggedTest.test.id, parentFolderId);
                setDraggedTest(null);
                fetchTests();
            } catch (err) {
            }
        }

        if (draggedFolder) {
            try {
                await testsService.moveTestFolder(draggedFolder.folder.id, parentFolderId);
                setDraggedFolder(null);
                await fetchFolders();
                fetchTests();
            } catch (err) {
                toast.error(t('flashcardsView.moveFolderError'));
            }
        }
    };

    return (
        <div className={styles.testsView}>
            <div className={styles.headerSection}>
                <div className={styles.leftSection}>
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
                                {t('flashcardsView.back')}
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
                                <Folder size={24} style={{color: '#f59e0b'}} />
                                {currentFolder.name}
                            </h1>
                        </>
                    ) : (
                        <h1 className={styles.notebookTitle}>{t('testsView.tests')}</h1>
                    )}
                    <div className={styles.searchBox}>
                        <Search size={16} />
                        <input
                            type="text"
                            id="tests-search"
                            name="search"
                            placeholder={t('testsView.testPlaceHolder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>
                    <select
                        id="tests-filter-source"
                        name="filterSource"
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
                        id="tests-sort"
                        name="sortBy"
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
                                id="tests-search-mobile"
                                name="search"
                                placeholder="Szukaj testów..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={styles.searchInput}
                            />
                        </div>
                        <select
                            id="tests-filter-source-mobile"
                            name="filterSource"
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
                            id="tests-sort-mobile"
                            name="sortBy"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className={styles.filterSelect}
                        >
                            <option value="date_desc">{t('flashcardsView.sortNewest')}</option>
                            <option value="date_asc">{t('flashcardsView.sortOldest')}</option>
                            <option value="name_asc">{t('flashcardsView.sortNameAsc')}</option>
                            <option value="name_desc">{t('flashcardsView.sortNameDesc')}</option>
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
                        title="Filtry"
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
                        {t('testsView.testGen')}
                    </button>
                </div>
            </div>

            <TestsList
                tests={tests}
                setTests={setTests}
                folders={folders}
                currentFolder={currentFolder}
                searchQuery={searchQuery}
                filterSource={filterSource}
                sortBy={sortBy}
                userData={userData}
                notebookId={notebookId}
                onShowDetails={handleShowDetails}
                onRefreshFolders={fetchFolders}
                draggedTest={draggedTest}
                setDraggedTest={setDraggedTest}
                draggedFolder={draggedFolder}
                setDraggedFolder={setDraggedFolder}
                folderMenuOpen={folderMenuOpen}
                setFolderMenuOpen={setFolderMenuOpen}
                editingFolder={editingFolder}
                setEditingFolder={setEditingFolder}
                onOpenFolder={openFolder}
                onDeleteFolder={handleDeleteFolder}
                onRenameFolder={handleRenameFolder}
                isGenerating={isGenerating}
                loading={loading}
            />

            {/* Create Folder Modal */}
            {showCreateFolderModal && (
                <div className={generatorStyles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setShowCreateFolderModal(false)}>
                    <div className={generatorStyles.folderModal} onClick={(e) => e.stopPropagation()}>
                        <div className={generatorStyles.folderModalHeader}>
                            <h2 className={generatorStyles.folderModalTitle}>{t('flashcardsView.createFolder')}</h2>
                            <button
                                className={generatorStyles.folderModalClose}
                                onClick={() => setShowCreateFolderModal(false)}
                                title={t('flashcardsView.close')}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateFolder} className={generatorStyles.folderModalForm}>
                            <input
                                type="text"
                                id="tests-folder-name"
                                name="folderName"
                                className={generatorStyles.folderModalInput}
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder={t('flashcardsView.folderNamePlaceholder')}
                                autoFocus
                                required
                            />
                            <div className={generatorStyles.folderModalActions}>
                                <button
                                    type="button"
                                    className={generatorStyles.folderModalCancel}
                                    onClick={() => setShowCreateFolderModal(false)}
                                >
                                    {t('flashcardsView.cancel')}
                                </button>
                                <button type="submit" className={generatorStyles.folderModalSubmit}>
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
                    <div className={generatorStyles.folderModal} onClick={(e) => e.stopPropagation()}>
                        <div className={generatorStyles.folderModalHeader}>
                            <h2 className={generatorStyles.folderModalTitle}>{t('flashcardsView.renameFolderName')}</h2>
                            <button
                                className={generatorStyles.folderModalClose}
                                onClick={() => setEditingFolder(null)}
                                title={t('flashcardsView.close')}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleRenameFolder} className={generatorStyles.folderModalForm}>
                            <input
                                type="text"
                                id="tests-rename-folder"
                                name="folderName"
                                className={generatorStyles.folderModalInput}
                                value={editingFolder.name}
                                onChange={(e) => setEditingFolder({...editingFolder, name: e.target.value})}
                                placeholder={t('flashcardsView.folderNamePlaceholder')}
                                autoFocus
                                required
                            />
                            <div className={generatorStyles.folderModalActions}>
                                <button
                                    type="button"
                                    className={generatorStyles.folderModalCancel}
                                    onClick={() => setEditingFolder(null)}
                                >
                                    {t('flashcardsView.cancel')}
                                </button>
                                <button type="submit" className={generatorStyles.folderModalSubmit}>
                                    {t('flashcardsView.newName')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <TestGenerator
                show={showGenerateModal}
                onClose={() => setShowGenerateModal(false)}
                onStartGenerating={() => {
                    setShowGenerateModal(false);
                    setIsGenerating(true);
                }}
                onSuccess={() => {
                    setIsGenerating(false);
                    fetchTests();
                }}
                onError={() => {
                    setIsGenerating(false);
                }}
                userData={userData}
                notebookId={notebookId}
                currentFolder={currentFolder}
                notes={notes}
            />

            <TestTaking
                show={showTakeTestModal}
                onClose={() => setShowTakeTestModal(false)}
                currentTest={currentTest}
                currentQuestions={currentQuestions}
                userData={userData}
                onSubmitComplete={handleTestSubmitComplete}
            />

            <TestResults
                show={showResultsModal}
                onClose={() => setShowResultsModal(false)}
                testResults={testResults}
            />

            <TestDetails
                show={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                test={selectedTest}
                onStartTest={handleStartTest}
                onViewResults={handleViewResults}
            />
        </div>
    );
}