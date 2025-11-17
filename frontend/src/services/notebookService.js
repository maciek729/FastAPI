import ENDPOINTS from '../api/endpoints';

export const getNotebooks = async () => {
  const response = await fetch(ENDPOINTS.NOTEBOOKS.LIST, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch notebooks');
  return await response.json();
};

export const createNotebook = async (name) => {
  const response = await fetch(ENDPOINTS.NOTEBOOKS.CREATE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error('Failed to create notebook');
};
