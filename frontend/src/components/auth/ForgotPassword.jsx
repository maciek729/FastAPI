import { useState } from "react";
import { Link } from "react-router-dom";
import styles from "../../css/shared/Auth.module.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("email", email);

      const res = await fetch("http://localhost:8000/auth/forgot-password", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to send reset link");
      }

      setMessage("Password reset link sent! Check your email.");
      setEmail("");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <form className={styles.authCard} onSubmit={handleSubmit}>
        <h2 className={styles.title}>Forgot Password?</h2>
        <p className={styles.subtitle}>
          Enter your email and we'll send you a reset link
        </p>

        <div className={styles.formGroup}>
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={isLoading}
        >
          {isLoading ? "Sending..." : "Send Reset Link"}
        </button>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {message && <div className={styles.successMessage}>{message}</div>}

        <div className={styles.authLinks}>
          <Link to="/login">Back to Login</Link>
          <Link to="/register">Don't have an account? Sign up</Link>
        </div>
      </form>
    </div>
  );
}

export default ForgotPassword;