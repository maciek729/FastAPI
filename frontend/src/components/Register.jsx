// import { useState } from "react";

// export default function Register() {
//   const [form, setForm] = useState({
//     username: "", email: "", first_name: "", last_name: "",
//     password: "", password2: "", role: "", phone_number: ""
//   });
//   const [error, setError] = useState("");

//   const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

//   const handleSubmit = async e => {
//     e.preventDefault();
//     setError("");
//     if (form.password !== form.password2) {
//       setError("Passwords do not match");
//       return;
//     }
//     try {
//       const payload = { ...form };
//       delete payload.password2;
//       const res = await fetch("http://localhost:8000/auth/", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });
//       if (!res.ok) {
//         const data = await res.json();
//         throw new Error(data.detail || "Registration failed");
//       }
//       alert("Registration successful! Check your email for verification.");
//       window.location.href = "/login";
//     } catch (err) {
//       setError(err.message);
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit}>
//       <h2>Register</h2>
//       <input name="username" placeholder="Username" value={form.username} onChange={handleChange} required />
//       <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
//       <input name="first_name" placeholder="First Name" value={form.first_name} onChange={handleChange} required />
//       <input name="last_name" placeholder="Last Name" value={form.last_name} onChange={handleChange} required />
//       <input name="role" placeholder="Role" value={form.role} onChange={handleChange} required />
//       <input name="phone_number" placeholder="Phone Number" value={form.phone_number} onChange={handleChange} required />
//       <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />
//       <input name="password2" type="password" placeholder="Repeat Password" value={form.password2} onChange={handleChange} required />
//       <button type="submit">Register</button>
//       {error && <div style={{color: "red"}}>{error}</div>}
//       <div>
//         <a href="/login">Back to login</a>
//       </div>
//     </form>
//   );
// }

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../css/Register.css";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
    role: ""
  });
  const [error, setError] = useState("");

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    if (form.password !== form.password2) {
      setError("Hasła nie są zgodne");
      return;
    }
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
      alert("Rejestracja zakończona sukcesem! Sprawdź maila, by potwierdzić konto.");
      navigate("/login");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Stwórz konto</h2>
        <div className="form-group">
          <label htmlFor="username">Nazwa użytkownika</label>
          <input
            id="username"
            name="username"
            type="text"
            placeholder="Podaj nazwę użytkownika"
            value={form.username}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Podaj e-mail"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="role">Rola</label>
          <input
            id="role"
            name="role"
            type="text"
            placeholder="Admin/User"
            value={form.role}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Hasło</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Podaj hasło"
            value={form.password}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password2">Powtórz hasło</label>
          <input
            id="password2"
            name="password2"
            type="password"
            placeholder="Powtórz hasło"
            value={form.password2}
            onChange={handleChange}
            required
          />
        </div>
        <button type="submit">Zarejestruj się</button>
        {error && <div className="error-message">{error}</div>}
        <div className="auth-links">
          <Link to="/login">Masz już konto? Zaloguj się</Link>
        </div>
      </form>
    </div>
  );
}
