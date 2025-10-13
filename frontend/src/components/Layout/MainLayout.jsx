import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from 'react-router-dom';
import Sidebar from "../Sidebar";
import Dashboard from "../Dashboard";
import Chat from "../Chat";
import NotebookView from "../NotebookView";
import styles from "../../css/MainLayout.module.css";

export default function MainLayout() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [selectedNotebook, setSelectedNotebook] = useState(null);
  const [notebookDetails, setNotebookDetails] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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

  const handleLogout = useCallback(() => {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    }
    navigate('/login');
  }, [navigate]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  useEffect(() => {
    const token = getCookie('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    fetch('http://localhost:8000/user/', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then(data => setUserData(data))
      .catch(() => {
        handleLogout();
      });
  }, [navigate, handleLogout]);

  const handleSelectNotebook = (notebook) => {
    setSelectedNotebook(notebook);
    setActiveSection('notebook');
    
    const token = getCookie('access_token');
    fetch(`http://localhost:8000/notebooks/${notebook.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setNotebookDetails(data))
      .catch(err => console.error('Error fetching notebook:', err));
  };

  const refreshNotebook = () => {
    if (selectedNotebook) {
      handleSelectNotebook(selectedNotebook);
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'chat':
        return <Chat />;
      case 'notebook':
        return selectedNotebook ? (
          <NotebookView
            details={notebookDetails}
            userData={userData}
            refreshNotebook={refreshNotebook}
          />
        ) : (
          <div style={{ padding: '2rem', color: '#94a3b8' }}>
            Please select a notebook from the sidebar
          </div>
        );
      default:
        return (
          <Dashboard
            userData={userData}
            selectedNotebook={selectedNotebook}
            setSelectedNotebook={setSelectedNotebook}
            notebookDetails={notebookDetails}
            refreshNotebook={refreshNotebook}
          />
        );
    }
  };

  return (
    <div className={styles.mainLayout}>
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        userData={userData}
        handleLogout={handleLogout}
        onSelectNotebook={handleSelectNotebook}
      />
      
      <div 
        className={`${styles.contentArea} ${!isSidebarOpen ? styles.contentAreaCollapsed : ''}`}
      >
        {renderContent()}
      </div>
    </div>
  );
}