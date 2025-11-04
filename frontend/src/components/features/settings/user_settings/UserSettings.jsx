import React from 'react';

export default function UserSettings({userData}) {
    return (
        <div>
            <h1>Ustawienia użytkownika</h1>
            <p>Wybrany użytkownik: {userData?.username}</p>
            <p>Email: {userData?.email}</p>
            <p>Hasło: {userData?.hashed_password}</p>
        </div>
    );
}