import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function ResetPassword() {
    const { token } = useParams();  // Get token from URL params
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
            
            alert("Password updated successfully!");
            navigate("/login");
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="auth-container">
            <form className="auth-card" onSubmit={handleSubmit}>
                <h2>Reset Password</h2>
                <div className="form-group">
                    <label htmlFor="new_password">New Password</label>
                    <input
                        id="new_password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        placeholder="Enter new password"
                    />
                </div>
                <button type="submit">Reset Password</button>
                {error && <div className="error-message">{error}</div>}
            </form>
        </div>
    );
}