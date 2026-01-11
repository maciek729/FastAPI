import ENDPOINTS from '../api/endpoints';

const triggerRefresh = () => {
    window.dispatchEvent(new Event("refreshNotifications"));
};

const handleResponse = async (response) => {
    if (response.status === 204) return {}; 
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Błąd serwera' }));
        throw new Error(errorData.detail || 'Wystąpił błąd podczas obsługi powiadomień');
    }
    return await response.json();
};

export const getUserNotifications = async (userId) => {
    const response = await fetch(ENDPOINTS.NOTIFICATIONS.LIST(userId), {
        credentials: 'include',
    });
    return handleResponse(response);
};

export const markNotificationAsRead = async (notificationId) => {
    const response = await fetch(ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId), {
        method: 'PATCH',
        credentials: 'include',
    });
    triggerRefresh();
    return handleResponse(response);
};

export const deleteNotification = async (notificationId) => {
    const response = await fetch(ENDPOINTS.NOTIFICATIONS.DELETE(notificationId), {
        method: 'DELETE',
        credentials: 'include',
    });
    triggerRefresh();
    return handleResponse(response);
};

export const clearAllNotifications = async (userId) => {
    const response = await fetch(ENDPOINTS.NOTIFICATIONS.CLEAR_ALL(userId), {
        method: 'DELETE',
        credentials: 'include',
    });
    return handleResponse(response);
};