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
    <div className="login-bg">
      <div className="login-main-wrapper">
        <div className="login-header-and-form">
          <header className="login-header">
            <div className="login-logo">
              {/* Nowoczesna ikona mózgu */}
              <svg height="56" viewBox="0 0 56 56" width="56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="56" height="56" rx="16" fill="url(#gradient1)"/>
                <path d="M22 18c0-.7.9-1.3 2.1-1.3 3.5 0 6.3 3.9 6.3 10.5m-8.4-4.6c-4.4 0-7.4 2.6-7.4 7.2C14.6 36 16.8 38.5 22 38.5M31.4 26.7c4.4 0 7.4 2.6 7.4 7.2 0 3.3-2.5 5.9-6.8 5.9"
                      stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="24" cy="24" r="1.5" fill="#fff" opacity="0.6"/>
                <circle cx="32" cy="28" r="1.2" fill="#fff" opacity="0.4"/>
                <defs>
                  <linearGradient id="gradient1" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#bea3f7"/>
                    <stop offset="0.5" stopColor="#a78bfa"/>
                    <stop offset="1" stopColor="#93c5fd"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="login-title">zdAI to!</h1>
            <span className="login-subtitle">Twój inteligentny asystent nauki</span>
          </header>

          <form className="login-card" onSubmit={handleSubmit}>
            <h2 className="login-card-title">Witaj ponownie!</h2>
            <p className="login-card-desc">Zaloguj się, aby kontynuować naukę</p>

            <div className="login-form-group">
              <label htmlFor="username">Nazwa użytkownika</label>
              <div className="login-input-icon">
                <span className="login-input-icon-left">
                  {/* Ikona użytkownika */}
                  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </span>
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Wprowadź nazwę"
                  autoComplete="username"
                  value={form.username}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="login-form-group">
              <label htmlFor="password">Hasło</label>
              <div className="login-input-icon">
                <span className="login-input-icon-left">
                  {/* Ikona hasła */}
                  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM15.1 8H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/>
                  </svg>
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Wprowadź hasło"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
                <span
                  className="login-input-icon-right"
                  onClick={() => setShowPassword(show => !show)}
                  tabIndex={0}
                  role="button"
                  title={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
                >
                  {/* Ikona oka */}
                  {showPassword ? (
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  )}
                </span>
              </div>
            </div>

            <button type="submit" className="login-submit-btn">
              Zaloguj się
            </button>

            {error && <div className="login-error-message">{error}</div>}

            <div className="login-links">
              <Link to="/register" className="login-link-primary">Utwórz konto</Link>
              <Link to="/forgot-password" className="login-link-secondary">Zapomniałeś hasła?</Link>
            </div>
          </form>
        </div>
        <footer className="login-footer">
          Używając tej aplikacji akceptujesz nasze warunki użytkowania
        </footer>
      </div>
    </div>
  );
}