import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import toast from 'react-hot-toast';
import { confirmModal } from '../../../utils/confirmModal';
import {
    Save, X, Trash2, Bold, Italic, Underline,
    AlignLeft, AlignCenter, AlignRight, List, ListOrdered,
    Type, Calendar, Image as ImageIcon, Lock, Eye, Grid3x3, Zap, Columns, Users
} from 'lucide-react';
import styles from '../../../css/features/NoteEditor.module.css';
import { lockNoteFunction, unlockNoteFunction, checkLockStatusFunction, updateNote, deleteNote } from '../../../services/noteService';
import noteCollabService from '../../../services/noteCollaborationService';
import { useLanguage } from "../../../translations/LanguageContext";
import translations from "../../../translations/translation.json";
import AiAssistant from './AiAssistant';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';

const GlobalTooltip = ({ text, x, y, visible }) => {
    if (!visible || !text) return null;
    
    return (
        <div style={{
            position: 'fixed',
            top: y, 
            left: x,
            transform: 'translateX(-50%)', 
            backgroundColor: '#1f2937', 
            color: '#ffffff',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            pointerEvents: 'none', 
            zIndex: 999999,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            border: '1px solid #374151'
        }}>
            {text}
            <div style={{
                position: 'absolute',
                top: '-4px',
                left: '50%',
                transform: 'translateX(-50%) rotate(45deg)',
                width: '8px',
                height: '8px',
                backgroundColor: '#1f2937',
                borderLeft: '1px solid #374151',
                borderTop: '1px solid #374151'
            }} />
        </div>
    );
};

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
    
    // Collaborative editing state
    const [activeEditors, setActiveEditors] = useState([]);
    const [showEditorsList, setShowEditorsList] = useState(false);
    const contentChangeTimeoutRef = useRef(null);
    
    const [tooltipState, setTooltipState] = useState({ visible: false, x: 0, y: 0, text: '' });
    const [isSplitView, setIsSplitView] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);

    const aiInsertRangeRef = useRef(null);
    const editorRef = useRef(null);
    const containerRef = useRef(null);
    const fileInputRef = useRef(null);
    const lockCheckIntervalRef = useRef(null)
    const initialTitleRef = useRef(note?.title || '');
    const initialContentRef = useRef(note?.content || '');
    const { language, changeLanguage } = useLanguage();
    const previewRef = useRef(null);
    const isScrollingRef = useRef(false);
    
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

    const handleTooltipEnter = (e, text) => {
    if(!text) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltipState({
            visible: true,
            x: rect.left + rect.width / 2,
            y: rect.top,
            text: text
        });
    };

    const handleTooltipLeave = () => {
        setTooltipState(prev => ({ ...prev, visible: false }));
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
            }
        }

        setContent(editorRef.current?.innerHTML || '');
        setIsDirty(true);
    };

    useEffect(() => {
        if (editorRef.current && note?.content) {
            editorRef.current.innerHTML = note.content;
        }

        if (!isNew && note?.id) {
            // Connect to collaborative editing
            noteCollabService.connect(note.id, userData.id);

            // Listen for presence updates
            const handlePresence = (editors) => {
                setActiveEditors(editors.filter(e => e.user_id !== userData.id));
            };

            // Listen for content changes from other users
            const handleContentChange = (message) => {
                if (message.user_id !== userData.id && editorRef.current) {
                    // Save cursor position
                    const selection = window.getSelection();
                    const range = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
                    
                    // Update content
                    editorRef.current.innerHTML = message.content;
                    setContent(message.content);
                    
                    // Restore cursor position if possible
                    if (range) {
                        try {
                            selection.removeAllRanges();
                            selection.addRange(range);
                        } catch (e) {
                            // Cursor restoration failed, ignore
                        }
                    }
                    
                    toast.success(`${message.username} ${t('noteEditor.updatedNote') || 'updated the note'}`, {
                        duration: 2000,
                        icon: '👥'
                    });
                }
            };

            // Listen for save events from other users
            const handleSaved = (message) => {
                if (message.user_id !== userData.id) {
                    toast.success(`${message.username} ${t('noteEditor.savedNote') || 'saved the note'}`, {
                        duration: 2000,
                        icon: '💾'
                    });
                }
            };

            noteCollabService.on('onPresence', handlePresence);
            noteCollabService.on('onContentChange', handleContentChange);
            noteCollabService.on('onSaved', handleSaved);

            return () => {
                noteCollabService.off('onPresence', handlePresence);
                noteCollabService.off('onContentChange', handleContentChange);
                noteCollabService.off('onSaved', handleSaved);
                noteCollabService.disconnect();
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

    useEffect(() => {
        if (editorRef.current && content) {
            if (editorRef.current.innerHTML !== content) {
                editorRef.current.innerHTML = content;
            }
        }
    }, [isSplitView, isReadOnly]);

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
            setIsReadOnly(true);
        }
    };

    const unlockNote = async () => {
        if (isNew) return;
        try {
            await unlockNoteFunction(note.id, userData.id);
        } catch (err) {
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

    const handleSyncScroll = (source) => {
        if (!isSplitView || !editorRef.current || !previewRef.current) return;
        
        if (isScrollingRef.current) return;

        isScrollingRef.current = true;

        window.requestAnimationFrame(() => {
            const left = editorRef.current;
            const right = previewRef.current;

            if (!left || !right) {
                isScrollingRef.current = false;
                return;
            }

            if (source === 'editor') {
                const percentage = left.scrollTop / (left.scrollHeight - left.clientHeight);
                const newScrollTop = percentage * (right.scrollHeight - right.clientHeight) || 0;
                right.scrollTop = newScrollTop;
            } else {
                const percentage = right.scrollTop / (right.scrollHeight - right.clientHeight);
                const newScrollTop = percentage * (left.scrollHeight - left.clientHeight) || 0;
                left.scrollTop = newScrollTop;
            }
            setTimeout(() => {
                isScrollingRef.current = false;
            }, 10);
        });
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

            // Broadcast save event to other users
            if (!isNew && note?.id) {
                noteCollabService.sendSave(updatedContent, title);
            }

            onSave({ ...note, title, content: updatedContent });
            toast.success('Notatka zapisana!');
            initialTitleRef.current = title;
            initialContentRef.current = updatedContent || '';
            setIsDirty(false);
        } catch (err) {
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
            const newContent = editorRef.current.innerHTML;
            setContent(newContent);
            const curTitle = title || '';
            const curContent = editorRef.current?.innerHTML || '';
            setIsDirty(curTitle !== (initialTitleRef.current || '') || curContent !== (initialContentRef.current || ''));
            
            // Broadcast content changes to other users (debounced)
            if (!isNew && note?.id) {
                if (contentChangeTimeoutRef.current) {
                    clearTimeout(contentChangeTimeoutRef.current);
                }
                
                contentChangeTimeoutRef.current = setTimeout(() => {
                    noteCollabService.sendContentChange(newContent);
                }, 500); // Debounce for 500ms
            }
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

    const formatContent = (text) => {
        if (!text) return "";
        
        let formatted = text.replace(/\^(\w+)/g, '<sup>$1</sup>');

        formatted = formatted.replace(/\_(\d+)/g, '<sub>$1</sub>');

        return formatted;
    };

    return (
        <div className={styles.editorOverlay}>
            <div className={styles.editorContainer}>
                {isReadOnly && (
                    <div className={styles.readOnlyBanner}>
                        <Lock size={16} />
                        <span>{t('noteEditor.readOnlyMessage', { username: lockedByUsername })}</span>
                    </div>
                )}
                <div className={styles.editorHeader}>
                    <div className={styles.headerLeft}>
                        <input
                            type="text"
                            id="note-title"
                            name="noteTitle"
                            value={title}
                            onChange={(e) => !isReadOnly && setTitle(e.target.value)}
                            className={styles.titleInput}
                            placeholder={t('noteEditor.titlePlaceholder')}
                            disabled={isReadOnly}
                        />
                        {/* Active Editors Indicator */}
                        {activeEditors.length > 0 && (
                            <div className={styles.activeEditorsIndicator} onClick={() => setShowEditorsList(!showEditorsList)}>
                                <Users size={16} />
                                <span>{activeEditors.length} {activeEditors.length === 1 ? t('noteEditor.editing') || 'editing' : t('noteEditor.editingPlural') || 'editing'}</span>
                                {showEditorsList && (
                                    <div className={styles.editorsList} onClick={(e) => e.stopPropagation()}>
                                        {activeEditors.map((editor, idx) => (
                                            <div key={editor.user_id} className={styles.editorItem}>
                                                {editor.avatar_url ? (
                                                    <img src={editor.avatar_url} alt={editor.username} className={styles.editorAvatar} />
                                                ) : (
                                                    <div className={styles.editorAvatarFallback} style={{ backgroundColor: `hsl(${idx * 137.5}, 70%, 60%)` }}>
                                                        {editor.username.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <span className={styles.editorName}>{editor.username}</span>
                                                <div className={styles.editorIndicator} style={{ backgroundColor: `hsl(${idx * 137.5}, 70%, 60%)` }} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className={styles.headerRight}>
                        {!isReadOnly && (
                            <>
                                {!isNew && (
                                    <button 
                                        className={styles.deleteBtn}
                                        onClick={handleDelete}
                                        title={t('noteEditor.deleteTitle')}
                                        onMouseEnter={(e) => handleTooltipEnter(e, t('noteEditor.deleteTitle'))}
                                        onMouseLeave={handleTooltipLeave}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                                <button 
                                    className={styles.saveBtn}
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    title={t('noteEditor.saveTitle')}
                                    onMouseEnter={(e) => handleTooltipEnter(e, t('noteEditor.saveTitle'))}
                                    onMouseLeave={handleTooltipLeave}
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
                            onMouseEnter={(e) => handleTooltipEnter(e, t('noteEditor.closeTitle'))}
                            onMouseLeave={handleTooltipLeave}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {!isReadOnly && (
                    <div className={styles.toolbar}>
                        <div className={styles.toolbarGroup}>
                            <button
                                className={styles.toolBtn}
                                onClick={() => setIsSplitView(!isSplitView)}
                                style={{ 
                                    backgroundColor: isSplitView ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                                    color: isSplitView ? '#8b5cf6' : 'inherit'
                                }}
                                onMouseEnter={(e) => handleTooltipEnter(e, isSplitView ? "Wyłącz podgląd" : "Podgląd na żywo (Split View)")}
                                onMouseLeave={handleTooltipLeave}
                            >
                                <Columns size={18} />
                            </button>
                            <button
                                className={styles.toolBtn}
                                onClick={() => execCommand('bold')}
                                onMouseEnter={(e) => handleTooltipEnter(e, t('noteEditor.bold'))}
                                onMouseLeave={handleTooltipLeave}
                            >
                                <Bold size={18} />
                            </button>
                            <button
                                className={styles.toolBtn}
                                onClick={() => execCommand('italic')}
                                onMouseEnter={(e) => handleTooltipEnter(e, t('noteEditor.italic'))}
                                onMouseLeave={handleTooltipLeave}
                            >
                                <Italic size={18} />
                            </button>
                            <button
                                className={styles.toolBtn}
                                onClick={() => execCommand('underline')}
                                onMouseEnter={(e) => handleTooltipEnter(e, t('noteEditor.underline'))}
                                onMouseLeave={handleTooltipLeave}
                            >
                                <Underline size={18} />
                            </button>
                        </div>

                        <div className={styles.toolbarSeparator} />

                        <div className={styles.toolbarGroup}>
                            <button
                                className={styles.toolBtn}
                                onClick={() => execCommand('justifyLeft')}
                                onMouseEnter={(e) => handleTooltipEnter(e, t('noteEditor.alignLeft'))}
                                onMouseLeave={handleTooltipLeave}
                            >
                                <AlignLeft size={18} />
                            </button>
                            <button
                                className={styles.toolBtn}
                                onClick={() => execCommand('justifyCenter')}
                                onMouseEnter={(e) => handleTooltipEnter(e, t('noteEditor.alignCenter'))}
                                onMouseLeave={handleTooltipLeave}
                            >
                                <AlignCenter size={18} />
                            </button>
                            <button
                                className={styles.toolBtn}
                                onClick={() => execCommand('justifyRight')}
                                onMouseEnter={(e) => handleTooltipEnter(e, t('noteEditor.alignRight'))}
                                onMouseLeave={handleTooltipLeave}
                            >
                                <AlignRight size={18} />
                            </button>
                        </div>

                        <div className={styles.toolbarSeparator} />

                        <div className={styles.toolbarGroup}>
                            <button
                                className={styles.toolBtn}
                                onClick={() => execCommand('insertUnorderedList')}
                                onMouseEnter={(e) => handleTooltipEnter(e, t('noteEditor.bulletList'))}
                                onMouseLeave={handleTooltipLeave}
                            >
                                <List size={18} />
                            </button>
                            <button
                                className={styles.toolBtn}
                                onClick={() => execCommand('insertOrderedList')}
                                onMouseEnter={(e) => handleTooltipEnter(e, t('noteEditor.numberedList'))}
                                onMouseLeave={handleTooltipLeave}
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
                                onMouseEnter={(e) => handleTooltipEnter(e, t('noteEditor.insertImage'))}
                                onMouseLeave={handleTooltipLeave}
                            >
                                <ImageIcon size={18} />
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
                                onMouseEnter={(e) => handleTooltipEnter(e, t('noteEditor.insertTable'))}
                                onMouseLeave={handleTooltipLeave}
                            >
                                <Grid3x3 size={18} />
                            </button>
                            <button
                                className={styles.toolBtn}
                                onClick={() => removeTable()}
                                onMouseEnter={(e) => handleTooltipEnter(e, t('noteEditor.removeTable'))}
                                onMouseLeave={handleTooltipLeave}
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
                                onMouseEnter={(e) => handleTooltipEnter(e, "AI Assistant")}
                                onMouseLeave={handleTooltipLeave}
                            >
                                <Zap size={18} />
                            </button>
                        </div>
                    </div>
                )}

                <div 
                    className={styles.editorContent} 
                    ref={containerRef}
                    style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }} 
                >
                    {!isReadOnly && selectedImage && (
                        <ImageResizeOverlay 
                            image={selectedImage}
                            containerRef={containerRef}
                            editorRef={editorRef}
                            onResizeEnd={handleInput}
                            deselect={() => setSelectedImage(null)}
                        />
                    )}

                    {!isReadOnly && isSplitView ? (
                        <div style={{ display: 'flex', height: '100%', width: '100%' }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border_gray)', overflow: 'hidden' }}>
                                <div
                                    ref={editorRef}
                                    className={styles.editor}
                                    contentEditable={true}
                                    onInput={handleInput}
                                    onClick={handleEditorClick}
                                    onScroll={() => handleSyncScroll('editor')}
                                    suppressContentEditableWarning
                                    data-placeholder="Wpisz tekst... (np. $$x^2$$)"
                                    style={{ height: '100%', overflowY: 'auto', padding: '1.5rem' }}
                                />
                            </div>
                            
                            <div 
                                ref={previewRef}
                                onScroll={() => handleSyncScroll('preview')}
                                style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', backgroundColor: 'var(--inner_section_bg)' }}>
                                <div className={styles.readOnly}>
                                    <ReactMarkdown
                                        children={formatContent(content)}
                                        remarkPlugins={[remarkMath, remarkGfm]}
                                        rehypePlugins={[rehypeKatex, rehypeRaw]} 
                                        urlTransform={(value) => value}
                                        components={{
                                            p: ({node, ...props}) => <p style={{ marginBottom: '0.75rem', lineHeight: '1.6' }} {...props} />,
                                            a: ({node, ...props}) => <a style={{ color: '#8b5cf6', textDecoration: 'underline' }} {...props} />,
                                            ul: ({node, ...props}) => <ul style={{ marginLeft: '1.5rem', marginBottom: '0.75rem' }} {...props} />,
                                            ol: ({node, ...props}) => <ol style={{ marginLeft: '1.5rem', marginBottom: '0.75rem' }} {...props} />,
                                            h1: ({node, ...props}) => <h1 style={{ fontSize: '1.5em', fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem' }} {...props} />,
                                            h2: ({node, ...props}) => <h2 style={{ fontSize: '1.25em', fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem' }} {...props} />,
                                            h3: ({node, ...props}) => <h3 style={{ fontSize: '1.1em', fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem' }} {...props} />,
                                            div: ({node, ...props}) => <div {...props} />, // Po prostu renderuj div
                                            span: ({node, ...props}) => <span {...props} />,
                                            br: ({node, ...props}) => <br {...props} />,
                                            strong: ({node, ...props}) => <strong style={{ fontWeight: 'bold', color: 'var(--purple_brighter)' }} {...props} />,
                                            b: ({node, ...props}) => <strong style={{ fontWeight: 'bold' }} {...props} />,
                                            em: ({node, ...props}) => <em style={{ fontStyle: 'italic' }} {...props} />,
                                            i: ({node, ...props}) => <em style={{ fontStyle: 'italic' }} {...props} />,
                                            sup: ({node, ...props}) => <sup {...props} style={{ fontSize: '0.75em', verticalAlign: 'super', lineHeight: 0 }} />,
                                            sub: ({node, ...props}) => <sub {...props} style={{ fontSize: '0.75em', verticalAlign: 'sub', lineHeight: 0 }} />,
                                            table: ({node, ...props}) => <div style={{overflowX:'auto', marginBottom: '1rem'}}><table style={{width:'100%', borderCollapse:'collapse'}} {...props}/></div>,
                                            th: ({node, ...props}) => <th style={{border:'1px solid rgba(148, 163, 184, 0.3)', padding:'8px 12px', background:'rgba(139, 92, 246, 0.1)', fontWeight: 600}} {...props}/>,
                                            td: ({node, ...props}) => <td style={{border:'1px solid rgba(148, 163, 184, 0.3)', padding:'8px 12px'}} {...props}/>,
                                            img: ({node, ...props}) => (
                                                <img 
                                                    {...props} 
                                                    style={{
                                                        maxWidth: '100%', 
                                                        borderRadius: '8px', 
                                                        ...props.style
                                                    }} 
                                                />
                                            )
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {!isReadOnly ? (
                                <div
                                    ref={editorRef}
                                    className={`${styles.editor} ${isReadOnly ? styles.readOnly : ''}`}
                                    contentEditable={true}
                                    onInput={handleInput}
                                    onClick={handleEditorClick}
                                    suppressContentEditableWarning
                                    data-placeholder={t('noteEditor.editorPlaceholder')}
                                    style={{ height: '100%', overflowY: 'auto' }}
                                />
                            ) : (
                                <div className={`${styles.editor} ${styles.readOnly}`} style={{ height: '100%', overflowY: 'auto' }}>
                                    <ReactMarkdown
                                        children={formatContent(content)}
                                        remarkPlugins={[remarkMath, remarkGfm]}
                                        rehypePlugins={[rehypeKatex, rehypeRaw]} 
                                        urlTransform={(value) => value}
                                        components={{
                                            p: ({node, ...props}) => <p style={{ marginBottom: '0.75rem', lineHeight: '1.6' }} {...props} />,
                                            a: ({node, ...props}) => <a style={{ color: '#8b5cf6', textDecoration: 'underline' }} {...props} />,
                                            ul: ({node, ...props}) => <ul style={{ marginLeft: '1.5rem', marginBottom: '0.75rem' }} {...props} />,
                                            ol: ({node, ...props}) => <ol style={{ marginLeft: '1.5rem', marginBottom: '0.75rem' }} {...props} />,
                                            h1: ({node, ...props}) => <h1 style={{ fontSize: '1.5em', fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem' }} {...props} />,
                                            h2: ({node, ...props}) => <h2 style={{ fontSize: '1.25em', fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem' }} {...props} />,
                                            h3: ({node, ...props}) => <h3 style={{ fontSize: '1.1em', fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem' }} {...props} />,
                                            div: ({node, ...props}) => <div {...props} />, // Po prostu renderuj div
                                            span: ({node, ...props}) => <span {...props} />,
                                            br: ({node, ...props}) => <br {...props} />,
                                            strong: ({node, ...props}) => <strong style={{ fontWeight: 'bold', color: 'var(--purple_brighter)' }} {...props} />,
                                            b: ({node, ...props}) => <strong style={{ fontWeight: 'bold' }} {...props} />,
                                            em: ({node, ...props}) => <em style={{ fontStyle: 'italic' }} {...props} />,
                                            i: ({node, ...props}) => <em style={{ fontStyle: 'italic' }} {...props} />,
                                            sup: ({node, ...props}) => <sup {...props} style={{ fontSize: '0.75em', verticalAlign: 'super', lineHeight: 0 }} />,
                                            sub: ({node, ...props}) => <sub {...props} style={{ fontSize: '0.75em', verticalAlign: 'sub', lineHeight: 0 }} />,
                                            table: ({node, ...props}) => <div style={{overflowX:'auto', marginBottom: '1rem'}}><table style={{width:'100%', borderCollapse:'collapse'}} {...props}/></div>,
                                            th: ({node, ...props}) => <th style={{border:'1px solid rgba(148, 163, 184, 0.3)', padding:'8px 12px', background:'rgba(139, 92, 246, 0.1)', fontWeight: 600}} {...props}/>,
                                            td: ({node, ...props}) => <td style={{border:'1px solid rgba(148, 163, 184, 0.3)', padding:'8px 12px'}} {...props}/>,
                                            img: ({node, ...props}) => (
                                                <img 
                                                    {...props} 
                                                    style={{
                                                        maxWidth: '100%', 
                                                        borderRadius: '8px', 
                                                        ...props.style
                                                    }} 
                                                />
                                            )
                                        }}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>

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
            
            <GlobalTooltip 
                text={tooltipState.text}
                x={tooltipState.x}
                y={tooltipState.y}
                visible={tooltipState.visible}
            />
        </div>
    );
}