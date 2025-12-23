import ENDPOINTS from '../api/endpoints';

const getAuthHeaders = (token, isFormData = false) => {
    const headers = {
        'Authorization': `Bearer ${token}`,
    };
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }
    return headers;
};

export const changeUsername = async (newUsername, token) => {
    const response = await fetch(ENDPOINTS.USERS.CHANGE_USERNAME(newUsername), {
        method: 'PUT',
        headers: getAuthHeaders(token),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Błąd zmiany nazwy użytkownika');
    }
    return true;
};

export const requestPasswordReset = async (email) => {
    const formData = new FormData();
    formData.append('email', email);

    const response = await fetch(ENDPOINTS.USERS.REQUEST_PASSWORD_RESET, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Nie udało się wysłać emaila resetującego.');
    }
    return await response.json();
};

export const checkUsernameAvailability = async (username, token) => {
     const response = await fetch(ENDPOINTS.USERS.CHECK_AVAILABILITY(username), {
        method: 'GET',
        headers: getAuthHeaders(token),
    });
    
    if (!response.ok) throw new Error('Błąd sprawdzania dostępności');
    return await response.json();
};

export const uploadAvatar = async (file, token) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(ENDPOINTS.USERS.UPLOAD_AVATAR, {
        // tutaj jest post ze względu na to, że nie mamy oryginalnego
        // zdjęcia avatara nigdzie zapisanego
        // nie mam tez zmiennej na razie
        method: 'POST', // tutaj zmienie to na PUT, ale nie mam zmiennej
        headers: getAuthHeaders(token, true), // true -> bo to FormData
        body: formData
    });

    if (!response.ok) throw new Error('Błąd przesyłania awatara');
    return await response.json();
};

export const deleteAvatar = async (token) => {
    const response = await fetch(ENDPOINTS.USERS.DELETE_AVATAR, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Błąd usuwania awatara');
    }
    return true;
};

export const archiveUserAccount = async (token) => {
    const response = await fetch(ENDPOINTS.USERS.DELETE_ACCOUNT, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Nie udało się usunąć konta');
    }
    return true;
};