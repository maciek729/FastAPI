import { useState, useEffect } from "react";
import axios from "axios";
import { ArrowLeft, RotateCw, Award, Loader } from "lucide-react";
import FlashcardCard from "./FlashcardCard";
import styles from "../../../css/features/FlashcardLearning.module.css";

export default function FlashcardLearning({ flashcardSet, userId, onBack }) {
    const [allFlashcards, setAllFlashcards] = useState([]); // Pełny oryginalny zestaw
    const [flashcards, setFlashcards] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [sessionStats, setSessionStats] = useState({
        total: 0,
        reviewed: 0,
        correct: 0,
        incorrect: 0
    });
    const [incorrectCards, setIncorrectCards] = useState([]);
    const [showCompletion, setShowCompletion] = useState(false);

    useEffect(() => {
        fetchFlashcards();
    }, [flashcardSet.id]);

    const fetchFlashcards = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`http://localhost:8000/flashcards/set/${flashcardSet.id}/cards`);
            setAllFlashcards(response.data); // Zapisz oryginalny zestaw
            setFlashcards(response.data);
            setSessionStats(prev => ({...prev, total: response.data.length}));
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    const handleReview = async (knows) => {
        const currentCard = flashcards[currentIndex];

        try {
            await axios.post("http://localhost:8000/flashcards/review", {
                flashcard_id: currentCard.id,
                user_id: userId,
                quality: knows ? "umiem" : "nie_umiem"
            });

            setSessionStats(prev => ({
                ...prev,
                reviewed: prev.reviewed + 1,
                correct: knows ? prev.correct + 1 : prev.correct,
                incorrect: knows ? prev.incorrect : prev.incorrect + 1
            }));

            if (!knows) {
                setIncorrectCards(prev => [...prev, currentCard]);
            }

            if (currentIndex < flashcards.length - 1) {
                setCurrentIndex(currentIndex + 1);
            } else {
                setShowCompletion(true);
            }
        } catch (error) {
            alert("Błąd podczas zapisywania postępu");
        }
    };

    const handleRestart = () => {
        setFlashcards(allFlashcards);
        setCurrentIndex(0);
        setShowCompletion(false);
        setIncorrectCards([]);
        setSessionStats({
            total: allFlashcards.length,
            reviewed: 0,
            correct: 0,
            incorrect: 0
        });
    };

    const handleRepeatIncorrect = () => {
        setFlashcards(incorrectCards);
        setCurrentIndex(0);
        setShowCompletion(false);
        setIncorrectCards([]);
        setSessionStats({
            total: incorrectCards.length,
            reviewed: 0,
            correct: 0,
            incorrect: 0
        });
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <Loader className={styles.spinner} size={48} />
                <p>Ładowanie fiszek...</p>
            </div>
        );
    }

    if (showCompletion) {
        const percentageCorrect = sessionStats.reviewed > 0
            ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100)
            : 0;

        return (
            <div className={styles.completion}>
                <Award className={styles.completionIcon} size={64} />
                <h2>Sesja ukończona!</h2>
                <p>Zestaw: "{flashcardSet.title}"</p>

                <div className={styles.completionStats}>
                    <div className={styles.completionStat}>
                        <span className={styles.completionStatValue}>{sessionStats.correct}</span>
                        <span className={styles.completionStatLabel}>Umiem</span>
                    </div>
                    <div className={styles.completionStat}>
                        <span className={styles.completionStatValue}>{sessionStats.incorrect}</span>
                        <span className={styles.completionStatLabel}>Nie umiem</span>
                    </div>
                    <div className={styles.completionStat}>
                        <span className={styles.completionStatValue}>{percentageCorrect}%</span>
                        <span className={styles.completionStatLabel}>Wynik</span>
                    </div>
                </div>

                <div className={styles.completionActions}>
                    <button className={styles.btnRestart} onClick={handleRestart}>
                        <RotateCw size={18} />
                        Wszystkie fiszki od nowa
                    </button>
                    {incorrectCards.length > 0 && (
                        <button className={styles.btnRepeatIncorrect} onClick={handleRepeatIncorrect}>
                            <RotateCw size={18} />
                            Powtórz fiszki których nie umiem ({incorrectCards.length})
                        </button>
                    )}
                    <button className={styles.btnBack} onClick={onBack}>
                        Wróć do listy
                    </button>
                </div>
            </div>
        );
    }

    const currentCard = flashcards[currentIndex];

    return (
        <div className={styles.learningContainer}>
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={onBack}>
                    <ArrowLeft size={20} />
                    Wróć
                </button>
                <div className={styles.progress}>
                    <span>{currentIndex + 1} / {flashcards.length}</span>
                    <div className={styles.progressBar}>
                        <div
                            className={styles.progressFill}
                            style={{ '--progress-width': `${((currentIndex + 1) / flashcards.length) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            <FlashcardCard
                question={currentCard.question}
                answer={currentCard.answer}
                onReview={handleReview}
            />
        </div>
    );
}
