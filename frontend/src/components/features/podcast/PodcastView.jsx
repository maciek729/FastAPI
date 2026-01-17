import { useState, useEffect, useRef, useContext } from 'react';
import toast from 'react-hot-toast';
import { confirmModal } from '../../../utils/confirmModal';
import { Play, Pause, Trash2, Folder, ArrowLeft, MoreVertical, Pin, X, Search, Plus, Filter } from 'lucide-react';
import styles from '../../../css/features/PodcastView.module.css';
import generatorStyles from '../../../css/features/FlashcardGenerator.module.css';

import {
    fetchPodcasts, generatePodcast, deletePodcast, renamePodcast, pinPodcast, updatePodcastPosition,
    fetchPodcastFolders, createPodcastFolder, deletePodcastFolder, renamePodcastFolder,
    movePodcastToFolder, updatePodcastFolderPosition, movePodcastFolder
} from '../../../services/podcastService';
import { getNotes } from '../../../services/noteService';
import PodcastGenerator from './PodcastGenerator';
import { LanguageContext } from '../../../translations/LanguageContext';
import translations from '../../../translations/translation.json';

export default function PodcastView({ notebookId, userData, highlightedItemId }) {
    const { language } = useContext(LanguageContext);
    const [podcasts, setPodcasts] = useState([]);
    const [folders, setFolders] = useState([]);
    const [notes, setNotes] = useState([]);

    const t = (key) => {
        const keys = key.split('.');
        let translation = translations[language];
        for (const k of keys) {
            translation = translation?.[k];
            if (!translation) return key;
        }
        return translation || key;
    };
    
    const [currentFolder, setCurrentFolder] = useState(null);
    const [folderMenuOpen, setFolderMenuOpen] = useState(null);
    const [podcastMenuOpen, setPodcastMenuOpen] = useState(null);

    const [showGenerateModal, setShowGenerateModal] = useState(false);
    
    const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [editingFolder, setEditingFolder] = useState(null);
    const [editingPodcast, setEditingPodcast] = useState(null);

    const [currentAudio, setCurrentAudio] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef(null);

    const [draggedPodcast, setDraggedPodcast] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [dragNotAllowedIndex, setDragNotAllowedIndex] = useState(null);
    
    const [draggedFolder, setDraggedFolder] = useState(null);
    const [dragOverFolder, setDragOverFolder] = useState(null);
    const [dragOverFolderIndex, setDragOverFolderIndex] = useState(null);
    const [dragOverBreadcrumb, setDragOverBreadcrumb] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('date_desc');
    const [showFilters, setShowFilters] = useState(window.innerWidth > 768);
    const [isGenerating, setIsGenerating] = useState(false);

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
        if (notebookId) {
            refreshData();
            loadNotes();
        }
    }, [notebookId]);

    useEffect(() => {
        if (highlightedItemId && podcasts.length > 0) {
            const targetPodcast = podcasts.find(p => p.id === highlightedItemId);
            if (targetPodcast && targetPodcast.folder_id) {
                const folderToOpen = folders.find(f => f.id === targetPodcast.folder_id);
                if (folderToOpen) {
                    setCurrentFolder(folderToOpen);
                }
            } else if (targetPodcast && !targetPodcast.folder_id) {
                setCurrentFolder(null);
            }

            // Scroll do elementu
            const timer = setTimeout(() => {
                const element = document.getElementById(`podcast-card-${highlightedItemId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [highlightedItemId, podcasts, folders]);

    const refreshData = async () => {
        try {
            const [pData, fData] = await Promise.all([
                fetchPodcasts(notebookId),
                fetchPodcastFolders(notebookId, userData?.id)
            ]);
            setPodcasts(pData);
            setFolders(fData);
        } catch (err) {
        }
    };

    const loadNotes = async () => {
        try {
            const data = await getNotes(notebookId); 
            setNotes(data);
        } catch (err) {
        }
    };

    const getFilteredAndSortedPodcasts = () => {
        let filtered = podcasts;

        if (currentFolder) {
            filtered = filtered.filter(p => p.folder_id === currentFolder.id);
        } else {
            filtered = filtered.filter(p => !p.folder_id);
        }
        if (searchQuery) {
            filtered = filtered.filter(p =>
                p.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        filtered = [...filtered].sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;

            if (a.is_pinned && b.is_pinned) {
                if (a.grid_position !== null && b.grid_position !== null) return a.grid_position - b.grid_position;
            }

            if (!a.is_pinned && !b.is_pinned) {
                if (sortBy === 'custom') {
                    if (a.grid_position !== null && b.grid_position !== null) {
                        return a.grid_position - b.grid_position;
                    }
                } else if (sortBy === 'date_desc') {
                    return new Date(b.created_at) - new Date(a.created_at);
                } else if (sortBy === 'date_asc') {
                    return new Date(a.created_at) - new Date(b.created_at);
                } else if (sortBy === 'name_asc') {
                    return a.title.localeCompare(b.title);
                } else if (sortBy === 'name_desc') {
                    return b.title.localeCompare(a.title);
                }
            }

            return new Date(b.created_at) - new Date(a.created_at);
        });

        return filtered;
    };

    const playPodcast = (url, e) => {
        if(e) e.stopPropagation();
        
        if (currentAudio === url) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.play();
                setIsPlaying(true);
            }
        } else {
            if (audioRef.current) audioRef.current.pause();
            setCurrentAudio(url);
            setIsPlaying(true);
            setCurrentTime(0);
            setTimeout(() => {
                if(audioRef.current) {
                    audioRef.current.load();
                    audioRef.current.play().catch(e => {});
                }
            }, 100);
        }
    };
    
    const handleTimeUpdate = () => audioRef.current && setCurrentTime(audioRef.current.currentTime);
    const handleLoadedMetadata = () => audioRef.current && setDuration(audioRef.current.duration);
    const handleSeek = (e) => {
        const time = parseFloat(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };
    const formatTime = (time) => {
        if (!time && time !== 0) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };


    const handleDelete = async (id) => {
        const confirmed = await confirmModal(t('podcastView.deleteConfirm'));
        if(!confirmed) return;
        try {
            await deletePodcast(id);
            const p = podcasts.find(x => x.id === id);
            if(p && p.file_url === currentAudio) {
                audioRef.current.pause();
                setCurrentAudio(null);
                setIsPlaying(false);
            }
            toast.success(t('podcastView.deleteSuccess'));
            refreshData();
        } catch(err) {
            toast.error(t('podcastView.deleteError'));
        }
    };

    const handlePin = async (id, currentStatus, e) => {
        e.stopPropagation();
        try {
            await pinPodcast(id, !currentStatus);
            refreshData();
        } catch(err) { }
    };

    const handleRenamePodcastSubmit = async (e) => {
        e.preventDefault();
        if(!editingPodcast || !editingPodcast.title.trim()) return;
        try {
            await renamePodcast(editingPodcast.id, editingPodcast.title);
            setEditingPodcast(null);
            toast.success(t('podcastView.changeName'));
            refreshData();
        } catch(err) { toast.error(t('podcastView.changeNameError')); }
    };

    const handleCreateFolder = async (e) => {
        e.preventDefault();
        if(!newFolderName.trim()) return;
        try {
            await createPodcastFolder(notebookId, userData.id, newFolderName, currentFolder?.id);
            setNewFolderName('');
            setShowCreateFolderModal(false);
            toast.success(t('podcastView.folderSuccess'));
            refreshData();
        } catch(err) { toast.error(t('flashcardsView.createFolderError')); }
    };

    const handleDeleteFolder = async (id) => {
        const confirmed = await confirmModal(t('podcastView.deleteFolderConfirm'));
        if(!confirmed) return;
        try {
            await deletePodcastFolder(id);
            toast.success(t('flashcardsView.deleteFolderSuccess'));
            refreshData();
        } catch(err) { toast.error(t('flashcardsView.deleteFolderError')); }
    };

    const handleRenameFolderSubmit = async (e) => {
        e.preventDefault();
        try {
            await renamePodcastFolder(editingFolder.id, editingFolder.name);
            setEditingFolder(null);
            toast.success(t('flashcasrdsView.renameFolderSuccess'));
            refreshData();
        } catch(err) { toast.error(t('flashcasrdsView.renameFolderError')); }
    };

    const openFolder = (folder) => setCurrentFolder(folder);
    const closeFolder = () => {
        if (currentFolder?.parent_folder_id) {
            const parent = folders.find(f => f.id === currentFolder.parent_folder_id);
            setCurrentFolder(parent);
        } else {
            setCurrentFolder(null);
        }
    };

    const handleDragStart = (e, podcast, index) => {
        setDraggedPodcast({ podcast, index });
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.style.opacity = '0.5';

        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'podcast',
            podcastId: podcast.id,
            userId: userData.id,
            sourceNotebookId: notebookId
        }));
    };

    const handleDragEnd = (e) => {
        e.currentTarget.style.opacity = '1';
        setDraggedPodcast(null);
        setDragOverIndex(null);
        setDragNotAllowedIndex(null);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        const filtered = getFilteredAndSortedPodcasts();
        const target = filtered[index];
        if(draggedPodcast && target) {
            if(draggedPodcast.podcast.is_pinned === target.is_pinned) {
                e.dataTransfer.dropEffect = 'move';
                setDragOverIndex(index);
                setDragNotAllowedIndex(null);
            } else {
                e.dataTransfer.dropEffect = 'none';
                setDragOverIndex(null);
                setDragNotAllowedIndex(index);
            }
        }
    };

    const handleDrop = async (e, dropIndex) => {
        e.preventDefault();
        setDragNotAllowedIndex(null);
        if (!draggedPodcast || draggedPodcast.index === dropIndex) {
            setDragOverIndex(null); return;
        }

        const filtered = getFilteredAndSortedPodcasts();
        const newPodcasts = [...filtered];
        const [removed] = newPodcasts.splice(draggedPodcast.index, 1);
        newPodcasts.splice(dropIndex, 0, removed);

        const updated = newPodcasts.map((p, idx) => ({...p, grid_position: idx}));
        setPodcasts(prev => {
            const all = [...prev];
            updated.forEach(u => {
                const idx = all.findIndex(x => x.id === u.id);
                if(idx !== -1) all[idx] = u;
            });
            return all;
        });

        try {
            await Promise.all(updated.map(p => updatePodcastPosition(p.id, p.grid_position)));
        } catch(err) {
            toast.error(t('podcastView.positionError'));
            refreshData();
        }
        setDragOverIndex(null);
    };

    const handleFolderDragOver = (e, folderId) => {
        e.preventDefault(); e.stopPropagation();
        setDragOverFolder(folderId);
    };
    
    const handleFolderDrop = async (e, folderId) => {
        e.preventDefault(); e.stopPropagation();
        setDragOverFolder(null);
        
        if(draggedPodcast) {
            try {
                await movePodcastToFolder(draggedPodcast.podcast.id, folderId);
                setDraggedPodcast(null);
                refreshData();
            } catch(err) { }
        }
        if(draggedFolder) {
             if(draggedFolder.folder.id === folderId) return;
             try {
                 await movePodcastFolder(draggedFolder.folder.id, folderId);
                 setDraggedFolder(null);
                 refreshData();
             } catch(err) { }
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.headerSection}>
                <div className={styles.leftSection}>
                    {currentFolder ? (
                        <>
                            <button onClick={closeFolder} className={styles.backBtn}>
                                <ArrowLeft size={20} /> Powrót
                            </button>
                            <h2
                                className={`${styles.title} ${dragOverBreadcrumb ? styles.dragOverBreadcrumb : ''}`}
                                onDragOver={(e) => { e.preventDefault(); setDragOverBreadcrumb(true); }}
                                onDragLeave={() => setDragOverBreadcrumb(false)}
                                onDrop={async (e) => {
                                    e.preventDefault(); setDragOverBreadcrumb(false);
                                    const parentId = currentFolder.parent_folder_id || null;
                                    if(draggedPodcast) await movePodcastToFolder(draggedPodcast.podcast.id, parentId);
                                    if(draggedFolder) await movePodcastFolder(draggedFolder.folder.id, parentId);
                                    refreshData();
                                }}
                            >
                                <Folder size={24} color="#f59e0b" stroke="#f59e0b"/> {currentFolder.name}
                            </h2>
                        </>
                    ) : (
                        <h2 className={styles.title}>{t('group_chat.Podcasts')}</h2>
                    )}
                    <div className={styles.searchBox}>
                        <Search size={16} />
                        <input
                            type="text"
                            id="podcasts-search"
                            name="search"
                            placeholder={t('podcastView.podcastPH')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>
                    <select
                        id="podcasts-sort"
                        name="sortBy"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="date_desc">{t('flashcardsView.sortNewest')}</option>
                        <option value="date_asc">{t('flashcardsView.sortOldest')}</option>
                        <option value="name_asc">{t('flashcardsView.sortNameAsc')}</option>
                        <option value="name_desc">{t('flashcardsView.sortNameDesc')}</option>
                    </select>
                </div>
                {showFilters && (
                    <div className={styles.filtersRow}>
                        <div className={styles.searchBox}>
                            <Search size={16} />
                            <input
                                type="text"
                                id="podcasts-search-mobile"
                                name="search"
                                placeholder={t('podcastView.podcastPH')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={styles.searchInput}
                            />
                        </div>
                        <select
                            id="podcasts-sort-mobile"
                            name="sortBy"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className={styles.filterSelect}
                        >
                            <option value="date_desc">{t('flashcardsView.sortNewest')}</option>
                            <option value="date_asc">{t('flashcardsView.sortOldest')}</option>
                            <option value="name_asc">{t('flashcardsView.sortNameAsc')}</option>
                            <option value="name_desc">{t('flashcardsView.sortNameDesc')}</option>
                        </select>
                    </div>
                )}
                <div className={styles.headerActions}>
                    <button
                        className={styles.filterToggleBtn}
                        onClick={() => setShowFilters(!showFilters)}
                        title={t('flashcardsView.filters')}
                    >
                        <Filter size={18} />
                    </button>
                    <button className={styles.secondaryBtn} onClick={() => setShowCreateFolderModal(true)}>
                        <Folder size={18} color="#f59e0b"/> {t('flashcardsView.newFolder')}
                    </button>
                    <button className={styles.createBtn} onClick={() => setShowGenerateModal(true)}>
                        <Plus size={18} />
                        {t('podcastGenerator.generate')}
                    </button>
                </div>
            </div>

            <div className={styles.podcastList}>
                
                {folders.filter(f => currentFolder ? f.parent_folder_id === currentFolder.id : !f.parent_folder_id).map((folder, index) => (
                    <div
                        key={folder.id}
                        className={`${styles.folderCard} ${dragOverFolder === folder.id ? styles.folderDragOver : ''}`}
                        draggable
                        onDragStart={(e) => { setDraggedFolder({folder, index}); e.dataTransfer.effectAllowed = 'move'; }}
                        onDragEnd={() => setDraggedFolder(null)}
                        onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                        onDragLeave={() => setDragOverFolder(null)}
                        onDrop={(e) => handleFolderDrop(e, folder.id)}
                        onClick={() => openFolder(folder)}
                    >
                        <div className={styles.folderContent}>
                            <Folder size={64} className={styles.folderIcon}/>
                            <span className={styles.folderName}>{folder.name}</span>
                        </div>
                        <button className={styles.btnFolderOptions} onClick={(e) => { e.stopPropagation(); setFolderMenuOpen(folderMenuOpen === folder.id ? null : folder.id); }}>
                            <MoreVertical size={18}/>
                        </button>
                        {folderMenuOpen === folder.id && (
                            <div className={styles.folderMenu}>
                                <button onClick={(e) => { e.stopPropagation(); setEditingFolder(folder); setFolderMenuOpen(null); }}>{t('flashcardsView.newName')}</button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); setFolderMenuOpen(null); }} className={styles.deleteOption}>{t('flashcardSetManager.delete')}</button>
                            </div>
                        )}
                    </div>
                ))}

                {/* Skeleton card while generating */}
                {isGenerating && (
                    <div className={`${styles.podcastCard} ${styles.skeletonCard}`}>
                        <div className={styles.podcastCardHeader}>
                            <div className={`${styles.skeleton} ${styles.skeletonTitle}`}></div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <div className={`${styles.skeleton} ${styles.skeletonButton}`}></div>
                                <div className={`${styles.skeleton} ${styles.skeletonButton}`}></div>
                            </div>
                        </div>
                        <div className={styles.podcastStats}>
                            <div className={`${styles.skeleton} ${styles.skeletonStat}`}></div>
                            <div className={`${styles.skeleton} ${styles.skeletonStat}`}></div>
                        </div>
                        <div className={styles.generatingText}>
                            <div className={styles.spinner}></div>
                            <span>{t('podcastGenerator.generatingPodcast')}</span>
                        </div>
                    </div>
                )}

                {getFilteredAndSortedPodcasts().map((podcast, index) => {
                    const isActive = currentAudio === podcast.file_url;
                    const isDragOver = dragOverIndex === index;
                    const isHighlighted = highlightedItemId === podcast.id;

                    return (
                        <div
                            key={podcast.id}
                            id={`podcast-card-${podcast.id}`}
                            className={`${styles.podcastCard} ${isActive ? styles.activeCard : ''} ${podcast.is_pinned ? styles.pinnedCard : ''} ${isDragOver ? styles.dragOver : ''} ${isHighlighted ? styles.highlighted : ''}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, podcast, index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                        >
                            <div className={styles.cardHeader}>
                                <div className={styles.playIcon} onClick={(e) => playPodcast(podcast.file_url, e)}>
                                    {isActive && isPlaying ? <Pause size={20} fill="white"/> : <Play size={20} fill="white"/>}
                                </div>
                                <div className={styles.podcastInfo}>
                                    <h4>{podcast.title}</h4>
                                    <span className={styles.date}>{new Date(podcast.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className={styles.cardActions}>
                                     <button className={`${styles.pinBtn} ${podcast.is_pinned ? styles.pinned : ''}`} onClick={(e) => handlePin(podcast.id, podcast.is_pinned, e)}>
                                        <Pin size={16}/>
                                    </button>
                                    <button className={styles.optionsBtn} onClick={(e) => { e.stopPropagation(); setPodcastMenuOpen(podcastMenuOpen === podcast.id ? null : podcast.id); }}>
                                        <MoreVertical size={16}/>
                                    </button>
                                </div>
                                {podcastMenuOpen === podcast.id && (
                                    <div className={styles.contextMenu}>
                                        <button onClick={(e) => { e.stopPropagation(); setEditingPodcast(podcast); setPodcastMenuOpen(null); }}>{t('flashcardsView.newName')}</button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(podcast.id); setPodcastMenuOpen(null); }} className={styles.deleteOption}>{t('flashcardSetManager.delete')}</button>
                                    </div>
                                )}
                            </div>

                            {isActive && (
                                <div className={styles.playerControls} onClick={e => e.stopPropagation()}>
                                    <div className={styles.timeInfo}>
                                        <span>{formatTime(currentTime)}</span>
                                        <span>{formatTime(duration)}</span>
                                    </div>
                                    <input type="range" min="0" max={duration || 0} value={currentTime} onChange={handleSeek} className={styles.progressBar} />
                                </div>
                            )}
                        </div>
                    );
                })}

                {getFilteredAndSortedPodcasts().length === 0 && folders.length === 0 && (
                    <div className={styles.emptyState}>
                         <p>{t('podcastView.emptyFolder')}</p>
                    </div>
                )}
            </div>

            <audio ref={audioRef} src={currentAudio} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={() => setIsPlaying(false)} />

            {showCreateFolderModal && (
                <div className={generatorStyles.modalOverlay} onClick={() => setShowCreateFolderModal(false)}>
                    <div className={generatorStyles.folderModal} onClick={e => e.stopPropagation()}>
                        <div className={generatorStyles.folderModalHeader}>
                            <h2 className={generatorStyles.folderModalTitle}>{t('flashcardsView.createFolder')}</h2>
                            <button
                                className={generatorStyles.folderModalClose}
                                onClick={() => setShowCreateFolderModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateFolder} className={generatorStyles.folderModalForm}>
                            <input
                                type="text"
                                id="podcasts-folder-name"
                                name="folderName"
                                className={generatorStyles.folderModalInput}
                                value={newFolderName}
                                onChange={e => setNewFolderName(e.target.value)}
                                placeholder={t('flashcardsView.folderNamePlaceholder')}
                                autoFocus
                                required
                            />
                            <div className={generatorStyles.folderModalActions}>
                                <button type="button" className={generatorStyles.folderModalCancel} onClick={() => setShowCreateFolderModal(false)}>{t('flashcardsView.cancel')}</button>
                                <button type="submit" className={generatorStyles.folderModalSubmit}>{t('flashcardsView.createFolder')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
             
            {editingFolder && (
                <div className={generatorStyles.modalOverlay} onClick={() => setEditingFolder(null)}>
                    <div className={generatorStyles.folderModal} onClick={e => e.stopPropagation()}>
                        <div className={generatorStyles.folderModalHeader}>
                            <h2 className={generatorStyles.folderModalTitle}>{t('flashcardsView.renameFolderName')}</h2>
                            <button
                                className={generatorStyles.folderModalClose}
                                onClick={() => setEditingFolder(null)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleRenameFolderSubmit} className={generatorStyles.folderModalForm}>
                            <input
                                type="text"
                                id="podcasts-rename-folder"
                                name="folderName"
                                className={generatorStyles.folderModalInput}
                                value={editingFolder.name}
                                onChange={e => setEditingFolder({...editingFolder, name: e.target.value})}
                                placeholder={t('flashcardsView.folderNamePlaceholder')}
                                autoFocus
                                required
                            />
                            <div className={generatorStyles.folderModalActions}>
                                <button type="button" className={generatorStyles.folderModalCancel} onClick={() => setEditingFolder(null)}>{t('flashcardsView.cancel')}</button>
                                <button type="submit" className={generatorStyles.folderModalSubmit}>{t('flashcardsView.newName')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {editingPodcast && (
                <div className={styles.modalOverlay} onClick={() => setEditingPodcast(null)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>{t('flashcardsView.newName')}</h2>
                            <button
                                className={styles.closeBtn}
                                onClick={() => setEditingPodcast(null)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleRenamePodcastSubmit} style={{padding: '2rem'}}>
                            <div className={styles.formGroup}>
                                <label>{t('podcastView.name')}</label>
                                <input
                                    autoFocus
                                    type="text"
                                    id="podcast-rename"
                                    name="podcastTitle"
                                    value={editingPodcast.title}
                                    onChange={e => setEditingPodcast({...editingPodcast, title: e.target.value})}
                                    required
                                />
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.btnCancel} onClick={() => setEditingPodcast(null)}>{t('flashcardsView.cancel')}</button>
                                <button type="submit" className={styles.btnSubmit}>{t('noteEditor.saveButton')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <PodcastGenerator
                show={showGenerateModal}
                onClose={() => setShowGenerateModal(false)}
                onSuccess={() => {
                    setIsGenerating(false);
                    refreshData();
                }}
                onStartGenerating={() => {
                    setShowGenerateModal(false);
                    setIsGenerating(true);
                }}
                onError={() => {
                    setIsGenerating(false);
                }}
                notebookId={notebookId}
                userData={userData}
                notes={notes}
            />
        </div>
    );
}