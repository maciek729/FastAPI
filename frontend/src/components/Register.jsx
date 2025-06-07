import { useState } from "react";

export default function Register() {
  const [form, setForm] = useState({
    username: "", email: "", first_name: "", last_name: "",
    password: "", password2: "", role: "", phone_number: ""
  });
  const [error, setError] = useState("");

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    if (form.password !== form.password2) {
      setError("Passwords do not match");
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
        throw new Error(data.detail || "Registration failed");
      }
      alert("Registration successful! Check your email for verification.");
      window.location.href = "/login";
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Register</h2>
      <input name="username" placeholder="Username" value={form.username} onChange={handleChange} required />
      <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
      <input name="first_name" placeholder="First Name" value={form.first_name} onChange={handleChange} required />
      <input name="last_name" placeholder="Last Name" value={form.last_name} onChange={handleChange} required />
      <input name="role" placeholder="Role" value={form.role} onChange={handleChange} required />
      <input name="phone_number" placeholder="Phone Number" value={form.phone_number} onChange={handleChange} required />
      <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />
      <input name="password2" type="password" placeholder="Repeat Password" value={form.password2} onChange={handleChange} required />
      <button type="submit">Register</button>
      {error && <div style={{color: "red"}}>{error}</div>}
      <div>
        <a href="/login">Back to login</a>
      </div>
    </form>
  );
}