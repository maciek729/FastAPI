import ENDPOINTS from '../api/endpoints';

export const getFlashcardSets = async (notebookId) => {
  const response = await fetch(ENDPOINTS.FLASHCARDS.LIST(notebookId), {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch flashcard sets');
  return await response.json();
};

export const getFlashcardSetCards = async (setId) => {
  const response = await fetch(ENDPOINTS.FLASHCARDS.GET_CARDS(setId), {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch flashcard cards');
  return await response.json();
};

export const generateFlashcards = async (data) => {
  const response = await fetch(ENDPOINTS.FLASHCARDS.GENERATE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to generate flashcards');
  return await response.json();
};

export const generateFlashcardsFromFile = async (formData) => {
  const response = await fetch(ENDPOINTS.FLASHCARDS.GENERATE_FROM_FILE, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!response.ok) throw new Error('Failed to generate flashcards from file');
  return await response.json();
};

export const updateFlashcardSet = async (setId, data) => {
  const response = await fetch(ENDPOINTS.FLASHCARDS.UPDATE_SET(setId), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update flashcard set');
  return await response.json();
};

export const deleteFlashcardSet = async (setId) => {
  const response = await fetch(ENDPOINTS.FLASHCARDS.DELETE_SET(setId), {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to delete flashcard set');
};

export const pinFlashcardSet = async (setId, isPinned) => {
  const response = await fetch(ENDPOINTS.FLASHCARDS.TOGGLE_PIN(setId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ is_pinned: isPinned }),
  });
  if (!response.ok) throw new Error('Failed to pin flashcard set');
};

export const updateFlashcardSetPosition = async (setId, position) => {
  const response = await fetch(ENDPOINTS.FLASHCARDS.UPDATE_POSITION(setId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ grid_position: position }),
  });
  if (!response.ok) throw new Error('Failed to update flashcard set position');
  return response;
};

export const getFlashcardProgress = async (userId, setId) => {
  const response = await fetch(ENDPOINTS.FLASHCARDS.PROGRESS(userId, setId), {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch flashcard progress');
  return await response.json();
};

export const reviewFlashcard = async (data) => {
  const response = await fetch(ENDPOINTS.FLASHCARDS.REVIEW, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to review flashcard');
};

export const reorderFlashcards = async (data) => {
  const response = await fetch(ENDPOINTS.FLASHCARDS.REORDER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to reorder flashcards');
};

export const createFlashcard = async (data) => {
  const response = await fetch(ENDPOINTS.FLASHCARDS.CARDS.CREATE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create flashcard');
  return await response.json();
};

export const updateFlashcard = async (cardId, data) => {
  const response = await fetch(ENDPOINTS.FLASHCARDS.CARDS.UPDATE(cardId), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update flashcard');
  return await response.json();
};

export const deleteFlashcard = async (cardId) => {
  const response = await fetch(ENDPOINTS.FLASHCARDS.CARDS.DELETE(cardId), {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to delete flashcard');
};

export const getFlashcardFolders = async (userId, notebookId) => {
  const response = await fetch(ENDPOINTS.FOLDERS.FLASHCARDS.LIST(notebookId, userId), {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch flashcard folders');
  return await response.json();
};

export const createFlashcardFolder = async (data) => {
  const response = await fetch(ENDPOINTS.FOLDERS.FLASHCARDS.CREATE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create flashcard folder');
  return await response.json();
};

export const deleteFlashcardFolder = async (folderId) => {
  const response = await fetch(ENDPOINTS.FOLDERS.FLASHCARDS.DELETE(folderId), {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to delete flashcard folder');
};

export const renameFlashcardFolder = async (folderId, newName) => {
  const response = await fetch(ENDPOINTS.FOLDERS.FLASHCARDS.RENAME(folderId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name: newName }),
  });
  if (!response.ok) throw new Error('Failed to rename flashcard folder');
};

export const moveFlashcardFolder = async (folderId, parentFolderId) => {
  const response = await fetch(ENDPOINTS.FOLDERS.FLASHCARDS.MOVE(folderId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ parent_folder_id: parentFolderId }),
  });
  if (!response.ok) throw new Error('Failed to move flashcard folder');
};

export const moveFlashcardSetToFolder = async (setId, folderId) => {
  const response = await fetch(ENDPOINTS.FOLDERS.FLASHCARDS.MOVE_ITEM, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ set_id: setId, folder_id: folderId }),
  });
  if (!response.ok) throw new Error('Failed to move flashcard set to folder');
};

export const updateFlashcardFolderPosition = async (folderId, position) => {
  const response = await fetch(ENDPOINTS.FOLDERS.FLASHCARDS.UPDATE_POSITION(folderId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ grid_position: position }),
  });
  if (!response.ok) throw new Error('Failed to update flashcard folder position');
  return response;
};
