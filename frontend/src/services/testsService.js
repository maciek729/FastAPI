import ENDPOINTS from "../api/endpoints";
import { throwApiError } from "./apiError";

export const fetchTests = async (userId, notebookId) => {
  const response = await fetch(ENDPOINTS.TESTS.LIST(notebookId, userId), {
    credentials: 'include',
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: 'Nieznany błąd serwera' }));
    throw new Error(errorBody.detail || 'Failed to fetch tests');
  }
  return await response.json();
};

export const generateTest = async (testData) => {
  const response = await fetch(ENDPOINTS.TESTS.GENERATE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(testData),
  });
  if (!response.ok) {
    await throwApiError(response, 'Failed to generate test');
  }
  return await response.json();
};

export const generateTestFromFile = async (formData) => {
  const response = await fetch(ENDPOINTS.TESTS.GENERATE_FROM_FILE, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!response.ok) {
    await throwApiError(response, 'Failed to generate test from file');
  }
  return await response.json();
};

export const getTest = async (testId) => {
  const response = await fetch(ENDPOINTS.TESTS.GET(testId), {
    credentials: 'include',
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: 'Nieznany błąd serwera' }));
    throw new Error(errorBody.detail || 'Failed to get test');
  }
  return await response.json();
};

export const deleteTest = async (testId, userId) => {
  const response = await fetch(ENDPOINTS.TESTS.DELETE(testId, userId), {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: 'Nieznany błąd serwera' }));
    throw new Error(errorBody.detail || 'Failed to delete test');
  }
  return {};
};

export const submitAnswer = async (answerData) => {
  const response = await fetch(ENDPOINTS.TESTS.SUBMIT_ANSWER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(answerData),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: 'Nieznany błąd serwera' }));
    throw new Error(errorBody.detail || 'Failed to submit answer');
  }
  return await response.json();
};

export const getTestResults = async (testId, userId) => {
  const response = await fetch(ENDPOINTS.TESTS.RESULTS(testId, userId), {
    credentials: 'include',
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: 'Nieznany błąd serwera' }));
    throw new Error(errorBody.detail || 'Failed to get test results');
  }
  return await response.json();
};

export const togglePinTest = async (testId, isPinned) => {
  const response = await fetch(ENDPOINTS.TESTS.TOGGLE_PIN(testId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ is_pinned: isPinned }),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: 'Nieznany błąd serwera' }));
    throw new Error(errorBody.detail || 'Failed to toggle pin');
  }
  return await response.json();
};

export const updateTestPosition = async (testId, gridPosition) => {
  const response = await fetch(ENDPOINTS.TESTS.UPDATE_POSITION(testId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ grid_position: gridPosition }),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: 'Nieznany błąd serwera' }));
    throw new Error(errorBody.detail || 'Failed to update test position');
  }
  return await response.json();
};

export const fetchTestFolders = async (userId, notebookId) => {
  const response = await fetch(ENDPOINTS.FOLDERS.TESTS.LIST(notebookId, userId), {
    credentials: 'include',
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: 'Nieznany błąd serwera' }));
    throw new Error(errorBody.detail || 'Failed to fetch test folders');
  }
  return await response.json();
};

export const createTestFolder = async (folderData) => {
  const response = await fetch(ENDPOINTS.FOLDERS.TESTS.CREATE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(folderData),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: 'Nieznany błąd serwera' }));
    throw new Error(errorBody.detail || 'Failed to create test folder');
  }
  return await response.json();
};

export const deleteTestFolder = async (folderId) => {
  const response = await fetch(ENDPOINTS.FOLDERS.TESTS.DELETE(folderId), {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: 'Nieznany błąd serwera' }));
    throw new Error(errorBody.detail || 'Failed to delete test folder');
  }
  return {};
};

export const renameTestFolder = async (folderId, name) => {
  const response = await fetch(ENDPOINTS.FOLDERS.TESTS.RENAME(folderId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: 'Nieznany błąd serwera' }));
    throw new Error(errorBody.detail || 'Failed to rename test folder');
  }
  return await response.json();
};

export const moveTestFolder = async (folderId, parentFolderId) => {
  const response = await fetch(ENDPOINTS.FOLDERS.TESTS.MOVE(folderId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ parent_folder_id: parentFolderId }),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: 'Nieznany błąd serwera' }));
    throw new Error(errorBody.detail || 'Failed to move test folder');
  }
  return await response.json();
};

export const moveTestToFolder = async (testId, folderId) => {
  const response = await fetch(ENDPOINTS.FOLDERS.TESTS.MOVE_ITEM, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ test_id: testId, folder_id: folderId }),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: 'Nieznany błąd serwera' }));
    throw new Error(errorBody.detail || 'Failed to move test to folder');
  }
  return await response.json();
};

export const updateTestFolderPosition = async (folderId, gridPosition) => {
  const response = await fetch(ENDPOINTS.FOLDERS.TESTS.UPDATE_POSITION(folderId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ grid_position: gridPosition }),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: 'Nieznany błąd serwera' }));
    throw new Error(errorBody.detail || 'Failed to update test folder position');
  }
  return await response.json();
};

export const fetchNotes = async (notebookId) => {
  const response = await fetch(ENDPOINTS.NOTES.LIST(notebookId), {
    credentials: 'include',
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: 'Nieznany błąd serwera' }));
    throw new Error(errorBody.detail || 'Failed to fetch notes');
  }
  return await response.json();
};  