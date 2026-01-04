import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { X, ChevronDown } from 'lucide-react';
import styles from "../../../css/features/FlashcardGenerator.module.css";
import * as testsService from '../../../services/testsService';

export default function TestGenerator({
    show,
    onClose,
    onSuccess,
    userData,
    notebookId,
    currentFolder,
    notes
}) {
    const [loading, setLoading] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [newTest, setNewTest] = useState({
        title: '',
        topic: '',
        num_questions: 5,
        question_type: 'multiple_choice',
        source_type: 'manual',
        note_id: null
    });
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleGenerateTest = async (e) => {
        e.preventDefault();

        if (!newTest.title.trim()) {
            toast.error("Tytuł jest wymagany!");
            return;
        }

        if (newTest.source_type === 'manual' && !newTest.topic.trim()) {
            toast.error("Opis/temat jest wymagany dla ręcznego wprowadzania!");
            return;
        }

        if (newTest.source_type === 'file' && !uploadFile) {
            toast.error("Wybierz plik!");
            return;
        }

        if (newTest.source_type === 'note' && !newTest.note_id) {
            toast.error("Wybierz notatkę!");
            return;
        }

        if (newTest.num_questions < 1 || newTest.num_questions > 20) {
            toast.error("Liczba pytań musi być między 1 a 20!");
            return;
        }

        if (!notebookId) {
            toast.error("Błąd: Brak ID notatnika");
            return;
        }

        setLoading(true);
        try {
            if (newTest.source_type === 'file') {
                const formData = new FormData();
                formData.append('file', uploadFile);
                formData.append('user_id', userData.id);
                formData.append('notebook_id', notebookId);
                formData.append('title', newTest.title);
                formData.append('topic', newTest.topic || 'Generuj pytania na podstawie pliku');
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
                    topic: newTest.topic || 'Generuj pytania na podstawie notatki',
                    num_questions: parseInt(newTest.num_questions),
                    question_type: newTest.question_type,
                    note_id: newTest.source_type === 'note' ? newTest.note_id : null,
                    folder_id: currentFolder?.id || null
                });
            }

            toast.success("Test wygenerowany pomyślnie!");
            setNewTest({ title: '', topic: '', num_questions: 5, question_type: 'multiple_choice', source_type: 'manual', note_id: null });
            setUploadFile(null);
            onSuccess();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.detail || "Błąd generowania testu. Upewnij się, że Gemini API jest skonfigurowane.");
        } finally {
            setLoading(false);
        }
    };

    if (!show) return null;

    return (
        <div className={styles.modalOverlay} onClick={() => !loading && onClose()}>
            <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Wygeneruj nowy test</h2>
                    <button
                        className={styles.closeBtn}
                        onClick={onClose}
                        disabled={loading}
                    >
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleGenerateTest} className={styles.form}>
                    <div className={styles.formSection}>
                        <h3 className={styles.sectionTitle}>Źródło materiału</h3>
                        <div className={styles.sourceOptions}>
                            <div className={styles.radioOption}>
                                <input
                                    type="radio"
                                    id="source-manual"
                                    name="source_type"
                                    value="manual"
                                    checked={newTest.source_type === 'manual'}
                                    onChange={(e) => setNewTest({...newTest, source_type: e.target.value, note_id: null})}
                                    disabled={loading}
                                />
                                <label htmlFor="source-manual" className={styles.radioLabel}>
                                    <span className={styles.radioText}>Ręczny opis</span>
                                </label>
                            </div>
                            <div className={styles.radioOption}>
                                <input
                                    type="radio"
                                    id="source-file"
                                    name="source_type"
                                    value="file"
                                    checked={newTest.source_type === 'file'}
                                    onChange={(e) => setNewTest({...newTest, source_type: e.target.value, note_id: null})}
                                    disabled={loading}
                                />
                                <label htmlFor="source-file" className={styles.radioLabel}>
                                    <span className={styles.radioText}>Z pliku</span>
                                </label>
                            </div>
                            <div className={styles.radioOption}>
                                <input
                                    type="radio"
                                    id="source-note"
                                    name="source_type"
                                    value="note"
                                    checked={newTest.source_type === 'note'}
                                    onChange={(e) => setNewTest({...newTest, source_type: e.target.value, note_id: null})}
                                    disabled={loading}
                                />
                                <label htmlFor="source-note" className={styles.radioLabel}>
                                    <span className={styles.radioText}>Z notatki</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {newTest.source_type === 'file' && (
                        <div className={styles.formSection}>
                            <div className={styles.formGroup}>
                                <label>Załącz plik (PDF, DOCX, TXT, lub obraz)</label>
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
                                        disabled={loading}
                                        className={styles.fileInput}
                                    />
                                    <label htmlFor="file-upload" className={styles.fileLabel}>
                                        {uploadFile ? uploadFile.name : 'Wybierz plik'}
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {newTest.source_type === 'note' && (
                        <div className={styles.formSection}>
                            <div className={styles.formGroup}>
                                <label>Wybierz notatkę</label>
                                <div className={styles.customSelect} ref={dropdownRef}>
                                    <div
                                        className={`${styles.selectTrigger} ${dropdownOpen ? styles.selectOpen : ''}`}
                                        onClick={() => !loading && setDropdownOpen(!dropdownOpen)}
                                    >
                                        <span>
                                            {newTest.note_id
                                                ? notes.find(n => n.id === newTest.note_id)?.title
                                                : '-- Wybierz notatkę --'}
                                        </span>
                                        <ChevronDown size={20} className={styles.chevron} />
                                    </div>
                                    {dropdownOpen && (
                                        <div className={styles.selectDropdown}>
                                            <div
                                                className={styles.selectOption}
                                                onClick={() => {
                                                    setNewTest({...newTest, note_id: null});
                                                    setDropdownOpen(false);
                                                }}
                                            >
                                                -- Wybierz notatkę --
                                            </div>
                                            {notes.map(note => (
                                                <div
                                                    key={note.id}
                                                    className={`${styles.selectOption} ${newTest.note_id === note.id ? styles.selected : ''}`}
                                                    onClick={() => {
                                                        setNewTest({
                                                            ...newTest,
                                                            note_id: note.id,
                                                            title: note.title
                                                        });
                                                        setDropdownOpen(false);
                                                    }}
                                                >
                                                    {note.title}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={styles.formSection}>
                        <h3 className={styles.sectionTitle}>Podstawowe informacje</h3>

                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label>Tytuł testu *</label>
                                <input
                                    type="text"
                                    value={newTest.title}
                                    onChange={(e) => setNewTest({...newTest, title: e.target.value})}
                                    placeholder="np. Historia Polski"
                                    disabled={loading}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Liczba pytań</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={newTest.num_questions}
                                    onChange={(e) => setNewTest({...newTest, num_questions: e.target.value})}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Temat / Zakres {newTest.source_type !== 'manual' && '(opcjonalny)'}</label>
                            <textarea
                                value={newTest.topic}
                                onChange={(e) => setNewTest({...newTest, topic: e.target.value})}
                                placeholder={newTest.source_type === 'manual' ? "Opisz temat testu..." : "Opcjonalnie podaj dodatkowe wskazówki..."}
                                rows={3}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className={styles.formSection}>
                        <h3 className={styles.sectionTitle}>Typ pytań</h3>
                        <div className={styles.sourceOptions}>
                            <div className={styles.radioOption}>
                                <input
                                    type="radio"
                                    id="type-multiple"
                                    name="question_type"
                                    value="multiple_choice"
                                    checked={newTest.question_type === 'multiple_choice'}
                                    onChange={(e) => setNewTest({...newTest, question_type: e.target.value})}
                                    disabled={loading}
                                />
                                <label htmlFor="type-multiple" className={styles.radioLabel}>
                                    <span className={styles.radioText}>Wielokrotny wybór</span>
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
                                    disabled={loading}
                                />
                                <label htmlFor="type-truefalse" className={styles.radioLabel}>
                                    <span className={styles.radioText}>Prawda/Fałsz</span>
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
                                    disabled={loading}
                                />
                                <label htmlFor="type-multiple-answers" className={styles.radioLabel}>
                                    <span className={styles.radioText}>Wiele odpowiedzi</span>
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
                                    disabled={loading}
                                />
                                <label htmlFor="type-mixed" className={styles.radioLabel}>
                                    <span className={styles.radioText}>Mieszany</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className={styles.formActions}>
                        <button
                            type="button"
                            className={styles.btnCancel}
                            onClick={onClose}
                            disabled={loading}
                        >
                            Anuluj
                        </button>
                        <button
                            type="submit"
                            className={styles.btnSubmit}
                            disabled={loading}
                        >
                            {loading ? 'Generowanie...' : 'Generuj test'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
