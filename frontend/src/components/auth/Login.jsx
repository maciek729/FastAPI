import { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import styles from "../../css/shared/Auth.module.css";
import { LoginUser } from "../../services/authService";
import logo from "../layout/logodark.png";

import { LanguageContext } from "../../translations/LanguageContext";
import translations from "../../translations/translation.json";

function Login() {
  const { language } = useContext(LanguageContext);

  const t = (key) => {
    if (!key) return "";
    return key.split(".").reduce(
      (obj, k) => (obj ? obj[k] : null),
      translations[language]
    ) || key;
  };

  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const data = await LoginUser(form);
      document.cookie = `access_token=${data.access_token}; path=/`;
      localStorage.setItem("token", data.access_token);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      if (err.message === "Invalid credentials") {
        setError(t("auth.login.errorInvalidCredentials"));
      } 
      else if (err.message === "Please verify your email before logging in") {
        setError(t("auth.login.errorVerifyEmail"));
      } 
      else if (err.message.includes("zostało zarchiwizowane")) {
        setError(err.message);
      } 
      else {
        setError(t("auth.login.errorGeneric"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <Link to="/" className={styles.backButton}>
        <ArrowLeft />
        <span>{t("auth.login.backHome")}</span>
      </Link>

      <form className={styles.authCard} onSubmit={handleSubmit}>
        <img src={logo} alt="zdAI to!" className={styles.logo} />
        <h1 className={styles.brandName}>zdAI to!</h1>
        <p className={styles.subtitle}>{t("auth.login.subtitle")}</p>

        <div className={styles.formGroup}>
          <label htmlFor="username">{t("auth.login.usernameLabel")}</label>
          <input
            id="username"
            name="username"
            type="text"
            placeholder={t("auth.login.usernamePlaceholder")}
            value={form.username}
            onChange={handleChange}
            required
            disabled={isLoading}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="password">{t("auth.login.passwordLabel")}</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder={t("auth.login.passwordPlaceholder")}
            value={form.password}
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
          {isLoading ? t("auth.login.loading") : t("auth.login.submit")}
        </button>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <div className={styles.authLinks}>
          <Link to="/register">{t("auth.login.noAccount")}</Link>
          <Link to="/forgot-password">{t("auth.login.forgotPassword")}</Link>
        </div>
      </form>
    </div>
  );
}

export default Login;
