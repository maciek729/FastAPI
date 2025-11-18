import ENDPOINTS from '../api/endpoints';

export const createNote = async (noteData) => {
  const response = await fetch(ENDPOINTS.NOTES.CREATE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(noteData),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: 'Nieznany błąd serwera' }));
    throw new Error(errorBody.detail || 'Failed to create note');
  }

  return await response.json();
};

export const updateNote = async (noteId, noteData) => {
    const response = await fetch(ENDPOINTS.NOTES.UPDATE(noteId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(noteData),
    });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ detail: 'Nieznany błąd serwera' }));
        throw new Error(errorBody.detail || 'Failed to update note');
    }
    return await response.json();
};

export const deleteNote = async (noteId) => {
    const response = await fetch(ENDPOINTS.NOTES.DELETE(noteId), {
        method: 'DELETE',
        credentials: 'include',
    });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ detail: 'Nieznany błąd serwera' }));
        throw new Error(errorBody.detail || 'Failed to delete note');
    }
    return {}; 
};

const lockAction = async (noteId, endpointFn, userId) => {
    const url = `${endpointFn(noteId)}?user_id=${userId}`;
    const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
    });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ detail: 'Nieznany błąd' }));
        throw new Error(errorBody.detail || 'Lock operation failed');
    }
    return await response.json();
};

export const lockNoteFunction = (noteId, userId) => lockAction(noteId, ENDPOINTS.NOTES.LOCK, userId);
export const unlockNoteFunction = (noteId, userId) => lockAction(noteId, ENDPOINTS.NOTES.UNLOCK, userId);

export const checkLockStatusFunction = async (noteId) => {
    const response = await fetch(ENDPOINTS.NOTES.LOCK_STATUS(noteId), {
        credentials: 'include',
    });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ detail: 'Nieznany błąd' }));
        throw new Error(errorBody.detail || 'Failed to check lock status');
    }
    return await response.json();
};