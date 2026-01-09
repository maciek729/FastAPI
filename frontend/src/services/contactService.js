import ENDPOINTS from "../api/endpoints";

export const SendContactMessage = async (title, message, userEmail) => {
  const payload = {
    title: title,
    message: message,
    user_email: userEmail,
  };

  const res = await fetch(ENDPOINTS.CONTACT.SUBMIT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Wystąpił błąd podczas wysyłania wiadomości.");
  }

  return data;
};