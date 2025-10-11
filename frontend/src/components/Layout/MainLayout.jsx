import React, { useState, useEffect } from "react";
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

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const handleSelectNotebook = (notebook) => {
    setSelectedNotebook(notebook);
    setActiveSection('notebooks');
  };

  const refreshNotebook = () => {
    if (selectedNotebook) {
      fetch(`http://localhost:8000/notebooks/${selectedNotebook.id}`)
        .then(res => res.json())
        .then(data => setNotebookDetails(data))
        .catch(err => console.error('Error fetching notebook details:', err));
    }
  };

  // Check authentication and fetch user data
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

  // Load notebook details when a notebook is selected
  useEffect(() => {
    if (selectedNotebook) {
      fetch(`http://localhost:8000/notebooks/${selectedNotebook.id}`)
        .then(res => res.json())
        .then(data => setNotebookDetails(data))
        .catch(err => console.error('Error fetching notebook details:', err));
    }
  }, [selectedNotebook]);

  if (!userData) {
    return (
      <div className={styles.mainLayout}>
        <div className={styles.contentArea}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            color: '#60a5fa',
            fontSize: '1.2rem'
          }}>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <Dashboard
            userData={userData}
            selectedNotebook={selectedNotebook}
            setSelectedNotebook={setSelectedNotebook}
            notebookDetails={notebookDetails}
            refreshNotebook={refreshNotebook}
          />
        );
      case 'chat':
        return <Chat />;
      case 'notebooks':
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
      {/* Sidebar Toggle Button */}
      <button 
        className={styles.sidebarToggleBtn}
        onClick={toggleSidebar}
        style={{
          left: isSidebarOpen ? '280px' : '20px',
          transition: 'left 0.3s ease'
        }}
      >
        {isSidebarOpen ? '❮❮' : '❯❯'}
      </button>

      <Sidebar
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        userData={userData}
        handleLogout={handleLogout}
        onSelectNotebook={handleSelectNotebook}
      />
      
      <div 
        className={styles.contentArea}
        style={{
          marginLeft: isSidebarOpen ? '260px' : '0',
          transition: 'margin-left 0.3s ease'
        }}
      >
        {renderContent()}
      </div>
    </div>
  );
}