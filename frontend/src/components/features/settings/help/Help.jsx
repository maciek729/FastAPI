import React, {useState, useContext} from "react";
import styles from "../../../../css/features/settings/Help.module.css"
import { Sparkles} from "lucide-react";
import HelpQuestion from "./HelpQuestion.jsx";
import { LanguageContext } from "../../../../translations/LanguageContext";
import translations from "../../../../translations/translation.json";

export default function Help({userData}) {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [status, setStatus] = useState("");
    const [isLoading, setIsLoading] = useState(false);
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

        const apiUrl = "http://localhost:8000/contact/";

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: title,
                    message: message,
                    user_email: userData.email, 
                })
            });

            const data = await response.json();

            if (response.ok) {
                setStatus(data.message || t('help.successMessage'));
                setTitle("");
                setMessage("");
            } else {
                setStatus(data.detail || t('help.errorMessage'));
            }
        } catch (error) {
            console.error("Błąd sieci lub serwera:", error);
            setStatus(t('help.connectionError'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.formWrapper}>
            <div className={styles.titleContainer}>
                <h2 className={styles.title}>{t('help.title')}</h2>
                <p className={styles.subtitle}>{t('help.subtitle')}</p>
            </div>

            <HelpQuestion
                question={t('help.question1')}
                answer={t('help.answer1')}
            />
            <HelpQuestion
                question={t('help.question2')}
                answer={t('help.answer2')}
            />

            <form className={styles.helpContainer} onSubmit={handleSubmit}>
                <div className={styles.formContainer}>
                    <Sparkles size={20} className={styles.brandIcon}/>
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

                <button type="submit" className={styles.sendButton} disabled={isLoading}>
                    {isLoading ? t('help.sending') : t('help.sendButton')}
                </button>

                {status && <p className={styles.statusMessage}>{status}</p>}
            </form>
        </div>  
    );
}


