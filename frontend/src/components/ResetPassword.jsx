import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import '../css/ResetPassword.css'; // << pamiętaj o imporcie stylu!

export default function ResetPassword() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async e => {
        e.preventDefault();
        setError("");
        try {
            const formData = new FormData();
            formData.append("token", token);
            formData.append("new_password", newPassword);

            const res = await fetch("http://localhost:8000/auth/reset-password", {
                method: "POST",
                body: formData,
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || "Password reset failed");
            }
            alert("Hasło zostało pomyślnie zaktualizowane!");
            navigate("/login");
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="auth-container">
            <form className="auth-card" onSubmit={handleSubmit}>
                <h2>Zresetuj hasło</h2>
                <div className="form-group">
                    <label htmlFor="new_password">Nowe hasło</label>
                    <input
                        id="new_password"
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                        placeholder="Wprowadź nowe hasło"
                    />
                </div>
                <button type="submit">Zresetuj hasło</button>
                {error && <div className="error-message">{error}</div>}
            </form>
        </div>
    );
}
