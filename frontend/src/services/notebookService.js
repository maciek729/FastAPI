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

export const getCollaborators = async (notebookId) => {
  const res = await fetch(ENDPOINTS.NOTEBOOKS.FETCH_COLLABORATORS(notebookId), {
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch collaborators');
  return await res.json();
};

export const addCollaborator = async (notebookId, username) => {
  const res = await fetch(ENDPOINTS.NOTEBOOKS.ADD_COLLABORATOR(notebookId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username })
  });
  if (!res.ok) throw new Error('Failed to add collaborator');
};

export const removeCollaborator = async (notebookId, userId) => {
  const res = await fetch(ENDPOINTS.NOTEBOOKS.REMOVE_COLLABORATOR(notebookId, userId), {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to remove collaborator');
};