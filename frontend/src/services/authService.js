import ENDPOINTS from "../api/endpoints";

export const VerifyEmail = async (token) => {
  const res = await fetch(ENDPOINTS.AUTH.VERIFY(token), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data.detail || "Weryfikacja nie powiodła się");
  }

  return data;
};

export const RegisterUser = async (user) => {
  const payload = {
    username: user.username,
    email: user.email,
    password: user.password,
    role: "user" 
  };

  const res = await fetch(ENDPOINTS.AUTH.REGISTER, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Rejestracja nie powiodła się");
  }

  return data;
};

export const LoginUser = async (form) => {
  const res = await fetch(ENDPOINTS.AUTH.LOGIN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Nieprawidłowe dane logowania");
  return data;
};

export const ForgotPassword = async (email) => {
  const formData = new FormData();
  formData.append("email", email);

  const res = await fetch(ENDPOINTS.AUTH.FORGOT_PASSWORD, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok)
    throw new Error(data.detail || "Nie udało się wysłać linku resetującego");
  return data;
};

export const ResetPassword = async (token, newPassword) => {
  const formData = new FormData();
  formData.append("token", token);
  formData.append("new_password", newPassword);

  const res = await fetch(ENDPOINTS.AUTH.RESET_PASSWORD, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Resetowanie hasła nie powiodło się");
  return data;
};
