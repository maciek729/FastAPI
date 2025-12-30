import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from "./Sidebar";
import Dashboard from "../features/dashboard/Dashboard";
import Chat from "../features/chat/Chat";
import NotebookView from "../features/notebook/NotebookView";
import styles from "../../css/layout/MainLayout.module.css";
import Settings from "../features/settings/app_settings/Settings";
import UserSettings from "../features/settings/user_settings/UserSettings";
import Help from '../features/settings/help/Help';
import NotificationView from "../features/settings/notifications/NotificationView";
import API_BASE_URL from "../../api/config";
import Demo from "../demo/Demo";

export default function MainLayout() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState(null);
  const [selectedNotebook, setSelectedNotebook] = useState(null);
  const [notebookDetails, setNotebookDetails] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notebookSection, setNotebookSection] = useState('overview');

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

  const fetchUserData = useCallback(() => {
    const token = getCookie('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    fetch(`${API_BASE_URL}/user/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then(data => {
        console.log("Dane użytkownika pobrane/zaktualizowane:", data);
        setUserData(data);
      })
      .catch((err) => {
        console.error("Błąd pobierania danych użytkownika:", err);
        handleLogout();
      });
  }, [navigate, handleLogout]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    window.addEventListener("refreshUserData", fetchUserData);
    
    return () => {
      window.removeEventListener("refreshUserData", fetchUserData);
    };
  }, [fetchUserData]);

  const handleGoToSection = (sectionId) => {
    setActiveSection(sectionId);
    if (sectionId !== 'notebook') {
        setSelectedNotebook(null);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSelectNotebook = (notebook) => {
    setSelectedNotebook(notebook);
    setActiveSection('notebook');
    setNotebookSection('files');
    setNotebookDetails(notebook);

    const token = getCookie('access_token');
    fetch(`${API_BASE_URL}/notebooks/${notebook.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setNotebookDetails(prev => ({...prev, ...data}));
      })
      .catch(err => console.error('Error fetching notebook:', err));
  };

  const refreshNotebook = () => {
    if (selectedNotebook) {
      handleSelectNotebook(selectedNotebook);
    }
  };

  const handleBackToDashboard = () => {
    setSelectedNotebook(null);
    setNotebookDetails(null);
    setActiveSection('dashboard');
  };

  const getChatKey = () => {
    return `chat-${location.pathname}-${activeSection}-${selectedNotebook?.id || 'dashboard'}`;
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'chat':
        return <Chat key={getChatKey()} />;

      case 'settings':
        return <Settings userData={userData} onGoToSection={handleGoToSection}/>

      case 'user_settings':
        return <UserSettings userData={userData}/>

      case 'help':
        return <Help userData={userData}/>;

      case 'notifications':
        return <NotificationView userData={userData}/>;
      
      case 'notebook':
        return selectedNotebook ? (
          <NotebookView
            key={selectedNotebook?.id}
            details={notebookDetails}
            userData={userData}
            refreshNotebook={refreshNotebook}
            defaultSection={notebookSection}
            isSidebarOpen={isSidebarOpen}
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
            onSelectNotebook={handleSelectNotebook}
          />
        );
    }
  };

  useEffect(() => {
    const applyTheme = () => {
        const savedTheme = localStorage.getItem('appTheme') || 'light';
        if (savedTheme === 'light') {
            document.documentElement.removeAttribute('data-theme');
        } else if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else if (savedTheme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        }
    };

    applyTheme();
    window.addEventListener('storage', applyTheme);
    return () => window.removeEventListener('storage', applyTheme);
  }, []);

  return (
    <div className={styles.mainLayout}>
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        userData={userData}
        handleLogout={handleLogout}
        onSelectNotebook={handleSelectNotebook}
        onGoToDashboard={handleBackToDashboard}
        onGoToSection={handleGoToSection}
      />

      <div
        className={`${styles.contentArea} ${!isSidebarOpen ? styles.contentAreaCollapsed : ''}`}
      >
        {renderContent()}
      </div>

      <Demo />
    </div>
  );
}