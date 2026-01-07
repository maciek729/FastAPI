import { useState, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
import { confirmModal } from '../../../utils/confirmModal';
import { X } from 'lucide-react';
import MathText from './MathText';
import styles from "../../../css/features/TestsView.module.css";
import sharedStyles from "../../../css/features/NotebookView.module.css";
import * as testsService from '../../../services/testsService';
import { LanguageContext } from '../../../translations/LanguageContext';
import translations from '../../../translations/translation.json';

export default function TestTaking({
    show,
    onClose,
    currentTest,
    currentQuestions,
    userData,
    onSubmitComplete
}) {
    const [loading, setLoading] = useState(false);
    const [userAnswers, setUserAnswers] = useState({});
    const { language } = useContext(LanguageContext);

    const t = (key, params = {}) => {
        const keys = key.split('.');
        let translation = translations[language];

        for (const k of keys) {
            translation = translation?.[k];
            if (!translation) return key;
        }

        if (typeof translation === 'string' && Object.keys(params).length > 0) {
            return translation.replace(/\{(\w+)\}/g, (_, k) => params[k] || `{${k}}`);
        }

        return translation || key;
    };
    useEffect(() => {
        if (show && currentTest) {
            setUserAnswers({});
        }
    }, [show, currentTest?.id]);

    const handleSelectAnswer = (questionId, answer, isMultiple = false) => {
        if (isMultiple) {
            setUserAnswers(prev => {
                const current = prev[questionId] || [];
                const currentArray = Array.isArray(current) ? current : [];

                if (currentArray.includes(answer)) {
                    return {
                        ...prev,
                        [questionId]: currentArray.filter(a => a !== answer)
                    };
                } else {
                    return {
                        ...prev,
                        [questionId]: [...currentArray, answer]
                    };
                }
            });
        } else {
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
            const confirmed = await confirmModal(t('testTaking.unansweredConfirm',{count : unanswered.length}));
            if (!confirmed) {
                return;
            }
        }

        setLoading(true);
        try {
            for (const question of currentQuestions) {
                const answer = userAnswers[question.id];
                if (answer) {
                    const answerString = Array.isArray(answer)
                        ? JSON.stringify(answer)
                        : JSON.stringify([answer]);

                    await testsService.submitAnswer({
                        user_id: userData.id,
                        test_question_id: question.id,
                        selected_answer: answerString
                    });
                }
            }

            const results = await testsService.getTestResults(currentTest.id, userData.id);
            onSubmitComplete(results);
        } catch (err) {
            console.error('Error submitting test:', err);
            toast.error(t('testTaking.sendError'));
        } finally {
            setLoading(false);
        }
    };

    const renderQuestion = (question, index) => {
        const questionType = question.question_type || 'multiple_choice';
        const options = JSON.parse(question.other_options);
        const userAnswer = userAnswers[question.id];

        if (questionType === 'true_false') {
            return (
                <div key={question.id} className={styles.questionBlock}>
                    <h3 className={styles.questionNumber}>{t('testTaking.que')} {index + 1}</h3>
                    <p className={styles.questionText}>
                        <MathText text={question.question} />
                    </p>
                    <div className={styles.optionsGrid}>
                        {[t('testTaking.true'), t('testTaking.false')].map((option) => (
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
                    <h3 className={styles.questionNumber}>{t('testTaking.que')} {index + 1}</h3>
                    <p className={styles.questionText}>
                        <MathText text={question.question} />
                    </p>
                    <p className={styles.multipleAnswersHint}>
                        {t('testTaking.chooseCorrect')}
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
                    <h3 className={styles.questionNumber}>{t('testTaking.que') }{index + 1}</h3>
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

    if (!show || !currentTest) return null;

    return (
        <div className={sharedStyles.modalOverlay}>
            <div className={styles.modalLarge} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>{currentTest.title}</h2>
                    <button
                        className={sharedStyles.closeBtn}
                        onClick={onClose}
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
                        onClick={onClose}
                        disabled={loading}
                    >
                        {t('flashcardsView.cancel')}
                    </button>
                    <button
                        className={sharedStyles.btnSubmit}
                        onClick={handleSubmitTest}
                        disabled={loading}
                    >
                        {loading ? t('testTaking.checking') : t('testTaking.endTest')}
                    </button>
                </div>
            </div>
        </div>
    );
}
