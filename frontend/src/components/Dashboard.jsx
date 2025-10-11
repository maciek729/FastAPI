import React, { useState, useEffect } from 'react';
import styles from '../css/Dashboard.module.css';
import NotebookView from './NotebookView';

export default function Dashboard({ 
  userData, 
  selectedNotebook, 
  setSelectedNotebook, 
  notebookDetails, 
  refreshNotebook 
}) {
  const [notebooks, setNotebooks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user's notebooks
  useEffect(() => {
    if (userData) {
      fetchNotebooks();
    }
  }, [userData]);

  const fetchNotebooks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/notebooks/', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setNotebooks(data);
      }
    } catch (error) {
      console.error('Error fetching notebooks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotebookClick = (notebook) => {
    setSelectedNotebook(notebook);
  };

  const handleCreateNotebook = async () => {
    const name = prompt('Enter notebook name:');
    if (!name) return;

    try {
      const response = await fetch('http://localhost:8000/notebooks/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name })
      });

      if (response.ok) {
        fetchNotebooks();
      }
    } catch (error) {
      console.error('Error creating notebook:', error);
    }
  };

  return (
    <div className={styles.dashboardContainer}>
      {!selectedNotebook ? (
        <div className={styles.notebookSelection}>
          <div className={styles.header}>
            <h1 className={styles.title}>Welcome back, {userData?.username}!</h1>
            <p className={styles.subtitle}>Select a notebook or create a new one</p>
          </div>

          <div className={styles.actions}>
            <button className={styles.createButton} onClick={handleCreateNotebook}>
              + Create New Notebook
            </button>
          </div>

          {isLoading ? (
            <div className={styles.loading}>Loading notebooks...</div>
          ) : (
            <div className={styles.notebooksGrid}>
              {notebooks.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No notebooks yet. Create your first one!</p>
                </div>
              ) : (
                notebooks.map((notebook) => (
                  <div
                    key={notebook.id}
                    className={styles.notebookCard}
                    onClick={() => handleNotebookClick(notebook)}
                  >
                    <div className={styles.notebookIcon}>📚</div>
                    <h3 className={styles.notebookName}>{notebook.name}</h3>
                    <p className={styles.notebookInfo}>
                      {notebook.files_count || 0} files
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.notebookViewContainer}>
          <div className={styles.breadcrumb}>
            <button 
              className={styles.backButton}
              onClick={() => setSelectedNotebook(null)}
            >
              ← Back to Notebooks
            </button>
            <span className={styles.currentNotebook}>
              {selectedNotebook.name}
            </span>
          </div>
          
          <NotebookView
            details={notebookDetails}
            userData={userData}
            refreshNotebook={refreshNotebook}
          />
        </div>
      )}
    </div>
  );
}