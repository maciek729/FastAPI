import { useState, useEffect, useContext } from "react";
import toast from 'react-hot-toast';
import { X, Loader, CheckSquare } from "lucide-react";
import styles from "../../../css/features/FlashcardGenerator.module.css";
import { LanguageContext } from "../../../translations/LanguageContext";
import translations from "../../../translations/translation.json";
import { generateFlashcards, generateFlashcardsFromFile } from '../../../services/flashcardService';
import ENDPOINTS from '../../../api/endpoints';

export default function FlashcardGenerator({ notebookId, userId, onSuccess, onCancel, onStartGenerating, onError }) {
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        difficulty: "średni",
        count: 10,
        source_type: "manual",
        source_note_ids: []
    });
    const [notes, setNotes] = useState([]);
    const [uploadFile, setUploadFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
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
        if (notebookId) {
            fetchNotes();
        }
    }, [notebookId]);

    const fetchNotes = async () => {
        if (!notebookId) {
            return;
        }
        try {
            setLoading(true);
            const response = await fetch(ENDPOINTS.NOTES.LIST(notebookId), {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setNotes(data.filter(note => note.type !== "Fiszki"));
            }
        } catch {
        } finally {
            setLoading(false);
        }
    };

    const handleNoteToggle = (noteId) => {
        setFormData(prev => ({
            ...prev,
            source_note_ids: prev.source_note_ids.includes(noteId)
                ? prev.source_note_ids.filter(id => id !== noteId)
                : [...prev.source_note_ids, noteId]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            toast.error(t('flashcardGenerator.titleError'));
            return;
        }

        if (formData.source_type === "manual" && !formData.description.trim()) {
            toast.error(t('flashcardGenerator.descriptionError'));
            return;
        }

        if (formData.source_type === "file" && !uploadFile) {
            toast.error(t('flashcardGenerator.fileError'));
            return;
        }

        if (formData.source_type === "note" && formData.source_note_ids.length === 0) {
            toast.error(t('flashcardGenerator.noteError'));
            return;
        }

        setGenerating(true);

        // Close modal and show loading state immediately
        if (onStartGenerating) {
            onStartGenerating();
        }

        try {
            if (formData.source_type === "file" && uploadFile) {
                const requestData = new FormData();
                requestData.append("user_id", userId);
                requestData.append("notebook_id", notebookId);
                requestData.append("title", formData.title);
                requestData.append("description", formData.description || "");
                requestData.append("difficulty", formData.difficulty);
                requestData.append("count", formData.count);
                requestData.append("file", uploadFile);

                await generateFlashcardsFromFile(requestData);
            } else {
                await generateFlashcards({
                    user_id: userId,
                    notebook_id: notebookId,
                    title: formData.title,
                    description: formData.description || "",
                    difficulty: formData.difficulty,
                    count: formData.count,
                    source_type: formData.source_type,
                    source_note_ids: formData.source_note_ids
                });
            }

            toast.success(t('flashcardGenerator.success'));
            onSuccess();
        } catch (error) {
            const errorMessage = error.response?.data?.detail || error.message || t('flashcardGenerator.unknownError');
            toast.error(t('flashcardGenerator.generationError') + ": " + errorMessage);
            if (onError) {
                onError();
            }
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && !generating && onCancel()}>
            <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                <h2 className={styles.title}>{t('flashcardGenerator.title')}</h2>
                <button className={styles.closeBtn} onClick={onCancel} title={t('flashcardGenerator.close')}>
                    <X size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formSection}>
                    <h3 className={styles.sectionTitle}>{t('flashcardGenerator.sourceTitle')}</h3>
                    <div className={styles.sourceOptions}>
                        <div className={styles.radioOption}>
                            <input
                                type="radio"
                                id="source-manual"
                                name="source_type"
                                value="manual"
                                checked={formData.source_type === 'manual'}
                                onChange={(e) => setFormData({...formData, source_type: e.target.value, source_note_ids: []})}
                                disabled={generating}
                            />
                            <label htmlFor="source-manual" className={styles.radioLabel}>
                                <span className={styles.radioText}>{t('flashcardGenerator.manual')}</span>
                            </label>
                        </div>
                        <div className={styles.radioOption}>
                            <input
                                type="radio"
                                id="source-file"
                                name="source_type"
                                value="file"
                                checked={formData.source_type === 'file'}
                                onChange={(e) => setFormData({...formData, source_type: e.target.value, source_note_ids: []})}
                                disabled={generating}
                            />
                            <label htmlFor="source-file" className={styles.radioLabel}>
                                <span className={styles.radioText}>{t('flashcardGenerator.fromFile')}</span>
                            </label>
                        </div>
                        <div className={styles.radioOption}>
                            <input
                                type="radio"
                                id="source-note"
                                name="source_type"
                                value="note"
                                checked={formData.source_type === 'note'}
                                onChange={(e) => setFormData({...formData, source_type: e.target.value, source_note_ids: []})}
                                disabled={generating}
                            />
                            <label htmlFor="source-note" className={styles.radioLabel}>
                                <span className={styles.radioText}>{t('flashcardGenerator.fromNote')}</span>
                            </label>
                        </div>
                    </div>
                </div>

                {formData.source_type === 'file' && (
                    <div className={styles.formSection}>
                        <div className={styles.formGroup}>
                            <label>{t('flashcardGenerator.uploadFile')}</label>
                            <div className={styles.fileUploadWrapper}>
                                <input
                                    type="file"
                                    id="file-upload"
                                    accept=".pdf,.docx,.doc,.txt,.jpg,.jpeg,.png,.webp"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        setUploadFile(file);
                                        if (file && !formData.title) {
                                            const filename = file.name.replace(/\.[^/.]+$/, '');
                                            setFormData({...formData, title: filename});
                                        }
                                    }}
                                    disabled={generating}
                                    className={styles.fileInput}
                                />
                                <label htmlFor="file-upload" className={styles.fileLabel}>
                                    {uploadFile ? uploadFile.name : t('flashcardGenerator.chooseFile')}
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                <div className={styles.formSection}>
                    <h3 className={styles.sectionTitle}>{t('flashcardGenerator.basicInfo')}</h3>

                    <div className={styles.formGroup}>
                        <label>{t('flashcardGenerator.setTitle')} *</label>
                        <input
                            type="text"
                            id="flashcard-set-title"
                            name="setTitle"
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                            placeholder={t('flashcardGenerator.titlePlaceholder')}
                            required
                        />
                    </div>

                    {formData.source_type === 'manual' && (
                        <div className={styles.formGroup}>
                            <label>{t('flashcardGenerator.materialDescription')} *</label>
                            <textarea
                                id="flashcard-description-manual"
                                name="description"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                placeholder={t('flashcardGenerator.descriptionPlaceholder')}
                                rows={5}
                                required
                            />
                        </div>
                    )}

                    {formData.source_type !== 'manual' && (
                        <div className={styles.formGroup}>
                            <label>{t('flashcardGenerator.descriptionOptional')}</label>
                            <textarea
                                id="flashcard-description"
                                name="description"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                placeholder={t('flashcardGenerator.additionalInfo')}
                                rows={3}
                            />
                        </div>
                    )}
                </div>

                <div className={styles.formSection}>
                    <h3 className={styles.sectionTitle}>{t('flashcardGenerator.generationParams')}</h3>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label>{t('flashcardGenerator.cardCount')}: {formData.count}</label>
                            <input
                                type="range"
                                min="5"
                                max="50"
                                value={formData.count}
                                onChange={(e) => setFormData({...formData, count: parseInt(e.target.value)})}
                                className={styles.slider}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>{t('flashcardGenerator.difficulty')}</label>
                            <select
                                value={formData.difficulty}
                                onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                            >
                                <option value="łatwy">{t('flashcardGenerator.easy')}</option>
                                <option value="średni">{t('flashcardGenerator.medium')}</option>
                                <option value="trudny">{t('flashcardGenerator.hard')}</option>
                            </select>
                        </div>
                    </div>
                </div>

                {formData.source_type === 'note' && (
                    <div className={styles.formSection}>
                        <h3 className={styles.sectionTitle}>
                            {t('flashcardGenerator.selectSources')} ({formData.source_note_ids.length} {t('flashcardGenerator.selected')})
                        </h3>

                        {loading ? (
                            <div className={styles.loadingNotes}>
                                <Loader className={styles.spinner} size={24} />
                                <p>{t('flashcardGenerator.loadingNotes')}</p>
                            </div>
                        ) : notes.length === 0 ? (
                            <div className={styles.emptyNotes}>
                                <p>{t('flashcardGenerator.noNotes')}</p>
                            </div>
                        ) : (
                            <div className={styles.notesList}>
                                {notes.map(note => (
                                    <div
                                        key={note.id}
                                        className={`${styles.noteItem} ${
                                            formData.source_note_ids.includes(note.id) ? styles.selected : ""
                                        }`}
                                        onClick={() => handleNoteToggle(note.id)}
                                    >
                                        <div className={styles.checkbox}>
                                            {formData.source_note_ids.includes(note.id) && (
                                                <CheckSquare size={20} />
                                            )}
                                            {!formData.source_note_ids.includes(note.id) && (
                                                <div className={styles.unchecked}></div>
                                            )}
                                        </div>
                                        <div className={styles.noteInfo}>
                                            <h4>{note.title}</h4>
                                            <p>{note.content?.substring(0, 100).replace(/<[^>]*>/g, '')}...</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className={styles.formActions}>
                    <button
                        type="button"
                        className={styles.btnCancel}
                        onClick={onCancel}
                        disabled={generating}
                    >
                        {t('flashcardGenerator.cancel')}
                    </button>
                    <button
                        type="submit"
                        className={styles.btnSubmit}
                        disabled={generating}
                    >
                        {generating ? (
                            <>
                                <Loader className={styles.spinner} size={18} />
                                {t('flashcardGenerator.generating')}
                            </>
                        ) : (
                            t('flashcardGenerator.generateCards')
                        )}
                    </button>
                </div>
            </form>
            </div>
        </div>
    );
}