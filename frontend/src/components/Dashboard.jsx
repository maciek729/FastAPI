import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/Dashboard.css';
import Sidebar from './Sidebar';

export default function Dashboard() {
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
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

    if (!userData) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div className="dashboard-container">
            <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
                {isSidebarOpen ? '◀' : '▶'}
            </button>
            
            <Sidebar 
                isSidebarOpen={isSidebarOpen}
                toggleSidebar={toggleSidebar}
                userData={userData}
                handleLogout={handleLogout}
            />

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