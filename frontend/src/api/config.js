const API_BASE_URL = window.location.origin.includes('localhost')
  ? 'http://localhost:8000'
  : 'https://your-server-domain.com';

export default API_BASE_URL;
