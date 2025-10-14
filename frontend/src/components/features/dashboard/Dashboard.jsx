import React, { useState, useEffect } from 'react';
import styles from "../../../css/features/Dashboard.module.css";

export default function Dashboard({ userData, onSelectNotebook }) {
  const [notebooks, setNotebooks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

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
                  onClick={() => onSelectNotebook(notebook)}
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
    </div>
  );
}