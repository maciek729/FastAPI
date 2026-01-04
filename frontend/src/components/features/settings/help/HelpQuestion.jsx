import React from 'react';
import styles from "../../../../css/features/settings/Help.module.css"
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function HelpQuestion({question, answer, isOpen, onToggle}) {
    return (
        <div className={styles.wrapper}>
            <div className={styles.collapsibleHeader} onClick={onToggle}>
                <label>{question}</label>
                <span className={styles.toggleIcon}>
                    {isOpen ? <ChevronUp/> : <ChevronDown/>}
                </span>
            </div>
            <div className={`${styles.content} ${isOpen ? styles.open : ''}`}>
                <p>{answer}</p>
            </div>
        </div>
    );
}