import { useState, useContext} from 'react';
import toast from 'react-hot-toast';
import { X, CheckSquare, Square } from 'lucide-react';
import styles from "../../../css/features/FlashcardGenerator.module.css";
import { generatePodcast } from '../../../services/podcastService';
import { LanguageContext } from "../../../translations/LanguageContext";
import translations from "../../../translations/translation.json";

export default function PodcastGenerator({
    show,
    onClose,
    onSuccess,
    onStartGenerating,
    onError,
    notebookId,
    userData,
    notes
}) {
    const [selectedNoteIds, setSelectedNoteIds] = useState([]);
    const [topic, setTopic] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
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

    const handleToggleNote = (noteId) => {
        setSelectedNoteIds(prev =>
            prev.includes(noteId)
                ? prev.filter(id => id !== noteId)
                : [...prev, noteId]
        );
    };

    const handleGenerate = async (e) => {
        e.preventDefault();

        if (!topic.trim()) {
            toast.error(t('podcastGenerator.topicRequired'));
            return;
        }

        setIsGenerating(true);

        // Close modal and show loading state immediately
        if (onStartGenerating) {
            onStartGenerating();
        }

        try {
            await generatePodcast(notebookId, userData.id, topic, selectedNoteIds, null);
            toast.success(t('podcastGenerator.success'));
            setTopic('');
            setSelectedNoteIds([]);
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error(err.message || t('podcastGenerator.error'));
            if (onError) {
                onError();
            }
        } finally {
            setIsGenerating(false);
        }
    };

    if (!show) return null;

    return (
        <div className={styles.modalOverlay} onClick={() => !isGenerating && onClose()}>
            <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title}>{t('podcastGenerator.title')}</h2>
                    <button
                        className={styles.closeBtn}
                        onClick={onClose}
                        disabled={isGenerating}
                        title={t('flashcardsView.close')}
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleGenerate} className={styles.form}>
                    <div className={styles.formSection}>
                        <h3 className={styles.sectionTitle}>{t('podcastGenerator.basicInfo')}</h3>

                        <div className={styles.formGroup}>
                            <label>{t('podcastGenerator.topicLabel')}</label>
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder={t('podcastGenerator.topicPlaceholder')}
                                disabled={isGenerating}
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>{t('podcastGenerator.selectNotes', { count: selectedNoteIds.length })}</label>
                            <div className={styles.notesContainer}>
                                {notes && notes.length > 0 ? (
                                    notes.map(note => (
                                        <div
                                            key={note.id}
                                            onClick={() => !isGenerating && handleToggleNote(note.id)}
                                            className={`${styles.noteItem} ${selectedNoteIds.includes(note.id) ? styles.selected : ''}`}
                                        >
                                            {selectedNoteIds.includes(note.id) ? (
                                                <CheckSquare size={20} className={styles.noteIcon} />
                                            ) : (
                                                <Square size={20} className={styles.noteIcon} />
                                            )}
                                            <span className={styles.noteTitle}>{note.title}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className={styles.emptyNote}>
                                        {t('podcastGenerator.noNotes')}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={styles.formActions}>
                        <button
                            type="button"
                            onClick={onClose}
                            className={styles.btnCancel}
                            disabled={isGenerating}
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            className={styles.btnSubmit}
                            disabled={isGenerating}
                        >
                            {isGenerating ? t('podcastGenerator.generating') : t('podcastGenerator.generate')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
