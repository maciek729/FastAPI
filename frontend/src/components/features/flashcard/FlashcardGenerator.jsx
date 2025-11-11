import { useState, useEffect } from "react";
import axios from "axios";
import { X, Loader, Sparkles, CheckSquare } from "lucide-react";
import styles from "../../../css/features/FlashcardGenerator.module.css";

export default function FlashcardGenerator({ notebookId, userId, onSuccess, onCancel }) {
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

    useEffect(() => {
        fetchNotes();
    }, [notebookId]);

    const fetchNotes = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`http://localhost:8000/notes/list/${notebookId}`);
            setNotes(response.data.filter(note => note.type !== "Fiszki"));
        } catch (error) {
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
            alert("Podaj tytuł zestawu fiszek!");
            return;
        }

        if (formData.source_type === "manual" && !formData.description.trim()) {
            alert("Podaj opis materiału do wygenerowania fiszek!");
            return;
        }

        if (formData.source_type === "file" && !uploadFile) {
            alert("Załącz plik!");
            return;
        }

        if (formData.source_type === "note" && formData.source_note_ids.length === 0) {
            alert("Wybierz przynajmniej jedną notatkę!");
            return;
        }

        try {
            setGenerating(true);

            if (formData.source_type === "file" && uploadFile) {
                const requestData = new FormData();
                requestData.append("user_id", userId);
                requestData.append("notebook_id", notebookId);
                requestData.append("title", formData.title);
                requestData.append("description", formData.description || "");
                requestData.append("difficulty", formData.difficulty);
                requestData.append("count", formData.count);
                requestData.append("file", uploadFile);

                await axios.post("http://localhost:8000/flashcards/generate-from-file", requestData, {
                    headers: {
                        "Content-Type": "multipart/form-data"
                    }
                });
            } else {
                await axios.post("http://localhost:8000/flashcards/generate", {
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

            alert("Fiszki zostały wygenerowane!");
            onSuccess();
        } catch (error) {
            const errorMessage = error.response?.data?.detail || error.message || "Nieznany błąd";
            alert("Błąd podczas generowania fiszek: " + errorMessage);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className={styles.generatorContainer}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <Sparkles className={styles.headerIcon} size={24} />
                    <h2 className={styles.title}>Generuj nowe fiszki</h2>
                </div>
                <button className={styles.closeBtn} onClick={onCancel}>
                    <X size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formSection}>
                    <h3 className={styles.sectionTitle}>Źródło materiału</h3>
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
                                <span className={styles.radioText}>Ręczny opis</span>
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
                                <span className={styles.radioText}>Z pliku</span>
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
                                <span className={styles.radioText}>Z notatki</span>
                            </label>
                        </div>
                    </div>
                </div>

                {formData.source_type === 'file' && (
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
                                        if (file && !formData.title) {
                                            const filename = file.name.replace(/\.[^/.]+$/, '');
                                            setFormData({...formData, title: filename});
                                        }
                                    }}
                                    disabled={generating}
                                    className={styles.fileInput}
                                />
                                <label htmlFor="file-upload" className={styles.fileLabel}>
                                    {uploadFile ? uploadFile.name : 'Wybierz plik'}
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                <div className={styles.formSection}>
                    <h3 className={styles.sectionTitle}>Podstawowe informacje</h3>

                    <div className={styles.formGroup}>
                        <label>Tytuł zestawu *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                            placeholder="np. Historia Polski - Średniowiecze"
                            required
                        />
                    </div>

                    {formData.source_type === 'manual' && (
                        <div className={styles.formGroup}>
                            <label>Opis materiału *</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                placeholder="Opisz materiał, z którego mają być wygenerowane fiszki..."
                                rows={5}
                                required
                            />
                        </div>
                    )}

                    {formData.source_type !== 'manual' && (
                        <div className={styles.formGroup}>
                            <label>Opis (opcjonalnie)</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                placeholder="Dodatkowe informacje o zestawie..."
                                rows={3}
                            />
                        </div>
                    )}
                </div>

                <div className={styles.formSection}>
                    <h3 className={styles.sectionTitle}>Parametry generowania</h3>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label>Liczba fiszek: {formData.count}</label>
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
                            <label>Poziom trudności</label>
                            <select
                                value={formData.difficulty}
                                onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                            >
                                <option value="łatwy">Łatwy</option>
                                <option value="średni">Średni</option>
                                <option value="trudny">Trudny</option>
                            </select>
                        </div>
                    </div>
                </div>

                {formData.source_type === 'note' && (
                    <div className={styles.formSection}>
                        <h3 className={styles.sectionTitle}>
                            Wybierz źródła ({formData.source_note_ids.length} wybranych)
                        </h3>

                        {loading ? (
                            <div className={styles.loadingNotes}>
                                <Loader className={styles.spinner} size={24} />
                                <p>Ładowanie notatek...</p>
                            </div>
                        ) : notes.length === 0 ? (
                            <div className={styles.emptyNotes}>
                                <p>Brak notatek w tym notatniku</p>
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
                        Anuluj
                    </button>
                    <button
                        type="submit"
                        className={styles.btnSubmit}
                        disabled={generating}
                    >
                        {generating ? (
                            <>
                                <Loader className={styles.spinner} size={18} />
                                Generowanie...
                            </>
                        ) : (
                            <>
                                <Sparkles size={18} />
                                Generuj fiszki
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
