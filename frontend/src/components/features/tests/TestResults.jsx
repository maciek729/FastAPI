import { X, CheckCircle } from 'lucide-react';
import MathText from './MathText';
import {useContext } from 'react';
import { LanguageContext } from '../../../translations/LanguageContext';
import translations from '../../../translations/translation.json';
import styles from "../../../css/features/TestsView.module.css";
import sharedStyles from "../../../css/features/NotebookView.module.css";

export default function TestResults({ show, onClose, testResults }) {
    if (!show || !testResults) return null;

    const getFullAnswerText = (answerText, options) => {
        if (!answerText || !options) return answerText;

        const parts = answerText.split(',').map(p => p.trim());

        if (parts.every(p => p.length === 1 && /^[A-Z]$/.test(p))) {
            const fullTexts = parts
                .filter(p => options[p])
                .map(p => options[p]);
            return fullTexts.join(', ');
        }

        return answerText;
    };
    const { language } = useContext(LanguageContext);

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
    return (
        <div className={sharedStyles.modalOverlay} onClick={onClose}>
            <div className={styles.modalLarge} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>{t('testResults.title')}</h2>
                    <button
                        className={sharedStyles.closeBtn}
                        onClick={onClose}
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
                            {t('testResults.correctAnswers')} <strong>{testResults.correct_answers} / {testResults.total_questions}</strong>
                        </p>
                    </div>
                </div>
                <div className={styles.answersList}>
                    {testResults.answers.map((answer, index) => {
                        const userAnswerText = getFullAnswerText(answer.user_answer, answer.all_options);
                        const correctAnswerText = getFullAnswerText(answer.correct_answer, answer.all_options);

                        return (
                            <div
                                key={answer.question_id}
                                className={`${styles.answerBlock} ${answer.is_correct ? styles.correct : styles.incorrect}`}
                            >
                                <div className={styles.answerHeader}>
                                    <h3 className={styles.questionNumber}>{t('testResults.question')} {index + 1}</h3>
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
                                        <p className={styles.answerLabel}>{t('testResults.yourAnswer')}</p>
                                        <p className={answer.is_correct ? styles.correctAnswer : styles.wrongAnswer}>
                                            <MathText text={userAnswerText} />
                                        </p>
                                        {!answer.is_correct && (
                                            <>
                                                <p className={styles.answerLabel}>{t('testResults.correctAnswer')}</p>
                                                <p className={styles.correctAnswer}>
                                                    <MathText text={correctAnswerText} />
                                                </p>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <p className={styles.noAnswer}>{t('testResults.noAnswer')}</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
