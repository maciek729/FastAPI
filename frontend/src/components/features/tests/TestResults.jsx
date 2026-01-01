import { X, CheckCircle } from 'lucide-react';
import MathText from './MathText';
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

    return (
        <div className={sharedStyles.modalOverlay} onClick={onClose}>
            <div className={styles.modalLarge} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>Wyniki testu</h2>
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
                            Poprawnych odpowiedzi: <strong>{testResults.correct_answers} / {testResults.total_questions}</strong>
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
    );
}
