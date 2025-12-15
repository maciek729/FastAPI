import ENDPOINTS from "../api/endpoints";

export const fetchPodcasts = async (notebookId) => {
  const response = await fetch(ENDPOINTS.PODCASTS.LIST(notebookId), {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error("Błąd podczas pobierania podcastów");
  }

  return response.json();
};

export const generatePodcast = async (notebookId, userId, topic, noteIds) => {
  const response = await fetch(ENDPOINTS.PODCASTS.GENERATE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: 'include',
    body: JSON.stringify({
      notebook_id: notebookId,
      user_id: userId,
      topic: topic,
      note_ids: noteIds
    }),
  });

  if (!response.ok) {
     const errorBody = await response.json().catch(() => ({ detail: 'Nieznany błąd serwera' }));
     throw new Error(errorBody.detail || "Błąd podczas generowania podcastu");
  }
  return response.json();
};

export const deletePodcast = async (podcastId) => {
  const response = await fetch(ENDPOINTS.PODCASTS.DELETE(podcastId), {
    method: "DELETE",
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error("Błąd podczas usuwania podcastu");
  }
  return {};
};