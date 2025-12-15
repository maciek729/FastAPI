import API_BASE_URL from './config';

const ENDPOINTS = {
  AI:{
    UPLOAD: `${API_BASE_URL}/ai/upload`,
    CLEAR: `${API_BASE_URL}/ai/clear_files`,
    CHAT: `${API_BASE_URL}/ai/chat`,
    RESET: `${API_BASE_URL}/ai/reset_session`,
  },
  NOTEBOOKS: {
    LIST: (createdBy, spaceType) => `${API_BASE_URL}/notebooks/list?created_by=${createdBy}&space_type=${spaceType}`,
    CREATE: `${API_BASE_URL}/notebooks/create`,
    DELETE: (id) => `${API_BASE_URL}/notebooks/${id}/delete`,
    FETCH_COLLABORATORS: (id) => `${API_BASE_URL}/notebooks/${id}/collaborators`,
    ADD_COLLABORATOR: (id) => `${API_BASE_URL}/notebooks/${id}/add-collaborator`,
    REMOVE_COLLABORATOR: (notebookId, userId) => `${API_BASE_URL}/notebooks/${notebookId}/collaborator/${userId}`,
  },
  NOTES: {
    CREATE: `${API_BASE_URL}/notes/create`,
    LIST: (notebookId) => `${API_BASE_URL}/notes/list/${notebookId}`,
    GET: (noteId) => `${API_BASE_URL}/notes/${noteId}`,
    UPDATE: (noteId) => `${API_BASE_URL}/notes/${noteId}`,
    DELETE: (noteId) => `${API_BASE_URL}/notes/${noteId}`,
    COPY: (noteId) => `${API_BASE_URL}/notes/${noteId}/copy`,

    LOCK: (noteId) => `${API_BASE_URL}/notes/${noteId}/lock`,
    UNLOCK: (noteId) => `${API_BASE_URL}/notes/${noteId}/unlock`,
    LOCK_STATUS: (noteId) => `${API_BASE_URL}/notes/${noteId}/lock-status`,

    FOLDERS: {
      COPY: (folderId) => `${API_BASE_URL}/note-folders/${folderId}/copy`,
    },
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
    COPY: (testId) => `${API_BASE_URL}/tests/${testId}/copy`,
    FOLDERS: {
      LIST: (notebookId, userId) => `${API_BASE_URL}/test-folders/list?user_id=${userId}&notebook_id=${notebookId}`,
      CREATE: `${API_BASE_URL}/test-folders/create`,
      DELETE: (folderId) => `${API_BASE_URL}/test-folders/${folderId}`,
      RENAME: (folderId) => `${API_BASE_URL}/test-folders/${folderId}/rename`,
      MOVE: (folderId) => `${API_BASE_URL}/test-folders/${folderId}/move`,
      MOVE_TEST: `${API_BASE_URL}/test-folders/move-test`,
      UPDATE_POSITION: (folderId) => `${API_BASE_URL}/test-folders/${folderId}/position`,
      COPY: (folderId) => `${API_BASE_URL}/test-folders/${folderId}/copy`,
    },
  },
  FLASHCARDS: {
    LIST: (notebookId) => `${API_BASE_URL}/flashcards/sets/${notebookId}`,
    GENERATE: `${API_BASE_URL}/flashcards/generate`,
    GENERATE_FROM_FILE: `${API_BASE_URL}/flashcards/generate-from-file`,
    GET_CARDS: (setId) => `${API_BASE_URL}/flashcards/set/${setId}/cards`,
    UPDATE_SET: (setId) => `${API_BASE_URL}/flashcards/set/${setId}`,
    DELETE_SET: (setId) => `${API_BASE_URL}/flashcards/set/${setId}`,
    REVIEW: `${API_BASE_URL}/flashcards/review`,
    REORDER: `${API_BASE_URL}/flashcards/reorder`,
    TOGGLE_PIN: (setId) => `${API_BASE_URL}/flashcards/set/${setId}/pin`,
    UPDATE_POSITION: (setId) => `${API_BASE_URL}/flashcards/set/${setId}/position`,
    PROGRESS: (userId, setId) => `${API_BASE_URL}/flashcards/progress/${userId}/${setId}`,
    COPY_SET: (setId) => `${API_BASE_URL}/flashcards/set/${setId}/copy`,
    CARDS: {
      CREATE: `${API_BASE_URL}/flashcards/card`,
      UPDATE: (cardId) => `${API_BASE_URL}/flashcards/card/${cardId}`,
      DELETE: (cardId) => `${API_BASE_URL}/flashcards/card/${cardId}`,
    },
    FOLDERS: {
      LIST: `${API_BASE_URL}/flashcard-set-folders/list`,
      CREATE: `${API_BASE_URL}/flashcard-set-folders/create`,
      DELETE: (folderId) => `${API_BASE_URL}/flashcard-set-folders/${folderId}`,
      RENAME: (folderId) => `${API_BASE_URL}/flashcard-set-folders/${folderId}/rename`,
      MOVE: (folderId) => `${API_BASE_URL}/flashcard-set-folders/${folderId}/move`,
      MOVE_SET: `${API_BASE_URL}/flashcard-set-folders/move-set`,
      UPDATE_POSITION: (folderId) => `${API_BASE_URL}/flashcard-set-folders/${folderId}/position`,
      COPY: (folderId) => `${API_BASE_URL}/flashcard-set-folders/${folderId}/copy`,
    },
  },
  PODCASTS: {
    LIST: (notebookId) => `${API_BASE_URL}/podcasts/list?notebook_id=${notebookId}`,
    GENERATE: `${API_BASE_URL}/podcasts/generate`,
    DELETE: (podcastId) => `${API_BASE_URL}/podcasts/${podcastId}`, 
  },
  USERS: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
  },
};

export default ENDPOINTS;
