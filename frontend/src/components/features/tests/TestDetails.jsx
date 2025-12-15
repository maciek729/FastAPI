import { X, Play, BarChart } from 'lucide-react';
import styles from "../../../css/features/TestsView.module.css";
import sharedStyles from "../../../css/features/NotebookView.module.css";

export default function TestDetails({ show, onClose, test, onStartTest, onViewResults }) {
    if (!show || !test) return null;

    const getSourceLabel = (sourceType) => {
        const labels = {
            'manual': {
                text: 'Ręczny opis',
                color: 'var(--purple_brighter)',
                bg: 'var(--purple_brighter_bg)',
                border: 'var(--purple_brighter_border)'
            },
            'file': {
                text: 'Z pliku',
                color: '#3b82f6',
                bg: '#3b82f615',
                border: '#3b82f640'
            },
            'note': {
                text: 'Z notatki',
                color: '#10b981',
                bg: '#10b98115',
                border: '#10b98140'
            }
        };
        return labels[sourceType] || labels['manual'];
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

    return (
        <div className={sharedStyles.modalOverlay} onClick={onClose}>
            <div className={styles.detailsModal} onClick={(e) => e.stopPropagation()}>
                <div className={sharedStyles.modalHeader}>
                    <h2 className={sharedStyles.modalTitle}>{test.title}</h2>
                    <button
                        className={sharedStyles.closeBtn}
                        onClick={onClose}
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className={styles.detailsContent}>
                    <div className={styles.detailsInfo}>
                        {test.topic && (
                            <div className={styles.detailSection}>
                                <span className={styles.detailSectionLabel}>Opis:</span>
                                <p className={styles.topicDescription}>{test.topic}</p>
                            </div>
                        )}
                        {test.description && (
                            <div className={styles.detailSection}>
                                <span className={styles.detailSectionLabel}>Zakres:</span>
                                <p className={styles.topicDescription}>{test.description}</p>
                            </div>
                        )}
                        <div className={styles.detailSection}>
                            <span className={styles.detailSectionLabel}>Metoda generowania:</span>
                            <span
                                className={styles.sourceLabel}
                                style={{
                                    backgroundColor: getSourceLabel(test.source_type).bg,
                                    color: getSourceLabel(test.source_type).color,
                                    border: `1px solid ${getSourceLabel(test.source_type).border}`
                                }}
                            >
                                {getSourceLabel(test.source_type).text}
                            </span>
                        </div>
                        <div className={styles.detailSection}>
                            <span className={styles.detailSectionLabel}>Data utworzenia:</span>
                            <span className={styles.detailValue}>{formatDate(test.created_at)}</span>
                        </div>
                    </div>
                    <div className={styles.detailsActions}>
                        <button
                            className={styles.btnPlayLarge}
                            onClick={() => onStartTest(test)}
                        >
                            <Play size={18} />
                            Rozwiąż test
                        </button>
                        <button
                            className={styles.btnResultsLarge}
                            onClick={() => onViewResults(test)}
                        >
                            <BarChart size={18} />
                            Zobacz wyniki
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
