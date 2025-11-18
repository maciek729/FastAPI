import { useState, useRef, useEffect } from 'react';
import { 
    Save, X, Trash2, Bold, Italic, Underline, 
    AlignLeft, AlignCenter, AlignRight, List, ListOrdered,
    Type, Calendar, Image, Lock, Eye
} from 'lucide-react';
import styles from '../../../css/features/NoteEditor.module.css';
import { lockNoteFunction, unlockNoteFunction, checkLockStatusFunction, updateNote, deleteNote } from '../../../services/noteService';

export default function NoteEditor({ note, onClose, onSave, onDelete, userData }) {
    const [title, setTitle] = useState(note.title);
    const [content, setContent] = useState(note.content);
    const [isSaving, setIsSaving] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [lockedByUsername, setLockedByUsername] = useState('');
    const editorRef = useRef(null);
    const fileInputRef = useRef(null);
    const lockCheckIntervalRef = useRef(null)

    useEffect(() => {
        if (editorRef.current && note.content) {
            editorRef.current.innerHTML = note.content;
        }

        lockNote();

        lockCheckIntervalRef.current = setInterval(() => {
            checkLockStatus();
        }, 10000);

        return () => {
            unlockNote();
            if (lockCheckIntervalRef.current) {
                clearInterval(lockCheckIntervalRef.current);
            }
        };
    }, []);

    const lockNote = async () => {
        try {
            const responseData = await lockNoteFunction(note.id, userData.id);
            
            if (responseData.can_edit) {
                setIsReadOnly(false);
            } else {
                setIsReadOnly(true);
                setLockedByUsername(responseData.locked_by_username);
            }
        } catch (err) {
            console.error('Error locking note:', err);
            setIsReadOnly(true);
        }
    };

    const unlockNote = async () => {
        try {
            await unlockNoteFunction(note.id, userData.id);
        } catch (err) {
            console.error('Error unlocking note:', err);
        }
    };

    const checkLockStatus = async () => {
        try {
            const responseData = await checkLockStatusFunction(note.id);
            
            if (responseData.locked) {
                if (responseData.locked_by_user_id !== userData.id) {
                    setIsReadOnly(true);
                    setLockedByUsername(responseData.locked_by_username);
                }
            }
        } catch (err) {
            console.error('Error checking lock status:', err);
        }
    };

    const execCommand = (command, value = null) => {
        if (isReadOnly) return;
        document.execCommand(command, false, value);
        editorRef.current?.focus();
    };

    const handleImageUpload = (e) => {
        if (isReadOnly) return;
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Proszę wybrać plik obrazu!');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('Plik jest za duży! Maksymalny rozmiar to 5MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = document.createElement('img');
            img.src = event.target.result;
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.borderRadius = '8px';
            img.style.margin = '10px 0';
            
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(img);
                
                range.setStartAfter(img);
                range.setEndAfter(img);
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                editorRef.current?.appendChild(img);
            }
            
            setContent(editorRef.current.innerHTML);
        };
        reader.readAsDataURL(file);
        
        e.target.value = '';
    };

    const handleSave = async () => {
        if (isReadOnly) {
            alert('Notatka jest edytowana przez innego użytkownika!');
            return;
        }
        if (!title.trim()) {
            alert('Tytuł nie może być pusty!');
            return;
        }

        setIsSaving(true);
        try {
            const updatedContent = editorRef.current.innerHTML;
            
            await updateNote(note.id, {
                title: title,
                content: updatedContent,
                type: note.type,
                user_id: note.user_id,
                notebook_id: note.notebook_id,
                is_shared: note.is_shared
            });
            
            onSave({ ...note, title, content: updatedContent });
            alert('Notatka zapisana!');
        } catch (err) {
            console.error(err);
            alert(err.message || 'Błąd zapisywania notatki');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (isReadOnly) {
            alert('Nie możesz usunąć notatki, która jest edytowana przez innego użytkownika!');
            return;
        }
        if (!window.confirm('Czy na pewno chcesz usunąć tę notatkę?')) return;

        try {
            await deleteNote(note.id);
            
            onDelete(note.id);
            alert('Notatka usunięta!');
            onClose();
        } catch (err) {
            console.error(err);
            alert(err.message || 'Błąd usuwania notatki');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('pl-PL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleInput = () => {
        if (!isReadOnly) {
            setContent(editorRef.current.innerHTML);
        }
    };

    return (
        <div className={styles.editorOverlay}>
            <div className={styles.editorContainer}>
                {/* Read-only banner */}
                {isReadOnly && (
                    <div className={styles.readOnlyBanner}>
                        <Lock size={16} />
                        <span>Tryb tylko do odczytu - {lockedByUsername} edytuje tę notatkę</span>
                    </div>
                )}
                {/* Header */}
                <div className={styles.editorHeader}>
                    <div className={styles.headerLeft}>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => !isReadOnly && setTitle(e.target.value)}
                            className={styles.titleInput}
                            placeholder="Tytuł notatki"
                            disabled={isReadOnly}
                        />
                    </div>
                    <div className={styles.headerRight}>
                        {!isReadOnly && (
                            <>
                                <button 
                                    className={styles.deleteBtn}
                                    onClick={handleDelete}
                                    title="Usuń notatkę"
                                >
                                    <Trash2 size={18} />
                                </button>
                                <button 
                                    className={styles.saveBtn}
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    title="Zapisz zmiany"
                                >
                                    <Save size={18} />
                                    {isSaving ? 'Zapisywanie...' : 'Zapisz'}
                                </button>
                            </>
                        )}
                        {isReadOnly && (
                            <div className={styles.readOnlyIndicator}>
                                <Eye size={18} />
                                <span>Podgląd</span>
                            </div>
                        )}
                        <button 
                            className={styles.closeBtn}
                            onClick={onClose}
                            title="Zamknij"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                {!isReadOnly && (
                    <div className={styles.toolbar}>
                        <div className={styles.toolbarGroup}>
                            <button
                                className={styles.toolBtn}
                                onClick={() => execCommand('bold')}
                                title="Pogrubienie (Ctrl+B)"
                            >
                                <Bold size={18} />
                            </button>
                            <button
                                className={styles.toolBtn}
                                onClick={() => execCommand('italic')}
                                title="Kursywa (Ctrl+I)"
                            >
                                <Italic size={18} />
                            </button>
                            <button
                                className={styles.toolBtn}
                                onClick={() => execCommand('underline')}
                                title="Podkreślenie (Ctrl+U)"
                            >
                                <Underline size={18} />
                            </button>
                        </div>

                        <div className={styles.toolbarSeparator} />

                        <div className={styles.toolbarGroup}>
                            <button
                                className={styles.toolBtn}
                                onClick={() => execCommand('justifyLeft')}
                                title="Wyrównaj do lewej"
                            >
                                <AlignLeft size={18} />
                            </button>
                            <button
                                className={styles.toolBtn}
                                onClick={() => execCommand('justifyCenter')}
                                title="Wyśrodkuj"
                            >
                                <AlignCenter size={18} />
                            </button>
                            <button
                                className={styles.toolBtn}
                                onClick={() => execCommand('justifyRight')}
                                title="Wyrównaj do prawej"
                            >
                                <AlignRight size={18} />
                            </button>
                        </div>

                        <div className={styles.toolbarSeparator} />

                        <div className={styles.toolbarGroup}>
                            <button
                                className={styles.toolBtn}
                                onClick={() => execCommand('insertUnorderedList')}
                                title="Lista wypunktowana"
                            >
                                <List size={18} />
                            </button>
                            <button
                                className={styles.toolBtn}
                                onClick={() => execCommand('insertOrderedList')}
                                title="Lista numerowana"
                            >
                                <ListOrdered size={18} />
                            </button>
                        </div>

                        <div className={styles.toolbarSeparator} />

                        <div className={styles.toolbarGroup}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                accept="image/*"
                                style={{ display: 'none' }}
                            />
                            <button
                                className={styles.toolBtn}
                                onClick={() => fileInputRef.current?.click()}
                                title="Wstaw zdjęcie"
                            >
                                <Image size={18} />
                            </button>
                        </div>

                        <div className={styles.toolbarSeparator} />

                        <div className={styles.toolbarGroup}>
                            <select
                                className={styles.fontSizeSelect}
                                onChange={(e) => execCommand('fontSize', e.target.value)}
                                defaultValue="3"
                            >
                                <option value="1">Mały</option>
                                <option value="3">Normalny</option>
                                <option value="5">Duży</option>
                                <option value="7">Bardzo duży</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* Editor Content */}
                <div className={styles.editorContent}>
                    <div
                        ref={editorRef}
                        className={`${styles.editor} ${isReadOnly ? styles.readOnly : ''}`}
                        contentEditable={!isReadOnly}
                        onInput={handleInput}
                        suppressContentEditableWarning
                    />
                </div>

                {/* Footer */}
                <div className={styles.editorFooter}>
                    <div className={styles.footerInfo}>
                        <span className={styles.noteType} style={{
                            backgroundColor: note.type === 'Notatka' ? '#6c63ff' : 
                                           note.type === 'Test' ? '#4cafef' : '#ff6f61'
                        }}>
                            {note.type}
                        </span>
                        <span className={styles.footerDate}>
                            <Calendar size={14} />
                            Utworzono: {formatDate(note.created_at)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}