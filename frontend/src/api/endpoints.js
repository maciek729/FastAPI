import API_BASE_URL from './config';

const ENDPOINTS = {
  NOTEBOOKS: {
    LIST: `${API_BASE_URL}/notebooks/list`,
    CREATE: `${API_BASE_URL}/notebooks/create`,
    DELETE: (id) => `${API_BASE_URL}/notebooks/${id}/delete`,
  },
  USERS: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
  },
};

export default ENDPOINTS;
