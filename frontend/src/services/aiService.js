import ENDPOINTS from '../api/endpoints';
import { throwApiError } from './apiError';

export const UploadFile = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(ENDPOINTS.AI.UPLOAD, {
    method: "POST",
    body: formData,
    credentials: 'include'
  });

  if (!res.ok) throw new Error("Failed to upload file");
  return await res.json();
};

export const SendMessage = async (userId, message, conversation, responseStyle = 'balanced') => {
  const res = await fetch(ENDPOINTS.AI.CHAT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: 'include',
    body: JSON.stringify({ 
      user_id: userId,
      message, 
      conversation,
      response_style: responseStyle  
    })
  });

  if (!res.ok) await throwApiError(res, "Failed to send message");
  return await res.json();
};

export const ResetSession = async () => {
  const res = await fetch(ENDPOINTS.AI.RESET, {
    method: "POST",
    credentials: 'include'
  });

  if (!res.ok) throw new Error("Failed to reset AI session");
};

export const ClearFiles = async () => {
  const res = await fetch(ENDPOINTS.AI.CLEAR, {
    method: "POST",
    credentials: 'include'
  });

  if (!res.ok) throw new Error("Failed to clear uploaded AI files");
};

export const Status = async () => {
  const res = await fetch(ENDPOINTS.AI.STATUS, {
    credentials: 'include'
  });

  if (!res.ok) throw new Error("Failed to fetch AI status");
  return await res.json();
};

export const ListFiles = async () => {
  const res = await fetch(ENDPOINTS.AI.FILES, {
    credentials: 'include'
  });

  if (!res.ok) throw new Error("Failed to fetch AI files");
  return await res.json();
};