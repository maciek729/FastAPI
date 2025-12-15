import { useState } from 'react';
import { X } from 'lucide-react';
import sharedStyles from "../../../css/features/NotebookView.module.css";
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

    const handleGenerateTest = async (e) => {
        e.preventDefault();

        if (!newTest.title.trim()) {
            alert("Tytuł jest wymagany!");
            return;
        }

        if (newTest.source_type === 'manual' && !newTest.topic.trim()) {
            alert("Opis/temat jest wymagany dla ręcznego wprowadzania!");
            return;
        }

        if (newTest.source_type === 'file' && !uploadFile) {
            alert("Wybierz plik!");
            return;
        }

        if (newTest.source_type === 'note' && !newTest.note_id) {
            alert("Wybierz notatkę!");
            return;
        }

        if (newTest.num_questions < 1 || newTest.num_questions > 20) {
            alert("Liczba pytań musi być między 1 a 20!");
            return;
        }

        if (!notebookId) {
            alert("Błąd: Brak ID notatnika");
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

            alert("Test wygenerowany pomyślnie!");
            setNewTest({ title: '', topic: '', num_questions: 5, question_type: 'multiple_choice', source_type: 'manual', note_id: null });
            setUploadFile(null);
            onSuccess();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || "Błąd generowania testu. Upewnij się, że Gemini API jest skonfigurowane.");
        } finally {
            setLoading(false);
        }
    };

    if (!show) return null;

    return (
        <div className={sharedStyles.modalOverlay} onClick={() => !loading && onClose()}>
            <div className={sharedStyles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={sharedStyles.modalHeader}>
                    <h2 className={sharedStyles.modalTitle}>Wygeneruj nowy test</h2>
                    <button
                        className={sharedStyles.closeBtn}
                        onClick={onClose}
                        disabled={loading}
                    >
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleGenerateTest} style={{display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0}}>
                    <div className="modal-form-content" style={{padding: '1.5rem 2rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', minHeight: 0}}>
                        <div>
                            <label style={{fontSize: '0.875rem', fontWeight: 600, color: 'var(--subtitle)', marginBottom: '0.75rem', display: 'block'}}>
                                Źródło materiału
                            </label>
                            <div className={sharedStyles.sourceOptions}>
                                <div className={sharedStyles.radioOption}>
                                    <input
                                        type="radio"
                                        id="source-manual"
                                        name="source_type"
                                        value="manual"
                                        checked={newTest.source_type === 'manual'}
                                        onChange={(e) => setNewTest({...newTest, source_type: e.target.value, note_id: null})}
                                        disabled={loading}
                                    />
                                    <label htmlFor="source-manual" className={sharedStyles.radioLabel}>
                                        <span className={sharedStyles.radioText}>Ręczny opis</span>
                                    </label>
                                </div>
                                <div className={sharedStyles.radioOption}>
                                    <input
                                        type="radio"
                                        id="source-file"
                                        name="source_type"
                                        value="file"
                                        checked={newTest.source_type === 'file'}
                                        onChange={(e) => setNewTest({...newTest, source_type: e.target.value, note_id: null})}
                                        disabled={loading}
                                    />
                                    <label htmlFor="source-file" className={sharedStyles.radioLabel}>
                                        <span className={sharedStyles.radioText}>Z pliku</span>
                                    </label>
                                </div>
                                <div className={sharedStyles.radioOption}>
                                    <input
                                        type="radio"
                                        id="source-note"
                                        name="source_type"
                                        value="note"
                                        checked={newTest.source_type === 'note'}
                                        onChange={(e) => setNewTest({...newTest, source_type: e.target.value, note_id: null})}
                                        disabled={loading}
                                    />
                                    <label htmlFor="source-note" className={sharedStyles.radioLabel}>
                                        <span className={sharedStyles.radioText}>Z notatki</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {newTest.source_type === 'file' && (
                            <div className={sharedStyles.formGroup}>
                                <label>Załącz plik (PDF, DOCX, TXT, lub obraz)</label>
                                <div className={sharedStyles.fileUploadWrapper}>
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
                                        className={sharedStyles.fileInput}
                                    />
                                    <label htmlFor="file-upload" className={sharedStyles.fileLabel}>
                                        {uploadFile ? uploadFile.name : 'Wybierz plik'}
                                    </label>
                                </div>
                            </div>
                        )}

                        {newTest.source_type === 'note' && (
                            <div className={sharedStyles.formGroup}>
                                <label>Wybierz notatkę</label>
                                <select
                                    value={newTest.note_id || ''}
                                    onChange={(e) => {
                                        const noteId = parseInt(e.target.value);
                                        const selectedNote = notes.find(n => n.id === noteId);
                                        setNewTest({
                                            ...newTest,
                                            note_id: noteId,
                                            title: selectedNote ? selectedNote.title : newTest.title
                                        });
                                    }}
                                    disabled={loading}
                                >
                                    <option value="">-- Wybierz notatkę --</option>
                                    {notes.map(note => (
                                        <option key={note.id} value={note.id}>{note.title}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className={sharedStyles.formGrid}>
                            <div className={sharedStyles.formGroup}>
                                <label>Tytuł testu</label>
                                <input
                                    type="text"
                                    value={newTest.title}
                                    onChange={(e) => setNewTest({...newTest, title: e.target.value})}
                                    placeholder="np. Historia Polski"
                                    disabled={loading}
                                />
                            </div>
                            <div className={sharedStyles.formGroup}>
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

                        <div className={sharedStyles.formGroup}>
                            <label>Temat / Zakres {newTest.source_type !== 'manual' && '(opcjonalny)'}</label>
                            <textarea
                                value={newTest.topic}
                                onChange={(e) => setNewTest({...newTest, topic: e.target.value})}
                                placeholder={newTest.source_type === 'manual' ? "Opisz temat testu..." : "Opcjonalnie podaj dodatkowe wskazówki..."}
                                rows={3}
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label style={{fontSize: '0.875rem', fontWeight: 600, color: 'var(--subtitle)', marginBottom: '0.75rem', display: 'block'}}>
                                Typ pytań
                            </label>
                            <div className={sharedStyles.sourceOptions}>
                                <div className={sharedStyles.radioOption}>
                                    <input
                                        type="radio"
                                        id="type-multiple"
                                        name="question_type"
                                        value="multiple_choice"
                                        checked={newTest.question_type === 'multiple_choice'}
                                        onChange={(e) => setNewTest({...newTest, question_type: e.target.value})}
                                        disabled={loading}
                                    />
                                    <label htmlFor="type-multiple" className={sharedStyles.radioLabel}>
                                        <span className={sharedStyles.radioText}>Wielokrotny wybór</span>
                                    </label>
                                </div>
                                <div className={sharedStyles.radioOption}>
                                    <input
                                        type="radio"
                                        id="type-truefalse"
                                        name="question_type"
                                        value="true_false"
                                        checked={newTest.question_type === 'true_false'}
                                        onChange={(e) => setNewTest({...newTest, question_type: e.target.value})}
                                        disabled={loading}
                                    />
                                    <label htmlFor="type-truefalse" className={sharedStyles.radioLabel}>
                                        <span className={sharedStyles.radioText}>Prawda/Fałsz</span>
                                    </label>
                                </div>
                                <div className={sharedStyles.radioOption}>
                                    <input
                                        type="radio"
                                        id="type-multiple-answers"
                                        name="question_type"
                                        value="multiple_answers"
                                        checked={newTest.question_type === 'multiple_answers'}
                                        onChange={(e) => setNewTest({...newTest, question_type: e.target.value})}
                                        disabled={loading}
                                    />
                                    <label htmlFor="type-multiple-answers" className={sharedStyles.radioLabel}>
                                        <span className={sharedStyles.radioText}>Wiele odpowiedzi</span>
                                    </label>
                                </div>
                                <div className={sharedStyles.radioOption}>
                                    <input
                                        type="radio"
                                        id="type-mixed"
                                        name="question_type"
                                        value="mixed"
                                        checked={newTest.question_type === 'mixed'}
                                        onChange={(e) => setNewTest({...newTest, question_type: e.target.value})}
                                        disabled={loading}
                                    />
                                    <label htmlFor="type-mixed" className={sharedStyles.radioLabel}>
                                        <span className={sharedStyles.radioText}>Mieszany</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className={sharedStyles.modalActions}>
                        <button
                            type="button"
                            className={sharedStyles.btnCancel}
                            onClick={onClose}
                            disabled={loading}
                        >
                            Anuluj
                        </button>
                        <button
                            type="submit"
                            className={sharedStyles.btnSubmit}
                            disabled={loading}
                        >
                            {loading ? 'Generowanie...' : 'Wygeneruj test'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
