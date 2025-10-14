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
      console.error('Błąd pobierania notatników:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNotebook = async () => {
    const name = prompt('Podaj nazwę notatnika:');
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
      console.error('Błąd tworzenia notatnika:', error);
    }
  };

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.notebookSelection}>
        <div className={styles.header}>
          <h1 className={styles.title}>Witaj z powrotem, {userData?.username}!</h1>
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
                <p>Brak notatników. Utwórz swój pierwszy!</p>
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
                    {notebook.files_count || 0} {notebook.files_count === 1 ? 'plik' : 'pliki'}
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