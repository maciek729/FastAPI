import { useState, useEffect, useRef } from 'react';
import { Mic, Play, Pause, Trash2, CheckSquare, Square, RefreshCw, Headphones } from 'lucide-react';
import styles from '../../../css/features/PodcastView.module.css'; 

import { fetchPodcasts as fetchPodcasts, generatePodcast, deletePodcast } from '../../../services/podcastService';
import { getNotes } from '../../../services/noteService';

export default function PodcastView({ notebookId, userData }) {
    const [podcasts, setPodcasts] = useState([]);
    const [notes, setNotes] = useState([]);
    const [selectedNoteIds, setSelectedNoteIds] = useState([]);
    const [topic, setTopic] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showCreator, setShowCreator] = useState(false);
    
    const [currentAudio, setCurrentAudio] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(null);

    useEffect(() => {
        if (notebookId) {
            loadPodcasts();
            loadNotes();
        }
    }, [notebookId]);

    const loadPodcasts = async () => {
        try {
            const data = await fetchPodcasts(notebookId);
            setPodcasts(data);
        } catch (err) {
            console.error("Błąd pobierania podcastów:", err);
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

    const handleGenerate = async () => {
        if (!topic) {
            alert("Wpisz temat podcastu.");
            return;
        }

        setIsGenerating(true);
        try {
            // note_ids są teraz opcjonalne (mogą być puste)
            await generatePodcast(notebookId, userData.id, topic, selectedNoteIds);
            
            setTopic('');
            setSelectedNoteIds([]);
            setShowCreator(false);
            loadPodcasts();
        } catch (err) {
            console.error(err);
            alert("Błąd generowania podcastu: " + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const toggleNoteSelection = (id) => {
        setSelectedNoteIds(prev => 
            prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]
        );
    };

    const playPodcast = (url) => {
        if (currentAudio === url) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.play();
                setIsPlaying(true);
            }
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            setCurrentAudio(url);
            setIsPlaying(true);
            setTimeout(() => {
                if(audioRef.current) {
                    audioRef.current.load();
                    audioRef.current.play();
                }
            }, 100);
        }
    };

    const handleDelete = async (id) => {
        if(!window.confirm("Usunąć podcast?")) return;
        try {
            await deletePodcast(id);
            loadPodcasts();
        } catch(err) {
            console.error(err);
            alert("Nie udało się usunąć podcastu.");
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>Biblioteka Podcastów</h2>
                <button 
                    className={styles.createBtn} 
                    onClick={() => setShowCreator(!showCreator)}
                >
                    {showCreator ? "Anuluj" : "+ Generuj Podcast"}
                </button>
            </div>

            {showCreator && (
                <div className={styles.creatorCard}>
                    <h3>Nowy Podcast</h3>
                    <input 
                        type="text" 
                        placeholder="O czym ma być podcast? (np. Podsumowanie działu z Historii)" 
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className={styles.input}
                    />
                    
                    <p className={styles.label}>Wybierz materiały źródłowe (opcjonalne):</p>
                    <div className={styles.notesList}>
                        {notes.length === 0 ? (
                            <p style={{color: '#888', fontStyle: 'italic', fontSize: '0.9rem'}}>Brak notatek w tym notatniku.</p>
                        ) : (
                            notes.map(note => (
                                <div 
                                    key={note.id} 
                                    className={`${styles.noteItem} ${selectedNoteIds.includes(note.id) ? styles.selected : ''}`}
                                    onClick={() => toggleNoteSelection(note.id)}
                                >
                                    {selectedNoteIds.includes(note.id) ? <CheckSquare size={16}/> : <Square size={16}/>}
                                    <span>{note.title}</span>
                                </div>
                            ))
                        )}
                    </div>

                    <button 
                        className={styles.generateBtn} 
                        onClick={handleGenerate} 
                        disabled={isGenerating}
                    >
                        {isGenerating ? (
                            <><RefreshCw className={styles.spin} size={18}/> Generowanie...</>
                        ) : (
                            <><Mic size={18}/> Generuj Audio</>
                        )}
                    </button>
                </div>
            )}

            <div className={styles.podcastList}>
                {podcasts.length === 0 && !isGenerating && (
                    <div className={styles.emptyState}>
                        <Headphones size={48} opacity={0.3}/>
                        <p>Brak podcastów. Wygeneruj pierwszy!</p>
                    </div>
                )}

                {podcasts.map(podcast => (
                    <div key={podcast.id} className={styles.podcastCard}>
                        <div className={styles.playIcon} onClick={() => playPodcast(podcast.file_url)}>
                            {currentAudio === podcast.file_url && isPlaying ? (
                                <Pause size={24} fill="white" />
                            ) : (
                                <Play size={24} fill="white" />
                            )}
                        </div>
                        <div className={styles.podcastInfo}>
                            <h4>{podcast.title}</h4>
                            <span className={styles.date}>{new Date(podcast.created_at).toLocaleDateString()}</span>
                        </div>
                        <button className={styles.deleteBtn} onClick={() => handleDelete(podcast.id)}>
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}
            </div>

            <audio ref={audioRef} src={currentAudio} onEnded={() => setIsPlaying(false)} />
        </div>
    );
}