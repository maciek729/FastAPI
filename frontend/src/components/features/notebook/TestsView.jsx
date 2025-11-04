import { useState, useEffect } from 'react';
import axios from "axios";
import { Plus, X, Play, BarChart, Trash2, CheckCircle, Search, Filter, Pin, Folder, FolderOpen, ChevronRight, MoreVertical, ArrowLeft } from 'lucide-react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import styles from "../../../css/features/TestsView.module.css";
import sharedStyles from "../../../css/features/NotebookView.module.css";

// Helper function to render text with math formulas
const MathText = ({ text }) => {
    if (!text) return null;

    // Split text by $$ (block math) and $ (inline math)
    const parts = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
        // Check for block math $$...$$
        const blockStart = remaining.indexOf('$$');
        if (blockStart !== -1) {
            // Add text before $$
            if (blockStart > 0) {
                parts.push(<span key={key++}>{remaining.substring(0, blockStart)}</span>);
            }
            // Find closing $$
            const blockEnd = remaining.indexOf('$$', blockStart + 2);
            if (blockEnd !== -1) {
                const formula = remaining.substring(blockStart + 2, blockEnd);
                parts.push(<BlockMath key={key++} math={formula} />);
                remaining = remaining.substring(blockEnd + 2);
            } else {
                // No closing $$, treat as regular text
                parts.push(<span key={key++}>{remaining}</span>);
                break;
            }
        } else {
            // No more block math, check for inline math $...$
            const inlineStart = remaining.indexOf('$');
            if (inlineStart !== -1) {
                // Add text before $
                if (inlineStart > 0) {
                    parts.push(<span key={key++}>{remaining.substring(0, inlineStart)}</span>);
                }
                // Find closing $
                const inlineEnd = remaining.indexOf('$', inlineStart + 1);
                if (inlineEnd !== -1) {
                    const formula = remaining.substring(inlineStart + 1, inlineEnd);
                    parts.push(<InlineMath key={key++} math={formula} />);
                    remaining = remaining.substring(inlineEnd + 1);
                } else {
                    // No closing $, treat as regular text
                    parts.push(<span key={key++}>{remaining}</span>);
                    break;
                }
            } else {
                // No more math, add remaining text
                parts.push(<span key={key++}>{remaining}</span>);
                break;
            }
        }
    }

    return <>{parts}</>;
};

