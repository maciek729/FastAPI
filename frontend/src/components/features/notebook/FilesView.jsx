import { useState, useEffect, useContext, useRef } from 'react';
import toast from 'react-hot-toast';
import { confirmModal } from '../../../utils/confirmModal';
import axios from "axios";
import { UserPlus, X, Pin, Folder, ArrowLeft, MoreVertical, Search, Trash2, Plus, Filter, Upload, FileText, File, FileImage, FileSpreadsheet, ExternalLink, Eye, AlertCircle } from 'lucide-react';
import NoteEditor from './NoteEditor';
import FileViewer from './FileViewer';
import styles from "../../../css/features/NotebookView.module.css";
import generatorStyles from "../../../css/features/FlashcardGenerator.module.css";
import { getCollaborators, addCollaborator, removeCollaborator } from '../../../services/notebookService';
import { updateNotePosition } from '../../../services/noteService';
import { uploadFile, getFiles, deleteFile } from '../../../services/fileService';
import ENDPOINTS from '../../../api/endpoints';
import { LanguageContext } from '../../../translations/LanguageContext';
import translations from '../../../translations/translation.json';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export default function FilesView({ details, userData, refreshNotebook, highlightedItemId }) {
    const [showCollaboratorModal, setShowCollaboratorModal] = useState(false);
    const [showNoteEditor, setShowNoteEditor] = useState(false);
    const [selectedNote, setSelectedNote] = useState(null);
    const [collaboratorUsername, setCollaboratorUsername] = useState('');
    const [collaborators, setCollaborators] = useState([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(true);
    
    const [notes, setNotes] = useState([]);
    const [folders, setFolders] = useState([]);
    const [files, setFiles] = useState([]);
    const [currentFolder, setCurrentFolder] = useState(null);
    
    const [isUploading, setIsUploading] = useState(false);
    const [viewingFile, setViewingFile] = useState(null);
    const fileInputRef = useRef(null);
    const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [folderMenuOpen, setFolderMenuOpen] = useState(null);
    const [editingFolder, setEditingFolder] = useState(null);
    
    const [draggedNote, setDraggedNote] = useState(null);
    const [draggedFile, setDraggedFile] = useState(null);
    const [draggedFolder, setDraggedFolder] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [dragNotAllowedIndex, setDragNotAllowedIndex] = useState(null);
    const [dragOverFolder, setDragOverFolder] = useState(null);
    const [isGlobalDragOver, setIsGlobalDragOver] = useState(false);
    const [dragOverBreadcrumb, setDragOverBreadcrumb] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('date_desc');
    const [showFilters, setShowFilters] = useState(window.innerWidth > 768);

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

    const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'txt', 'md'];

    const checkFileExtension = (file) => {
        const extension = file.name.split('.').pop().toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(extension)) {
            toast.error(t('filesView.formatNotSupported', { ext: extension })); // Tłumaczenie
            return false;
        }
        return true;
    };

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 768) {
                setShowFilters(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        setIsLoadingDetails(true);
        const loadingTimer = setTimeout(() => setIsLoadingDetails(false), 400);
        return () => clearTimeout(loadingTimer);
    }, [details?.id]);



    useEffect(() => { if (details?.notes) setNotes(details.notes); }, [details?.notes]);
    
    useEffect(() => {
        const loadAllData = async () => {
            if (details?.id && userData?.id) {
                setIsLoadingData(true);
                try {
                    await Promise.all([
                        fetchFolders(),
                        fetchFiles(),
                        details?.is_shared && !isLoadingDetails ? fetchCollaborators() : Promise.resolve()
                    ]);
                } catch (error) {
                    console.error('Error loading data:', error);
                } finally {
                    setIsLoadingData(false);
                }
            }
        };
        loadAllData();
    }, [details?.id, userData?.id]);

    useEffect(() => {
        if (highlightedItemId) {
            setTimeout(() => {
                const element = document.getElementById(`item-card-${highlightedItemId}`) || document.getElementById(`note-card-${highlightedItemId}`);
                if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 150);
        }
    }, [highlightedItemId]);

    useEffect(() => {
        if (highlightedItemId && notes.length > 0 && folders.length > 0) {
            const targetNote = notes.find(n => n.id === highlightedItemId);
            if (targetNote) {
                if (targetNote.folder_id && (!currentFolder || currentFolder.id !== targetNote.folder_id)) {
                    const folderToOpen = folders.find(f => f.id === targetNote.folder_id);
                    if (folderToOpen) setCurrentFolder(folderToOpen);
                } else if (!targetNote.folder_id && currentFolder !== null) setCurrentFolder(null);
            }
        }
    }, [highlightedItemId, notes, folders]);

    const fetchFolders = async () => { try { const response = await axios.get(ENDPOINTS.FOLDERS.NOTES.LIST(details.id, userData.id)); setFolders(response.data); } catch (err) { } };
    const fetchFiles = async () => { try { const data = await getFiles(details.id); setFiles(data); } catch (error) { } };
    const fetchCollaborators = async () => { try { const data = await getCollaborators(details.id); setCollaborators(data); } catch (err) { } };

    const handleFileUpload = async (e) => {
        const file = e.target.files ? e.target.files[0] : null;
        if (!file) return;
        if (!checkFileExtension(file)) { e.target.value = ''; return; }
        await uploadSingleFile(file);
    };

    const uploadSingleFile = async (file) => {
        if (!checkFileExtension(file)) return;
        if (file.size > 20 * 1024 * 1024) { toast.error(t('filesView.fileTooBig')); return; }

        setIsUploading(true);
        const toastId = toast.loading(t('filesView.uploading'));
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('notebook_id', details.id);
            formData.append('user_id', userData.id);
            await uploadFile(formData);
            toast.success(t('filesView.fileAdded'), { id: toastId });
            fetchFiles();
        } catch (error) {
            toast.error(t('flashcardsView.error'), { id: toastId });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteFile = async (e, file) => {
        e.stopPropagation();
        if (!await confirmModal(t('filesView.deleteFileConfirm', { fileName: file.file_name }))) return;
        try {
            await deleteFile(file.id);
            toast.success(t('filesView.fileDeleted'));
            setFiles(prev => prev.filter(f => f.id !== file.id));
        } catch (error) { toast.error(t('filesView.deleteFileError')); }
    };

    const handleCreateNewNote = () => {
        const emptyNote = { id: null, title: '', content: '', type: 'Notatka', user_id: userData.id, notebook_id: details.id, is_shared: false, created_at: new Date().toISOString() };
        setSelectedNote(emptyNote); setShowNoteEditor(true);
    };
    const handleDeleteNote = async (noteId) => {
        if (!await confirmModal(t('filesView.confirmDelete'))) return;
        try{ await axios.delete(ENDPOINTS.NOTES.DELETE(noteId), { params: { user_id: userData.id } }); toast.success(t('filesView.deleteSuccess')); refreshNotebook(); } 
        catch (err) { toast.error(t('filesView.deleteError')); }
    };
    const handleTogglePin = async (noteId, isPinned, e) => {
        e.stopPropagation();
        try { await axios.patch(ENDPOINTS.NOTES.TOGGLE_PIN(noteId), { is_pinned: isPinned }); setNotes(prev => prev.map(n => n.id === noteId ? { ...n, is_pinned: isPinned } : n)); } 
        catch (err) { toast.error(t('filesView.pinError')); }
    };
    
    const handleToggleFilePin = async (fileId, isPinned, e) => {
        e.stopPropagation();
        try { 
            await axios.patch(ENDPOINTS.FILES.TOGGLE_PIN(fileId), { is_pinned: isPinned }); 
            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, is_pinned: isPinned } : f)); 
        } 
        catch (err) { toast.error(t('filesView.pinError')); }
    };

    const handleCreateFolder = async (e) => { e.preventDefault(); if(!newFolderName.trim()) return; try { await axios.post(ENDPOINTS.FOLDERS.NOTES.CREATE, { notebook_id: details.id, user_id: userData.id, name: newFolderName, parent_folder_id: currentFolder?.id || null }); setNewFolderName(''); setShowCreateFolderModal(false); fetchFolders(); } catch(err){toast.error(t('flashcardsView.createFolderError'));} };
    const openFolder = (folder) => setCurrentFolder(folder);
    const closeFolder = () => { if(currentFolder?.parent_folder_id) { setCurrentFolder(folders.find(f => f.id === currentFolder.parent_folder_id)); } else setCurrentFolder(null); };
    const handleDeleteFolder = async (id) => { if(await confirmModal(t('filesView.deleteFolderConfirm'))) { try { await axios.delete(ENDPOINTS.FOLDERS.NOTES.DELETE(id)); if(currentFolder?.id===id) setCurrentFolder(null); fetchFolders(); refreshNotebook(); } catch(e){toast.error(t('flashcardsView.deleteFolderError'));}} };
    const handleRenameFolder = async (e) => { e.preventDefault(); if(!editingFolder?.name.trim()) return; try { await axios.patch(ENDPOINTS.FOLDERS.NOTES.RENAME(editingFolder.id), {name: editingFolder.name}); setEditingFolder(null); fetchFolders(); } catch(e){toast.error(t('flashcardsView.renameFolderError'));} };
    
    const handleAddCollaborator = async (e) => {
        e.preventDefault(); 
        if (!collaboratorUsername.trim()) { 
            toast.error(t('filesView.userError')); 
            return; 
        }
        
        try { 
            await addCollaborator(details.id, collaboratorUsername); 
            toast.success(t('filesView.userAdded', { username: collaboratorUsername })); 
            setCollaboratorUsername(''); 
            setShowCollaboratorModal(true); 
            fetchCollaborators();
            window.dispatchEvent(new Event('refreshSidebar'));
        } catch (err) { 
            if (err.message === 'USER_NOT_FOUND') {
                toast.error(t('sidebar.userNotFound'));
            } else {
                toast.error(err.message || t('filesView.addColError')); 
            }
        }
    };
    
    const handleRemoveCollaborator = async (userId) => {
        if (!await confirmModal(t('filesView.deleteColConfirm'))) return;
        try { 
            await removeCollaborator(details.id, userId); 
            toast.success(t('filesView.deleteColSuccess')); 
            fetchCollaborators();
            window.dispatchEvent(new Event('refreshSidebar'));
        } 
        catch (err) { toast.error(err.message || t('filesView.deleteColError')); }
    };

    const formatDate = (dateString) => {
        if (!dateString) return t('filesView.today');
        const date = new Date(dateString);
        const now = new Date();
        if (date.toDateString() === now.toDateString()) return t('filesView.today');
        return date.toLocaleDateString('pl-PL');
    };

    const getTypeColor = (type) => {
        const t = type?.toLowerCase() || '';
        if (t.includes('notatka')) return '#6c63ff';
        if (t.includes('pdf')) return '#e74c3c';
        if (t.includes('image') || t.includes('png') || t.includes('jpg')) return '#3498db';
        return '#95a5a6';
    };

    const getFileIcon = (fileName, type) => {
        const ext = fileName.split('.').pop().toLowerCase();
        if (['pdf'].includes(ext)) return <FileText size={48} color="#e74c3c" strokeWidth={1} />;
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <FileImage size={48} color="#3498db" strokeWidth={1} />;
        if (['txt', 'md'].includes(ext)) return <File size={48} color="#7f8c8d" strokeWidth={1} />;
        return <AlertCircle size={48} color="#f39c12" strokeWidth={1} />;
    };

    const getMixedItems = () => {
        let processedNotes = notes.filter(n => n.type !== "Fiszki");
        if (currentFolder) processedNotes = processedNotes.filter(n => n.folder_id === currentFolder.id);
        else processedNotes = processedNotes.filter(n => !n.folder_id);
        processedNotes = processedNotes.map(n => ({...n, itemType: 'note'}));

        let processedFiles = [];
        if (currentFolder) {
            processedFiles = files.filter(f => f.folder_id === currentFolder.id).map(f => ({
                id: f.id, title: f.file_name, content: null, created_at: f.created_at,
                type: f.file_type.includes('pdf') ? 'PDF' : 'Obraz', is_pinned: f.is_pinned || false, 
                grid_position: f.grid_position, itemType: 'file', originalFile: f
             }));
        } else {
             processedFiles = files.filter(f => !f.folder_id).map(f => ({
                id: f.id, title: f.file_name, content: null, created_at: f.created_at,
                type: f.file_type.includes('pdf') ? 'PDF' : 'Obraz', is_pinned: f.is_pinned || false, 
                grid_position: f.grid_position, itemType: 'file', originalFile: f
             }));
        }

        let combined = [...processedNotes, ...processedFiles];
        if (searchQuery) combined = combined.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()));

        combined.sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            
            if (sortBy === 'date_desc' || sortBy === 'date_asc') {
                if (a.grid_position !== null && a.grid_position !== undefined && 
                    b.grid_position !== null && b.grid_position !== undefined) {
                    return a.grid_position - b.grid_position;
                }
                
                if (sortBy === 'date_desc') return new Date(b.created_at) - new Date(a.created_at);
                if (sortBy === 'date_asc') return new Date(a.created_at) - new Date(b.created_at);
            }
            
            if (sortBy === 'name_asc') return a.title.localeCompare(b.title);
            if (sortBy === 'name_desc') return b.title.localeCompare(a.title);
            return 0;
        });
        return combined;
    };

    const mixedItems = getMixedItems();

    const handleDragStart = (e, item, index) => {
        if (item.itemType === 'note') {
            setDraggedNote({ note: item, index });
            e.dataTransfer.setData('application/json', JSON.stringify({ type: 'note', noteId: item.id }));
        } else if (item.itemType === 'file') {
            setDraggedFile({ file: item, index });
            e.dataTransfer.setData('application/json', JSON.stringify({ type: 'file', fileId: item.id }));
        }
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.style.opacity = '0.5';
    };
    const handleDragEnd = (e) => { e.currentTarget.style.opacity = '1'; setDraggedNote(null); setDraggedFile(null); setDragOverIndex(null); };
    const handleDragOver = (e, index) => {
        e.preventDefault();
        if ((draggedNote || draggedFile) && mixedItems[index]) setDragOverIndex(index);
    };
    const handleDrop = async (e, dropIndex) => {
        e.preventDefault(); setDragOverIndex(null);
        const draggedItem = draggedNote || draggedFile;
        if (!draggedItem || draggedItem.index === dropIndex) return;
        
        const newPosition = dropIndex;
        
        try {
            if (draggedNote) {
                await axios.patch(ENDPOINTS.NOTES.UPDATE_POSITION(draggedNote.note.id), { grid_position: newPosition });
                setNotes(prev => prev.map(n => n.id === draggedNote.note.id ? { ...n, grid_position: newPosition } : n));
            } else if (draggedFile) {
                await axios.patch(ENDPOINTS.FILES.UPDATE_POSITION(draggedFile.file.id), { grid_position: newPosition });
                fetchFiles();
            }
        } catch (err) {
            toast.error(t('filesView.notePosError'));
        }
    };
    const handleFolderDrop = async (e, folderId) => {
        e.preventDefault(); e.stopPropagation(); setDragOverFolder(null);
        if (draggedNote) {
            try {
                await axios.post(ENDPOINTS.FOLDERS.NOTES.MOVE_ITEM, { note_id: draggedNote.note.id, folder_id: folderId });
                setDraggedNote(null);
                refreshNotebook(); fetchFolders();
            } catch (err) { toast.error(t('filesView.noteMoveError')); }
        } else if (draggedFile) {
            try {
                await axios.post(ENDPOINTS.FILES.MOVE_TO_FOLDER, { file_id: draggedFile.file.id, folder_id: folderId });
                setDraggedFile(null);
                fetchFiles();
            } catch (err) { toast.error(t('filesView.fileMoveError')); }
        }
    };
    const handleBreadcrumbDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverBreadcrumb(true);
    };

    const handleBreadcrumbDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverBreadcrumb(false);
    };

    const handleBreadcrumbDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverBreadcrumb(false);

        const parentFolderId = currentFolder?.parent_folder_id || null;

        if (draggedNote) {
            try {
                await axios.post(ENDPOINTS.FOLDERS.NOTES.MOVE_ITEM, { note_id: draggedNote.note.id, folder_id: parentFolderId });
                setDraggedNote(null);
                refreshNotebook();
                fetchFolders();
            } catch (err) {
                toast.error(t('filesView.noteMoveError'));
            }
        } else if (draggedFile) {
            try {
                await axios.post(ENDPOINTS.FILES.MOVE_TO_FOLDER, { file_id: draggedFile.file.id, folder_id: parentFolderId });
                setDraggedFile(null);
                fetchFiles();
            } catch (err) {
                toast.error(t('filesView.fileMoveError'));
            }
        }
    };
    
    const handleGlobalDrop = async (e) => {
        e.preventDefault(); e.stopPropagation(); setIsGlobalDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) await uploadSingleFile(e.dataTransfer.files[0]);
    };

    if (isLoadingDetails || isLoadingData) return <div className={styles.loading}><div className={styles.loadingSpinner}></div><p>{t('filesView.loading')}</p></div>;

    return (
        <div 
            className={styles.filesView}
            onDragEnter={(e) => { e.preventDefault(); if(e.dataTransfer.types.includes('Files')) setIsGlobalDragOver(true); }}
            onDragOver={(e) => { e.preventDefault(); if(e.dataTransfer.types.includes('Files')) setIsGlobalDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); if(e.currentTarget.contains(e.relatedTarget)) return; setIsGlobalDragOver(false); }}
            onDrop={handleGlobalDrop}
        >
            {isGlobalDragOver && (
                <div style={{position:'absolute',inset:0,background:'rgba(52,152,219,0.2)',border:'3px dashed #3498db',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
                    <div style={{background:'white',padding:20,borderRadius:10,display:'flex',alignItems:'center',gap:10}}>
                        <Upload size={32} color="#3498db"/> <h2 style={{margin:0,color:'#3498db'}}>{t('filesView.dropFile')}</h2> <p style={{margin:0, color:'#7f8c8d'}}>{t('filesView.dropFileDesc')}</p>
                    </div>
                </div>
            )}

            <div className={styles.headerSection}>
                <div className={styles.leftSection}>
                    {currentFolder && (
                        <button onClick={closeFolder} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#f59e0b', fontWeight: 600 }}>
                            <ArrowLeft size={20} /> {t('flashcardsView.back')}
                        </button>
                    )}
                    <h1 
                        className={styles.notebookTitle} 
                        style={{ 
                            padding: currentFolder ? '0.5rem' : '0',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease',
                            backgroundColor: dragOverBreadcrumb ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                            border: dragOverBreadcrumb ? '2px dashed #f59e0b' : '2px solid transparent'
                        }}
                        onDragOver={currentFolder ? handleBreadcrumbDragOver : undefined}
                        onDragLeave={currentFolder ? handleBreadcrumbDragLeave : undefined}
                        onDrop={currentFolder ? handleBreadcrumbDrop : undefined}
                    >
                        {currentFolder ? <><Folder size={24} style={{color: '#f59e0b', marginRight: '8px'}} />{currentFolder.name}</> : t('filesView.myFiles')}
                    </h1>
                    <div className={styles.searchBox}>
                        <Search size={16} />
                        <input type="text" id="files-search" name="search" placeholder={t('filesView.searchNotePlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={styles.searchInput} />
                    </div>
                    <select id="files-sort" name="sortBy" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={styles.filterSelect}>
                        <option value="date_desc">{t('flashcardsView.sortNewest')}</option>
                        <option value="name_asc">{t('flashcardsView.sortNameAsc')}</option>
                    </select>
                </div>
                {showFilters && (
                    <div className={styles.filtersRow}>
                        <div className={styles.searchBox}>
                            <Search size={16} />
                            <input type="text" id="files-search-mobile" name="search" placeholder={t('filesView.searchNotePlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={styles.searchInput} />
                        </div>
                        <select id="files-sort-mobile" name="sortBy" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={styles.filterSelect}>
                            <option value="date_desc">{t('flashcardsView.sortNewest')}</option>
                            <option value="name_asc">{t('flashcardsView.sortNameAsc')}</option>
                        </select>
                    </div>
                )}
                <div className={styles.headerActions}>
                     <button className={styles.filterToggleBtn} onClick={() => setShowFilters(!showFilters)}><Filter size={18} /></button>
                     <button className={styles.addFolderBtn} onClick={() => setShowCreateFolderModal(true)}><Folder size={18} /> {t('flashcardsView.newFolder')}</button>
                     {details.is_shared && (
                        <button 
                            className={styles.collaboratorBtn} 
                            onClick={() => {
                                fetchCollaborators();
                                setShowCollaboratorModal(true);
                            }}
                        >
                            <UserPlus size={18} /> <span>{t('filesView.col')}</span>
                        </button>
                     )}
                     
                     <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} accept=".pdf,.jpg,.jpeg,.png,.txt" />
                     <button className={styles.addNoteBtn} onClick={() => fileInputRef.current?.click()} disabled={isUploading} style={{backgroundColor: '#3498db'}}>
                        {isUploading ? <div className={styles.loadingSpinner} style={{width:16,height:16}}/> : <Upload size={18} />}
                        {isUploading ? "..." : t('filesView.addFileBtn')}
                     </button>

                     <button className={styles.addNoteBtn} onClick={handleCreateNewNote}><Plus size={18} /> {t('filesView.addNote')}</button>
                </div>
            </div>

            <div className={styles.cardsContainer}>
                {folders.filter(f => currentFolder ? f.parent_folder_id === currentFolder.id : !f.parent_folder_id).map((folder, index) => (
                    <div
                        key={`folder-${folder.id}`}
                        className={`${styles.folderCard} ${dragOverFolder === folder.id ? styles.folderDragOver : ''}`}
                        onClick={() => !(draggedNote || draggedFile) && openFolder(folder)}
                        onDragOver={(e) => { e.preventDefault(); if(draggedNote || draggedFile) setDragOverFolder(folder.id); }}
                        onDragLeave={() => setDragOverFolder(null)}
                        onDrop={(e) => handleFolderDrop(e, folder.id)}
                    >
                        <div className={styles.folderHeader}>
                            <div className={styles.folderLeft}>
                                <Folder size={72} />
                                <span className={styles.folderName}>{folder.name}</span>
                                <span className={styles.folderCount}>({notes.filter(n => n.folder_id === folder.id).length + files.filter(f => f.folder_id === folder.id).length})</span>
                            </div>
                            <button className={styles.btnFolderOptions} onClick={(e) => { e.stopPropagation(); setFolderMenuOpen(folderMenuOpen === folder.id ? null : folder.id); }}>
                                <MoreVertical size={18} />
                            </button>
                        </div>
                        {folderMenuOpen === folder.id && (
                            <div className={styles.folderMenu}>
                                <button onClick={(e) => { e.stopPropagation(); setEditingFolder(folder); setFolderMenuOpen(null); }}>{t('flashcardsView.newName')}</button>
                                <button className={styles.deleteFolderBtn} onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); setFolderMenuOpen(null); }}>{t('filesView.deleteFolder')}</button>
                            </div>
                        )}
                    </div>
                ))}

                {mixedItems.map((item, index) => {
                    const isNote = item.itemType === 'note';
                    const isDragOver = dragOverIndex === index;
                    const isHighlighted = highlightedItemId === item.id;

                    return (
                        <div
                            key={`${item.itemType}-${item.id}`}
                            id={isNote ? `note-card-${item.id}` : `item-card-${item.id}`}
                            className={`${styles.noteCard} ${item.is_pinned ? styles.pinnedCard : ''} ${isDragOver ? styles.dragOver : ''} ${isHighlighted ? styles.highlighted : ''}`}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, item, index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            onClick={() => isNote ? setSelectedNote(item) || setShowNoteEditor(true) : setViewingFile(item.originalFile)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className={styles.noteCardHeader}>
                                <h3 className={styles.noteTitle} title={item.title}>{item.title}</h3>
                                <div className={styles.noteCardActions}>
                                    <button className={`${styles.pinNoteBtn} ${item.is_pinned ? styles.pinned : ''}`} onClick={(e) => isNote ? handleTogglePin(item.id, !item.is_pinned, e) : handleToggleFilePin(item.id, !item.is_pinned, e)}>
                                        <Pin size={16} />
                                    </button>
                                    <button className={styles.deleteNoteBtn} onClick={(e) => { 
                                        e.stopPropagation(); 
                                        isNote ? handleDeleteNote(item.id) : handleDeleteFile(e, item.originalFile) 
                                    }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className={styles.noteContent} style={{ 
                                display: isNote ? 'block' : 'flex',
                                alignItems: isNote ? 'flex-start' : 'center',
                                justifyContent: isNote ? 'flex-start' : 'center',
                                height: '120px',
                                overflow: 'hidden',
                                color: isNote ? 'inherit' : '#bdc3c7',
                                paddingTop: isNote ? '10px' : '0'
                            }}>
                                {isNote ? (
                                    <>
                                        <div style={{
                                            display: '-webkit-box',
                                            WebkitLineClamp: 4,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            fontSize: '0.85rem'
                                        }}>
                                            <ReactMarkdown
                                                children={item.content || ''}
                                                remarkPlugins={[remarkMath]}
                                                rehypePlugins={[rehypeKatex, rehypeRaw]} // <--- TU JEST KLUCZ DO HTML
                                                components={{
                                                    p: ({node, ...props}) => <span {...props} style={{ margin: 0, display: 'inline' }} />,
                                                    div: ({node, ...props}) => <span {...props} />, // Divy zamieniamy na spany
                                                    span: ({node, ...props}) => <span {...props} />,
                                                    h1: ({node, ...props}) => <strong {...props} style={{ display: 'block', margin: '4px 0', fontSize: '1em' }} />,
                                                    h2: ({node, ...props}) => <strong {...props} style={{ display: 'block', margin: '4px 0', fontSize: '1em' }} />,
                                                    h3: ({node, ...props}) => <strong {...props} style={{ display: 'block', margin: '4px 0', fontSize: '1em' }} />,
                                                    ul: ({node, ...props}) => <span {...props} style={{ display: 'block' }} />,
                                                    ol: ({node, ...props}) => <span {...props} style={{ display: 'block' }} />,
                                                    li: ({node, ...props}) => <span {...props} style={{ marginRight: '5px' }}>• </span>,
                                                    strong: ({node, ...props}) => <strong {...props} style={{ fontWeight: 'bold', color: 'var(--purple_brighter)' }} />,
                                                    b: ({node, ...props}) => <strong {...props} style={{ fontWeight: 'bold' }} />,
                                                    em: ({node, ...props}) => <em {...props} style={{ fontStyle: 'italic' }} />,
                                                    i: ({node, ...props}) => <em {...props} style={{ fontStyle: 'italic' }} />,
                                                    img: () => <span style={{color: '#3498db', fontSize: '0.8em'}}>[Obraz]</span>,
                                                    table: () => <span style={{color: '#e67e22', fontSize: '0.8em'}}>[Tabela]</span>,
                                                }}
                                            />
                                        </div>
                                        {!item.content && <span style={{fontStyle:'italic', opacity:0.5}}>{t('filesView.emptyNoteContent')}</span>}
                                    </>
                                ) : (
                                    getFileIcon(item.title, item.type)
                                )}
                            </div>

                            <div className={styles.noteFooter}>
                                <span className={styles.noteDate}>{formatDate(item.created_at)}</span>
                                <span className={styles.noteType} style={{ backgroundColor: getTypeColor(item.type) }}>{item.type}</span>
                            </div>
                        </div>
                    );
                })}

                {mixedItems.length === 0 && folders.length === 0 && (
                    <div className={styles.emptyState}><p>{currentFolder ? t('filesView.emptyFolder') : t('filesView.noFiles')}</p></div>
                )}
            </div>
            
            {viewingFile && <FileViewer file={viewingFile} onClose={() => setViewingFile(null)} />}
            
            {showCreateFolderModal && (
                <div className={generatorStyles.modalOverlay} onClick={() => setShowCreateFolderModal(false)}>
                    <div className={generatorStyles.folderModal} onClick={e => e.stopPropagation()}>
                        <div className={generatorStyles.folderModalHeader}>
                            <h2 className={generatorStyles.folderModalTitle}>{t('flashcardsView.createFolder')}</h2>
                            <button className={generatorStyles.folderModalClose} onClick={() => setShowCreateFolderModal(false)}><X size={20}/></button>
                        </div>
                        <form onSubmit={handleCreateFolder} className={generatorStyles.folderModalForm}>
                            <input type="text" id="folder-name" name="folderName" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder={t('flashcardsView.folderNamePlaceholder')} autoFocus required className={generatorStyles.folderModalInput}/>
                            <div className={generatorStyles.folderModalActions}>
                                <button type="button" className={generatorStyles.folderModalCancel} onClick={() => setShowCreateFolderModal(false)}>{t('flashcardsView.cancel')}</button>
                                <button type="submit" className={generatorStyles.folderModalSubmit}>{t('flashcardsView.createFolder')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {showCollaboratorModal && (
                <div className={generatorStyles.modalOverlay} onClick={() => setShowCollaboratorModal(false)}>
                    <div className={generatorStyles.modalContainer} onClick={e => e.stopPropagation()}>
                        <div className={generatorStyles.header}>
                            <h2 className={generatorStyles.title}>{t('filesView.manageCol')}</h2>
                            <button className={generatorStyles.closeBtn} onClick={() => setShowCollaboratorModal(false)}>
                                <X size={20}/>
                            </button>
                        </div>
                        
                        <div className={styles.collaboratorModalContent}>
                            <form onSubmit={handleAddCollaborator} className={styles.addCollaboratorForm}>
                                <div className={styles.inputWithButton}>
                                    <input 
                                        type="text" 
                                        value={collaboratorUsername} 
                                        onChange={e => setCollaboratorUsername(e.target.value)} 
                                        placeholder={t('filesView.nameCol')} 
                                        className={styles.modalInput}
                                    />
                                    <button type="submit" className={styles.btnAdd}>
                                        <UserPlus size={18}/> {t('filesView.add')}
                                    </button>
                                </div>
                            </form>

                            <div className={styles.collaboratorsSection}>
                                <h3>{t('filesView.col')} ({collaborators.length})</h3>
                                {collaborators.length > 0 ? (
                                    collaborators.map(c => (
                                        <div key={c.id} className={styles.collaboratorItem}>
                                            <div className={styles.collaboratorLeft}>
                                                {c.avatar_url ? (
                                                    <img 
                                                        src={c.avatar_url} 
                                                        alt={c.username} 
                                                        className={styles.collaboratorAvatar} 
                                                    />
                                                ) : (
                                                    <div className={styles.avatarFallback}>
                                                        {c.username.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <span className={styles.collaboratorName}>{c.username}</span>
                                            </div>
                                            <button 
                                                className={styles.btnRemove} 
                                                onClick={() => handleRemoveCollaborator(c.id)}
                                                title={t('filesView.deleteCol')}
                                            >
                                                <X size={16}/>
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className={styles.emptyCollaborators}>
                                        <p>{t('filesView.noCol')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
             {showNoteEditor && selectedNote && (
                <NoteEditor note={selectedNote} isNew={selectedNote.id === null} userData={userData} onClose={() => { setShowNoteEditor(false); setSelectedNote(null); }} onSave={() => refreshNotebook()} onDelete={() => refreshNotebook()} />
            )}
        </div>
    );
}