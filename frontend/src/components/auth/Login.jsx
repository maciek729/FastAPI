import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import styles from "../../css/shared/Auth.module.css";

function Login() {
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
      const res = await fetch("http://localhost:8000/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(form),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Nieprawidłowe dane logowania");
      }
      
      const data = await res.json();
      document.cookie = `access_token=${data.access_token}; path=/`;
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      {/* Back to Intro Button */}
      <Link to="/" className={styles.backButton}>
        <ArrowLeft />
        <span>Powrót do strony głównej</span>
      </Link>

      <form className={styles.authCard} onSubmit={handleSubmit}>
        <h2 className={styles.title}>Witaj ponownie</h2>
        <p className={styles.subtitle}>Zaloguj się do swojego konta</p>
        
        <div className={styles.formGroup}>
          <label htmlFor="username">Nazwa użytkownika</label>
          <input
            id="username"
            name="username"
            type="text"
            placeholder="Podaj swoją nazwę użytkownika"
            value={form.username}
            onChange={handleChange}
            required
            disabled={isLoading}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="password">Hasło</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Podaj swoje hasło"
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
          {isLoading ? "Logowanie..." : "Zaloguj się"}
        </button>
        
        {error && <div className={styles.errorMessage}>{error}</div>}
        
        <div className={styles.authLinks}>
          <Link to="/register">Nie masz konta? Zarejestruj się</Link>
          <Link to="/forgot-password">Zapomniałeś hasła?</Link>
        </div>
      </form>
    </div>
  );
}

export default Login;