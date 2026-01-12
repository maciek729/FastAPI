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
                question={"Jak dodać lub usunąć współtwórcę do / z notatnika?"}
                answer={"Aby dodać bądź usunąć współtwórcę do / z notatnika należy najechać na notatnik znajdujący się na pasku bocznym po lewej stronie i kliknąć na 3 kropeczki, a następnie wybrać opcję Dodaj współtwórcę. Otworzy się okno współtwórców notatnika."}
                isOpen={openQuestion === 'question4'}
                onToggle={()=> handleQuestionToggle('question4')}
            />
            <HelpQuestion
                question={"Co to jest sekcja Chat z AI"}
                answer={"Chat z AI to sekcja notatnika, w której użytkownik może zadawać dowolne pytania sztucznej inteligencji, może również przesyłać swoje pliki, a odpowiedzi sztucznej inteligencji można zapisywać do notatki."}
                isOpen={openQuestion === 'question7'}
                onToggle={()=> handleQuestionToggle('question7')}
            />
            <HelpQuestion
                question={"Co to jest sekcja Moje Pliki"}
                answer={"Moje pliki to sekcja notatnika, w której użytkownik może umieszczać swoje notatki, a także różnego rodzaju pliki np. pdf lub zdjęcia. Dzięki temu użytkownik może trzymać wszystkie pliki potrzebne do lepszej nauki w jednym miejscu. Notatki następnie możemy wykorzystać tworząc fiszki, sprawdziany bądź podcasty."}
                isOpen={openQuestion === 'question6'}
                onToggle={()=> handleQuestionToggle('question6')}
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