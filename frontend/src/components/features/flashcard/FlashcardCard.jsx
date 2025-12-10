
import { useState } from "react";
import { XCircle, CheckCircle } from "lucide-react";
import styles from "../../../css/features/FlashcardCard.module.css";

export default function FlashcardCard({ question, answer, onReview }) {
    const [isFlipped, setIsFlipped] = useState(false);

    const handleFlipCard = () => {
        if (!isFlipped) {
            setIsFlipped(true);
        }
    };

    const handleResponse = (knows) => {
        onReview(knows);
        setIsFlipped(false);
    };

    const getFontSize = (text) => {
        const length = text.length;
        if (length > 500) return "0.75rem";
        if (length > 300) return "0.875rem";
        if (length > 200) return "1rem";
        if (length > 100) return "1.125rem";
        if (length > 50) return "1.25rem";
        return "1.5rem";
    };

    return (
        <div className={styles.cardContainer}>
            <div className={styles.cardScene}>
                <div className={`${styles.card} ${isFlipped ? styles.flipped : ""}`}>
                    <div className={`${styles.cardFace} ${styles.cardFront}`}>
                        <div className={styles.cardLabel}>Pytanie</div>
                        <div className={styles.cardContent}>
                            <p style={{ fontSize: getFontSize(question) }}>{question}</p>
                        </div>
                        <button className={styles.flipBtn} onClick={handleFlipCard}>
                            Pokaż odpowiedź
                        </button>
                    </div>

                    <div className={`${styles.cardFace} ${styles.cardBack}`}>
                        <div className={styles.cardLabel}>Odpowiedź</div>
                        <div className={styles.cardContent}>
                            <p style={{ fontSize: getFontSize(answer) }}>{answer}</p>
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
                        <span>Nie umiem</span>
                    </button>
                    <button
                        className={`${styles.qualityBtn} ${styles.btnKnow}`}
                        onClick={() => handleResponse(true)}
                    >
                        <CheckCircle size={24} />
                        <span>Umiem</span>
                    </button>
                </div>
            )}
        </div>
    );
}
