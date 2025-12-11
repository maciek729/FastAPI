import React, { useState, useEffect, useContext } from 'react';
import styles from "../../../css/features/Dashboard.module.css";
import { getNotebooks, createNotebook } from '../../../services/notebookService';
import { LanguageContext } from "../../../translations/LanguageContext";
import translations from "../../../translations/translation.json";

export default function Dashboard({ userData, onSelectNotebook }) {
  const [notebooks, setNotebooks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { language } = useContext(LanguageContext);

  const t = (key, params = {}) => {
    const keys = key.split('.');
    let translation = translations[language];
    
    for (const k of keys) {
      translation = translation?.[k];
      if (!translation) return key;
    }
    
    if (typeof translation === 'string' && Object.keys(params).length > 0) {
      return translation.replace(/\{(\w+)\}/g, (match, key) => {
        return params[key] || match;
      });
    }
    
    return translation || key;
  };

  useEffect(() => {
    if (userData) {
      fetchNotebooks();
    }
  }, [userData]);

  const fetchNotebooks = async () => {
    setIsLoading(true);
    try {
      const [personalData, sharedData] = await Promise.all([
        getNotebooks(userData.id, 'personal'),
        getNotebooks(userData.id, 'shared')
      ]);
      setNotebooks([...personalData, ...sharedData]);
    }
    catch (error) {
      console.error(t('dashboard.fetchError'), error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNotebook = async () => {
    const name = prompt(t('dashboard.notebookNamePrompt'));
    if (!name) return;
    try {
      await createNotebook({
        name: name,
        created_by: userData.id,
        space_type: 'personal',
        is_shared: false
      });
      fetchNotebooks();
    } catch (error) {
      console.error(t('dashboard.createError'), error);
    }
  };

  const getFileCountText = (count) => {
    if (language === 'pl') {
      return `${count} ${count === 1 ? 'plik' : count >= 2 && count <= 4 ? 'pliki' : 'plików'}`;
    } else {
      return `${count} ${count === 1 ? 'file' : 'files'}`;
    }
  };

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.notebookSelection}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            {t('dashboard.welcome', { username: userData?.username })}
          </h1>
          <p className={styles.subtitle}>{t('dashboard.subtitle')}</p>
        </div>

        <div className={styles.actions}>
          <button className={styles.createButton} onClick={handleCreateNotebook}>
            + {t('dashboard.createNotebook')}
          </button>
        </div>

        {isLoading ? (
          <div className={styles.loading}>{t('dashboard.loading')}</div>
        ) : (
          <div className={styles.notebooksGrid}>
            {notebooks.length === 0 ? (
              <div className={styles.emptyState}>
                <p>{t('dashboard.noNotebooks')}</p>
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
                    {getFileCountText(notebook.files_count || 0)}
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