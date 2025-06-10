import { useState } from "react";
import "../css/ForgotPassword.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async e => {
    e.preventDefault();
    setError(""); setMessage("");
    try {
      const res = await fetch("http://localhost:8000/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Wystąpił błąd.");
      setMessage("Jeśli ten adres istnieje, wysłaliśmy link do resetowania hasła.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2 className="auth-header">Resetowanie hasła</h2>
        <p className="auth-desc">
          Podaj adres e-mail powiązany z Twoim kontem,<br />
          a wyślemy do Ciebie link do zmiany hasła.
        </p>
        <div className="form-group">
          <label htmlFor="email">Adres e-mail</label>
          <input
            id="email"
            type="email"
            placeholder="Wprowadź e-mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
        <button type="submit">Wyślij link resetujący</button>
        {error && <div className="error-message">{error}</div>}
        {message && <div className="ok-message">{message}</div>}
        <div className="return-login">
          <a href="/login">Powrót do logowania</a>
        </div>
      </form>
    </div>
  );
}
