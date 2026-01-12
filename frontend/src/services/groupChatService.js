import ENDPOINTS from '../api/endpoints';

const getHeaders = (token) => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
});

export const getChatHistory = async (notebookId) => {
    const response = await fetch(ENDPOINTS.GROUP_CHAT.HISTORY(notebookId));
    if (!response.ok) throw new Error('Błąd pobierania historii');
    return await response.json();
};

export const getChatMembers = async (notebookId) => {
    const response = await fetch(ENDPOINTS.GROUP_CHAT.MEMBERS(notebookId));
    if (!response.ok) throw new Error('Błąd pobierania członków');
    return await response.json();
};

export const getPinnedMessage = async (notebookId) => {
    const response = await fetch(ENDPOINTS.GROUP_CHAT.PINNED(notebookId));
    if (!response.ok) return null;
    return await response.json();
};

export const getAvailableResources = async (notebookId) => {
    try {
        const [notes, tests, flashcards, podcasts] = await Promise.all([
            fetch(ENDPOINTS.GROUP_CHAT.RESOURCES.NOTES(notebookId)).then(res => res.json()),
            fetch(ENDPOINTS.GROUP_CHAT.RESOURCES.TESTS(notebookId)).then(res => res.json()),
            fetch(ENDPOINTS.GROUP_CHAT.RESOURCES.FLASHCARDS(notebookId)).then(res => res.json()),
            fetch(ENDPOINTS.GROUP_CHAT.RESOURCES.PODCASTS(notebookId)).then(res => res.json()),
        ]);

        return { notes, tests, flashcards, podcasts };
    } catch (error) {
        console.error("Błąd agregacji zasobów:", error);
        return { notes: [], tests: [], flashcards: [], podcasts: [] };
    }
};

export const deleteMessage = async (messageId, userId) => {
    const response = await fetch(ENDPOINTS.GROUP_CHAT.DELETE_MESSAGE(messageId, userId), {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Błąd usuwania wiadomości');
    return true;
};

export const editMessage = async (messageId, userId, newContent) => {
    const response = await fetch(ENDPOINTS.GROUP_CHAT.EDIT_MESSAGE(messageId, userId, newContent), {
        method: 'PATCH'
    });
    if (!response.ok) throw new Error('Błąd edycji wiadomości');
    return true;
};

export const pinMessage = async (messageId, userId) => {
    const response = await fetch(ENDPOINTS.GROUP_CHAT.PIN_MESSAGE(messageId, userId), {
        method: 'PATCH'
    });
    if (!response.ok) throw new Error('Błąd przypinania wiadomości');
    return true;
};

export const unpinAllMessages = async (notebookId) => {
    const response = await fetch(ENDPOINTS.GROUP_CHAT.UNPIN_ALL(notebookId), {
        method: 'PATCH'
    });
    if (!response.ok) throw new Error('Błąd odpinania wiadomości');
    return true;
};

export const getUnreadStatus = async (userId) => {
    const response = await fetch(ENDPOINTS.GROUP_CHAT.UNREAD_STATUS(userId));
    
    if (!response.ok) {
        console.warn('Nie udało się pobrać statusu wiadomości');
        return {}; 
    }
    
    return await response.json();
};

export const markChatAsRead = async (notebookId, userId) => {
    const response = await fetch(ENDPOINTS.GROUP_CHAT.MARK_READ(notebookId, userId), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) {
        console.warn('Błąd oznaczania jako przeczytane');
    }
};