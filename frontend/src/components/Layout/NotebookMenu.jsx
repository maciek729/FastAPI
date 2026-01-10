import { useState, useRef, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { MoreVertical, Edit2, Trash2, UserPlus } from 'lucide-react';
import { confirmModal } from '../../utils/confirmModal';
import { promptModal } from '../../utils/promptModal';
import styles from '../../css/layout/NotebookMenu.module.css';
import { renameNotebook, deleteNotebook, getCollaborators, addCollaborator, removeCollaborator } from '../../services/notebookService';
import { LanguageContext } from '../../translations/LanguageContext';
import translations from '../../translations/translation.json';

const NotebookMenu = ({ notebook, spaceType, onRefresh, t }) => {
  const { language } = useContext(LanguageContext);
  const [showMenu, setShowMenu] = useState(false);
  const [showCollaboratorModal, setShowCollaboratorModal] = useState(false);
  const [collaborators, setCollaborators] = useState([]);
  const [collaboratorUsername, setCollaboratorUsername] = useState('');
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  // Fallback translation function if t is not provided correctly
  const translate = (key, params = {}) => {
    if (t && typeof t === 'function') {
      const result = t(key, params);
      // If t returns the key itself, fall back to direct lookup
      if (result === key) {
        const keys = key.split('.');
        let translation = translations[language];
        for (const k of keys) {
          translation = translation?.[k];
          if (!translation) return key;
        }
        if (typeof translation === 'string' && Object.keys(params).length > 0) {
          return translation.replace(/\{(\w+)\}/g, (match, paramKey) => {
            return params[paramKey] || match;
          });
        }
        return translation || key;
      }
      return result;
    }
    // Direct fallback
    const keys = key.split('.');
    let translation = translations[language];
    for (const k of keys) {
      translation = translation?.[k];
      if (!translation) return key;
    }
    if (typeof translation === 'string' && Object.keys(params).length > 0) {
      return translation.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey] || match;
      });
    }
    return translation || key;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) &&
          triggerRef.current && !triggerRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const calculateMenuPosition = () => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 180; // min-width from CSS
    const menuHeight = 150; // approximate height

    let top = rect.bottom + 4; // 4px margin below trigger
    let left = rect.right - menuWidth; // align to right edge of trigger

    // Ensure menu doesn't go off bottom of screen
    if (top + menuHeight > window.innerHeight) {
      top = rect.top - menuHeight - 4; // position above trigger
    }

    // Ensure menu doesn't go off right edge
    if (left + menuWidth > window.innerWidth) {
      left = window.innerWidth - menuWidth - 8;
    }

    // Ensure menu doesn't go off left edge
    if (left < 8) {
      left = 8;
    }

    setMenuPosition({ top, left });
  };

  const fetchCollaborators = async () => {
    try {
      const data = await getCollaborators(notebook.id);
      setCollaborators(data);
    } catch (err) {
      console.error('Error fetching collaborators:', err);
    }
  };

  const handleRename = async () => {
    const newName = await promptModal(translate('sidebar.renamePrompt'));
    if (!newName) return;

    try {
      await renameNotebook(notebook.id, newName);
      toast.success(translate('sidebar.renameSuccess'));
      onRefresh();
      setShowMenu(false);
    } catch (err) {
      toast.error(translate('sidebar.renameError'));
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirmModal(translate('sidebar.deleteNotebookConfirm'));
    if (!confirmed) return;

    try {
      await deleteNotebook(notebook.id);
      toast.success(translate('sidebar.deleteNotebookSuccess'));
      onRefresh();
      setShowMenu(false);
    } catch (err) {
      toast.error(translate('sidebar.deleteNotebookError'));
    }
  };

  const handleOpenCollaborators = () => {
    fetchCollaborators();
    setShowCollaboratorModal(true);
  };

  const handleAddCollaborator = async (e) => {
    e.preventDefault();
    if (!collaboratorUsername.trim()) {
      toast.error(translate('sidebar.userError'));
      return;
    }

    try {
      await addCollaborator(notebook.id, collaboratorUsername);
      toast.success(translate('sidebar.userAdded', { username: collaboratorUsername }));
      setCollaboratorUsername('');
      fetchCollaborators();
    } catch (err) {
      toast.error(err.message || translate('sidebar.addColError'));
    }
  };

  const handleRemoveCollaborator = async (userId) => {
    const confirmed = await confirmModal(translate('sidebar.deleteColConfirm'));
    if (!confirmed) return;

    try {
      await removeCollaborator(notebook.id, userId);
      toast.success(translate('sidebar.deleteColSuccess'));
      fetchCollaborators();
    } catch (err) {
      toast.error(err.message || translate('sidebar.deleteColError'));
    }
  };

  const handleToggleMenu = () => {
    if (!showMenu) {
      calculateMenuPosition();
    }
    setShowMenu(!showMenu);
  };

  return (
    <div className={styles.notebookMenuContainer}>
      <button
        ref={triggerRef}
        className={styles.menuTrigger}
        onClick={handleToggleMenu}
        title={translate('sidebar.notebookMenu')}
      >
        <MoreVertical size={16} />
      </button>

      {showMenu && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className={styles.contextMenu}
          style={{
            position: 'fixed',
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
          }}
        >
          <button
            className={styles.menuItem}
            onClick={handleRename}
          >
            <Edit2 size={16} />
            <span>{translate('sidebar.rename')}</span>
          </button>
          <button
            className={styles.menuItem}
            onClick={handleOpenCollaborators}
          >
            <UserPlus size={16} />
            <span>{translate('sidebar.addCollaborators')}</span>
          </button>
          <div className={styles.menuDivider}></div>
          <button
            className={`${styles.menuItem} ${styles.deleteItem}`}
            onClick={handleDelete}
          >
            <Trash2 size={16} />
            <span>{translate('sidebar.delete')}</span>
          </button>
        </div>,
        document.body
      )}

      {showCollaboratorModal && typeof document !== 'undefined' && createPortal(
        <div className={styles.modalOverlay} onClick={() => setShowCollaboratorModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{translate('sidebar.collaborators')}</h3>
              <button
                className={styles.closeBtn}
                onClick={() => setShowCollaboratorModal(false)}
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <form onSubmit={handleAddCollaborator} className={styles.addForm}>
                <input
                  type="text"
                  value={collaboratorUsername}
                  onChange={(e) => setCollaboratorUsername(e.target.value)}
                  placeholder={translate('sidebar.collaboratorPlaceholder')}
                  className={styles.input}
                />
                <button type="submit" className={styles.addBtn}>
                  {translate('sidebar.add')}
                </button>
              </form>

              <div className={styles.collaboratorsList}>
                {collaborators.length === 0 ? (
                  <p className={styles.empty}>{translate('sidebar.noCollaborators')}</p>
                ) : (
                  collaborators.map((col) => (
                    <div key={col.id} className={styles.collaboratorItem}>
                      <span>{col.username}</span>
                      <button
                        className={styles.removeBtn}
                        onClick={() => handleRemoveCollaborator(col.id)}
                        title={translate('sidebar.removeColl')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default NotebookMenu;
