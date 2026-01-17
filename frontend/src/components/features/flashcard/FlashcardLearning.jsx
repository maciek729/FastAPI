import { useState, useEffect, useContext } from "react";
import toast from 'react-hot-toast';
import { ArrowLeft, RotateCw, Award, Loader } from "lucide-react";
import FlashcardCard from "./FlashcardCard";
import styles from "../../../css/features/FlashcardLearning.module.css";
import { LanguageContext } from "../../../translations/LanguageContext";
import translations from "../../../translations/translation.json";
import { getFlashcardSetCards, reviewFlashcard } from '../../../services/flashcardService';

export default function FlashcardLearning({ flashcardSet, userId, onBack }) {
    const [allFlashcards, setAllFlashcards] = useState([]);
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
        fetchFlashcards();
    }, [flashcardSet.id]);

    const fetchFlashcards = async () => {
        try {
            setLoading(true);
            const data = await getFlashcardSetCards(flashcardSet.id);
            setAllFlashcards(data);
            setFlashcards(data);
            setSessionStats(prev => ({...prev, total: data.length}));
        } catch {
        } finally {
            setLoading(false);
        }
    };

    const handleReview = async (knows) => {
        const currentCard = flashcards[currentIndex];

        try {
            await reviewFlashcard({
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
            toast.error(t('flashcardLearning.saveError'));
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
                <p>{t('flashcardLearning.loading')}</p>
            </div>
        );
    }

    if (showCompletion) {
        const percentageCorrect = sessionStats.reviewed > 0
            ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100)
            : 0;

        return (
            <div className={styles.completion}>
                <h2>{t('flashcardLearning.sessionCompleted')}</h2>
                <p>{t('flashcardLearning.set')}: "{flashcardSet.title}"</p>

                <div className={styles.completionStats}>
                    <div className={styles.completionStat}>
                        <span className={styles.completionStatValue}>{sessionStats.correct}</span>
                        <span className={styles.completionStatLabel}>{t('flashcardLearning.know')}</span>
                    </div>
                    <div className={styles.completionStat}>
                        <span className={styles.completionStatValue}>{sessionStats.incorrect}</span>
                        <span className={styles.completionStatLabel}>{t('flashcardLearning.dontKnow')}</span>
                    </div>
                    <div className={styles.completionStat}>
                        <span className={styles.completionStatValue}>{percentageCorrect}%</span>
                        <span className={styles.completionStatLabel}>{t('flashcardLearning.score')}</span>
                    </div>
                </div>

                <div className={styles.completionActions}>
                    <button className={styles.btnRestart} onClick={handleRestart}>
                        <RotateCw size={18} />
                        {t('flashcardLearning.restartAll')}
                    </button>
                    {incorrectCards.length > 0 && (
                        <button className={styles.btnRepeatIncorrect} onClick={handleRepeatIncorrect}>
                            <RotateCw size={18} />
                            {t('flashcardLearning.repeatIncorrect', { count: incorrectCards.length })}
                        </button>
                    )}
                    <button className={styles.btnBack} onClick={onBack}>
                        {t('flashcardLearning.backToList')}
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
                    {t('flashcardLearning.back')}
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