import { useState, useContext } from "react";
import toast from "react-hot-toast";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import styles from "../../css/shared/Auth.module.css";
import { RegisterUser } from "../../services/authService";
import logo from "../layout/logodark.png";

import { LanguageContext } from "../../translations/LanguageContext";
import translations from "../../translations/translation.json";

function Register() {
  const { language } = useContext(LanguageContext);

  const t = (key) => {
    if (!key) return "";
    return key.split(".").reduce(
      (obj, k) => (obj ? obj[k] : null),
      translations[language]
    ) || key;
  };

  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = e =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");

    if (form.password !== form.password2) {
      setError(t("auth.register.passwordMismatch"));
      return;
    }

    setIsLoading(true);
    try {
      await RegisterUser(form);
      toast.success(t("auth.register.success"));
      setTimeout(() => navigate("/login"), 1000);
    } catch (err) {
      if (err.message === "NetworkError when attempting to fetch resource." || err.message === "Failed to fetch") {
        setError(t("auth.register.accountExists") || "Błąd połączenia z serwerem. Spróbuj ponownie później.");
      }
      else if (err.code === "seat_limit_reached") {
        setError(err.message || "Rejestracja jest chwilowo zamknięta - osiągnięto limit użytkowników.");
      }
      else {
        setError(t("auth.register.errorGeneric") || t("auth.login.errorGeneric") || "Wystąpił błąd rejestracji.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <Link to="/" className={styles.backButton}>
        <ArrowLeft />
        <span>{t("auth.register.backHome")}</span>
      </Link>

      <form className={styles.authCard} onSubmit={handleSubmit}>
        <img src={logo} alt="zdAI to!" className={styles.logo} />
        <h1 className={styles.brandName}>zdAI to!</h1>

        <p className={styles.subtitle}>
          {t("auth.register.subtitle")}
        </p>

        <div className={styles.formGroup}>
          <label htmlFor="username">
            {t("auth.register.usernameLabel")}
          </label>
          <input
            id="username"
            name="username"
            type="text"
            placeholder={t("auth.register.usernamePlaceholder")}
            value={form.username}
            onChange={handleChange}
            required
            disabled={isLoading}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="email">
            {t("auth.register.emailLabel")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder={t("auth.register.emailPlaceholder")}
            value={form.email}
            onChange={handleChange}
            required
            disabled={isLoading}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="password">
            {t("auth.register.passwordLabel")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder={t("auth.register.passwordPlaceholder")}
            value={form.password}
            onChange={handleChange}
            required
            disabled={isLoading}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="password2">
            {t("auth.register.password2Label")}
          </label>
          <input
            id="password2"
            name="password2"
            type="password"
            placeholder={t("auth.register.password2Placeholder")}
            value={form.password2}
            onChange={handleChange}
            required
            disabled={isLoading}
          />
        </div>
        
        <button 
          type="submit" 
          className={styles.submitButton}
          disabled={isLoading}
        >
          {isLoading
            ? t("auth.register.loading")
            : t("auth.register.submit")}
        </button>
        
        {error && <div className={styles.errorMessage}>{error}</div>}
        
        <div className={styles.authLinks}>
          <Link to="/login">
            {t("auth.register.alreadyHaveAccount")}
          </Link>
        </div>
      </form>
    </div>
  );
}

export default Register;
