import { useState, useEffect, useContext } from "react";
import { ArrowLeft, Edit2, Trash2, GripVertical, Plus, X, Check } from "lucide-react";
import styles from "../../../css/features/FlashcardSetManager.module.css";
import { LanguageContext } from "../../../translations/LanguageContext";
import translations from "../../../translations/translation.json";
import { getFlashcardSetCards, updateFlashcardSet, updateFlashcard, deleteFlashcard, createFlashcard, reorderFlashcards } from '../../../services/flashcardService';

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
    const { language } = useContext(LanguageContext);

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

    useEffect(() => {
        fetchFlashcards();
    }, [flashcardSet.id]);

    const fetchFlashcards = async () => {
        try {
            setLoading(true);
            const data = await getFlashcardSetCards(flashcardSet.id);
            setFlashcards(data);
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSet = async () => {
        try {
            await updateFlashcardSet(flashcardSet.id, {
                title: setTitle,
                description: setDescription
            });

            alert(t('flashcardSetManager.updateSuccess'));
            setEditingSet(false);
            onBack();
        } catch (error) {
            alert(`${t('flashcardSetManager.updateError')}: ${error.message}`);
        }
    };

    const handleUpdateCard = async () => {
        if (!editQuestion.trim() || !editAnswer.trim()) {
            alert(t('flashcardSetManager.emptyFields'));
            return;
        }

        try {
            await updateFlashcard(editingCard, {
                question: editQuestion.trim(),
                answer: editAnswer.trim()
            });
            fetchFlashcards();
            setEditingCard(null);
            setEditQuestion("");
            setEditAnswer("");
            alert(t('flashcardSetManager.cardUpdateSuccess'));
        } catch (error) {
            alert(t('flashcardSetManager.cardUpdateError'));
        }
    };

    const handleStartEdit = (card) => {
        setEditingCard(card.id);
        setEditQuestion(card.question);
        setEditAnswer(card.answer);
    };

    const handleDeleteCard = async (cardId) => {
        if (!window.confirm(t('flashcardSetManager.deleteConfirm'))) return;

        try {
            await deleteFlashcard(cardId);
            fetchFlashcards();
            alert(t('flashcardSetManager.cardDeleteSuccess'));
        } catch (error) {
            alert(t('flashcardSetManager.cardDeleteError'));
        }
    };

    const handleAddCard = async () => {
        if (!newQuestion.trim() || !newAnswer.trim()) {
            alert(t('flashcardSetManager.emptyFields'));
            return;
        }

        try {
            await createFlashcard({
                flashcard_set_id: flashcardSet.id,
                question: newQuestion.trim(),
                answer: newAnswer.trim()
            });

            setNewQuestion("");
            setNewAnswer("");
            setShowAddCard(false);
            fetchFlashcards();
            alert(t('flashcardSetManager.cardAddSuccess'));
        } catch (error) {
            alert(t('flashcardSetManager.cardAddError'));
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
            await reorderFlashcards({
                set_id: flashcardSet.id,
                card_positions: newFlashcards.map((card, idx) => ({
                    card_id: card.id,
                    position: idx
                }))
            });
        } catch (error) {
            fetchFlashcards();
        }
    };

    if (loading) {
        return (
            <div className={styles.managerContainer}>
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>{t('flashcardSetManager.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.managerContainer}>
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={onBack}>
                    <ArrowLeft size={20} />
                    {t('flashcardSetManager.back')}
                </button>

                <div className={styles.setInfo}>
                    {editingSet ? (
                        <div className={styles.setEditForm}>
                            <input
                                type="text"
                                value={setTitle}
                                onChange={(e) => setSetTitle(e.target.value)}
                                className={styles.titleInput}
                                placeholder={t('flashcardSetManager.setTitlePlaceholder')}
                            />
                            <textarea
                                value={setDescription}
                                onChange={(e) => setSetDescription(e.target.value)}
                                className={styles.descriptionInput}
                                placeholder={t('flashcardSetManager.setDescriptionPlaceholder')}
                                rows={2}
                            />
                            <div className={styles.setEditActions}>
                                <button className={styles.btnSave} onClick={handleUpdateSet}>
                                    <Check size={18} />
                                    {t('flashcardSetManager.save')}
                                </button>
                                <button className={styles.btnCancel} onClick={() => {
                                    setEditingSet(false);
                                    setSetTitle(flashcardSet.title);
                                    setSetDescription(flashcardSet.description || "");
                                }}>
                                    <X size={18} />
                                    {t('flashcardSetManager.cancel')}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.setDisplay}>
                            <h1>{flashcardSet.title}</h1>
                            {flashcardSet.description && <p>{flashcardSet.description}</p>}
                            <button className={styles.btnEdit} onClick={() => setEditingSet(true)}>
                                <Edit2 size={16} />
                                {t('flashcardSetManager.editSet')}
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
                        <h3>{t('flashcardSetManager.addNewCard')}</h3>
                        <textarea
                            value={newQuestion}
                            onChange={(e) => setNewQuestion(e.target.value)}
                            className={styles.addQuestionInput}
                            placeholder={t('flashcardSetManager.questionPlaceholder')}
                            rows={3}
                        />
                        <textarea
                            value={newAnswer}
                            onChange={(e) => setNewAnswer(e.target.value)}
                            className={styles.addAnswerInput}
                            placeholder={t('flashcardSetManager.answerPlaceholder')}
                            rows={3}
                        />
                        <div className={styles.addCardActions}>
                            <button className={styles.btnSaveNewCard} onClick={handleAddCard}>
                                <Check size={18} />
                                {t('flashcardSetManager.addCard')}
                            </button>
                            <button className={styles.btnCancelNewCard} onClick={() => {
                                setShowAddCard(false);
                                setNewQuestion("");
                                setNewAnswer("");
                            }}>
                                <X size={18} />
                                {t('flashcardSetManager.cancel')}
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
                        <h3>{t('flashcardSetManager.editCard')}</h3>
                        <textarea
                            value={editQuestion}
                            onChange={(e) => setEditQuestion(e.target.value)}
                            className={styles.addQuestionInput}
                            placeholder={t('flashcardSetManager.questionPlaceholder')}
                            rows={3}
                        />
                        <textarea
                            value={editAnswer}
                            onChange={(e) => setEditAnswer(e.target.value)}
                            className={styles.addAnswerInput}
                            placeholder={t('flashcardSetManager.answerPlaceholder')}
                            rows={3}
                        />
                        <div className={styles.addCardActions}>
                            <button className={styles.btnSaveNewCard} onClick={handleUpdateCard}>
                                <Check size={18} />
                                {t('flashcardSetManager.saveChanges')}
                            </button>
                            <button className={styles.btnCancelNewCard} onClick={() => {
                                setEditingCard(null);
                                setEditQuestion("");
                                setEditAnswer("");
                            }}>
                                <X size={18} />
                                {t('flashcardSetManager.cancel')}
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
                                    <span className={styles.cardLabel}>{t('flashcardSetManager.questionLabel')}</span>
                                    <p className={getTextSizeClass(card.question)}>{card.question}</p>
                                </div>
                                <div className={styles.cardSide}>
                                    <span className={styles.cardLabel}>{t('flashcardSetManager.answerLabel')}</span>
                                    <p className={getTextSizeClass(card.answer)}>{card.answer}</p>
                                </div>
                            </div>
                            <div className={styles.cardActions}>
                                <button
                                    className={styles.btnEditCard}
                                    onClick={() => handleStartEdit(card)}
                                    title={t('flashcardSetManager.edit')}
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    className={styles.btnDeleteCard}
                                    onClick={() => handleDeleteCard(card.id)}
                                    title={t('flashcardSetManager.delete')}
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