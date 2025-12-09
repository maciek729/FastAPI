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
  USERS: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
  },
};

export default ENDPOINTS;
