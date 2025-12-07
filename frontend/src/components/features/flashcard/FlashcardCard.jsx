import { useState, useContext } from "react";
import { XCircle, CheckCircle } from "lucide-react";
import styles from "../../../css/features/FlashcardCard.module.css";
import { LanguageContext } from "../../../translations/LanguageContext";
import translations from "../../../translations/translation.json";

export default function FlashcardCard({ question, answer, onReview }) {
    const [isFlipped, setIsFlipped] = useState(false);
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

    const handleFlipCard = () => {
        if (!isFlipped) {
            setIsFlipped(true);
        }
    };

    const handleResponse = (knows) => {
        onReview(knows);
        setIsFlipped(false);
    };

    return (
        <div className={styles.cardContainer}>
            <div className={styles.cardScene}>
                <div className={`${styles.card} ${isFlipped ? styles.flipped : ""}`}>
                    <div className={`${styles.cardFace} ${styles.cardFront}`}>
                        <div className={styles.cardLabel}>{t('flashcard.question')}</div>
                        <div className={styles.cardContent}>
                            <p>{question}</p>
                        </div>
                        <button className={styles.flipBtn} onClick={handleFlipCard}>
                            {t('flashcard.showAnswer')}
                        </button>
                    </div>

                    <div className={`${styles.cardFace} ${styles.cardBack}`}>
                        <div className={styles.cardLabel}>{t('flashcard.answer')}</div>
                        <div className={styles.cardContent}>
                            <p>{answer}</p>
                        </div>
                    </div>
                </div>
            </div>

            {isFlipped && (
                <div className={styles.qualityButtons}>
                    <button
                        className={`${styles.qualityBtn} ${styles.btnNotKnow}`}
                        onClick={() => handleResponse(false)}
                    >
                        <XCircle size={24} />
                        <span>{t('flashcard.dontKnow')}</span>
                    </button>
                    <button
                        className={`${styles.qualityBtn} ${styles.btnKnow}`}
                        onClick={() => handleResponse(true)}
                    >
                        <CheckCircle size={24} />
                        <span>{t('flashcard.know')}</span>
                    </button>
                </div>
            )}
        </div>
    );
}