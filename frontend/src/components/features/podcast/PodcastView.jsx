import { useState, useEffect, useRef } from 'react';
import { Mic, Play, Pause, Trash2, CheckSquare, Square, RefreshCw, Headphones, Folder, ArrowLeft, MoreVertical, Pin, Edit2, X } from 'lucide-react';
import styles from '../../../css/features/PodcastView.module.css'; 

import { 
    fetchPodcasts, generatePodcast, deletePodcast, renamePodcast, pinPodcast, updatePodcastPosition,
    fetchPodcastFolders, createPodcastFolder, deletePodcastFolder, renamePodcastFolder, 
    movePodcastToFolder, updatePodcastFolderPosition, movePodcastFolder
} from '../../../services/podcastService';
import { getNotes } from '../../../services/noteService';

export default function PodcastView({ notebookId, userData }) {
    const [podcasts, setPodcasts] = useState([]);
    const [folders, setFolders] = useState([]);
    const [notes, setNotes] = useState([]);
    
    const [currentFolder, setCurrentFolder] = useState(null);
    const [folderMenuOpen, setFolderMenuOpen] = useState(null);
    const [podcastMenuOpen, setPodcastMenuOpen] = useState(null);
    
    const [selectedNoteIds, setSelectedNoteIds] = useState([]);
    const [topic, setTopic] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showCreator, setShowCreator] = useState(false);
    
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

    useEffect(() => {
        if (notebookId) {
            refreshData();
            loadNotes();
        }
    }, [notebookId]);

    const refreshData = async () => {
        try {
            const [pData, fData] = await Promise.all([
                fetchPodcasts(notebookId),
                fetchPodcastFolders(notebookId, userData?.id)
            ]);
            setPodcasts(pData);
            setFolders(fData);
        } catch (err) {
            console.error("Błąd pobierania danych:", err);
        }
    };

    const loadNotes = async () => {
        try {
            const data = await getNotes(notebookId); 
            setNotes(data);
        } catch (err) {
            console.error("Błąd pobierania notatek:", err);
        }
    };

    const getFilteredAndSortedPodcasts = () => {
        let filtered = podcasts;

        if (currentFolder) {
            filtered = filtered.filter(p => p.folder_id === currentFolder.id);
        } else {
            filtered = filtered.filter(p => !p.folder_id);
        }

        filtered = [...filtered].sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;

            if (a.is_pinned && b.is_pinned) {
                if (a.grid_position !== null && b.grid_position !== null) return a.grid_position - b.grid_position;
            }
            if (!a.is_pinned && !b.is_pinned) {
                if (a.grid_position !== null && b.grid_position !== null) return a.grid_position - b.grid_position;
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
                    audioRef.current.play().catch(e => console.error("Playback failed", e));
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

    const handleGenerate = async () => {
        if (!topic) {
            alert("Wpisz temat podcastu.");
            return;
        }
        setIsGenerating(true);
        try {
            await generatePodcast(notebookId, userData.id, topic, selectedNoteIds, currentFolder?.id);
            setTopic('');
            setSelectedNoteIds([]);
            setShowCreator(false);
            refreshData();
        } catch (err) {
            alert("Błąd generowania: " + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDelete = async (id) => {
        if(!window.confirm("Usunąć podcast?")) return;
        try {
            await deletePodcast(id);
            const p = podcasts.find(x => x.id === id);
            if(p && p.file_url === currentAudio) {
                audioRef.current.pause();
                setCurrentAudio(null);
                setIsPlaying(false);
            }
            refreshData();
        } catch(err) {
            alert("Błąd usuwania.");
        }
    };

    const handlePin = async (id, currentStatus, e) => {
        e.stopPropagation();
        try {
            await pinPodcast(id, !currentStatus);
            refreshData();
        } catch(err) { console.error(err); }
    };

    const handleRenamePodcastSubmit = async (e) => {
        e.preventDefault();
        if(!editingPodcast || !editingPodcast.title.trim()) return;
        try {
            await renamePodcast(editingPodcast.id, editingPodcast.title);
            setEditingPodcast(null);
            refreshData();
        } catch(err) { alert("Błąd zmiany nazwy"); }
    };

    const handleCreateFolder = async (e) => {
        e.preventDefault();
        if(!newFolderName.trim()) return;
        try {
            await createPodcastFolder(notebookId, userData.id, newFolderName, currentFolder?.id);
            setNewFolderName('');
            setShowCreateFolderModal(false);
            refreshData();
        } catch(err) { alert("Błąd tworzenia folderu"); }
    };

    const handleDeleteFolder = async (id) => {
        if(!window.confirm("Usunąć folder? Podcasty wrócą do widoku głównego.")) return;
        try {
            await deletePodcastFolder(id);
            refreshData();
        } catch(err) { alert("Błąd usuwania folderu"); }
    };

    const handleRenameFolderSubmit = async (e) => {
        e.preventDefault();
        try {
            await renamePodcastFolder(editingFolder.id, editingFolder.name);
            setEditingFolder(null);
            refreshData();
        } catch(err) { alert("Błąd zmiany nazwy"); }
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
        } catch(err) { refreshData(); }
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
            } catch(err) { console.error(err); }
        }
        if(draggedFolder) {
             if(draggedFolder.folder.id === folderId) return;
             try {
                 await movePodcastFolder(draggedFolder.folder.id, folderId);
                 setDraggedFolder(null);
                 refreshData();
             } catch(err) { console.error(err); }
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerMain}>
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
                                <Folder size={24} style={{color: '#6c63ff'}}/> {currentFolder.name}
                            </h2>
                        </>
                    ) : (
                        <h2 className={styles.title}>Biblioteka Podcastów</h2>
                    )}
                    
                    <div className={styles.actions}>
                        <button className={styles.secondaryBtn} onClick={() => setShowCreateFolderModal(true)}>
                            <Folder size={18}/> Nowy folder
                        </button>
                        <button className={styles.createBtn} onClick={() => setShowCreator(!showCreator)}>
                            {showCreator ? "Anuluj" : "+ Generuj Podcast"}
                        </button>
                    </div>
                </div>
            </div>

            {showCreator && (
                <div className={styles.creatorCard}>
                    <h3>Nowy Podcast</h3>
                    <input 
                        type="text" placeholder="O czym ma być podcast? Jeżeli wybierasz z notatki, to podaj tylko tytuł podcastu." 
                        value={topic} onChange={(e) => setTopic(e.target.value)}
                        className={styles.input}
                    />
                    <div className={styles.notesList}>
                        {notes.length === 0 ? <p className={styles.emptyNote}>Brak notatek.</p> : notes.map(note => (
                            <div key={note.id} className={`${styles.noteItem} ${selectedNoteIds.includes(note.id) ? styles.selected : ''}`} onClick={() => setSelectedNoteIds(prev => prev.includes(note.id) ? prev.filter(n => n !== note.id) : [...prev, note.id])}>
                                {selectedNoteIds.includes(note.id) ? <CheckSquare size={16}/> : <Square size={16}/>} <span>{note.title}</span>
                            </div>
                        ))}
                    </div>
                    <button className={styles.generateBtn} onClick={handleGenerate} disabled={isGenerating}>
                        {isGenerating ? <><RefreshCw className={styles.spin} size={18}/> Generowanie...</> : <><Mic size={18}/> Generuj Audio</>}
                    </button>
                </div>
            )}

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
                        <button className={styles.optionsBtn} onClick={(e) => { e.stopPropagation(); setFolderMenuOpen(folderMenuOpen === folder.id ? null : folder.id); }}>
                            <MoreVertical size={18}/>
                        </button>
                        {folderMenuOpen === folder.id && (
                            <div className={styles.contextMenu}>
                                <button onClick={(e) => { e.stopPropagation(); setEditingFolder(folder); setFolderMenuOpen(null); }}>Zmień nazwę</button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); setFolderMenuOpen(null); }} className={styles.deleteOption}>Usuń</button>
                            </div>
                        )}
                    </div>
                ))}

                {getFilteredAndSortedPodcasts().map((podcast, index) => {
                    const isActive = currentAudio === podcast.file_url;
                    const isDragOver = dragOverIndex === index;

                    return (
                        <div 
                            key={podcast.id} 
                            className={`${styles.podcastCard} ${isActive ? styles.activeCard : ''} ${podcast.is_pinned ? styles.pinnedCard : ''} ${isDragOver ? styles.dragOver : ''}`}
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
                                        <button onClick={(e) => { e.stopPropagation(); setEditingPodcast(podcast); setPodcastMenuOpen(null); }}>Zmień nazwę</button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(podcast.id); setPodcastMenuOpen(null); }} className={styles.deleteOption}>Usuń</button>
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

                {getFilteredAndSortedPodcasts().length === 0 && folders.length === 0 && !isGenerating && (
                    <div className={styles.emptyState}>
                         <Headphones size={48} opacity={0.3}/>
                         <p>Brak podcastów w tym folderze.</p>
                    </div>
                )}
            </div>

            <audio ref={audioRef} src={currentAudio} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={() => setIsPlaying(false)} />

            {showCreateFolderModal && (
                <div className={styles.modalOverlay} onClick={() => setShowCreateFolderModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h3>Nowy folder</h3>
                        <input autoFocus type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Nazwa folderu" className={styles.input}/>
                        <div className={styles.modalActions}>
                            <button onClick={() => setShowCreateFolderModal(false)}>Anuluj</button>
                            <button onClick={handleCreateFolder} className={styles.primaryBtn}>Utwórz</button>
                        </div>
                    </div>
                </div>
            )}
             
            {(editingFolder || editingPodcast) && (
                <div className={styles.modalOverlay} onClick={() => { setEditingFolder(null); setEditingPodcast(null); }}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h3>Zmień nazwę</h3>
                        <form onSubmit={editingFolder ? handleRenameFolderSubmit : handleRenamePodcastSubmit}>
                            <input 
                                autoFocus 
                                type="text" 
                                value={editingFolder ? editingFolder.name : editingPodcast.title} 
                                onChange={e => editingFolder ? setEditingFolder({...editingFolder, name: e.target.value}) : setEditingPodcast({...editingPodcast, title: e.target.value})} 
                                className={styles.input}
                            />
                            <div className={styles.modalActions}>
                                <button type="button" onClick={() => { setEditingFolder(null); setEditingPodcast(null); }}>Anuluj</button>
                                <button type="submit" className={styles.primaryBtn}>Zapisz</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}