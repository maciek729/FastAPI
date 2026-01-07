import ENDPOINTS from "../api/endpoints";

const handleResponse = async (response) => {
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ detail: 'Nieznany błąd serwera' }));
        throw new Error(errorBody.detail || "Wystąpił błąd");
    }
    return response.json();
};

const getHeaders = () => ({
    "Content-Type": "application/json",
});

export const fetchPodcasts = async (notebookId) => {
  const response = await fetch(ENDPOINTS.PODCASTS.LIST(notebookId), { credentials: 'include' });
  return handleResponse(response);
};

export const generatePodcast = async (notebookId, userId, title, noteIds, parentFolderId = null, description = null) => {
  const response = await fetch(ENDPOINTS.PODCASTS.GENERATE, {
    method: "POST",
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify({
      notebook_id: notebookId,
      user_id: userId,
      title: title,
      topic: description || title, 
      note_ids: noteIds,
      parent_folder_id: parentFolderId
    }),
  });
  return handleResponse(response);
};

export const deletePodcast = async (podcastId) => {
  const response = await fetch(ENDPOINTS.PODCASTS.DELETE(podcastId), {
    method: "DELETE",
    credentials: 'include',
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: 'Nieznany błąd serwera' }));
    throw new Error(errorBody.detail || "Błąd usuwania podcastu");
  }
  return {};
};

export const renamePodcast = async (podcastId, newName) => {
    const response = await fetch(ENDPOINTS.PODCASTS.RENAME(podcastId), {
        method: "PATCH",
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ name: newName })
    });
    return handleResponse(response);
};

export const pinPodcast = async (podcastId, isPinned) => {
    const response = await fetch(ENDPOINTS.PODCASTS.TOGGLE_PIN(podcastId), {
        method: "PATCH",
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ is_pinned: isPinned })
    });
    return handleResponse(response);
};

export const updatePodcastPosition = async (podcastId, position) => {
    const response = await fetch(ENDPOINTS.PODCASTS.UPDATE_POSITION(podcastId), {
        method: "PATCH",
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ grid_position: position })
    });
    return handleResponse(response);
};

export const fetchPodcastFolders = async (notebookId, userId) => {
    const response = await fetch(ENDPOINTS.FOLDERS.PODCASTS.LIST(notebookId, userId), 
    { credentials: 'include' });
    return handleResponse(response);
};

export const createPodcastFolder = async (notebookId, userId, name, parentFolderId = null) => {
    const response = await fetch(ENDPOINTS.FOLDERS.PODCASTS.CREATE, {
        method: "POST",
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ notebook_id: notebookId, user_id: userId, name, parent_folder_id: parentFolderId })
    });
    return handleResponse(response);
};

export const deletePodcastFolder = async (folderId) => {
    const response = await fetch(ENDPOINTS.FOLDERS.PODCASTS.DELETE(folderId), {
        method: "DELETE",
        credentials: 'include'
    });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ detail: 'Nieznany błąd serwera' }));
        throw new Error(errorBody.detail || "Błąd usuwania folderu");
    }
    return {};
};

export const renamePodcastFolder = async (folderId, newName) => {
    const response = await fetch(ENDPOINTS.FOLDERS.PODCASTS.RENAME(folderId), {
        method: "PATCH",
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ name: newName })
    });
    return handleResponse(response);
};

export const movePodcastToFolder = async (podcastId, folderId) => {
    const response = await fetch(ENDPOINTS.FOLDERS.PODCASTS.MOVE_ITEM, {
        method: "POST",
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ item_id: podcastId, folder_id: folderId })
    });
    return handleResponse(response);
};

export const updatePodcastFolderPosition = async (folderId, position) => {
    const response = await fetch(ENDPOINTS.FOLDERS.PODCASTS.UPDATE_POSITION(folderId), {
        method: "PATCH",
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ grid_position: position })
    });
    return handleResponse(response);
};

export const movePodcastFolder = async (folderId, parentFolderId) => {
    const response = await fetch(ENDPOINTS.FOLDERS.PODCASTS.MOVE(folderId), {
        method: "PATCH",
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ parent_folder_id: parentFolderId })
    });
    return handleResponse(response);
};