import { useEffect, useState } from "react";
import axios from "axios";
import '../css/Sidebar.css';

const Sidebar = ({ isSidebarOpen, toggleSidebar, userData, handleLogout, onSelectNotebook }) => {
    const [spaces] = useState([
        { id: 'personal', name: 'Przestrzeń Osobista', icon: '🔒' },
        { id: 'shared', name: 'Przestrzeń Wspólna', icon: '👥' }
    ]);
    const [expandedSpaces, setExpandedSpaces] = useState(['personal', 'shared']);
    const [notebooks, setNotebooks] = useState({});
    const [selectedNotebook, setSelectedNotebook] = useState(null);

    useEffect(() => {
        fetchNotebooks('personal');
        fetchNotebooks('shared');
    }, [userData.id]);

    const fetchNotebooks = async (spaceType) => {
        try {
            const response = await axios.get('http://localhost:8000/notebooks/list', {
                params: {
                    created_by: userData.id,
                    space_type: spaceType 
                }
            });
            setNotebooks(prev => ({ ...prev, [spaceType]: response.data }));
        } catch (error) {
            console.error('Błąd pobierania notatników:', error);
        }
    };

    const handleAddNotebook = async (spaceType) => {
        const name = prompt('Podaj nazwę notatnika:');
        if (!name) return;
        try {
            await axios.post('http://localhost:8000/notebooks/create', {
                name: name,
                created_by: userData.id,
                space_type: spaceType,
                is_shared: spaceType === 'shared'
            });
            fetchNotebooks(spaceType);
        } catch (error) {
            alert('Błąd dodawania notatnika: ' + (error.response?.data?.detail || error.message));
        }
    };

    const toggleSpace = (spaceId) => {
        setExpandedSpaces(prev =>
            prev.includes(spaceId)
                ? prev.filter(id => id !== spaceId)
                : [...prev, spaceId]
        );
    };

    const handleNotebookClick = (notebook) => {
        onSelectNotebook(notebook); 
    };


    return (
        <aside className={`sidebar ${!isSidebarOpen ? 'collapsed' : ''}`}>
            <div className="sidebar-inner">

                {/* Header */}
                <div className="sidebar-header">
                    <div className="brand-container">
                        <div className="brand-icon">
                            🧠
                        </div>
                        <div className="brand-text">
                            <h1>zdAI to!</h1>
                            <p>Twój inteligentny system nauki</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="sidebar-content">
                    {spaces.map((space) => (
                        <div key={space.id} className={`sidebar-section ${expandedSpaces.includes(space.id) ? 'expanded' : ''}`}>
                            <div className="sidebar-section-title-container">
                                <div
                                    className="sidebar-section-title"
                                    onClick={() => toggleSpace(space.id)}
                                >
                                    <div className="space-info">
                                        <div className="space-icon">{space.icon}</div>
                                        <div className="space-name">{space.name}</div>
                                    </div>
                                    <button
                                    className="add-notebook-icon-btn"
                                    onClick={(e) => {
                                        e.stopPropagation(); 
                                        handleAddNotebook(space.id);
                                    }}
                                    title="Dodaj notatnik"
                                >
                                    ➕
                                </button>
                                </div>                              
                            </div>


                            {expandedSpaces.includes(space.id) && (
                                <ul className="js-submenu">
                                    {(notebooks[space.id] || []).map(notebook => (
                                        <li
                                            key={notebook.id}
                                            className={`notebook-item ${selectedNotebook?.id === notebook.id ? 'selected' : ''}`}
                                            onClick={() => handleNotebookClick(notebook)}
                                        >
                                            <span className="notebook-name">{notebook.name}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                </div>

                {/* User Section */}
                <div className="sidebar-options">
                    <div className="user-profile">
                        <div className="user-avatar">
                            {userData?.name?.charAt(0) || 'A'}
                        </div>
                        <div className="user-info">
                            <div className="user-name">{userData?.username || 'unknown'}</div>
                            <div className="user-email">{userData?.email || 'unknown@failed'}</div>
                        </div>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>
                        Wyloguj się
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;