import { useState, useContext } from 'react';
import toast from 'react-hot-toast';
import { X, CheckSquare } from 'lucide-react';
import styles from "../../../css/features/FlashcardGenerator.module.css";
import * as testsService from '../../../services/testsService';
import { LanguageContext } from '../../../translations/LanguageContext';
import translations from '../../../translations/translation.json';

export default function TestGenerator({
    show,
    onClose,
    onStartGenerating,
    onSuccess,
    onError,
    userData,
    notebookId,
    currentFolder,
    notes
}) {
    const [uploadFile, setUploadFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);
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
    const [newTest, setNewTest] = useState({
        title: '',
        topic: '',
        num_questions: 5,
        question_type: 'multiple_choice',
        source_type: 'manual',
        note_ids: []
    });

    const handleNoteToggle = (noteId) => {
        setNewTest(prev => {
            const isRemoving = prev.note_ids.includes(noteId);
            const newNoteIds = isRemoving
                ? prev.note_ids.filter(id => id !== noteId)
                : [...prev.note_ids, noteId];

            // Auto-fill title if exactly one note is selected, clear if none selected
            let newTitle = prev.title;
            if (newNoteIds.length === 0) {
                newTitle = '';
            } else if (newNoteIds.length === 1) {
                const selectedNote = notes.find(n => n.id === newNoteIds[0]);
                if (selectedNote) {
                    newTitle = selectedNote.title;
                }
            }

            return {
                ...prev,
                note_ids: newNoteIds,
                title: newTitle
            };
        });
    };

    const handleGenerateTest = async (e) => {
        e.preventDefault();

        if (!newTest.title.trim()) {
            toast.error(t('testGenerator.errors.titleRequired'));
            return;
        }

        if (newTest.source_type === 'manual' && !newTest.topic.trim()) {
            toast.error(t('testGenerator.errors.topicRequiredManual'));
            return;
        }

        if (newTest.source_type === 'file' && !uploadFile) {
            toast.error(t('testGenerator.errors.fileRequired'));
            return;
        }

        if (newTest.source_type === 'note' && newTest.note_ids.length === 0) {
            toast.error(t('testGenerator.errors.noteRequired'));
            return;
        }

        if (newTest.num_questions < 1 || newTest.num_questions > 20) {
            toast.error(t('testGenerator.errors.numQuestionsInvalid'));
            return;
        }

        if (!notebookId) {
            toast.error(t('testGenerator.errors.notebookMissing'));
            return;
        }

        setSubmitting(true);

        // Close modal and show loading state immediately
        onStartGenerating();
        setNewTest({ title: '', topic: '', num_questions: 5, question_type: 'multiple_choice', source_type: 'manual', note_ids: [] });
        setUploadFile(null);

        try {
            if (newTest.source_type === 'file') {
                const formData = new FormData();
                formData.append('file', uploadFile);
                formData.append('user_id', userData.id);
                formData.append('notebook_id', notebookId);
                formData.append('title', newTest.title);
                formData.append('topic', newTest.topic || t('testGenerator.defaults.topicFile'));
                formData.append('num_questions', newTest.num_questions);
                formData.append('question_type', newTest.question_type);
                if (currentFolder) {
                    formData.append('folder_id', currentFolder.id);
                }

                await testsService.generateTestFromFile(formData);
            } else {
                await testsService.generateTest({
                    user_id: userData.id,
                    notebook_id: notebookId,
                    title: newTest.title,
                    topic: newTest.topic || t('testGenerator.defaults.topicNote'),
                    num_questions: parseInt(newTest.num_questions),
                    question_type: newTest.question_type,
                    note_ids: newTest.source_type === 'note' ? newTest.note_ids : [],
                    folder_id: currentFolder?.id || null
                });
            }

            toast.success(t('testGenerator.success.generated'));
            onSuccess();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.detail || t('testGenerator.errors.apiError'));
            onError();
        } finally {
            setSubmitting(false);
        }
    };

    if (!show) return null;

    return (
        <div className={styles.modalOverlay} onClick={() => !submitting && onClose()}>
            <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title}>{t('testGenerator.title')}</h2>
                    <button
                        className={styles.closeBtn}
                        onClick={onClose}
                        disabled={submitting}
                    >
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleGenerateTest} className={styles.form}>
                    <div className={styles.formSection}>
                        <h3 className={styles.sectionTitle}>{t('testGenerator.sections.source')}</h3>
                        <div className={styles.sourceOptions}>
                            <div className={styles.radioOption}>
                                <input
                                    type="radio"
                                    id="source-manual"
                                    name="source_type"
                                    value="manual"
                                    checked={newTest.source_type === 'manual'}
                                    onChange={(e) => setNewTest({...newTest, source_type: e.target.value, note_ids: []})}
                                    disabled={submitting}
                                />
                                <label htmlFor="source-manual" className={styles.radioLabel}>
                                    <span className={styles.radioText}>{t('testGenerator.sourceTypes.manual')}</span>
                                </label>
                            </div>
                            <div className={styles.radioOption}>
                                <input
                                    type="radio"
                                    id="source-file"
                                    name="source_type"
                                    value="file"
                                    checked={newTest.source_type === 'file'}
                                    onChange={(e) => setNewTest({...newTest, source_type: e.target.value, note_ids: []})}
                                    disabled={submitting}
                                />
                                <label htmlFor="source-file" className={styles.radioLabel}>
                                    <span className={styles.radioText}>{t('testGenerator.sourceTypes.file')}</span>
                                </label>
                            </div>
                            <div className={styles.radioOption}>
                                <input
                                    type="radio"
                                    id="source-note"
                                    name="source_type"
                                    value="note"
                                    checked={newTest.source_type === 'note'}
                                    onChange={(e) => setNewTest({...newTest, source_type: e.target.value, note_ids: []})}
                                    disabled={submitting}
                                />
                                <label htmlFor="source-note" className={styles.radioLabel}>
                                    <span className={styles.radioText}>{t('testGenerator.sourceTypes.note')}</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {newTest.source_type === 'file' && (
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
                                            if (file && !newTest.title) {
                                                const filename = file.name.replace(/\.[^/.]+$/, '');
                                                setNewTest({...newTest, title: filename});
                                            }
                                        }}
                                        disabled={submitting}
                                        className={styles.fileInput}
                                    />
                                    <label htmlFor="file-upload" className={styles.fileLabel}>
                                        {uploadFile ? uploadFile.name : t('testGenerator.chooseFile')}
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {newTest.source_type === 'note' && (
                        <div className={styles.formSection}>
                            <h3 className={styles.sectionTitle}>
                                {t('podcastGenerator.selectNotes', {count : newTest.note_ids.length})}
                            </h3>

                            {notes.length === 0 ? (
                                <div className={styles.emptyNotes}>
                                    <p>{t('podcastGenerator.noNotes')}</p>
                                </div>
                            ) : (
                                <div className={styles.notesList}>
                                    {notes.map(note => (
                                        <div
                                            key={note.id}
                                            className={`${styles.noteItem} ${
                                                newTest.note_ids.includes(note.id) ? styles.selected : ""
                                            }`}
                                            onClick={() => handleNoteToggle(note.id)}
                                        >
                                            <div className={styles.checkbox}>
                                                {newTest.note_ids.includes(note.id) && (
                                                    <CheckSquare size={20} />
                                                )}
                                                {!newTest.note_ids.includes(note.id) && (
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

                    <div className={styles.formSection}>
                        <h3 className={styles.sectionTitle}>{t('testGenerator.sections.basic')}</h3>

                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label>{t('testGenerator.labels.title')}</label>
                                <input
                                    type="text"
                                    value={newTest.title}
                                    onChange={(e) => setNewTest({...newTest, title: e.target.value})}
                                    placeholder={t('testGenerator.placeholders.title')}
                                    disabled={submitting}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>{t('testGenerator.labels.numQuestions')}</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={newTest.num_questions}
                                    onChange={(e) => setNewTest({...newTest, num_questions: e.target.value})}
                                    disabled={submitting}
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>{t('testGenerator.labels.topic')} {newTest.source_type !== 'manual' && t('testGenerator.optional')}</label>
                            <textarea
                                value={newTest.topic}
                                onChange={(e) => setNewTest({...newTest, topic: e.target.value})}
                                placeholder={newTest.source_type === 'manual' ? t('testGenerator.placeholders.topicManual') : t('testGenerator.placeholders.topicOptional')}
                                rows={3}
                                disabled={submitting}
                            />
                        </div>
                    </div>

                    <div className={styles.formSection}>
                        <h3 className={styles.sectionTitle}>{t('testGenerator.sections.questionType')}</h3>
                        <div className={styles.sourceOptions}>
                            <div className={styles.radioOption}>
                                <input
                                    type="radio"
                                    id="type-multiple"
                                    name="question_type"
                                    value="multiple_choice"
                                    checked={newTest.question_type === 'multiple_choice'}
                                    onChange={(e) => setNewTest({...newTest, question_type: e.target.value})}
                                    disabled={submitting}
                                />
                                <label htmlFor="type-multiple" className={styles.radioLabel}>
                                    <span className={styles.radioText}>{t('testGenerator.questionTypes.multiple_choice')}</span>
                                </label>
                            </div>
                            <div className={styles.radioOption}>
                                <input
                                    type="radio"
                                    id="type-truefalse"
                                    name="question_type"
                                    value="true_false"
                                    checked={newTest.question_type === 'true_false'}
                                    onChange={(e) => setNewTest({...newTest, question_type: e.target.value})}
                                    disabled={submitting}
                                />
                                <label htmlFor="type-truefalse" className={styles.radioLabel}>
                                    <span className={styles.radioText}>{t('testGenerator.questionTypes.true_false')}</span>
                                </label>
                            </div>
                            <div className={styles.radioOption}>
                                <input
                                    type="radio"
                                    id="type-multiple-answers"
                                    name="question_type"
                                    value="multiple_answers"
                                    checked={newTest.question_type === 'multiple_answers'}
                                    onChange={(e) => setNewTest({...newTest, question_type: e.target.value})}
                                    disabled={submitting}
                                />
                                <label htmlFor="type-multiple-answers" className={styles.radioLabel}>
                                    <span className={styles.radioText}>{t('testGenerator.questionTypes.multiple_answers')}</span>
                                </label>
                            </div>
                            <div className={styles.radioOption}>
                                <input
                                    type="radio"
                                    id="type-mixed"
                                    name="question_type"
                                    value="mixed"
                                    checked={newTest.question_type === 'mixed'}
                                    onChange={(e) => setNewTest({...newTest, question_type: e.target.value})}
                                    disabled={submitting}
                                />
                                <label htmlFor="type-mixed" className={styles.radioLabel}>
                                    <span className={styles.radioText}>{t('testGenerator.questionTypes.mixed')}</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className={styles.formActions}>
                        <button
                            type="button"
                            className={styles.btnCancel}
                            onClick={onClose}
                            disabled={submitting}
                        >
                            {t('flashcardsView.cancel')}
                        </button>
                        <button
                            type="submit"
                            className={styles.btnSubmit}
                            disabled={submitting}
                        >
                            {submitting ? t('testGenerator.buttons.generating') : t('testGenerator.buttons.generate')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
