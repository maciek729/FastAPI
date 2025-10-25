import React  from "react";

export default function Help({details, userData, refreshNotebook}) {
    return (
        <div style={{ padding: '20px', background: '#e0f2fe', borderRadius: '8px' }}>
            <h1>Customowy Widok Notatnika: {details?.name}</h1>
            <p>Wybrany użytkownik: {userData?.username}</p>
            <p>Możesz tutaj zaimplementować swoją własną logikę.</p>
            <button onClick={refreshNotebook}>Odśwież Notatnik</button>
        </div>
    );
}