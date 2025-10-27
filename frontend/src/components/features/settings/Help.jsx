import React, {useState}  from "react";
import styles from "../../../css/features/Settings.module.css"
import { Sparkles} from "lucide-react";
import HelpQuestion from "./HelpQuestion.jsx";

export default function Help({userData}) {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [status, setStatus] = useState("");
    const [isLoading, setIsLoading] = useState(false);

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
                setStatus(data.message || "Wiadomość została wysłana!");
                setTitle("");
                setMessage("");
            } else {
                setStatus(data.detail || "Wystąpił błąd podczas wysyłania wiadomości.");
            }
        } catch (error) {
            console.error("Błąd sieci lub serwera:", error);
            setStatus("Błąd połączenia z serwerem., spróbuj ponownie później.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.formWrapper}>
            {/* Nagłówek */}
            <div className={styles.titleContainer}>
                <h2 className={styles.title}>Pomoc i kontakt</h2>
                <p className={styles.subtitle}>Masz pytania? Sprawdź najczęstsze pytania lub skontaktuj się z nami!</p>
            </div>

            {/* Pytania i odpowiedzi */}
            <HelpQuestion
                question="Jeżeli byście chcieli to mogę dodać nową sekcję kontakt"
                answer="i tam wówczas umieszczę formularz. Bo nie wiedziałem, gdzie go umieścić, więc na razie jest tutaj"
            />

            <HelpQuestion
                question="Jak mogę zresetować moje hasło?"
                answer="Aby zresetować swoje hasło, przejdź do strony logowania i kliknij na link 'Zapomniałeś hasła?'. Postępuj zgodnie z instrukcjami, aby ustawić nowe hasło."
            />
            <HelpQuestion
                question="Jak mogę skontaktować się z zespołem wsparcia?"
                answer="Aby skontaktować się z naszym zespołem wsparcia, wypełnij poniższy formularz kontaktowy, a my odpowiemy na Twoją wiadomość tak szybko, jak to możliwe."
            />

            {/* Formularz */}
            <form className={styles.helpContainer} onSubmit={handleSubmit}>
                <div className={styles.formContainer}>
                    <Sparkles size={20} className={styles.brandIcon}/>
                    <h2 className={styles.helpTitle}>Skontaktuj się z nami</h2>
                </div>

                <input
                    type="text"
                    placeholder="Tytuł..."
                    value={title}
                    onChange={(t) => setTitle(t.target.value)}
                    className={styles.inputTitle}
                    required
                    disabled={isLoading}
                />

                <textarea
                    placeholder="Treść wiadomości..."
                    value={message}
                    onChange={(m) => setMessage(m.target.value)}
                    className={styles.textArea}
                    required
                    disabled={isLoading}
                />

                <button type="submit" className={styles.sendButton} disabled={isLoading}>
                    {isLoading ? "Wysyłanie..." : "Wyślij"}
                </button>

                {status && <p className={styles.statusMessage}>{status}</p>}
            </form>
        </div>  
    );
}