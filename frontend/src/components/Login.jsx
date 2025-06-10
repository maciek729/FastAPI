import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../css/Login.css";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
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
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-header">
        <div className="auth-logo">
          {/* Fioletowa ikona mózgu jako SVG */}
          <svg height="42" viewBox="0 0 42 42" width="42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="42" height="42" rx="12" fill="#a084e8"/>
            <path d="M18 15c0-.552.716-1 1.6-1 2.65 0 4.8 3 4.8 8m-6.4-3.5c-3.333 0-5.6 1.986-5.6 5.5C12.8 28 14.693 30 18 30M23.2 20.5c3.333 0 5.6 1.986 5.6 5.5 0 2.5-1.893 4.5-5.2 4.5" 
             stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <h1 className="auth-title">zdAI to!</h1>
          <div className="auth-subtitle">Twój inteligentny asystent nauki</div>
        </div>
      </div>
      <div className="auth-container">
        <form className="auth-card" onSubmit={handleSubmit}>
          <h2 className="auth-card-title">Witaj ponownie!</h2>
          <p className="auth-card-desc">Zaloguj się, aby kontynuować naukę</p>
          <div className="form-group">
            <label htmlFor="username">Nazwa użytkownika</label>
            <div className="input-icon">
        
              <input
                id="username"
                name="username"
                type="text"
                placeholder="Wprowadź nazwę użytkownika"
                value={form.username}
                onChange={handleChange}
                required
                autoComplete="username"
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="password">Hasło</label>
            <div className="input-icon">
              
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Wprowadź hasło"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
              />
              <span className="input-icon-right" onClick={() => setShowPassword(show => !show)} tabIndex={0} role="button" title={showPassword ? "Ukryj hasło" : "Pokaż hasło"}>
                {/* Eye icon SVG */}
                {showPassword ? (
                  <svg width="20" height="20" fill="#a084e8" viewBox="0 0 20 20">
                    <path d="M10 4C4 4 1.73 10 1.73 10s2.27 6 8.27 6 8.27-6 8.27-6S16 4 10 4zm0 10.5A4.5 4.5 0 1110 5.5a4.5 4.5 0 010 9zM10 8a2 2 0 100 4 2 2 0 000-4z"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" fill="#a084e8" viewBox="0 0 20 20">
                    <path d="M10 4C4 4 1.73 10 1.73 10s2.27 6 8.27 6 8.27-6 8.27-6S16 4 10 4zm0 10c-3.87 0-7-4-7-4s3.13-4 7-4 7 4 7 4-3.13 4-7 4zm0-6c-1.1 0-2 .9-2 2 0 .33.08.65.22.93l2.71-2.71A1.987 1.987 0 0010 8zm4.78 4.39l-1.41-1.41C13.9 11.12 14 10.57 14 10c0-2.21-1.79-4-4-4-.57 0-1.12.1-1.59.28L6.27 6.08C7.13 5.39 8.49 5 10 5c4 0 7 4 7 4s-.87 1.23-2.22 2.39z"/>
                  </svg>
                )}
              </span>
            </div>
          </div>
          <button type="submit" className="auth-submit-btn">Zaloguj się</button>
          {error && <div className="error-message">{error}</div>}
          <div className="auth-links">
            <Link to="/register" className="auth-link-primary">Utwórz konto</Link>
            <Link to="/forgot-password" className="auth-link-secondary">Zapomniałeś hasła?</Link>
          </div>
        </form>
      </div>
      <div className="auth-footer">
        Używając tej aplikacji akceptujesz nasze warunki użytkowania
      </div>
    </div>
  );
}

