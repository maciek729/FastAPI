const API_BASE_URL = window.location.origin.includes('localhost')
  ? 'http://localhost:8000'
  : 'https://zdaito.pl/api';

export default API_BASE_URL;
