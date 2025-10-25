import React from 'react';

export default function Settings({userData}) {
    return (
        <div>
            <h1>Tu będą ustawienia</h1>
            <p>Wybrany użytkownik: {userData?.username}</p>
            <p>Email: {userData?.email}</p>
            <p>Hasło: {userData?.hashed_password}</p>
        </div>
    );
}