export default function TestsView({ userData, notebookId, isSidebarOpen }) {
    const [tests, setTests] = useState([]);
    const [folders, setFolders] = useState([]);
    const [expandedFolders, setExpandedFolders] = useState([]);
    const [currentFolder, setCurrentFolder] = useState(null); // Currently opened folder
    const [notes, setNotes] = useState([]);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showTakeTestModal, setShowTakeTestModal] = useState(false);
    const [showResultsModal, setShowResultsModal] = useState(false);
    const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentTest, setCurrentTest] = useState(null);
    const [currentQuestions, setCurrentQuestions] = useState([]);
    const [userAnswers, setUserAnswers] = useState({});
    const [testResults, setTestResults] = useState(null);
    const [uploadFile, setUploadFile] = useState(null);
    const [newTest, setNewTest] = useState({
        title: '',
        topic: '',
        num_questions: 5,
        question_type: 'multiple_choice',
        source_type: 'manual', // manual, file, note
        note_id: null
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [filterSource, setFilterSource] = useState('all'); // all, manual, file, note
    const [sortBy, setSortBy] = useState('date_desc'); // date_desc, date_asc, name_asc, name_desc
    const [draggedTest, setDraggedTest] = useState(null);
    const [draggedFolder, setDraggedFolder] = useState(null);
    const [draggedItem, setDraggedItem] = useState(null); // for folders and tests
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [dragNotAllowedIndex, setDragNotAllowedIndex] = useState(null);
    const [dragOverFolder, setDragOverFolder] = useState(null);
    const [dragOverFolderIndex, setDragOverFolderIndex] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedTest, setSelectedTest] = useState(null);
    const [folderMenuOpen, setFolderMenuOpen] = useState(null);
    const [editingFolder, setEditingFolder] = useState(null);

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
            const response = await axios.get(`http://localhost:8000/tests/list?user_id=${userData.id}&notebook_id=${notebookId}`);
            setTests(response.data);
        } catch (err) {
            console.error('Error fetching tests:', err);
        }
    };

    const fetchFolders = async () => {
        if (!notebookId) return;

        try {
            const response = await axios.get(`http://localhost:8000/test-folders/list?user_id=${userData.id}&notebook_id=${notebookId}`);
            setFolders(response.data);
        } catch (err) {
            console.error('Error fetching folders:', err);
        }
    };

    const fetchNotes = async () => {
        if (!notebookId) {
            console.log('fetchNotes: brak notebookId');
            return;
        }

        console.log('Pobieranie notatek dla notebook:', notebookId);
        try {
            const response = await axios.get(`http://localhost:8000/notes/list/${notebookId}`);
            console.log('Pobrane notatki:', response.data);
            setNotes(response.data);
        } catch (err) {
            console.error('Error fetching notes:', err);
            console.error('Response:', err.response);
        }
    };

    const handleGenerateTest = async (e) => {
        e.preventDefault();

        // Title is always required
        if (!newTest.title.trim()) {
            alert("Tytuł jest wymagany!");
            return;
        }

        // Topic is required only for manual input
        if (newTest.source_type === 'manual' && !newTest.topic.trim()) {
            alert("Opis/temat jest wymagany dla ręcznego wprowadzania!");
            return;
        }

        // Validate source-specific requirements
        if (newTest.source_type === 'file' && !uploadFile) {
            alert("Wybierz plik!");
            return;
        }

        if (newTest.source_type === 'note' && !newTest.note_id) {
            alert("Wybierz notatkę!");
            return;
        }

        if (newTest.num_questions < 1 || newTest.num_questions > 20) {
            alert("Liczba pytań musi być między 1 a 20!");
            return;
        }

        if (!notebookId) {
            alert("Błąd: Brak ID notatnika");
            return;
        }

        setLoading(true);
        try {
            if (newTest.source_type === 'file') {
                // Upload file and generate test
                const formData = new FormData();
                formData.append('file', uploadFile);
                formData.append('user_id', userData.id);
                formData.append('notebook_id', notebookId);
                formData.append('title', newTest.title);
                formData.append('topic', newTest.topic || 'Generuj pytania na podstawie pliku');
                formData.append('num_questions', newTest.num_questions);
                formData.append('question_type', newTest.question_type);
                if (currentFolder) {
                    formData.append('folder_id', currentFolder.id);
                }

                await axios.post("http://localhost:8000/tests/generate-from-file", formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
            } else {
                // Generate from manual input or note
                await axios.post("http://localhost:8000/tests/generate", {
                    user_id: userData.id,
                    notebook_id: notebookId,
                    title: newTest.title,
                    topic: newTest.topic || 'Generuj pytania na podstawie notatki',
                    num_questions: parseInt(newTest.num_questions),
                    question_type: newTest.question_type,
                    note_id: newTest.source_type === 'note' ? newTest.note_id : null,
                    folder_id: currentFolder?.id || null
                });
            }

            alert("Test wygenerowany pomyślnie!");
            setNewTest({ title: '', topic: '', num_questions: 5, question_type: 'multiple_choice', source_type: 'manual', note_id: null });
            setUploadFile(null);
            setShowGenerateModal(false);
            fetchTests();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || "Błąd generowania testu. Upewnij się, że Gemini API jest skonfigurowane.");
        } finally {
            setLoading(false);
        }
    };

    const handleShowDetails = (test) => {
        setSelectedTest(test);
        setShowDetailsModal(true);
    };

    const handleStartTest = async (test) => {
        setShowDetailsModal(false);
        try {
            const response = await axios.get(`http://localhost:8000/tests/${test.id}`);
            setCurrentTest(response.data);
            setCurrentQuestions(response.data.questions);
            setUserAnswers({});
            setShowTakeTestModal(true);
        } catch (err) {
            console.error('Error loading test:', err);
            alert("Błąd ładowania testu");
        }
    };

    const handleSelectAnswer = (questionId, answer, isMultiple = false) => {
        if (isMultiple) {
            // For multiple answers, toggle selection
            setUserAnswers(prev => {
                const current = prev[questionId] || [];
                const currentArray = Array.isArray(current) ? current : [];

                if (currentArray.includes(answer)) {
                    // Remove answer
                    return {
                        ...prev,
                        [questionId]: currentArray.filter(a => a !== answer)
                    };
                } else {
                    // Add answer
                    return {
                        ...prev,
                        [questionId]: [...currentArray, answer]
                    };
                }
            });
        } else {
            // For single answer, just set it
            setUserAnswers(prev => ({
                ...prev,
                [questionId]: answer
            }));
        }
    };

    const handleSubmitTest = async () => {
        const unanswered = currentQuestions.filter(q => {
            const answer = userAnswers[q.id];
            return !answer || (Array.isArray(answer) && answer.length === 0);
        });

        if (unanswered.length > 0) {
            if (!window.confirm(`Nie odpowiedziałeś na ${unanswered.length} pytań. Czy chcesz kontynuować?`)) {
                return;
            }
        }

        setLoading(true);
        try {
            // Submit all answers
            for (const question of currentQuestions) {
                const answer = userAnswers[question.id];
                if (answer) {
                    // Convert answer to JSON string
                    const answerString = Array.isArray(answer)
                        ? JSON.stringify(answer)
                        : JSON.stringify([answer]);

                    await axios.post("http://localhost:8000/tests/submit-answer", {
                        user_id: userData.id,
                        test_question_id: question.id,
                        selected_answer: answerString
                    });
                }
            }

            // Get results
            const resultsResponse = await axios.get(
                `http://localhost:8000/tests/results/${currentTest.id}?user_id=${userData.id}`
            );
            setTestResults(resultsResponse.data);
            setShowTakeTestModal(false);
            setShowResultsModal(true);
        } catch (err) {
            console.error('Error submitting test:', err);
            alert("Błąd podczas przesyłania odpowiedzi");
        } finally {
            setLoading(false);
        }
    };

    const handleViewResults = async (test) => {
        setShowDetailsModal(false);
        try {
            const response = await axios.get(
                `http://localhost:8000/tests/results/${test.id}?user_id=${userData.id}`
            );
            setTestResults(response.data);
            setShowResultsModal(true);
        } catch (err) {
            console.error('Error loading results:', err);
            alert("Błąd ładowania wyników");
        }
    };

    const handleDeleteTest = async (testId) => {
        if (!window.confirm('Czy na pewno chcesz usunąć ten test?')) return;

        try {
            await axios.delete(`http://localhost:8000/tests/${testId}?user_id=${userData.id}`);
            alert('Test usunięty');
            fetchTests();
        } catch (err) {
            console.error('Error deleting test:', err);
            alert("Błąd usuwania testu");
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Dziś';
        const date = new Date(dateString);
        return date.toLocaleDateString('pl-PL', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const getScoreColor = (percentage) => {
        if (percentage >= 80) return '#4ade80';
        if (percentage >= 60) return '#fbbf24';
        return '#f87171';
    };

    const getSourceLabel = (sourceType) => {
        const labels = {
            'manual': { text: 'Ręczny opis', color: '#8b5cf6' },
            'file': { text: 'Z pliku', color: '#3b82f6' },
            'note': { text: 'Z notatki', color: '#10b981' }
        };
        return labels[sourceType] || labels['manual'];
    };

    const handleTogglePin = async (testId, isPinned) => {
        try {
            await axios.patch(`http://localhost:8000/tests/${testId}/pin`, {
                is_pinned: isPinned
            });
            // Update local state
            setTests(prevTests =>
                prevTests.map(test =>
                    test.id === testId ? { ...test, is_pinned: isPinned } : test
                )
            );
        } catch (err) {
            console.error('Error toggling pin:', err);
            alert("Błąd przypinania testu");
        }
    };

    const hasActiveFilters = () => {
        return searchQuery !== '' || filterSource !== 'all' || sortBy !== 'date_desc';
    };

    const clearFilters = () => {
        setSearchQuery('');
        setFilterSource('all');
        setSortBy('date_desc');
    };

    // Folder handlers
    const handleCreateFolder = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;

        try {
            await axios.post('http://localhost:8000/test-folders/create', {
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
            // Navigate to parent folder
            const parentFolder = folders.find(f => f.id === currentFolder.parent_folder_id);
            setCurrentFolder(parentFolder);
        } else {
            // Navigate to root (main dashboard)
            setCurrentFolder(null);
        }
    };

    const handleDeleteFolder = async (folderId) => {
        if (!window.confirm('Czy na pewno chcesz usunąć ten folder? Testy zostaną przeniesione do głównego widoku.')) return;

        try {
            await axios.delete(`http://localhost:8000/test-folders/${folderId}`);
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
            await axios.patch(`http://localhost:8000/test-folders/${editingFolder.id}/rename`, {
                name: editingFolder.name
            });
            setEditingFolder(null);
            fetchFolders();
        } catch (err) {
            console.error('Error renaming folder:', err);
            alert("Błąd zmiany nazwy folderu");
        }
    };

    const handleMoveTestToFolder = async (testId, folderId) => {
        try {
            await axios.post('http://localhost:8000/test-folders/move-test', {
                test_id: testId,
                folder_id: folderId
            });
            fetchTests();
        } catch (err) {
            console.error('Error moving test:', err);
            alert("Błąd przenoszenia testu");
        }
    };

    const getFilteredAndSortedTests = () => {
        let filtered = tests;

        // Filter by current folder context
        if (currentFolder) {
            // Inside a folder - only show tests in this folder
            filtered = filtered.filter(test => test.folder_id === currentFolder.id);
        } else {
            // Root dashboard - only show tests not in any folder
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

            // If no custom sorting is applied (date_desc), use grid_position for all tests
            if (sortBy === 'date_desc') {
                // For pinned tests, sort by grid_position
                if (a.is_pinned && b.is_pinned) {
                    if (a.grid_position !== null && b.grid_position !== null) {
                        return a.grid_position - b.grid_position;
                    }
                }

                // For non-pinned tests, sort by grid_position
                if (!a.is_pinned && !b.is_pinned) {
                    if (a.grid_position !== null && b.grid_position !== null) {
                        return a.grid_position - b.grid_position;
                    }
                }

                // Default to date
                return new Date(b.created_at) - new Date(a.created_at);
            }

            // For other sorting options, apply the user-selected sort
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

    const handleDragStart = (e, test, index) => {
        setDraggedTest({ test, index });
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.style.opacity = '0.5';

        // Add test data to dataTransfer for drag-to-copy to sidebar
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

        // Allow drag over only if:
        // 1. Both tests have same pinned status (pinned can only swap with pinned, unpinned with unpinned)
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

        // Prevent dropping pinned test on unpinned test and vice versa
        if (draggedTestData.is_pinned !== targetTest.is_pinned) {
            setDragOverIndex(null);
            return;
        }

        const newTests = [...filteredTests];
        const [removed] = newTests.splice(draggedTest.index, 1);
        newTests.splice(dropIndex, 0, removed);

        // Update grid positions
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

        // Update backend
        try {
            await Promise.all(
                updatedTests.map(test =>
                    axios.patch(`http://localhost:8000/tests/${test.id}/position`, {
                        grid_position: test.grid_position
                    })
                )
            );
        } catch (err) {
            console.error('Error updating test positions:', err);
            // Revert on error
            fetchTests();
        }

        setDragOverIndex(null);
    };

    // Folder drag handlers
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
            // Move test into folder
            await handleMoveTestToFolder(draggedTest.test.id, folderId);
            setDraggedTest(null);
        }
    };

    // Folder card drag handlers (for reordering folders in grid)
    const handleFolderCardDragStart = (e, folder, index) => {
        setDraggedFolder({ folder, index });
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.style.opacity = '0.5';

        // Add folder data to dataTransfer for drag-to-copy to sidebar
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
            // Only allow folder-to-folder reordering
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

        const foldersList = folders.filter(f => !f.parent_folder_id);
        const newFolders = [...foldersList];
        const [removed] = newFolders.splice(draggedFolder.index, 1);
        newFolders.splice(dropIndex, 0, removed);

        // Update grid positions for folders
        const updatedFolders = newFolders.map((folder, idx) => ({
            ...folder,
            grid_position: idx
        }));

        // Update local state immediately
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

        // Update backend
        try {
            await Promise.all(
                updatedFolders.map(folder =>
                    axios.patch(`http://localhost:8000/test-folders/${folder.id}/position`, {
                        grid_position: folder.grid_position
                    })
                )
            );
        } catch (err) {
            console.error('Error updating folder positions:', err);
            // Revert on error
            fetchFolders();
        }

        setDragOverFolderIndex(null);
    };

    const renderQuestion = (question, index) => {
        const questionType = question.question_type || 'multiple_choice';
        const options = JSON.parse(question.other_options);
        const userAnswer = userAnswers[question.id];

        if (questionType === 'true_false') {
            return (
                <div key={question.id} className={styles.questionBlock}>
                    <h3 className={styles.questionNumber}>Pytanie {index + 1}</h3>
                    <p className={styles.questionText}>
                        <MathText text={question.question} />
                    </p>
                    <div className={styles.optionsGrid}>
                        {['Prawda', 'Fałsz'].map((option) => (
                            <label
                                key={option}
                                className={`${styles.optionLabel} ${userAnswer === option ? styles.selected : ''}`}
                            >
                                <input
                                    type="radio"
                                    name={`question-${question.id}`}
                                    value={option}
                                    checked={userAnswer === option}
                                    onChange={() => handleSelectAnswer(question.id, option)}
                                />
                                <span className={styles.optionValue}>
                                    <MathText text={option} />
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            );
        } else if (questionType === 'multiple_answers') {
            const selectedAnswers = Array.isArray(userAnswer) ? userAnswer : [];

            return (
                <div key={question.id} className={styles.questionBlock}>
                    <h3 className={styles.questionNumber}>Pytanie {index + 1}</h3>
                    <p className={styles.questionText}>
                        <MathText text={question.question} />
                    </p>
                    <p className={styles.multipleAnswersHint}>
                        (Zaznacz wszystkie poprawne odpowiedzi)
                    </p>
                    <div className={styles.optionsGrid}>
                        {Object.entries(options).map(([key, value]) => (
                            <label
                                key={key}
                                className={`${styles.optionLabel} ${selectedAnswers.includes(key) ? styles.selected : ''}`}
                            >
                                <input
                                    type="checkbox"
                                    name={`question-${question.id}`}
                                    value={key}
                                    checked={selectedAnswers.includes(key)}
                                    onChange={() => handleSelectAnswer(question.id, key, true)}
                                />
                                <span className={styles.optionKey}>{key}</span>
                                <span className={styles.optionValue}>
                                    <MathText text={value} />
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            );
        } else {
            // multiple_choice (default)
            return (
                <div key={question.id} className={styles.questionBlock}>
                    <h3 className={styles.questionNumber}>Pytanie {index + 1}</h3>
                    <p className={styles.questionText}>
                        <MathText text={question.question} />
                    </p>
                    <div className={styles.optionsGrid}>
                        {Object.entries(options).map(([key, value]) => (
                            <label
                                key={key}
                                className={`${styles.optionLabel} ${userAnswer === key ? styles.selected : ''}`}
                            >
                                <input
                                    type="radio"
                                    name={`question-${question.id}`}
                                    value={key}
                                    checked={userAnswer === key}
                                    onChange={() => handleSelectAnswer(question.id, key)}
                                />
                                <span className={styles.optionKey}>{key}</span>
                                <span className={styles.optionValue}>
                                    <MathText text={value} />
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            );
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
                            <h1 className={styles.notebookTitle} style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
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

            <div className={`${styles.cardsContainer} ${!isSidebarOpen ? styles.cardsContainerExpanded : ''}`}>
                {currentFolder ? (
                    /* Show subfolders and tests inside the current folder */
                    <>
                        {/* Subfolders */}
                        {folders.filter(f => f.parent_folder_id === currentFolder.id).map((folder, index) => {
                            const folderTests = tests.filter(t => t.folder_id === folder.id);
                            const subfolders = folders.filter(f => f.parent_folder_id === folder.id);
                            const totalItems = folderTests.length + subfolders.length;

                            return (
                                <div
                                    key={`folder-${folder.id}`}
                                    className={`${styles.folderCard} ${dragOverFolder === folder.id ? styles.folderDragOver : ''} ${dragOverFolderIndex === index ? styles.dragOver : ''}`}
                                    onClick={() => openFolder(folder)}
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

                        {/* Tests in this folder */}
                        {getFilteredAndSortedTests().length > 0 ? (
                            getFilteredAndSortedTests().map((test, index) => (
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
                                        <div className={styles.cardActions}>
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
                                    <span
                                        className={styles.sourceLabel}
                                        style={{
                                            backgroundColor: `${getSourceLabel(test.source_type).color}15`,
                                            color: getSourceLabel(test.source_type).color,
                                            border: `1px solid ${getSourceLabel(test.source_type).color}40`
                                        }}
                                    >
                                        {getSourceLabel(test.source_type).text}
                                    </span>
                                    <button
                                        className={styles.btnDetails}
                                        onClick={() => handleShowDetails(test)}
                                    >
                                        Szczegóły
                                    </button>
                                </div>
                            ))
                        ) : folders.filter(f => f.parent_folder_id === currentFolder.id).length === 0 ? (
                            <div className={styles.emptyState}>
                                <p>Ten folder jest pusty. Przeciągnij testy tutaj lub utwórz nowe!</p>
                            </div>
                        ) : null}
                    </>
                ) : (
                    <>
                        {/* Folders */}
                        {folders.filter(f => !f.parent_folder_id).map((folder, index) => {
                            const folderTests = tests.filter(t => t.folder_id === folder.id);
                            const subfolders = folders.filter(f => f.parent_folder_id === folder.id);
                            const totalItems = folderTests.length + subfolders.length;

                            return (
                                <div
                                    key={`folder-${folder.id}`}
                                    className={`${styles.folderCard} ${dragOverFolder === folder.id ? styles.folderDragOver : ''} ${dragOverFolderIndex === index ? styles.dragOver : ''}`}
                                    onClick={() => openFolder(folder)}
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

                        {/* Tests not in folders */}
                        {getFilteredAndSortedTests().length > 0 ? (
                            getFilteredAndSortedTests().map((test, index) => (
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
                                        <div className={styles.cardActions}>
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
                                    <span
                                        className={styles.sourceLabel}
                                        style={{
                                            backgroundColor: `${getSourceLabel(test.source_type).color}15`,
                                            color: getSourceLabel(test.source_type).color,
                                            border: `1px solid ${getSourceLabel(test.source_type).color}40`
                                        }}
                                    >
                                        {getSourceLabel(test.source_type).text}
                                    </span>
                                    <button
                                        className={styles.btnDetails}
                                        onClick={() => handleShowDetails(test)}
                                    >
                                        Szczegóły
                                    </button>
                                </div>
                            ))
                        ) : (
                            !folders.filter(f => !f.parent_folder_id).length && (
                                <div className={styles.emptyState}>
                                    <p>Brak testów. Wygeneruj pierwszy test używając AI!</p>
                                </div>
                            )
                        )}
                    </>
                )}
            </div>

            {/* Generate Test Modal */}
            {/* Create Folder Modal */}
            {showCreateFolderModal && (
                <div className={sharedStyles.modalOverlay} onClick={() => setShowCreateFolderModal(false)}>
                    <div className={sharedStyles.modal} onClick={(e) => e.stopPropagation()} style={{maxWidth: '450px'}}>
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

            {showGenerateModal && (
                <div className={sharedStyles.modalOverlay} onClick={() => !loading && setShowGenerateModal(false)}>
                    <div className={sharedStyles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={sharedStyles.modalHeader}>
                            <h2 className={sharedStyles.modalTitle}>Wygeneruj nowy test</h2>
                            <button
                                className={sharedStyles.closeBtn}
                                onClick={() => setShowGenerateModal(false)}
                                disabled={loading}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleGenerateTest} style={{display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0}}>
                            <div className="modal-form-content" style={{padding: '1.5rem 2rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', minHeight: 0}}>
                                <div>
                                    <label style={{fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.75rem', display: 'block'}}>
                                        Źródło materiału
                                    </label>
                                <div className={sharedStyles.sourceOptions}>
                                    <div className={sharedStyles.radioOption}>
                                        <input
                                            type="radio"
                                            id="source-manual"
                                            name="source_type"
                                            value="manual"
                                            checked={newTest.source_type === 'manual'}
                                            onChange={(e) => setNewTest({...newTest, source_type: e.target.value, note_id: null})}
                                            disabled={loading}
                                        />
                                        <label htmlFor="source-manual" className={sharedStyles.radioLabel}>
                                            <span className={sharedStyles.radioText}>Ręczny opis</span>
                                        </label>
                                    </div>
                                    <div className={sharedStyles.radioOption}>
                                        <input
                                            type="radio"
                                            id="source-file"
                                            name="source_type"
                                            value="file"
                                            checked={newTest.source_type === 'file'}
                                            onChange={(e) => setNewTest({...newTest, source_type: e.target.value, note_id: null})}
                                            disabled={loading}
                                        />
                                        <label htmlFor="source-file" className={sharedStyles.radioLabel}>
                                            <span className={sharedStyles.radioText}>Z pliku</span>
                                        </label>
                                    </div>
                                    <div className={sharedStyles.radioOption}>
                                        <input
                                            type="radio"
                                            id="source-note"
                                            name="source_type"
                                            value="note"
                                            checked={newTest.source_type === 'note'}
                                            onChange={(e) => setNewTest({...newTest, source_type: e.target.value, note_id: null})}
                                            disabled={loading}
                                        />
                                        <label htmlFor="source-note" className={sharedStyles.radioLabel}>
                                            <span className={sharedStyles.radioText}>Z notatki</span>
                                        </label>
                                    </div>
                                </div>
                                </div>

                                {newTest.source_type === 'file' && (
                                    <div className={sharedStyles.formGroup}>
                                        <label>Załącz plik (PDF, DOCX, TXT, lub obraz)</label>
                                        <div className={sharedStyles.fileUploadWrapper}>
                                            <input
                                                type="file"
                                                id="file-upload"
                                                accept=".pdf,.docx,.doc,.txt,.jpg,.jpeg,.png,.webp"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    setUploadFile(file);
                                                    if (file && !newTest.title) {
                                                        const filename = file.name.replace(/\.[^/.]+$/, '');
                                                        setNewTest({...newTest, title: filename});
                                                    }
                                                }}
                                                disabled={loading}
                                                className={sharedStyles.fileInput}
                                            />
                                            <label htmlFor="file-upload" className={sharedStyles.fileLabel}>
                                                {uploadFile ? uploadFile.name : 'Wybierz plik'}
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {newTest.source_type === 'note' && (
                                    <div className={sharedStyles.formGroup}>
                                        <label>Wybierz notatkę</label>
                                        <select
                                            value={newTest.note_id || ''}
                                            onChange={(e) => {
                                                const noteId = parseInt(e.target.value);
                                                const selectedNote = notes.find(n => n.id === noteId);
                                                setNewTest({
                                                    ...newTest,
                                                    note_id: noteId,
                                                    title: selectedNote ? selectedNote.title : newTest.title
                                                });
                                            }}
                                            disabled={loading}
                                        >
                                            <option value="">-- Wybierz notatkę --</option>
                                            {notes.map(note => (
                                                <option key={note.id} value={note.id}>{note.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className={sharedStyles.formGrid}>
                                    <div className={sharedStyles.formGroup}>
                                        <label>Tytuł testu</label>
                                        <input
                                            type="text"
                                            value={newTest.title}
                                            onChange={(e) => setNewTest({...newTest, title: e.target.value})}
                                            placeholder="np. Historia Polski"
                                            disabled={loading}
                                        />
                                    </div>
                                    <div className={sharedStyles.formGroup}>
                                        <label>Liczba pytań</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={newTest.num_questions}
                                            onChange={(e) => setNewTest({...newTest, num_questions: e.target.value})}
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                <div className={sharedStyles.formGroup}>
                                    <label>Temat / Zakres {newTest.source_type !== 'manual' && '(opcjonalny)'}</label>
                                    <textarea
                                        value={newTest.topic}
                                        onChange={(e) => setNewTest({...newTest, topic: e.target.value})}
                                        placeholder={newTest.source_type === 'manual' ? "Opisz temat testu..." : "Opcjonalnie podaj dodatkowe wskazówki..."}
                                        rows={3}
                                        disabled={loading}
                                    />
                                </div>

                                <div>
                                    <label style={{fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.75rem', display: 'block'}}>
                                        Typ pytań
                                    </label>
                                    <div className={sharedStyles.sourceOptions}>
                                    <div className={sharedStyles.radioOption}>
                                        <input
                                            type="radio"
                                            id="type-multiple"
                                            name="question_type"
                                            value="multiple_choice"
                                            checked={newTest.question_type === 'multiple_choice'}
                                            onChange={(e) => setNewTest({...newTest, question_type: e.target.value})}
                                            disabled={loading}
                                        />
                                        <label htmlFor="type-multiple" className={sharedStyles.radioLabel}>
                                            <span className={sharedStyles.radioText}>Wielokrotny wybór</span>
                                        </label>
                                    </div>
                                    <div className={sharedStyles.radioOption}>
                                        <input
                                            type="radio"
                                            id="type-truefalse"
                                            name="question_type"
                                            value="true_false"
                                            checked={newTest.question_type === 'true_false'}
                                            onChange={(e) => setNewTest({...newTest, question_type: e.target.value})}
                                            disabled={loading}
                                        />
                                        <label htmlFor="type-truefalse" className={sharedStyles.radioLabel}>
                                            <span className={sharedStyles.radioText}>Prawda/Fałsz</span>
                                        </label>
                                    </div>
                                    <div className={sharedStyles.radioOption}>
                                        <input
                                            type="radio"
                                            id="type-multiple-answers"
                                            name="question_type"
                                            value="multiple_answers"
                                            checked={newTest.question_type === 'multiple_answers'}
                                            onChange={(e) => setNewTest({...newTest, question_type: e.target.value})}
                                            disabled={loading}
                                        />
                                        <label htmlFor="type-multiple-answers" className={sharedStyles.radioLabel}>
                                            <span className={sharedStyles.radioText}>Wiele odpowiedzi</span>
                                        </label>
                                    </div>
                                    <div className={sharedStyles.radioOption}>
                                        <input
                                            type="radio"
                                            id="type-mixed"
                                            name="question_type"
                                            value="mixed"
                                            checked={newTest.question_type === 'mixed'}
                                            onChange={(e) => setNewTest({...newTest, question_type: e.target.value})}
                                            disabled={loading}
                                        />
                                        <label htmlFor="type-mixed" className={sharedStyles.radioLabel}>
                                            <span className={sharedStyles.radioText}>Mieszany</span>
                                        </label>
                                    </div>
                                </div>
                                </div>
                            </div>
                            <div className={sharedStyles.modalActions}>
                                <button
                                    type="button"
                                    className={sharedStyles.btnCancel}
                                    onClick={() => setShowGenerateModal(false)}
                                    disabled={loading}
                                >
                                    Anuluj
                                </button>
                                <button
                                    type="submit"
                                    className={sharedStyles.btnSubmit}
                                    disabled={loading}
                                >
                                    {loading ? 'Generowanie...' : 'Wygeneruj test'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Take Test Modal */}
            {showTakeTestModal && currentTest && (
                <div className={sharedStyles.modalOverlay}>
                    <div className={styles.modalLarge} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>{currentTest.title}</h2>
                            <button
                                className={sharedStyles.closeBtn}
                                onClick={() => setShowTakeTestModal(false)}
                                disabled={loading}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.testQuestions}>
                            {currentQuestions.map((question, index) => renderQuestion(question, index))}
                        </div>
                        <div className={sharedStyles.modalActions}>
                            <button
                                className={sharedStyles.btnCancel}
                                onClick={() => setShowTakeTestModal(false)}
                                disabled={loading}
                            >
                                Anuluj
                            </button>
                            <button
                                className={sharedStyles.btnSubmit}
                                onClick={handleSubmitTest}
                                disabled={loading}
                            >
                                {loading ? 'Sprawdzanie...' : 'Zakończ test'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Results Modal */}
            {showResultsModal && testResults && (
                <div className={sharedStyles.modalOverlay} onClick={() => setShowResultsModal(false)}>
                    <div className={styles.modalLarge} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>Wyniki testu</h2>
                            <button
                                className={sharedStyles.closeBtn}
                                onClick={() => setShowResultsModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.resultsHeader}>
                            <div
                                className={styles.scoreCircle}
                                style={{
                                    '--good-degrees': `${testResults.score_percentage * 3.6}deg`,
                                    '--good-color': '#4ade80',
                                    '--bad-color': '#f87171'
                                }}
                            >
                                <span className={styles.scorePercentage}>
                                    {testResults.score_percentage.toFixed(0)}%
                                </span>
                            </div>
                            <div className={styles.scoreDetails}>
                                <p className={styles.scoreText}>
                                    Poprawnych odpowiedzi: <strong>{testResults.correct_answers} / {testResults.total_questions}</strong>
                                </p>
                            </div>
                        </div>
                        <div className={styles.answersList}>
                            {testResults.answers.map((answer, index) => {
                                // Helper function to get full answer text from options if needed
                                const getFullAnswerText = (answerText, options) => {
                                    if (!answerText || !options) return answerText;

                                    // Check if answer is letter keys (single or multiple like "A, C, D")
                                    // Split by comma and trim spaces
                                    const parts = answerText.split(',').map(p => p.trim());

                                    // If all parts are single letters (A-Z), convert to full text
                                    if (parts.every(p => p.length === 1 && /^[A-Z]$/.test(p))) {
                                        const fullTexts = parts
                                            .filter(p => options[p])
                                            .map(p => options[p]);
                                        return fullTexts.join(', ');
                                    }

                                    return answerText;
                                };

                                const userAnswerText = getFullAnswerText(answer.user_answer, answer.all_options);
                                const correctAnswerText = getFullAnswerText(answer.correct_answer, answer.all_options);

                                return (
                                    <div
                                        key={answer.question_id}
                                        className={`${styles.answerBlock} ${answer.is_correct ? styles.correct : styles.incorrect}`}
                                    >
                                        <div className={styles.answerHeader}>
                                            <h3 className={styles.questionNumber}>Pytanie {index + 1}</h3>
                                            {answer.is_correct ? (
                                                <CheckCircle size={20} color="#4ade80" />
                                            ) : (
                                                <X size={20} color="#f87171" />
                                            )}
                                        </div>
                                        <p className={styles.questionText}>
                                            <MathText text={answer.question} />
                                        </p>
                                        {answer.user_answer ? (
                                            <>
                                                <p className={styles.answerLabel}>Twoja odpowiedź:</p>
                                                <p className={answer.is_correct ? styles.correctAnswer : styles.wrongAnswer}>
                                                    <MathText text={userAnswerText} />
                                                </p>
                                                {!answer.is_correct && (
                                                    <>
                                                        <p className={styles.answerLabel}>Prawidłowa odpowiedź:</p>
                                                        <p className={styles.correctAnswer}>
                                                            <MathText text={correctAnswerText} />
                                                        </p>
                                                    </>
                                                )}
                                            </>
                                        ) : (
                                            <p className={styles.noAnswer}>Nie udzielono odpowiedzi</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetailsModal && selectedTest && (
                <div className={sharedStyles.modalOverlay} onClick={() => setShowDetailsModal(false)}>
                    <div className={styles.detailsModal} onClick={(e) => e.stopPropagation()}>
                        <div className={sharedStyles.modalHeader}>
                            <h2 className={sharedStyles.modalTitle}>{selectedTest.title}</h2>
                            <button
                                className={sharedStyles.closeBtn}
                                onClick={() => setShowDetailsModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.detailsContent}>
                            <div className={styles.detailsInfo}>
                                {selectedTest.topic && (
                                    <div className={styles.detailSection}>
                                        <span className={styles.detailSectionLabel}>Opis:</span>
                                        <p className={styles.topicDescription}>{selectedTest.topic}</p>
                                    </div>
                                )}
                                {selectedTest.description && (
                                    <div className={styles.detailSection}>
                                        <span className={styles.detailSectionLabel}>Zakres:</span>
                                        <p className={styles.topicDescription}>{selectedTest.description}</p>
                                    </div>
                                )}
                                <div className={styles.detailSection}>
                                    <span className={styles.detailSectionLabel}>Metoda generowania:</span>
                                    <span
                                        className={styles.sourceLabel}
                                        style={{
                                            backgroundColor: `${getSourceLabel(selectedTest.source_type).color}15`,
                                            color: getSourceLabel(selectedTest.source_type).color,
                                            border: `1px solid ${getSourceLabel(selectedTest.source_type).color}40`
                                        }}
                                    >
                                        {getSourceLabel(selectedTest.source_type).text}
                                    </span>
                                </div>
                                <div className={styles.detailSection}>
                                    <span className={styles.detailSectionLabel}>Data utworzenia:</span>
                                    <span className={styles.detailValue}>{formatDate(selectedTest.created_at)}</span>
                                </div>
                            </div>
                            <div className={styles.detailsActions}>
                                <button
                                    className={styles.btnPlayLarge}
                                    onClick={() => handleStartTest(selectedTest)}
                                >
                                    <Play size={18} />
                                    Rozwiąż test
                                </button>
                                <button
                                    className={styles.btnResultsLarge}
                                    onClick={() => handleViewResults(selectedTest)}
                                >
                                    <BarChart size={18} />
                                    Zobacz wyniki
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
