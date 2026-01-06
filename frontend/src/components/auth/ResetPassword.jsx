import { useState, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import styles from "../../css/shared/Auth.module.css";
import { ResetPassword as ResetPasswordService } from "../../services/authService";

import { LanguageContext } from "../../translations/LanguageContext";
import translations from "../../translations/translation.json";

function ResetPassword() {
  const { language } = useContext(LanguageContext);

  const t = (key) => {
    if (!key) return "";
    return key.split(".").reduce(
      (obj, k) => (obj ? obj[k] : null),
      translations[language]
    ) || key;
  };

  const { token } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = e =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (form.newPassword.length < 8) {
      setError(t("auth.resetPassword.passwordTooShort"));
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError(t("auth.resetPassword.passwordsNotMatch"));
      return;
    }

    setIsLoading(true);

    try {
      await ResetPasswordService(token, form.newPassword);
      setMessage(t("auth.resetPassword.success"));
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.message );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <form className={styles.authCard} onSubmit={handleSubmit}>
        <h2 className={styles.title}>
          {t("auth.resetPassword.title")}
        </h2>

        <p className={styles.subtitle}>
          {t("auth.resetPassword.subtitle")}
        </p>

        <div className={styles.formGroup}>
          <label htmlFor="newPassword">
            {t("auth.resetPassword.newPasswordLabel")}
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            placeholder={t("auth.resetPassword.newPasswordPlaceholder")}
            value={form.newPassword}
            onChange={handleChange}
            required
            disabled={isLoading}
            minLength={8}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="confirmPassword">
            {t("auth.resetPassword.confirmPassword")}
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder={t("auth.resetPassword.confirmPasswordLabel")}
            value={form.confirmPassword}
            onChange={handleChange}
            required
            disabled={isLoading}
            minLength={8}
          />
        </div>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={isLoading}
        >
          {isLoading
            ? t("auth.resetPassword.loading")
            : t("auth.resetPassword.submit")}
        </button>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {message && <div className={styles.successMessage}>{message}</div>}

        <div className={styles.authLinks}>
          <Link to="/login">
            {t("auth.resetPassword.backLogin")}
          </Link>
        </div>
      </form>
    </div>
  );
}

export default ResetPassword;
