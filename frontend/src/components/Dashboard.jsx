import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/Dashboard.css';
import Sidebar from './Sidebar';
import NotebookView from './NotebookView'; 

export default function Dashboard() {
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [selectedNotebook, setSelectedNotebook] = useState(null); // <-- tutaj przenosimy stan
    const [notebookDetails, setNotebookDetails] = useState(null);

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
        document.cookie.split(";").forEach(cookie => {
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        });
        navigate('/login');
    };

    const refreshNotebook = () => {
        fetch(`http://localhost:8000/notebooks/${selectedNotebook.id}`)
            .then(res => res.json())
            .then(data => setNotebookDetails(data))
            .catch(err => console.error('Błąd pobierania szczegółów:', err));
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
                    headers: { 'Authorization': `Bearer ${token}` }
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

    // Ładowanie szczegółów notatnika po kliknięciu
    useEffect(() => {
        if (selectedNotebook) {
            fetch(`http://localhost:8000/notebooks/${selectedNotebook.id}`)
                .then(res => res.json())
                .then(data => setNotebookDetails(data))
                .catch(err => console.error('Błąd pobierania szczegółów:', err));
        }
    }, [selectedNotebook]);

    if (!userData) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div className="dashboard-container">
            <button 
                className="sidebar-toggle-btn" 
                onClick={toggleSidebar}
                title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                style={{
                    left: isSidebarOpen ? '260px' : '16px',
                    transform: isSidebarOpen ? 'translateX(-50%)' : 'translateX(0)'
                }}
            >
                {isSidebarOpen ? '❮❮' : '❯❯'}
            </button>

            <Sidebar
                isSidebarOpen={isSidebarOpen}
                toggleSidebar={toggleSidebar}
                userData={userData}
                handleLogout={handleLogout}
                onSelectNotebook={setSelectedNotebook}
            />

            <main className="dashboard-content"
                style={{
                    marginLeft: isSidebarOpen ? '260px' : '0',
                    transition: 'margin-left 0.3s ease'
                }}>
                {!selectedNotebook ? (
                    <div className="user-info">
                        <h2>Wybierz notatnik z menu</h2>
                    </div>
                ) : (
                    <NotebookView
                        details={notebookDetails}
                        userData={userData}
                        refreshNotebook={refreshNotebook}
                    />
                )}
            </main>
        </div>
    );
}