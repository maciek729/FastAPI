import ENDPOINTS from '../api/endpoints';

export const getNotebooks = async (createdBy, spaceType) => {
  const response = await fetch(ENDPOINTS.NOTEBOOKS.LIST(createdBy, spaceType), {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch notebooks');
  return await response.json();
};

export const createNotebook = async (data) => {
  const response = await fetch(ENDPOINTS.NOTEBOOKS.CREATE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create notebook');
  return await response.json();
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

export const renameNotebook = async (notebookId, newName) => {
  const res = await fetch(ENDPOINTS.NOTEBOOKS.UPDATE(notebookId), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name: newName })
  });
  if (!res.ok) throw new Error('Failed to rename notebook');
  return await res.json();
};

export const deleteNotebook = async (notebookId) => {
  const res = await fetch(ENDPOINTS.NOTEBOOKS.DELETE(notebookId), {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to delete notebook');
};