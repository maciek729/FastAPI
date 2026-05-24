import ENDPOINTS from '../api/endpoints';

const getAuthHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

const parseError = async (response, fallback) => {
  const data = await response.json().catch(() => ({}));
  throw new Error(data?.detail || fallback);
};

export const fetchQuotaOverview = async (token) => {
  const response = await fetch(ENDPOINTS.ADMIN.QUOTA_OVERVIEW, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  if (!response.ok) return parseError(response, 'Failed to fetch quota overview');
  return await response.json();
};

export const fetchQuotaUsers = async (token, limit = 100) => {
  const response = await fetch(ENDPOINTS.ADMIN.QUOTA_USERS(limit), {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  if (!response.ok) return parseError(response, 'Failed to fetch quota users');
  return await response.json();
};

export const fetchQuotaLogs = async (token, limit = 100, userId = null) => {
  const response = await fetch(ENDPOINTS.ADMIN.QUOTA_LOGS(limit, userId), {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  if (!response.ok) return parseError(response, 'Failed to fetch quota logs');
  return await response.json();
};
