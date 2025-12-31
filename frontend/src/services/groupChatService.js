import ENDPOINTS from '../api/endpoints';

const handleResponse = async (response) => {
  if (response.status === 204) return {};
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Błąd serwera' }));
    throw new Error(errorData.detail || 'Wystąpił błąd');
  }
  return await response.json();
};

export const getChatHistory = async (notebookId) => {
  const response = await fetch(ENDPOINTS.GROUP_CHAT.HISTORY(notebookId), { credentials: 'include' });
  return handleResponse(response);
};

export const getChatMembers = async (notebookId) => {
  const response = await fetch(ENDPOINTS.GROUP_CHAT.MEMBERS(notebookId), { credentials: 'include' });
  return handleResponse(response);
};

export const getPinnedMessage = async (notebookId) => {
  const response = await fetch(ENDPOINTS.GROUP_CHAT.PINNED(notebookId), { credentials: 'include' });
  return handleResponse(response);
};

export const deleteMessage = async (messageId, userId) => {
  const response = await fetch(ENDPOINTS.GROUP_CHAT.DELETE(messageId, userId), { method: 'DELETE', credentials: 'include' });
  return handleResponse(response);
};

export const editMessage = async (messageId, userId, content) => {
  const response = await fetch(ENDPOINTS.GROUP_CHAT.EDIT(messageId, userId, content), { method: 'PATCH', credentials: 'include' });
  return handleResponse(response);
};

export const pinMessage = async (messageId, userId) => {
  const response = await fetch(ENDPOINTS.GROUP_CHAT.PIN(messageId, userId), { method: 'PATCH', credentials: 'include' });
  return handleResponse(response);
};

export const unpinAllMessages = async (notebookId) => {
  const response = await fetch(ENDPOINTS.GROUP_CHAT.UNPIN(notebookId), { method: 'PATCH', credentials: 'include' });
  return handleResponse(response);
};

export const getAvailableResources = async (notebookId) => {
  const [notes, tests, flashcards, podcasts] = await Promise.all([
    fetch(ENDPOINTS.GROUP_CHAT.RES_NOTES(notebookId)).then(handleResponse),
    fetch(ENDPOINTS.GROUP_CHAT.RES_TESTS(notebookId)).then(handleResponse),
    fetch(ENDPOINTS.GROUP_CHAT.RES_FLASHCARDS(notebookId)).then(handleResponse),
    fetch(ENDPOINTS.GROUP_CHAT.RES_PODCASTS(notebookId)).then(handleResponse),
  ]);
  return { notes, tests, flashcards, podcasts };
};

// GŁOSOWANIE
export const initiateChatClear = async (notebookId, userId) => {
  const response = await fetch(ENDPOINTS.GROUP_CHAT.INITIATE_CLEAR(notebookId, userId), { method: 'POST', credentials: 'include' });
  return handleResponse(response);
};

export const castClearVote = async (requestId, userId) => {
  const response = await fetch(ENDPOINTS.GROUP_CHAT.VOTE_CLEAR(requestId, userId), { method: 'POST', credentials: 'include' });
  return handleResponse(response);
};