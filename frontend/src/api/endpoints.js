import API_BASE_URL from './config';

const ENDPOINTS = {
  AI:{
    UPLOAD: `${API_BASE_URL}/ai/upload`,
    CLEAR: `${API_BASE_URL}/ai/clear_files`,
    CHAT: `${API_BASE_URL}/ai/chat`,
    RESET: `${API_BASE_URL}/ai/reset_session`,
  },
  NOTEBOOKS: {
    LIST: `${API_BASE_URL}/notebooks/list`,
    CREATE: `${API_BASE_URL}/notebooks/create`,
    DELETE: (id) => `${API_BASE_URL}/notebooks/${id}/delete`,
    FETCH_COLLABORATORS: (id) => `${API_BASE_URL}/notebooks/${id}/collaborators`,
    ADD_COLLABORATOR: (id) => `${API_BASE_URL}/notebooks/${id}/add-collaborator`,
    REMOVE_COLLABORATOR: (notebookId, userId) => `${API_BASE_URL}/notebooks/${notebookId}/collaborator/${userId}`,
  },
  NOTES: {
    CREATE: `${API_BASE_URL}/notes/create`,
    LIST: (notebookId) => `${API_BASE_URL}/notebooks/${notebookId}/notes/list`,
    GET: (noteId) => `${API_BASE_URL}/notes/${noteId}`,
    UPDATE: (noteId) => `${API_BASE_URL}/notes/${noteId}`,
    DELETE: (noteId) => `${API_BASE_URL}/notes/${noteId}`,

    LOCK: (noteId) => `${API_BASE_URL}/notes/${noteId}/lock`,
    UNLOCK: (noteId) => `${API_BASE_URL}/notes/${noteId}/unlock`,
    LOCK_STATUS: (noteId) => `${API_BASE_URL}/notes/${noteId}/lock-status`,
  },
  TESTS: {
    LIST: (notebookId, userId) => `${API_BASE_URL}/tests/list?user_id=${userId}&notebook_id=${notebookId}`,
    GENERATE: `${API_BASE_URL}/tests/generate`,
    GENERATE_FROM_FILE: `${API_BASE_URL}/tests/generate-from-file`,
    GET: (testId) => `${API_BASE_URL}/tests/${testId}`,
    DELETE: (testId, userId) => `${API_BASE_URL}/tests/${testId}?user_id=${userId}`,
    SUBMIT_ANSWER: `${API_BASE_URL}/tests/submit-answer`,
    RESULTS: (testId, userId) => `${API_BASE_URL}/tests/results/${testId}?user_id=${userId}`,
    TOGGLE_PIN: (testId) => `${API_BASE_URL}/tests/${testId}/pin`,
    UPDATE_POSITION: (testId) => `${API_BASE_URL}/tests/${testId}/position`,
    NOTES: {
      LIST: (notebookId) => `${API_BASE_URL}/notes/list/${notebookId}`,
    },
    FOLDERS: {
      LIST: (notebookId, userId) => `${API_BASE_URL}/test-folders/list?user_id=${userId}&notebook_id=${notebookId}`,
      CREATE: `${API_BASE_URL}/test-folders/create`,
      DELETE: (folderId) => `${API_BASE_URL}/test-folders/${folderId}`,
      RENAME: (folderId) => `${API_BASE_URL}/test-folders/${folderId}/rename`,
      MOVE: (folderId) => `${API_BASE_URL}/test-folders/${folderId}/move`,
      MOVE_TEST: `${API_BASE_URL}/test-folders/move-test`,
      UPDATE_POSITION: (folderId) => `${API_BASE_URL}/test-folders/${folderId}/position`,
    },
  },
  USERS: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
  },
};

export default ENDPOINTS;
