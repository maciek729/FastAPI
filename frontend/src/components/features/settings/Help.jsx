import React, {useState}  from "react";
import styles from "../../../css/features/Settings.module.css"
import { ChevronRight, Sparkles} from "lucide-react";

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
                // Obsługa błędów z FastAPI
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
            <form className={styles.helpContainer} onSubmit={handleSubmit}>
                <div className={styles.titleContainer}>
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
                    <ChevronRight size={20} />
                </button>

                {/* Dodaj prosty loader i wyświetlanie statusu */}
                {status && <p className={styles.statusMessage}>{status}</p>}
            </form>
        </div>  
    );
}