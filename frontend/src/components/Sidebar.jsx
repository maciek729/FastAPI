import { useEffect } from 'react';
import { useState } from "react";
import axios from 'axios';

const Sidebar = ({ isSidebarOpen, toggleSidebar, userData, handleLogout }) => {
    const [spaces, setSpaces] = useState([]);
    const [expandedSpaces, setExpandedSpaces] = useState([]);

    useEffect(() => {
        fetchSpaces();
    }, []);

    const fetchSpaces = async () => {
        try {
            const response = await axios.get('http://localhost:8000/spaces/list', {
                params: {
                    created_by: userData.id
                }
            });
            setSpaces(response.data);
            setExpandedSpaces(response.data.map(() => false));
        } catch (error) {
            console.error('Błąd pobierania przestrzeni:', error);
        }
    };

    const handleAddSpace = async () => {
        const name = prompt('Podaj nazwę przestrzeni:');
        if (!name) return;

        try {
            const response = await axios.post('http://localhost:8000/spaces/create', {
                name: name,
                created_by: userData.id 
            });

            console.log('Dodano przestrzeń:', response.data);
            fetchSpaces(); 
        } catch (error) {
            alert('Błąd dodawania przestrzeni: ' + error.response?.data?.detail || error.message);
        }
    };

        return (
        <aside className={`sidebar ${!isSidebarOpen ? 'collapsed' : ''}`}>
            <div className="sidebar-inner">
                <div className="sidebar-content">
                    <h1>zdAI to!</h1>

                    {spaces.map((space, index) => (
                        <div className="sidebar-section" key={space.name}>
                            <div
                                className="sidebar-section-title"
                                onClick={() => toggleSpace(index)}
                                style={{ cursor: 'pointer' }}
                            >
                                {expandedSpaces[index] ? '▾' : '▸'} {space.name}
                            </div>
                            {expandedSpaces[index] && (
                                <ul className="js-submenu">
                                    {/* Przykład pokoju — do zmiany na dynamiczne pokoje później */}
                                    <li>Pierwszy pokój</li>
                                    <li>Drugi pokój</li>
                                    <li style={{ color: 'green', cursor: 'pointer' }}>
                                        ➕ Dodaj pokój
                                    </li>
                                </ul>
                            )}
                        </div>
                    ))}

                    <button onClick={handleAddSpace} style={{ marginTop: '10px', width: '100%' }}>
                        ➕ Dodaj przestrzeń
                    </button>
                </div>
            </div>
        </aside>
    );

};

export default Sidebar;