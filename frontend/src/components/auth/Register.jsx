import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import styles from "../../css/shared/Auth.module.css";
;

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
      setError("Passwords do not match");
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
        throw new Error(data.detail || "Registration failed");
      }
      
      alert("Registration successful! You can now log in.");
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
        <span>Back to Home</span>
      </Link>

      <form className={styles.authCard} onSubmit={handleSubmit}>
        <h2 className={styles.title}>Create Account</h2>
        <p className={styles.subtitle}>Sign up to get started</p>
        
        <div className={styles.formGroup}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            placeholder="Choose a username"
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
            placeholder="Enter your email"
            value={form.email}
            onChange={handleChange}
            required
            disabled={isLoading}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Create a password"
            value={form.password}
            onChange={handleChange}
            required
            disabled={isLoading}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="password2">Confirm Password</label>
          <input
            id="password2"
            name="password2"
            type="password"
            placeholder="Repeat your password"
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
          {isLoading ? "Creating account..." : "Register"}
        </button>
        
        {error && <div className={styles.errorMessage}>{error}</div>}
        
        <div className={styles.authLinks}>
          <Link to="/login">Already have an account? Log in</Link>
        </div>
      </form>
    </div>
  );
}

export default Register;