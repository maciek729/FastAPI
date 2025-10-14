import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import styles from "../../css/shared/Auth.module.css";

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    
    if (form.password !== form.password2) {
      setError("Hasła nie pasują do siebie");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const payload = { ...form };
      delete payload.password2;
      
      const res = await fetch("http://localhost:8000/auth/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Rejestracja nie powiodła się");
      }
      
      alert("Rejestracja zakończona pomyślnie! Możesz się teraz zalogować.");
      navigate("/login");
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
        <h2 className={styles.title}>Utwórz konto</h2>
        <p className={styles.subtitle}>Zarejestruj się, aby rozpocząć</p>
        
        <div className={styles.formGroup}>
          <label htmlFor="username">Nazwa użytkownika</label>
          <input
            id="username"
            name="username"
            type="text"
            placeholder="Wybierz nazwę użytkownika"
            value={form.username}
            onChange={handleChange}
            required
            disabled={isLoading}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Podaj swój email"
            value={form.email}
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
            placeholder="Utwórz hasło"
            value={form.password}
            onChange={handleChange}
            required
            disabled={isLoading}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="password2">Potwierdź hasło</label>
          <input
            id="password2"
            name="password2"
            type="password"
            placeholder="Powtórz swoje hasło"
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
          {isLoading ? "Tworzenie konta..." : "Zarejestruj się"}
        </button>
        
        {error && <div className={styles.errorMessage}>{error}</div>}
        
        <div className={styles.authLinks}>
          <Link to="/login">Masz już konto? Zaloguj się</Link>
        </div>
      </form>
    </div>
  );
}

export default Register;