import React  from "react";

export default function Help({userData}) {
    return (
        <div>
            <p>Wybrany użytkownik: {userData?.username}</p>
            <p>Możesz tutaj zaimplementować swoją własną logikę.</p>
        </div>
    );
}