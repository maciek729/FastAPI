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
      console.error('Błąd podczas pobierania notatników:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotebookClick = (notebook) => {
    setSelectedNotebook(notebook);
  };

  const handleCreateNotebook = async () => {
    const name = prompt('Wprowadź nazwę notatnika:');
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
      console.error('Błąd podczas tworzenia notatnika:', error);
    }
  };

  return (
    <div className={styles.dashboardContainer}>
      {!selectedNotebook ? (
        <div className={styles.notebookSelection}>
          <div className={styles.header}>
            <h1 className={styles.title}>Witaj ponownie, {userData?.username}!</h1>
            <p className={styles.subtitle}>Wybierz notatnik lub utwórz nowy</p>
          </div>

          <div className={styles.actions}>
            <button className={styles.createButton} onClick={handleCreateNotebook}>
              + Utwórz nowy notatnik
            </button>
          </div>

          {isLoading ? (
            <div className={styles.loading}>Ładowanie notatników...</div>
          ) : (
            <div className={styles.notebooksGrid}>
              {notebooks.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>Nie masz jeszcze żadnych notatników. Utwórz pierwszy!</p>
                </div>
              ) : (
                notebooks.map((notebook) => (
                  <div 
                    key={notebook.id} 
                    className={styles.notebookCard}
                    onClick={() => handleNotebookClick(notebook)}
                  >
                    <h3>{notebook.name}</h3>
                    <p className={styles.notebookMeta}>
                      Utworzono: {new Date(notebook.created_at).toLocaleDateString('pl-PL')}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        <NotebookView
          details={notebookDetails}
          userData={userData}
          refreshNotebook={refreshNotebook}
        />
      )}
    </div>
  );
}