import { useState, useContext } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import styles from "../../css/shared/Auth.module.css";
import { ForgotPassword as ForgotPasswordService } from "../../services/authService";

import { LanguageContext } from "../../translations/LanguageContext";
import translations from "../../translations/translation.json";

function ForgotPassword() {
  const { language } = useContext(LanguageContext);
  const t = (key) => key.split(".").reduce((obj, k) => (obj ? obj[k] : null), translations[language]) || key;

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
      setMessage(t("auth.forgotPassword.successMessage"));
      setEmail("");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <Link to="/" className={styles.backButton}>
        <ArrowLeft />
        <span>{t("auth.forgotPassword.backHome")}</span>
      </Link>

      <form className={styles.authCard} onSubmit={handleSubmit}>
        <h2 className={styles.title}>{t("auth.forgotPassword.title")}</h2>
        <p className={styles.subtitle}>{t("auth.forgotPassword.subtitle")}</p>

        <div className={styles.formGroup}>
          <label htmlFor="email">{t("auth.forgotPassword.emailLabel")}</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder={t("auth.forgotPassword.emailPlaceholder")}
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
          {isLoading ? t("auth.forgotPassword.sending") : t("auth.forgotPassword.submit")}
        </button>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {message && <div className={styles.successMessage}>{message}</div>}

        <div className={styles.authLinks}>
          <Link to="/login">{t("auth.forgotPassword.backLogin")}</Link>
          <Link to="/register">{t("auth.forgotPassword.noAccount")}</Link>
        </div>
      </form>
    </div>
  );
}

export default ForgotPassword;
