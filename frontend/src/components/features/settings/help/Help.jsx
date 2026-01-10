import React, {useState, useContext} from "react";
import styles from "../../../../css/features/settings/Help.module.css"
import HelpQuestion from "./HelpQuestion.jsx";
import { LanguageContext } from "../../../../translations/LanguageContext";
import translations from "../../../../translations/translation.json";
import { SendContactMessage } from "../../../../services/contactService";

export default function Help({userData}) {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [status, setStatus] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [openQuestion, setOpenQuestion] = useState(null);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus("");

        try {
            const data = await SendContactMessage(title, message, userData.email);
            
            setStatus(data.message);
            setTitle("");
            setMessage("");
        } catch (error) {
            console.error("Błąd kontaktu:", error);
            setStatus(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuestionToggle = (questionId) => {
        setOpenQuestion(openQuestion === questionId ? null : questionId);
    };

    return (
        <div className={styles.settingsMainContainer}>
            <div className={styles.titleContainer}>
                <h2 className={styles.title}>{t('help.title')}</h2>
                <p className={styles.subtitle}>{t('help.subtitle')}</p>
            </div>

            <HelpQuestion
                question={t('help.question1')}
                answer={t('help.answer1')}
                isOpen={openQuestion === 'question1'}
                onToggle={() => handleQuestionToggle('question1')}
            />
            <HelpQuestion
                question={"Jak utworzyć nowy notatnik?"}
                answer={"Aby utworzyć nowy notatnik należy nakliknąć na dowolną przestrzeń, może to być osobista lub wspólna i kliknąć na znak plusa."}
                isOpen={openQuestion === 'question3'}
                onToggle={()=> handleQuestionToggle('question3')}
            />
            <HelpQuestion
                question={t('help.question2')}
                answer={t('help.answer2')}
                isOpen={openQuestion === 'question2'}
                onToggle={() => handleQuestionToggle('question2')}
            />

            <div className={styles.sectionContainer}>
                <form className={styles.helpContainer} onSubmit={handleSubmit}>
                    <div className={styles.formContainer}>
                        <h2 className={styles.helpTitle}>{t('help.contactTitle')}</h2>
                    </div>

                    <input
                        type="text"
                        placeholder={t('help.titlePlaceholder')}
                        value={title}
                        onChange={(t) => setTitle(t.target.value)}
                        className={styles.inputTitle}
                        required
                        disabled={isLoading}
                    />

                    <textarea
                        placeholder={t('help.messagePlaceholder')}
                        value={message}
                        onChange={(m) => setMessage(m.target.value)}
                        className={styles.textArea}
                        required
                        disabled={isLoading}
                    />

                    <div className={styles.buttonsContainer}>
                        <button type="submit" className={styles.sendButton} disabled={isLoading}>
                            {isLoading ? t('help.sending') : t('help.sendButton')}
                        </button>
                    </div>

                    {status && <p className={styles.statusMessage}>{status}</p>}
                </form>
            </div>
        </div>
    );
}


