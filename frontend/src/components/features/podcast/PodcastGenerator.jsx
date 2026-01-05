import { useState } from 'react';
import toast from 'react-hot-toast';
import { X, CheckSquare, Square } from 'lucide-react';
import styles from "../../../css/features/FlashcardGenerator.module.css";
import { generatePodcast } from '../../../services/podcastService';

export default function PodcastGenerator({
    show,
    onClose,
    onSuccess,
    notebookId,
    userData,
    notes
}) {
    const [selectedNoteIds, setSelectedNoteIds] = useState([]);
    const [title, setTitle] = useState('');
    const [topic, setTopic] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleToggleNote = (noteId) => {
        setSelectedNoteIds(prev =>
            prev.includes(noteId)
                ? prev.filter(id => id !== noteId)
                : [...prev, noteId]
        );
    };

    const handleGenerate = async (e) => {
        e.preventDefault();

        if (!title.trim()) {
            toast.error("Podaj tytuł podcastu!");
            return;
        }

        if (!topic.trim()) {
            toast.error("Podaj opis/temat podcastu!");
            return;
        }

        setIsGenerating(true);
        try {
            await generatePodcast(notebookId, userData.id, title, selectedNoteIds, null, topic);
            toast.success("Podcast został wygenerowany!");
            setTitle('');
            setTopic('');
            setSelectedNoteIds([]);
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.message || "Nie udało się wygenerować podcastu");
        } finally {
            setIsGenerating(false);
        }
    };

    if (!show) return null;

    return (
        <div className={styles.modalOverlay} onClick={() => !isGenerating && onClose()}>
            <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Wygeneruj nowy podcast</h2>
                    <button
                        className={styles.closeBtn}
                        onClick={onClose}
                        disabled={isGenerating}
                        title="Zamknij"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleGenerate} className={styles.form}>
                    <div className={styles.formSection}>
                        <h3 className={styles.sectionTitle}>Podstawowe informacje</h3>

                        <div className={styles.formGroup}>
                            <label>Tytuł podcastu *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="np. Historia Polski - Średniowiecze"
                                disabled={isGenerating}
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Opis/Temat podcastu *</label>
                            <textarea
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="np. Opowiedz o najważniejszych wydarzeniach w średniowiecznej Polsce, skupiając się na bitwach i władcach"
                                disabled={isGenerating}
                                required
                                rows={4}
                                style={{ resize: 'vertical', minHeight: '80px' }}
                            />
                            <small style={{ color: 'var(--subtitle)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                Opisz co dokładnie ma zostać omówione w podcastie - AI wygeneruje treść na podstawie tego opisu
                            </small>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Wybierz notatki (opcjonalnie, {selectedNoteIds.length} wybrano)</label>
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
                                        Brak notatek w tym notesie
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
                            Anuluj
                        </button>
                        <button
                            type="submit"
                            className={styles.btnSubmit}
                            disabled={isGenerating}
                        >
                            {isGenerating ? "Generowanie..." : "Generuj Podcast"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
