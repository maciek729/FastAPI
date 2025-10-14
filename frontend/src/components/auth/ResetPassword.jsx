import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import styles from "../../css/shared/Auth.module.css";
;

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (form.newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("token", token);
      formData.append("new_password", form.newPassword);

      const res = await fetch("http://localhost:8000/auth/reset-password", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Password reset failed");
      }

      setMessage("Password updated successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <form className={styles.authCard} onSubmit={handleSubmit}>
        <h2 className={styles.title}>Reset Password</h2>
        <p className={styles.subtitle}>Enter your new password</p>

        <div className={styles.formGroup}>
          <label htmlFor="newPassword">New Password</label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            placeholder="Enter new password (min. 8 characters)"
            value={form.newPassword}
            onChange={handleChange}
            required
            disabled={isLoading}
            minLength={8}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Confirm new password"
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
          {isLoading ? "Resetting..." : "Reset Password"}
        </button>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {message && <div className={styles.successMessage}>{message}</div>}

        <div className={styles.authLinks}>
          <Link to="/login">Back to Login</Link>
        </div>
      </form>
    </div>
  );
}

export default ResetPassword;