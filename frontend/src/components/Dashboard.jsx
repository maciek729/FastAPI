import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/Dashboard.css';

export default function Dashboard() {
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    // Defaultowe przestrzenie i pokoje
    const [spaces, setSpaces] = useState([
        {
            title: 'Moja przestrzeń',
            className: 'my-space',
            rooms: ['Fizyka', 'Matematyka']
        },
        {
            title: 'Przestrzeń XYZ',
            className: 'xyz-space',
            rooms: ['Biologia']
        },
        {
            title: 'Ustawienia',
            className: 'settings-space',
            rooms: ['Profil', 'Ustawienia', 'Wyloguj się']
        }
    ]);

    // Kontrola Paska bocznego
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const toggleSidebar = () => setIsSidebarOpen(prev => !prev);


    const getCookie = (name) => {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    };

    const handleLogout = () => {
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        }
        navigate('/login');
    };
    const handleAddSpace = () => {
        const newTitle = prompt("Podaj nazwę nowej przestrzeni:");
        if (!newTitle) return;

        const newClassName = newTitle.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
        setSpaces(prev => [
            ...prev,
            {
                title: newTitle,
                className: newClassName,
                rooms: []
            }
        ]);
    };

    const handleAddRoom = (spaceIndex) => {
        const newRoom = prompt("Podaj nazwę nowego pokoju:");
        if (!newRoom) return;

        setSpaces(prev => {
            const updated = [...prev];
            updated[spaceIndex] = {
                ...updated[spaceIndex],
                rooms: [...updated[spaceIndex].rooms, newRoom]
            };
            return updated;
        });
    };

    useEffect(() => {
        const token = getCookie('access_token');
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchUserData = async () => {
            try {
                const response = await fetch('http://localhost:8000/user/', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setUserData(data);
                } else {
                    handleLogout();
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
                handleLogout();
            }
        };

        fetchUserData();
    }, [navigate]);

   useEffect(() => {
        const handleToggleClick = (e) => {
            const toggle = e.currentTarget;
            const targetClass = toggle.dataset.target;
            const submenu = document.querySelector(`.js-submenu.${targetClass}`);
            const isHidden = submenu.classList.contains('hidden');

            submenu.classList.toggle('hidden');
            toggle.textContent = `${isHidden ? '▾' : '▸'} ${toggle.textContent.slice(2)}`;
        };

        const toggles = document.querySelectorAll('.js-toggle');
        
        // Najpierw usuwamy wszystkie wcześniej dodane zdublowane nasłuchiwacze
        toggles.forEach(toggle => {
            toggle.replaceWith(toggle.cloneNode(true));
        });

        // Od nowa dodajemy tylko jeden nasłuchiwacz
        const freshToggles = document.querySelectorAll('.js-toggle');
        freshToggles.forEach(toggle => {
            toggle.addEventListener('click', handleToggleClick);
        });

        return () => {
            freshToggles.forEach(toggle => {
                toggle.removeEventListener('click', handleToggleClick);
            });
        };
    }, [spaces]);

    if (!userData) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div className="dashboard-container">
            <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
                {isSidebarOpen ? '◀' : '▶'}
            </button>
            <aside className={`sidebar ${!isSidebarOpen ? 'collapsed' : ''}`}>
                <div className="sidebar-inner">
                    <div className="sidebar-content">
                        <h1>zdAI to!</h1>

                        {spaces.map((space, index) => (
                            <div className="sidebar-section" key={space.className}>
                                <div className="sidebar-section-title js-toggle" data-target={space.className}>
                                    ▸ {space.title}
                                </div>
                                <ul className={`js-submenu ${space.className} hidden`}>
                                    {space.rooms.map((room, i) => (
                                        <li
                                            key={i}
                                            onClick={room === 'Wyloguj się' ? handleLogout : null}
                                            style={room === 'Wyloguj się' ? { cursor: 'pointer', color: 'red' } : {}}
                                        >
                                            {room}
                                        </li>
                                    ))}
                                    <li
                                        style={{ color: 'green', cursor: 'pointer' }}
                                        onClick={() => handleAddRoom(index)}
                                    >
                                        ➕ Dodaj pokój
                                    </li>
                                </ul>
                            </div>
                        ))}

                        <button onClick={handleAddSpace} style={{ marginTop: '10px', width: '100%' }}>
                            ➕ Dodaj przestrzeń
                        </button>
                    </div>
                </div>
            </aside>

            <main className="dashboard-content">
                <nav className="dashboard-nav">
                    <h1>Welcome, {userData.first_name}!</h1>
                </nav>
                <div className="user-info">
                    <h2>Your Profile</h2>
                    <p>Email: {userData.email}</p>
                    <p>Username: {userData.username}</p>
                    <p>Role: {userData.role}</p>
                    <p>Phone: {userData.phone_number}</p>
                </div>
            </main>
        </div>
    );
}
