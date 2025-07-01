import { useEffect, useState } from "react";
import axios from "axios";

const Sidebar = ({ isSidebarOpen, toggleSidebar, userData, handleLogout }) => {
    const [spaces, setSpaces] = useState([]);
    const [expandedSpaces, setExpandedSpaces] = useState([]);
    const [notebooks, setNotebooks] = useState({}); // {space_id: [notebook, ...]}
    const [optionsOpen, setOptionsOpen] = useState(false);

    useEffect(() => {
        fetchSpaces();
    }, []);

    const fetchSpaces = async () => {
        try {
            const response = await axios.get('http://localhost:8000/spaces/list', {
                params: { created_by: userData.id }
            });
            setSpaces(response.data);
            setExpandedSpaces(response.data.map(() => false));
            response.data.forEach(space => fetchNotebooks(space.id));
        } catch (error) {
            console.error('Błąd pobierania przestrzeni:', error);
        }
    };

    const fetchNotebooks = async (spaceId) => {
        try {
            const response = await axios.get('http://localhost:8000/notebooks/list', {
                params: { space_id: spaceId }
            });
            setNotebooks(prev => ({ ...prev, [spaceId]: response.data }));
        } catch (error) {
            console.error('Błąd pobierania notatników:', error);
        }
    };

    const handleAddSpace = async () => {
        const name = prompt('Podaj nazwę przestrzeni:');
        if (!name) return;
        try {
            await axios.post('http://localhost:8000/spaces/create', {
                name: name,
                created_by: userData.id
            });
            fetchSpaces();
        } catch (error) {
            alert('Błąd dodawania przestrzeni: ' + error.response?.data?.detail || error.message);
        }
    };

    const handleAddNotebook = async (spaceId) => {
        const name = prompt('Podaj nazwę notatnika:');
        if (!name) return;
        try {
            await axios.post('http://localhost:8000/notebooks/create', {
                name: name,
                created_by: userData.id,
                space_id: spaceId
            });
            fetchNotebooks(spaceId);
        } catch (error) {
            alert('Błąd dodawania notatnika: ' + (error.response?.data?.detail || error.message));
        }
    };

    const toggleSpace = (index) => {
        setExpandedSpaces(prev => {
            const newState = [...prev];
            newState[index] = !newState[index];
            return newState;
        });
    };

    return (
        <aside className={`sidebar ${!isSidebarOpen ? 'collapsed' : ''}`}>
            <div className="sidebar-inner">
                <div className="sidebar-content">
                    <h1>zdAI to!</h1>
                    {spaces.map((space, index) => (
                        <div className="sidebar-section" key={space.id}>
                            <div
                                className="sidebar-section-title"
                                onClick={() => toggleSpace(index)}
                                style={{ cursor: 'pointer' }}
                            >
                                {expandedSpaces[index] ? '▾' : '▸'} {space.name}
                            </div>
                            {expandedSpaces[index] && (
                                <ul className="js-submenu">
                                    {(notebooks[space.id] || []).map(notebook => (
                                        <li key={notebook.id}>{notebook.name}</li>
                                    ))}
                                    <li
                                        key="add-notebook"
                                        style={{ color: 'green', cursor: 'pointer' }}
                                        onClick={() => handleAddNotebook(space.id)}
                                    >
                                        ➕ Dodaj notatnik
                                    </li>
                                </ul>
                            )}
                        </div>
                    ))}
                    <button onClick={handleAddSpace} style={{ marginTop: '10px', width: '100%' }}>
                        ➕ Dodaj przestrzeń
                    </button>
                </div>
                {/* Sekcja OPCJE na dole */}
                <div className="sidebar-options" style={{ marginTop: 'auto' }}>
                    <div
                        className="sidebar-section-title"
                        onClick={() => setOptionsOpen(o => !o)}
                        style={{ cursor: 'pointer', fontWeight: 'bold', padding: '10px 0' }}
                    >
                        {optionsOpen ? '▾' : '▸'} Opcje
                    </div>
                    {optionsOpen && (
                        <ul className="js-submenu">
                            <li style={{ cursor: 'pointer' }}>
                                Ustawienia konta
                            </li>
                            <li
                                style={{ color: 'red', cursor: 'pointer' }}
                                onClick={handleLogout}
                            >
                                Wyloguj się
                            </li>
                        </ul>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;