import React from 'react';
import styles from "../../../css/features/Settings.module.css"
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function HelpQuestion({question, answer}) {
    // Zmienna do śledzenia czy pytanie jest rozwinięte
    const [isOpen, setIsOpen] = React.useState(false);

    // Funkcja strzałkowa do przełączania stanu rozwinięcia
    const toggleOpen = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className={styles.wrapper}>
            {/*Zmiana stanu rozwinięcia*/}
            <div className={styles.collapsibleHeader} onClick={toggleOpen}>
                <label>{question}</label>
                {/* Zmiana ikony w zależności czy jest otwarte czy nie */}
                <span className={styles.toggleIcon}>
                    {isOpen ? <ChevronUp/> : <ChevronDown/>}
                </span>
            </div>
            {/* Rozwijanie i zwijanie odpowiedzi */}
            <div className={`${styles.content} ${isOpen ? styles.open : ''}`}>
                <p>{answer}</p>
            </div>
        </div>
    );
}