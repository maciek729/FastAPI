import { useState, useEffect } from "react";
import axios from "axios";
import { BookOpen, Trash2, Play, Brain, Settings } from "lucide-react";
import styles from "../../../css/features/FlashcardsView.module.css";

export default function FlashcardSetsList({ sets, loading, userId, onStartLearning, onManageSet, onDelete }) {
    const [progress, setProgress] = useState({});
    const [loadingProgress, setLoadingProgress] = useState({});

    useEffect(() => {
        if (sets.length > 0 && userId) {
            sets.forEach(set => {
                fetchProgress(set.id);
            });
        }
    }, [sets, userId]);

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

    if (sets.length === 0) {
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
            {sets.map(set => {
                const setProgress = progress[set.id];
                const isLoadingProgress = loadingProgress[set.id];

                return (
                    <div
                        key={set.id}
                        className={styles.setCard}
                    >
                        <div className={styles.setHeader}>
                            <div className={styles.setTitle}>
                                <BookOpen size={20} />
                                <h3>{set.title}</h3>
                            </div>
                            <span
                                className={styles.difficultyBadge}
                                style={{ '--difficulty-color': getDifficultyColor(set.difficulty) }}
                            >
                                {set.difficulty}
                            </span>
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
