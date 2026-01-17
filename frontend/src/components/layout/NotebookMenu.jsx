import { useState, useRef, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MoreVertical, Edit2, Trash2, UserPlus, X } from 'lucide-react';
import { confirmModal } from '../../utils/confirmModal';
import { promptModal } from '../../utils/promptModal';
import styles from '../../css/layout/NotebookMenu.module.css';
import generatorStyles from '../../css/features/FlashcardGenerator.module.css';
import notebookStyles from '../../css/features/NotebookView.module.css';
import { renameNotebook, deleteNotebook, getCollaborators, addCollaborator, removeCollaborator } from '../../services/notebookService';
import { LanguageContext } from '../../translations/LanguageContext';
import translations from '../../translations/translation.json';

const NotebookMenu = ({ notebook, spaceType, onRefresh, t }) => {
  const { language } = useContext(LanguageContext);
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showCollaboratorModal, setShowCollaboratorModal] = useState(false);
  const [collaborators, setCollaborators] = useState([]);
  const [collaboratorUsername, setCollaboratorUsername] = useState('');
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const translate = (key, params = {}) => {
    if (t && typeof t === 'function') {
      const result = t(key, params);
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
    const menuWidth = 180;
    const menuHeight = 150;

    let top = rect.bottom + 4;
    let left = rect.right - menuWidth;

    if (top + menuHeight > window.innerHeight) {
      top = rect.top - menuHeight - 4;
    }

    if (left + menuWidth > window.innerWidth) {
      left = window.innerWidth - menuWidth - 8;
    }

    if (left < 8) {
      left = 8;
    }

    setMenuPosition({ top, left });
  };

  const fetchCollaborators = async () => {
    try {
      const data = await getCollaborators(notebook.id);
      setCollaborators(data);
    } catch {
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
    } catch {
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
    } catch {
      toast.error(translate('sidebar.deleteNotebookError'));
    }
  };

  const handleOpenCollaborators = () => {
    fetchCollaborators();
    setShowCollaboratorModal(true);
    setShowMenu(false);
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
      if (err.message === 'USER_NOT_FOUND') {
        toast.error(translate('sidebar.userNotFound'));
      } else {
        toast.error(err.message || translate('sidebar.addColError'));
      }
    }
  };

  const handleRemoveCollaborator = async (userId) => {
    const confirmed = await confirmModal(translate('sidebar.deleteColConfirm'));
    if (!confirmed) return;

    try {
      await removeCollaborator(notebook.id, userId);

      if (currentUser.id === userId) {
        toast.success(translate('sidebar.leaveNotebookSuccess'));
        setShowCollaboratorModal(false);
        navigate('/dashboard');
        if (onRefresh) onRefresh();
      } else {
        toast.success(translate('sidebar.deleteColSuccess'));
        fetchCollaborators();
      }

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

          {spaceType === 'shared' && (
            <button
              className={styles.menuItem}
              onClick={handleOpenCollaborators}
            >
              <UserPlus size={16} />
              <span>{translate('sidebar.addCollaborators')}</span>
            </button>
          )}

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
        <div className={generatorStyles.modalOverlay} onClick={() => setShowCollaboratorModal(false)}>
          <div className={generatorStyles.modalContainer} onClick={(e) => e.stopPropagation()}>
            <div className={generatorStyles.header}>
              <h2 className={generatorStyles.title}>{translate('filesView.manageCol')}</h2>
              <button
                className={generatorStyles.closeBtn}
                onClick={() => setShowCollaboratorModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className={notebookStyles.collaboratorModalContent}>
              <form onSubmit={handleAddCollaborator} className={notebookStyles.addCollaboratorForm}>
                <div className={notebookStyles.inputWithButton}>
                  <input
                    type="text"
                    value={collaboratorUsername}
                    onChange={(e) => setCollaboratorUsername(e.target.value)}
                    placeholder={translate('filesView.nameCol')}
                    className={notebookStyles.modalInput}
                  />
                  <button type="submit" className={notebookStyles.btnAdd}>
                    <UserPlus size={18} /> {translate('filesView.add')}
                  </button>
                </div>
              </form>

              <div className={notebookStyles.collaboratorsSection}>
                <h3>{translate('filesView.col')} ({collaborators.length})</h3>
                {collaborators.length > 0 ? (
                  collaborators.map((col) => (
                    <div key={col.id} className={notebookStyles.collaboratorItem}>
                      <div className={notebookStyles.collaboratorLeft}>
                        {col.avatar_url ? (
                            <img
                                src={col.avatar_url}
                                alt={col.username}
                                className={notebookStyles.collaboratorAvatar}
                            />
                        ) : (
                            <div className={notebookStyles.avatarFallback}>
                                {col.username.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <span className={notebookStyles.collaboratorName}>
                          {col.username}
                          {col.id === currentUser.id && " (Ty)"}
                        </span>
                      </div>
                      <button
                        className={notebookStyles.btnRemove}
                        onClick={() => handleRemoveCollaborator(col.id)}
                        title={translate('sidebar.removeColl')}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className={notebookStyles.emptyCollaborators}>
                     <p>{translate('filesView.noCol')}</p>
                  </div>
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
