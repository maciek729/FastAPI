import { useState, useEffect } from 'react';
import { Plus, Search, Filter, X, Folder, ArrowLeft } from 'lucide-react';
import styles from "../../../css/features/TestsView.module.css";
import sharedStyles from "../../../css/features/NotebookView.module.css";
import * as testsService from '../../../services/testsService';
import TestsList from './TestsList';
import TestGenerator from './TestGenerator';
import TestTaking from './TestTaking';
import TestResults from './TestResults';
import TestDetails from './TestDetails';

export default function TestsView({ userData, notebookId, isSidebarOpen }) {
    const [tests, setTests] = useState([]);
    const [folders, setFolders] = useState([]);
    const [expandedFolders, setExpandedFolders] = useState([]);
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
    const [draggedTest, setDraggedTest] = useState(null);
    const [draggedFolder, setDraggedFolder] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedTest, setSelectedTest] = useState(null);
    const [folderMenuOpen, setFolderMenuOpen] = useState(null);
    const [editingFolder, setEditingFolder] = useState(null);
    const [dragOverBreadcrumb, setDragOverBreadcrumb] = useState(false);

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
            const data = await testsService.fetchTests(userData.id, notebookId);
            setTests(data);
        } catch (err) {
            console.error('Error fetching tests:', err);
        }
    };

    const fetchFolders = async () => {
        if (!notebookId) return;

        try {
            const data = await testsService.fetchTestFolders(userData.id, notebookId);
            setFolders(data);
        } catch (err) {
            console.error('Error fetching folders:', err);
        }
    };

    const fetchNotes = async () => {
        if (!notebookId) return;

        try {
            const data = await testsService.fetchNotes(notebookId);
            setNotes(data);
        } catch (err) {
            console.error('Error fetching notes:', err);
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
            console.error('Error loading test:', err);
            alert("Błąd ładowania testu");
        }
    };

    const handleViewResults = async (test) => {
        setShowDetailsModal(false);
        try {
            const results = await testsService.getTestResults(test.id, userData.id);
            setTestResults(results);
            setShowResultsModal(true);
        } catch (err) {
            console.error('Error loading results:', err);
            alert("Błąd ładowania wyników");
        }
    };

    const handleTestSubmitComplete = (results) => {
        setTestResults(results);
        setShowTakeTestModal(false);
        setShowResultsModal(true);
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
        if (!window.confirm('Czy na pewno chcesz usunąć ten folder? Testy zostaną przeniesione do głównego widoku.')) return;

        try {
            await testsService.deleteTestFolder(folderId);
            fetchFolders();
            fetchTests();
        } catch (err) {
            console.error('Error deleting folder:', err);
            alert("Błąd usuwania folderu");
        }
    };

    const handleRenameFolder = async (e) => {
        e.preventDefault();
        if (!editingFolder || !editingFolder.name.trim()) return;

        try {
            await testsService.renameTestFolder(editingFolder.id, editingFolder.name);
            setEditingFolder(null);
            fetchFolders();
        } catch (err) {
            console.error('Error renaming folder:', err);
            alert("Błąd zmiany nazwy folderu");
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
                console.error('Error moving test to parent folder:', err);
            }
        }

        if (draggedFolder) {
            try {
                await testsService.moveTestFolder(draggedFolder.folder.id, parentFolderId);
                setDraggedFolder(null);
                await fetchFolders();
                fetchTests();
            } catch (err) {
                console.error('Error moving folder to parent:', err);
                alert("Błąd przenoszenia folderu");
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
                                <Folder size={24} style={{color: '#f59e0b'}} />
                                {currentFolder.name}
                            </h1>
                        </>
                    ) : (
                        <h1 className={styles.notebookTitle}>Sprawdziany</h1>
                    )}
                    <div className={styles.searchBox}>
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Szukaj testów..."
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
                        <option value="all">Wszystkie źródła</option>
                        <option value="manual">Ręczny opis</option>
                        <option value="file">Z pliku</option>
                        <option value="note">Z notatki</option>
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
                <div style={{display: 'flex', gap: '0.75rem'}}>
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
                        Wygeneruj nowy test
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
            />

            {/* Create Folder Modal */}
            {showCreateFolderModal && (
                <div className={sharedStyles.modalOverlay} onClick={() => setShowCreateFolderModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{maxWidth: '450px'}}>
                        <div className={sharedStyles.modalHeader}>
                            <h2 className={sharedStyles.modalTitle}>Utwórz nowy folder</h2>
                            <button
                                className={sharedStyles.closeBtn}
                                onClick={() => setShowCreateFolderModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateFolder} style={{padding: '2rem'}}>
                            <div className={sharedStyles.formGroup}>
                                <label>Nazwa folderu</label>
                                <input
                                    type="text"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    placeholder="Wpisz nazwę folderu..."
                                    className={sharedStyles.formInput}
                                    autoFocus
                                    required
                                />
                            </div>
                            <div className={sharedStyles.modalActions}>
                                <button
                                    type="button"
                                    className={sharedStyles.btnCancel}
                                    onClick={() => setShowCreateFolderModal(false)}
                                >
                                    Anuluj
                                </button>
                                <button type="submit" className={sharedStyles.btnSubmit}>
                                    Utwórz folder
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Rename Folder Modal */}
            {editingFolder && (
                <div className={sharedStyles.modalOverlay} onClick={() => setEditingFolder(null)}>
                    <div className={sharedStyles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={sharedStyles.modalHeader}>
                            <h2 className={sharedStyles.modalTitle}>Zmień nazwę folderu</h2>
                            <button
                                className={sharedStyles.closeBtn}
                                onClick={() => setEditingFolder(null)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleRenameFolder} style={{padding: '2rem'}}>
                            <div className={sharedStyles.formGroup}>
                                <label>Nowa nazwa</label>
                                <input
                                    type="text"
                                    value={editingFolder.name}
                                    onChange={(e) => setEditingFolder({...editingFolder, name: e.target.value})}
                                    placeholder="Wpisz nową nazwę folderu..."
                                    className={sharedStyles.formInput}
                                    autoFocus
                                    required
                                />
                            </div>
                            <div className={sharedStyles.modalActions}>
                                <button
                                    type="button"
                                    className={sharedStyles.btnCancel}
                                    onClick={() => setEditingFolder(null)}
                                >
                                    Anuluj
                                </button>
                                <button type="submit" className={sharedStyles.btnSubmit}>
                                    Zmień nazwę
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <TestGenerator
                show={showGenerateModal}
                onClose={() => setShowGenerateModal(false)}
                onSuccess={() => {
                    setShowGenerateModal(false);
                    fetchTests();
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
