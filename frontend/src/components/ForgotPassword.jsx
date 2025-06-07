import { useState } from "react";

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
      if (!res.ok) throw new Error(data.detail || "Error");
      setMessage("If this email exists, a reset link has been sent.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Reset Password</h2>
      <input type="email" name="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required />
      <button type="submit">Send reset link</button>
      {error && <div style={{color: "red"}}>{error}</div>}
      {message && <div style={{color: "green"}}>{message}</div>}
      <div>
        <a href="/login">Back to login</a>
      </div>
    </form>
  );
}