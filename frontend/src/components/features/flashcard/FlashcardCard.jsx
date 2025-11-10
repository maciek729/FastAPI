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

    return (
        <div className={styles.cardContainer}>
            <div className={styles.cardScene}>
                <div className={`${styles.card} ${isFlipped ? styles.flipped : ""}`}>
                    <div className={`${styles.cardFace} ${styles.cardFront}`}>
                        <div className={styles.cardLabel}>Pytanie</div>
                        <div className={styles.cardContent}>
                            <p>{question}</p>
                        </div>
                        <button className={styles.flipBtn} onClick={handleFlipCard}>
                            Pokaż odpowiedź
                        </button>
                    </div>

                    <div className={`${styles.cardFace} ${styles.cardBack}`}>
                        <div className={styles.cardLabel}>Odpowiedź</div>
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
