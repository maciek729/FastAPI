import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import styles from "../../css/shared/Auth.module.css";
import { ResetPassword as ResetPasswordService } from "../../services/authService";

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (form.newPassword.length < 8) {
      setError("Hasło musi mieć co najmniej 8 znaków");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("Hasła nie pasują do siebie");
      return;
    }

    setIsLoading(true);

    try {
      await ResetPasswordService(token, form.newPassword);
      setMessage("Hasło zostało zaktualizowane pomyślnie! Przekierowanie do logowania...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <form className={styles.authCard} onSubmit={handleSubmit}>
        <h2 className={styles.title}>Resetuj hasło</h2>
        <p className={styles.subtitle}>Wprowadź nowe hasło</p>

        <div className={styles.formGroup}>
          <label htmlFor="newPassword">Nowe hasło</label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            placeholder="Wprowadź nowe hasło (min. 8 znaków)"
            value={form.newPassword}
            onChange={handleChange}
            required
            disabled={isLoading}
            minLength={8}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="confirmPassword">Potwierdź hasło</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Potwierdź nowe hasło"
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
          {isLoading ? "Resetowanie..." : "Zresetuj hasło"}
        </button>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {message && <div className={styles.successMessage}>{message}</div>}

        <div className={styles.authLinks}>
          <Link to="/login">Powrót do logowania</Link>
        </div>
      </form>
    </div>
  );
}

export default ResetPassword;