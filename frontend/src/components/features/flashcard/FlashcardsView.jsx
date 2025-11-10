import { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Search, X } from "lucide-react";
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

    useEffect(() => {
        if (notebookId) {
            fetchFlashcardSets();
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
                    <h1 className={styles.notebookTitle}>Fiszki</h1>
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
                <button
                    className={styles.addNoteBtn}
                    onClick={() => setShowGenerateModal(true)}
                >
                    <Plus size={18} />
                    Generuj fiszki
                </button>
            </div>

            <FlashcardSetsList
                sets={getFilteredAndSortedSets()}
                loading={loading}
                userId={userData.id}
                onStartLearning={handleStartLearning}
                onManageSet={handleManageSet}
                onDelete={fetchFlashcardSets}
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
        </div>
    );
}
