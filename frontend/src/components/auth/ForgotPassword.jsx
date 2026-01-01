import { useState } from "react";
import { Link } from "react-router-dom";
import styles from "../../css/shared/Auth.module.css";
import { ForgotPassword as ForgotPasswordService } from "../../services/authService";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      await ForgotPasswordService(email);
      setMessage("Link do resetowania hasła został wysłany! Sprawdź swoją skrzynkę email.");
      setEmail("");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <form className={styles.authCard} onSubmit={handleSubmit}>
        <h2 className={styles.title}>Zapomniałeś hasła?</h2>
        <p className={styles.subtitle}>
          Podaj swój email, a wyślemy Ci link do resetowania
        </p>

        <div className={styles.formGroup}>
          <label htmlFor="email">Adres email</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Podaj swój email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={isLoading}
        >
          {isLoading ? "Wysyłanie..." : "Wyślij link resetujący"}
        </button>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {message && <div className={styles.successMessage}>{message}</div>}

        <div className={styles.authLinks}>
          <Link to="/login">Powrót do logowania</Link>
          <Link to="/register">Nie masz konta? Zarejestruj się</Link>
        </div>
      </form>
    </div>
  );
}

export default ForgotPassword;