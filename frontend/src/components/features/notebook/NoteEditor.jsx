import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import toast from 'react-hot-toast';
import { confirmModal } from '../../../utils/confirmModal';
import {
    Save, X, Trash2, Bold, Italic, Underline,
    AlignLeft, AlignCenter, AlignRight, List, ListOrdered,
    Type, Calendar, Image, Lock, Eye, Grid3x3, Zap
} from 'lucide-react';
import styles from '../../../css/features/NoteEditor.module.css';
import { lockNoteFunction, unlockNoteFunction, checkLockStatusFunction, updateNote, deleteNote } from '../../../services/noteService';
import { useLanguage } from "../../../translations/LanguageContext";
import translations from "../../../translations/translation.json";
import AiAssistant from './AiAssistant';

const ImageResizeOverlay = ({ image, containerRef, editorRef, onResizeEnd, deselect }) => {
    const [dims, setDims] = useState({ width: 0, height: 0, top: 0, left: 0 });
    
    const updateOverlayPosition = () => {
        if (!image || !containerRef.current) return;
        
        const imgRect = image.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        
        setDims({
            width: image.offsetWidth,
            height: image.offsetHeight,
            top: imgRect.top - containerRect.top,
            left: imgRect.left - containerRect.left
        });
    };

    useLayoutEffect(() => {
        updateOverlayPosition();
        
        const scrollContainer = editorRef.current;
        
        window.addEventListener('resize', updateOverlayPosition);
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', updateOverlayPosition);
        }
        
        const resizeObserver = new ResizeObserver(() => updateOverlayPosition());
        resizeObserver.observe(image);

        return () => {
            window.removeEventListener('resize', updateOverlayPosition);
            if (scrollContainer) {
                scrollContainer.removeEventListener('scroll', updateOverlayPosition);
            }
            resizeObserver.disconnect();
        };
    }, [image, containerRef, editorRef]);

    const handleMouseDown = (e, direction) => {
        e.preventDefault();
        e.stopPropagation();
        
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = image.offsetWidth;
        const startHeight = image.offsetHeight;
        const aspectRatio = startWidth / startHeight;

        const handleMouseMove = (moveEvent) => {
            let newWidth = startWidth;
            let newHeight = startHeight;
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;

            if (direction.includes('e')) newWidth = startWidth + deltaX;
            if (direction.includes('w')) newWidth = startWidth - deltaX;
            if (direction.includes('s')) newHeight = startHeight + deltaY;
            if (direction.includes('n')) newHeight = startHeight - deltaY;

            if (moveEvent.shiftKey) {
                if (direction.includes('w') || direction.includes('e')) {
                    newHeight = newWidth / aspectRatio;
                } else {
                    newWidth = newHeight * aspectRatio;
                }
            }

            if (newWidth > 20) image.style.width = `${newWidth}px`;
            if (newHeight > 20) image.style.height = `${newHeight}px`;
            
            updateOverlayPosition();
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            if (onResizeEnd) onResizeEnd();
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleStyle = {
        position: 'absolute',
        width: '10px',
        height: '10px',
        backgroundColor: '#6c63ff',
        border: '1px solid white',
        borderRadius: '2px',
        zIndex: 100,
    };

    return (
        <div 
            style={{
                position: 'absolute',
                top: dims.top,
                left: dims.left,
                width: dims.width,
                height: dims.height,
                border: '2px solid #6c63ff',
                pointerEvents: 'none',
                zIndex: 50,
                boxSizing: 'border-box' 
            }}
        >
            <div 
                style={{ ...handleStyle, top: -6, left: -6, cursor: 'nw-resize', pointerEvents: 'auto' }}
                onMouseDown={(e) => handleMouseDown(e, 'nw')}
            />
            <div 
                style={{ ...handleStyle, top: -6, right: -6, cursor: 'ne-resize', pointerEvents: 'auto' }}
                onMouseDown={(e) => handleMouseDown(e, 'ne')}
            />
            <div 
                style={{ ...handleStyle, bottom: -6, left: -6, cursor: 'sw-resize', pointerEvents: 'auto' }}
                onMouseDown={(e) => handleMouseDown(e, 'sw')}
            />
            <div 
                style={{ ...handleStyle, bottom: -6, right: -6, cursor: 'se-resize', pointerEvents: 'auto' }}
                onMouseDown={(e) => handleMouseDown(e, 'se')}
            />
        </div>
    );
};

export default function NoteEditor({ note, onClose, onSave, onDelete, userData, isNew = false }) {
    const [title, setTitle] = useState(note?.title || '');
    const [content, setContent] = useState(note?.content || '');
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [lockedByUsername, setLockedByUsername] = useState('');
    const [showAiAssistant, setShowAiAssistant] = useState(false);
    const [showTableDialog, setShowTableDialog] = useState(false);
    const [tableRows, setTableRows] = useState('3');
    const [tableCols, setTableCols] = useState('3');
    const [selectedTextContext, setSelectedTextContext] = useState('');
    
    const [selectedImage, setSelectedImage] = useState(null);

    const aiInsertRangeRef = useRef(null);
    const editorRef = useRef(null);
    const containerRef = useRef(null);
    const fileInputRef = useRef(null);
    const lockCheckIntervalRef = useRef(null)
    const initialTitleRef = useRef(note?.title || '');
    const initialContentRef = useRef(note?.content || '');
    const { language, changeLanguage } = useLanguage();
    
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

    const removeTable = () => {
        if (isReadOnly) return;
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const node = selection.anchorNode;
        if (!node) return;

        let el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        while (el && el !== editorRef.current) {
            if (el.tagName && el.tagName.toLowerCase() === 'table') {
                el.remove();
                setContent(editorRef.current?.innerHTML || '');
                setIsDirty(true);
                return;
            }
            el = el.parentElement;
        }

        const lastTable = editorRef.current?.querySelector('table:last-of-type');
        if (lastTable) {
            lastTable.remove();
            setContent(editorRef.current?.innerHTML || '');
            setIsDirty(true);
        }
    };

    const applyFontSizePx = (size) => {
        if (isReadOnly) return;
        const px = String(size);
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);

        if (range.collapsed) {
            const span = document.createElement('span');
            span.style.fontSize = px + 'px';
            span.appendChild(document.createTextNode('\u200B'));
            range.insertNode(span);
            range.setStart(span.firstChild, 1);
            range.setEnd(span.firstChild, 1);
            sel.removeAllRanges();
            sel.addRange(range);
        } else {
            try {
                const span = document.createElement('span');
                span.style.fontSize = px + 'px';
                span.appendChild(range.extractContents());
                range.insertNode(span);
                range.setStartAfter(span);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            } catch (err) {
                console.error('applyFontSizePx error:', err);
            }
        }

        setContent(editorRef.current?.innerHTML || '');
        setIsDirty(true);
    };

    useEffect(() => {
        if (editorRef.current && note?.content) {
            editorRef.current.innerHTML = note.content;
        }

        if (!isNew) {
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
        }

        initialTitleRef.current = note?.title || '';
        initialContentRef.current = note?.content || '';
    }, []);

    useEffect(() => {
        const handler = (e) => {
            if (!isDirty) return;
            e.preventDefault();
            e.returnValue = '';
            return '';
        };

        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty]);

    const lockNote = async () => {
        if (isNew) return;
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
        if (isNew) return;
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

    const insertTable = () => {
        if (isReadOnly) return;
        setShowTableDialog(true);
    };

    const handleInsertTable = () => {
        const rows = parseInt(tableRows, 10) || 3;
        const cols = parseInt(tableCols, 10) || 3;

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        
        for (let i = 0; i < rows; i++) {
            const row = document.createElement('tr');
            for (let j = 0; j < cols; j++) {
                const cell = document.createElement(i === 0 ? 'th' : 'td');
                cell.textContent = i === 0 ? `Header ${j + 1}` : `Cell ${j + 1}`;
                cell.style.border = '1px solid #d1d5db';
                cell.style.padding = '0.75rem';
                cell.contentEditable = 'true';
                row.appendChild(cell);
            }
            table.appendChild(row);
        }
        
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(table);
            range.setStartAfter(table);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            editorRef.current?.appendChild(table);
        }
        
        setContent(editorRef.current.innerHTML);
        setShowTableDialog(false);
        setTableRows('3');
        setTableCols('3');
        setIsDirty(true);
    };

    const handleAiText = (text) => {
        if (isReadOnly) return;

        const parseAndFormatText = (input) => {
            const convertMarkdownBold = (text) => {
                return text.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
            };

            const container = document.createElement('div');
            const lines = input.split('\n');
            let i = 0;

            while (i < lines.length) {
                const line = lines[i];
                const trimmed = line.trim();

                if (!trimmed) {
                    i++;
                    continue;
                }

                if (/^[\s]*[-*•]\s+/.test(line)) {
                    const ul = document.createElement('ul');
                    ul.style.marginTop = '0.5rem';
                    ul.style.marginBottom = '0.5rem';

                    while (i < lines.length) {
                        const currentLine = lines[i];
                        const currentTrimmed = currentLine.trim();

                        if (/^[\s]*[-*•]\s+/.test(currentLine)) {
                            const leadingSpaces = currentLine.match(/^(\s*)/)[1].length;
                            const indentLevel = Math.floor(leadingSpaces / 4);
                            let itemText = currentTrimmed.replace(/^[-*•]\s+/, '');
                            itemText = convertMarkdownBold(itemText);

                            const li = document.createElement('li');
                            li.innerHTML = itemText;
                            li.style.marginLeft = `${indentLevel * 1.5}rem`;

                            ul.appendChild(li);
                            i++;
                        } else if (currentTrimmed === '') {
                            i++;
                        } else {
                            break;
                        }
                    }

                    container.appendChild(ul);
                }
                else if (/^[\s]*\d+\.\s+/.test(line)) {
                    const ol = document.createElement('ol');
                    ol.style.marginTop = '0.5rem';
                    ol.style.marginBottom = '0.5rem';

                    while (i < lines.length) {
                        const currentLine = lines[i];
                        const currentTrimmed = currentLine.trim();

                        if (/^[\s]*\d+\.\s+/.test(currentLine)) {
                            const leadingSpaces = currentLine.match(/^(\s*)/)[1].length;
                            const indentLevel = Math.floor(leadingSpaces / 4);
                            let itemText = currentTrimmed.replace(/^\d+\.\s+/, '');
                            itemText = convertMarkdownBold(itemText);

                            const li = document.createElement('li');
                            li.innerHTML = itemText;
                            li.style.marginLeft = `${indentLevel * 1.5}rem`;

                            ol.appendChild(li);
                            i++;
                        } else if (currentTrimmed === '') {
                            i++;
                        } else {
                            break;
                        }
                    }

                    container.appendChild(ol);
                }
                else {
                    let paragraphText = trimmed;
                    paragraphText = convertMarkdownBold(paragraphText);
                    
                    const p = document.createElement('p');
                    p.innerHTML = paragraphText;
                    p.style.marginTop = '0.5rem';
                    p.style.marginBottom = '0.5rem';
                    container.appendChild(p);
                    i++;
                }
            }

            return container;
        };

        const formattedContent = parseAndFormatText(text);
        
        let inserted = false;

        if (aiInsertRangeRef.current && editorRef.current && editorRef.current.contains(aiInsertRangeRef.current.startContainer)) {
            try {
                const range = aiInsertRangeRef.current.cloneRange();
                range.deleteContents();
                while (formattedContent.firstChild) {
                    range.insertNode(formattedContent.firstChild);
                }
                range.collapse(false);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
                inserted = true;
            } catch (err) {
                console.error('Error inserting AI text at saved range:', err);
                inserted = false;
            }
        } else {
            if (selectedTextContext && selectedTextContext.length > 0) {
                while (formattedContent.firstChild) {
                    editorRef.current?.appendChild(formattedContent.firstChild);
                }
                inserted = true;
            } else {
                const selection = window.getSelection();
                if (selection.rangeCount > 0 && editorRef.current && editorRef.current.contains(selection.anchorNode)) {
                    try {
                        const range = selection.getRangeAt(0);
                        range.deleteContents();
                        while (formattedContent.firstChild) {
                            range.insertNode(formattedContent.firstChild);
                        }
                        range.collapse(false);
                        selection.removeAllRanges();
                        selection.addRange(range);
                        inserted = true;
                    } catch (err) {
                        console.error('Error inserting AI text at selection:', err);
                        inserted = false;
                    }
                }
            }
        }

        if (!inserted) {
            while (formattedContent.firstChild) {
                editorRef.current?.appendChild(formattedContent.firstChild);
            }
        }

        setContent(editorRef.current?.innerHTML || '');
        setShowAiAssistant(false);
        toast.success(t('aiAssistant.insertSuccess'));
        setIsDirty(true);
        aiInsertRangeRef.current = null;
        setSelectedTextContext('');
    };

    const handleImageUpload = (e) => {
        if (isReadOnly) return;
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Proszę wybrać plik obrazu!');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Plik jest za duży! Maksymalny rozmiar to 5MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = document.createElement('img');
            img.src = event.target.result;
            img.style.minWidth = '50px';
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.borderRadius = '8px';
            img.style.margin = '10px 0';
            img.style.cursor = 'pointer';
            
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
            setIsDirty(true);
        };
        reader.readAsDataURL(file);
        
        e.target.value = '';
    };

    const handleSave = async () => {
        if (isReadOnly) {
            toast.error('Notatka jest edytowana przez innego użytkownika!');
            return;
        }
        if (!title.trim()) {
            toast.error('Tytuł nie może być pusty!');
            return;
        }

        setIsSaving(true);
        try {
            const updatedContent = editorRef.current.innerHTML;

            if (isNew) {
                const { createNote } = await import('../../../services/noteService');
                const payload = {
                    user_id: userData.id,
                    notebook_id: note.notebook_id,
                    title: title,
                    content: updatedContent,
                    type: note.type || 'Notatka',
                    is_shared: false
                };

                const responseData = await createNote(payload);
                onSave(responseData);
                toast.success('Notatka utworzona!');
                initialTitleRef.current = responseData.title;
                initialContentRef.current = responseData.content || '';
                setIsDirty(false);
                onClose();
                return;
            }

            await updateNote(note.id, {
                title: title,
                content: updatedContent,
                type: note.type,
                user_id: note.user_id,
                notebook_id: note.notebook_id,
                is_shared: note.is_shared
            });

            onSave({ ...note, title, content: updatedContent });
            toast.success('Notatka zapisana!');
            initialTitleRef.current = title;
            initialContentRef.current = updatedContent || '';
            setIsDirty(false);
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Błąd zapisywania notatki');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (isReadOnly) {
            toast.error(t('noteEditor.deleteLockedError'));
            return;
        }
        const confirmed = await confirmModal(t('noteEditor.deleteConfirm'));
        if (!confirmed) return;

        try {
            await deleteNote(note.id);

            onDelete(note.id);
            toast.success(t('noteEditor.deleteSuccess'));
            onClose();
        } catch (err) {
            console.error(err);
            toast.error(err.message || t('noteEditor.deleteError'));
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
            const curTitle = title || '';
            const curContent = editorRef.current?.innerHTML || '';
            setIsDirty(curTitle !== (initialTitleRef.current || '') || curContent !== (initialContentRef.current || ''));
        }
    };

    const handleClose = async () => {
        if (isDirty) {
            const confirmed = await confirmModal(t('noteEditor.unsavedConfirm'));
            if (!confirmed) return;
        }
        onClose();
    };

    const handleEditorClick = (e) => {
        if (isReadOnly) return;
        
        if (e.target.tagName === 'IMG') {
            setSelectedImage(e.target);
        } else {
            setSelectedImage(null);
        }
    };

    return (
        <div className={styles.editorOverlay}>
            <div className={styles.editorContainer}>
                {/* Read-only banner */}
                {isReadOnly && (
                    <div className={styles.readOnlyBanner}>
                        <Lock size={16} />
                        <span>{t('noteEditor.readOnlyMessage', { username: lockedByUsername })}</span>
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
                            placeholder={t('noteEditor.titlePlaceholder')}
                            disabled={isReadOnly}
                        />
                    </div>
                    <div className={styles.headerRight}>
                        {!isReadOnly && (
                            <>
                                {!isNew && (
                                    <button 
                                        className={styles.deleteBtn}
                                        onClick={handleDelete}
                                        title={t('noteEditor.deleteTitle')}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                                <button 
                                    className={styles.saveBtn}
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    title={t('noteEditor.saveTitle')}
                                >
                                    <Save size={18} />
                                    {isSaving ? t('noteEditor.saving') : t('noteEditor.saveButton')}
                                </button>
                            </>
                        )}
                        {isReadOnly && (
                            <div className={styles.readOnlyIndicator}>
                                <Eye size={18} />
                                <span>{t('noteEditor.preview')}</span>
                            </div>
                        )}
                        <button 
                            className={styles.closeBtn}
                            onClick={handleClose}
                            title={t('noteEditor.closeTitle')}
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
                                title={`${t('noteEditor.bold')} (Ctrl+B)`}
                            >
                                <Bold size={18} />
                            </button>
                            <button
                                className={styles.toolBtn}
                                onClick={() => execCommand('italic')}
                                title={`${t('noteEditor.italic')} (Ctrl+I)`}
                            >
                                <Italic size={18} />
                            </button>
                            <button
                                className={styles.toolBtn}
                                onClick={() => execCommand('underline')}
                                title={`${t('noteEditor.underline')} (Ctrl+U)`}
                            >
                                <Underline size={18} />
                            </button>
                        </div>

                        <div className={styles.toolbarSeparator} />

                        <div className={styles.toolbarGroup}>
                            <button
                                className={styles.toolBtn}
                                onClick={() => execCommand('justifyLeft')}
                                title={t('noteEditor.alignLeft')}
                            >
                                <AlignLeft size={18} />
                            </button>
                            <button
                                className={styles.toolBtn}
                                onClick={() => execCommand('justifyCenter')}
                                title={t('noteEditor.alignCenter')}
                            >
                                <AlignCenter size={18} />
                            </button>
                            <button
                                className={styles.toolBtn}
                                onClick={() => execCommand('justifyRight')}
                                title={t('noteEditor.alignRight')}
                            >
                                <AlignRight size={18} />
                            </button>
                        </div>

                        <div className={styles.toolbarSeparator} />

                        <div className={styles.toolbarGroup}>
                            <button
                                className={styles.toolBtn}
                                onClick={() => execCommand('insertUnorderedList')}
                                title={t('noteEditor.bulletList')}
                            >
                                <List size={18} />
                            </button>
                            <button
                                className={styles.toolBtn}
                                onClick={() => execCommand('insertOrderedList')}
                                title={t('noteEditor.numberedList')}
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
                                title={t('noteEditor.insertImage')}
                            >
                                <Image size={18} />
                            </button>
                        </div>

                        <div className={styles.toolbarSeparator} />

                        <div className={styles.toolbarGroup}>
                            <select
                                className={styles.fontSizeSelect}
                                onChange={(e) => applyFontSizePx(e.target.value)}
                                defaultValue="16"
                                aria-label="Font size"
                            >
                                <option value="12">12</option>
                                <option value="14">14</option>
                                <option value="16">16</option>
                                <option value="18">18</option>
                                <option value="20">20</option>
                                <option value="24">24</option>
                                <option value="28">28</option>
                                <option value="32">32</option>
                            </select>
                        </div>

                        <div className={styles.toolbarSeparator} />

                        <div className={styles.toolbarGroup}>
                            <button
                                className={styles.toolBtn}
                                onClick={insertTable}
                                title="Insert Table"
                            >
                                <Grid3x3 size={18} />
                            </button>
                            <button
                                className={styles.toolBtn}
                                onClick={() => removeTable()}
                                title={t('noteEditor.removeTable')}
                            >
                                <Trash2 size={16} />
                            </button>
                            <button
                                className={styles.aiAssistantBtn}
                                onClick={() => {
                                    const selection = window.getSelection();
                                    let selectedText = '';
                                    if (selection && selection.toString().length > 0 && editorRef.current && editorRef.current.contains(selection.anchorNode)) {
                                        selectedText = selection.toString().trim();
                                    }
                                    setSelectedTextContext(selectedText);

                                    if (!selectedText) {
                                        try {
                                            const sel = window.getSelection();
                                            if (sel && sel.rangeCount > 0 && editorRef.current && editorRef.current.contains(sel.anchorNode)) {
                                                aiInsertRangeRef.current = sel.getRangeAt(0).cloneRange();
                                            } else {
                                                aiInsertRangeRef.current = null;
                                            }
                                        } catch (err) {
                                            aiInsertRangeRef.current = null;
                                        }
                                    } else {
                                        aiInsertRangeRef.current = null;
                                    }
                                    setShowAiAssistant(true);
                                }}
                                title="AI Assistant"
                            >
                                <Zap size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Editor Content - Dodano containerRef i position: relative */}
                <div 
                    className={styles.editorContent} 
                    ref={containerRef}
                    style={{ position: 'relative' }} 
                >
                    {!isReadOnly && selectedImage && (
                        <ImageResizeOverlay 
                            image={selectedImage}
                            containerRef={containerRef} // Używamy teraz containerRef
                            editorRef={editorRef}       // editorRef potrzebny do nasłuchiwania scrolla
                            onResizeEnd={handleInput}
                            deselect={() => setSelectedImage(null)}
                        />
                    )}
                    <div
                        ref={editorRef}
                        className={`${styles.editor} ${isReadOnly ? styles.readOnly : ''}`}
                        contentEditable={!isReadOnly}
                        onInput={handleInput}
                        onClick={handleEditorClick}
                        suppressContentEditableWarning
                        data-placeholder={t('noteEditor.editorPlaceholder')}
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
                            {t('noteEditor.createdAt')}: {formatDate(note.created_at)}
                        </span>
                    </div>
                </div>
            </div>

            {/* AI Assistant Modal */}
            {showAiAssistant && (
                <AiAssistant
                    onClose={() => {
                        setShowAiAssistant(false);
                        setSelectedTextContext('');
                    }}
                    onInsert={handleAiText}
                    selectedText={selectedTextContext}
                />
            )}

            {/* Table Dialog */}
            {showTableDialog && (
                <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setShowTableDialog(false)}>
                    <div className={styles.tableModalContainer} onClick={(e) => e.stopPropagation()}>
                        <div style={{ padding: '1.5rem' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.125rem', fontWeight: 600, color: 'var(--title)' }}>
                                {t('noteEditor.insertTable')}
                            </h3>
                            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--subtitle)', fontWeight: 500 }}>
                                        {t('noteEditor.tableRows')}
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={tableRows}
                                        onChange={(e) => setTableRows(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.625rem',
                                            border: '1px solid var(--border_gray)',
                                            borderRadius: '8px',
                                            fontSize: '1rem',
                                            background: 'var(--white_btn_bg)',
                                            color: 'var(--title)',
                                            fontFamily: 'Inter, sans-serif'
                                        }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--subtitle)', fontWeight: 500 }}>
                                        {t('noteEditor.tableColumns')}
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={tableCols}
                                        onChange={(e) => setTableCols(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.625rem',
                                            border: '1px solid var(--border_gray)',
                                            borderRadius: '8px',
                                            fontSize: '1rem',
                                            background: 'var(--white_btn_bg)',
                                            color: 'var(--title)',
                                            fontFamily: 'Inter, sans-serif'
                                        }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border_gray)', paddingTop: '1rem' }}>
                                <button
                                    onClick={() => setShowTableDialog(false)}
                                    style={{
                                        padding: '0.625rem 1.25rem',
                                        border: '1px solid var(--border_gray)',
                                        borderRadius: '8px',
                                        background: 'var(--white_btn_bg)',
                                        color: 'var(--subtitle)',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        fontWeight: 500,
                                        transition: 'all 0.2s ease',
                                        fontFamily: 'Inter, sans-serif'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'var(--inner_section_bg)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'var(--white_btn_bg)';
                                    }}
                                >
                                    {t('noteEditor.cancel')}
                                </button>
                                <button
                                    onClick={handleInsertTable}
                                    style={{
                                        padding: '0.625rem 1.25rem',
                                        border: 'none',
                                        borderRadius: '8px',
                                        background: '#8b5cf6',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        transition: 'all 0.2s ease',
                                        fontFamily: 'Inter, sans-serif'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#7c3aed';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#8b5cf6';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    {t('noteEditor.insertTable')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}