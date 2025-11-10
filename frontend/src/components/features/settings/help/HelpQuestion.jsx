import React from 'react';
import styles from "../../../../css/features/settings/Help.module.css"
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function HelpQuestion({question, answer}) {
    const [isOpen, setIsOpen] = React.useState(false);

    const toggleOpen = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.collapsibleHeader} onClick={toggleOpen}>
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