import { useState, useEffect } from "react";
import axios from "axios";
import { ArrowLeft, Edit2, Trash2, GripVertical, Plus, X, Check } from "lucide-react";
import styles from "../../../css/features/FlashcardSetManager.module.css";

export default function FlashcardSetManager({ flashcardSet, userId, onBack }) {
    const [flashcards, setFlashcards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingCard, setEditingCard] = useState(null);
    const [editingSet, setEditingSet] = useState(false);
    const [setTitle, setSetTitle] = useState(flashcardSet.title);
    const [setDescription, setSetDescription] = useState(flashcardSet.description || "");
    const [draggedCard, setDraggedCard] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [showAddCard, setShowAddCard] = useState(false);
    const [newQuestion, setNewQuestion] = useState("");
    const [newAnswer, setNewAnswer] = useState("");
    const [editQuestion, setEditQuestion] = useState("");
    const [editAnswer, setEditAnswer] = useState("");

    useEffect(() => {
        fetchFlashcards();
    }, [flashcardSet.id]);

    const fetchFlashcards = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`http://localhost:8000/flashcards/set/${flashcardSet.id}/cards`);
            setFlashcards(response.data);
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSet = async () => {
        try {
            await axios.put(`http://localhost:8000/flashcards/set/${flashcardSet.id}`, {
                title: setTitle,
                description: setDescription
            });

            alert("Zestaw zaktualizowany!");
            setEditingSet(false);
            onBack();
        } catch (error) {
            alert(`Błąd podczas aktualizacji zestawu: ${error.response?.data?.detail || error.message}`);
        }
    };

    const handleUpdateCard = async () => {
        if (!editQuestion.trim() || !editAnswer.trim()) {
            alert("Pytanie i odpowiedź nie mogą być puste!");
            return;
        }

        try {
            await axios.put(`http://localhost:8000/flashcards/card/${editingCard}`, {
                question: editQuestion.trim(),
                answer: editAnswer.trim()
            });
            fetchFlashcards();
            setEditingCard(null);
            setEditQuestion("");
            setEditAnswer("");
            alert("Fiszka zaktualizowana!");
        } catch (error) {
            alert("Błąd podczas aktualizacji fiszki");
        }
    };

    const handleStartEdit = (card) => {
        setEditingCard(card.id);
        setEditQuestion(card.question);
        setEditAnswer(card.answer);
    };

    const handleDeleteCard = async (cardId) => {
        if (!window.confirm("Czy na pewno chcesz usunąć tę fiszkę?")) return;

        try {
            await axios.delete(`http://localhost:8000/flashcards/card/${cardId}`);
            fetchFlashcards();
            alert("Fiszka usunięta!");
        } catch (error) {
            alert("Błąd podczas usuwania fiszki");
        }
    };

    const handleAddCard = async () => {
        if (!newQuestion.trim() || !newAnswer.trim()) {
            alert("Pytanie i odpowiedź nie mogą być puste!");
            return;
        }

        try {
            await axios.post(`http://localhost:8000/flashcards/card`, {
                flashcard_set_id: flashcardSet.id,
                question: newQuestion.trim(),
                answer: newAnswer.trim()
            });

            setNewQuestion("");
            setNewAnswer("");
            setShowAddCard(false);
            fetchFlashcards();
            alert("Fiszka dodana!");
        } catch (error) {
            alert("Błąd podczas dodawania fiszki");
        }
    };

    const handleDragStart = (e, card, index) => {
        setDraggedCard({ card, index });
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (draggedCard && draggedCard.index !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDragLeave = () => {
        setDragOverIndex(null);
    };

    const handleDrop = async (e, dropIndex) => {
        e.preventDefault();
        if (!draggedCard || draggedCard.index === dropIndex) {
            setDragOverIndex(null);
            return;
        }

        const newFlashcards = [...flashcards];
        const [removed] = newFlashcards.splice(draggedCard.index, 1);
        newFlashcards.splice(dropIndex, 0, removed);

        setFlashcards(newFlashcards);
        setDraggedCard(null);
        setDragOverIndex(null);

        try {
            await axios.post(`http://localhost:8000/flashcards/reorder`, {
                set_id: flashcardSet.id,
                card_positions: newFlashcards.map((card, idx) => ({
                    card_id: card.id,
                    position: idx
                }))
            });
        } catch (error) {
            fetchFlashcards(); // Revert on error
        }
    };

    if (loading) {
        return (
            <div className={styles.managerContainer}>
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Ładowanie fiszek...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.managerContainer}>
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={onBack}>
                    <ArrowLeft size={20} />
                    Powrót
                </button>

                <div className={styles.setInfo}>
                    {editingSet ? (
                        <div className={styles.setEditForm}>
                            <input
                                type="text"
                                value={setTitle}
                                onChange={(e) => setSetTitle(e.target.value)}
                                className={styles.titleInput}
                                placeholder="Tytuł zestawu"
                            />
                            <textarea
                                value={setDescription}
                                onChange={(e) => setSetDescription(e.target.value)}
                                className={styles.descriptionInput}
                                placeholder="Opis zestawu (opcjonalnie)"
                                rows={2}
                            />
                            <div className={styles.setEditActions}>
                                <button className={styles.btnSave} onClick={handleUpdateSet}>
                                    <Check size={18} />
                                    Zapisz
                                </button>
                                <button className={styles.btnCancel} onClick={() => {
                                    setEditingSet(false);
                                    setSetTitle(flashcardSet.title);
                                    setSetDescription(flashcardSet.description || "");
                                }}>
                                    <X size={18} />
                                    Anuluj
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.setDisplay}>
                            <h1>{flashcardSet.title}</h1>
                            {flashcardSet.description && <p>{flashcardSet.description}</p>}
                            <button className={styles.btnEdit} onClick={() => setEditingSet(true)}>
                                <Edit2 size={16} />
                                Edytuj zestaw
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {showAddCard && (
                <div className={styles.addCardFormModal} onClick={() => {
                    setShowAddCard(false);
                    setNewQuestion("");
                    setNewAnswer("");
                }}>
                    <div className={styles.addCardForm} onClick={(e) => e.stopPropagation()}>
                        <h3>Dodaj nową fiszkę</h3>
                        <textarea
                            value={newQuestion}
                            onChange={(e) => setNewQuestion(e.target.value)}
                            className={styles.addQuestionInput}
                            placeholder="Pytanie"
                            rows={3}
                        />
                        <textarea
                            value={newAnswer}
                            onChange={(e) => setNewAnswer(e.target.value)}
                            className={styles.addAnswerInput}
                            placeholder="Odpowiedź"
                            rows={3}
                        />
                        <div className={styles.addCardActions}>
                            <button className={styles.btnSaveNewCard} onClick={handleAddCard}>
                                <Check size={18} />
                                Dodaj fiszkę
                            </button>
                            <button className={styles.btnCancelNewCard} onClick={() => {
                                setShowAddCard(false);
                                setNewQuestion("");
                                setNewAnswer("");
                            }}>
                                <X size={18} />
                                Anuluj
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {editingCard && (
                <div className={styles.addCardFormModal} onClick={() => {
                    setEditingCard(null);
                    setEditQuestion("");
                    setEditAnswer("");
                }}>
                    <div className={styles.addCardForm} onClick={(e) => e.stopPropagation()}>
                        <h3>Edytuj fiszkę</h3>
                        <textarea
                            value={editQuestion}
                            onChange={(e) => setEditQuestion(e.target.value)}
                            className={styles.addQuestionInput}
                            placeholder="Pytanie"
                            rows={3}
                        />
                        <textarea
                            value={editAnswer}
                            onChange={(e) => setEditAnswer(e.target.value)}
                            className={styles.addAnswerInput}
                            placeholder="Odpowiedź"
                            rows={3}
                        />
                        <div className={styles.addCardActions}>
                            <button className={styles.btnSaveNewCard} onClick={handleUpdateCard}>
                                <Check size={18} />
                                Zapisz zmiany
                            </button>
                            <button className={styles.btnCancelNewCard} onClick={() => {
                                setEditingCard(null);
                                setEditQuestion("");
                                setEditAnswer("");
                            }}>
                                <X size={18} />
                                Anuluj
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.cardsGrid}>
                {flashcards.map((card, index) => {
                    const getTextSizeClass = (text) => {
                        const length = text.length;
                        if (length > 90) return styles.textExtraLong;
                        if (length > 60) return styles.textVeryLong;
                        if (length > 35) return styles.textLong;
                        if (length > 20) return styles.textMedium;
                        return '';
                    };

                    return (
                        <div
                            key={card.id}
                            className={`${styles.miniCard} ${dragOverIndex === index ? styles.dragOver : ""}`}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, card, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, index)}
                        >
                            <div className={styles.dragHandle}>
                                <GripVertical size={16} />
                            </div>
                            <div className={styles.cardContent}>
                                <div className={styles.cardSide}>
                                    <span className={styles.cardLabel}>P</span>
                                    <p className={getTextSizeClass(card.question)}>{card.question}</p>
                                </div>
                                <div className={styles.cardSide}>
                                    <span className={styles.cardLabel}>O</span>
                                    <p className={getTextSizeClass(card.answer)}>{card.answer}</p>
                                </div>
                            </div>
                            <div className={styles.cardActions}>
                                <button
                                    className={styles.btnEditCard}
                                    onClick={() => handleStartEdit(card)}
                                    title="Edytuj"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    className={styles.btnDeleteCard}
                                    onClick={() => handleDeleteCard(card.id)}
                                    title="Usuń"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}

                <div className={styles.addCardButton} onClick={() => setShowAddCard(true)}>
                    <Plus size={40} strokeWidth={2.5} />
                </div>
            </div>
        </div>
    );
}
