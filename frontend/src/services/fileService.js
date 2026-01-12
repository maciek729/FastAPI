import ENDPOINTS from '../api/endpoints';

export const uploadFile = async (formData) => {
  // Nie ustawiamy ręcznie Content-Type dla FormData - przeglądarka zrobi to sama poprawnie
  const response = await fetch(ENDPOINTS.FILES.UPLOAD, {
    method: 'POST',
    body: formData,
    credentials: 'include', 
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Upload failed');
  }
  return await response.json();
};

export const getFiles = async (notebookId) => {
  const response = await fetch(ENDPOINTS.FILES.LIST(notebookId), {
    method: 'GET',
    credentials: 'include',
  });
  
  if (!response.ok) throw new Error('Failed to fetch files');
  return await response.json();
};

export const deleteFile = async (fileId) => {
  const response = await fetch(ENDPOINTS.FILES.DELETE(fileId), {
    method: 'DELETE',
    credentials: 'include',
  });
  
  if (!response.ok) throw new Error('Failed to delete file');
  return await response.json();
};