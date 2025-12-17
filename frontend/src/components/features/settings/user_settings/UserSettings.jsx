import React, { useContext, useState, useRef, useEffect } from 'react';
import styles from "../../../../css/features/settings/UserSettings.module.css"
import { LanguageContext } from "../../../../translations/LanguageContext";
import translations from "../../../../translations/translation.json";
import Modal from "./Modal.jsx";
// Importujemy nasze nowe serwisy (upewnij się, że ścieżka jest poprawna w Twojej strukturze plików)
import { changeUsername, requestPasswordReset } from '../../../../services/userService';

const MAX_FILE_SIZE = 32 * 1024 * 1024; // 32MB (dla backendu), ale localStorage ma mniej
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
};

export default function UserSettings({ userData }) {
    const { language } = useContext(LanguageContext);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState({});

    const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
    const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null);

    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showSavedMessage, setShowSavedMessage] = useState(false);

    const [pendingChanges, setPendingChanges] = useState({});

    const fileInputRef = useRef(null)

    const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();
            fileReader.readAsDataURL(file);
            fileReader.onload = () => {
                resolve(fileReader.result);
            };
            fileReader.onerror = (error) => {
                reject(error);
            };
        });
    };

    useEffect(() => {
        const savedAvatar = localStorage.getItem('user_avatar');

        if (savedAvatar) {
            setAvatarPreviewUrl(savedAvatar);
        } else if (userData?.avatarUrl) {
            setAvatarPreviewUrl(userData.avatarUrl);
        } else {
            setAvatarPreviewUrl(null);
        }

        if (selectedAvatarFile) {
            const fileUrl = URL.createObjectURL(selectedAvatarFile);
            setAvatarPreviewUrl(fileUrl);
            setHasUnsavedChanges(true);

            return () => URL.revokeObjectURL(fileUrl);
        }
    }, [selectedAvatarFile, userData?.avatarUrl]);

    useEffect(() => {
        if (showSavedMessage) {
            const timer = setTimeout(() => {
                setShowSavedMessage(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showSavedMessage]);

    const handleAvatarChangeClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            alert(t('userSettings.fileTypeError'));
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            alert(t('userSettings.fileSizeError', { max: '32MB' }));
            return;
        }

        setSelectedAvatarFile(file);
    };

    const handleCancel = () => {
        setSelectedAvatarFile(null);
        const savedAvatar = localStorage.getItem('user_avatar');
        setAvatarPreviewUrl(savedAvatar || userData?.avatarUrl || null);
        
        setPendingChanges({});
        setHasUnsavedChanges(false);
    };

    const handleSaveModal = async (type, newValue) => {
        if (type === 'password') {
            if (!userData?.email) {
                alert("Błąd: Nie znaleziono adresu email użytkownika.");
                closeModal();
                return;
            }

            try {
                await requestPasswordReset(userData.email);
                alert(t('Wysłano wiadomość email z linkiem do resetowania hasła!'));
            } catch (error) {
                console.error("Błąd serwisu:", error);
                alert(`Wystąpił błąd: ${error.message}`);
            }

            closeModal();
            return;
        }

        console.log(`Zapisano do bufora nową wartość dla ${type}: ${newValue}`);

        setPendingChanges(prev => ({
            ...prev,
            [type]: newValue
        }));

        closeModal();
        setHasUnsavedChanges(true);
        setShowSavedMessage(false)
    };

    const handleSave = async () => {
        const token = getCookie('access_token');

        if (!token) {
            alert("Błąd autoryzacji. Spróbuj zalogować się ponownie.");
            return;
        }

        let success = true;

        if (pendingChanges.username) {
            try {
                await changeUsername(pendingChanges.username, token);
                console.log("Nazwa użytkownika zaktualizowana w bazie!");
            } catch (error) {
                console.error("Błąd połączenia:", error);
                success = false;
                alert(`Błąd zmiany nazwy: ${error.message}`);
            }
        }

        if (selectedAvatarFile) {
            try {
                if (selectedAvatarFile.size > 4 * 1024 * 1024) { // Bezpieczne 4MB
                    alert("Wybrane zdjęcie jest za duże, aby zapisać je w przeglądarce (limit ok. 4MB).");
                    success = false;
                } else {
                    const base64 = await convertToBase64(selectedAvatarFile);
                    localStorage.setItem('user_avatar', base64);
                    console.log("Zdjęcie zapisane w localStorage!");
                    
                    window.dispatchEvent(new Event("storage"));
                }
            } catch (error) {
                console.error("Błąd zapisu avatara:", error);
                success = false;
                alert("Błąd zapisu zdjęcia.");
            }
        }

        if (success) {
            setHasUnsavedChanges(false);
            setShowSavedMessage(true);
            setPendingChanges({});
            setSelectedAvatarFile(null);

            if (pendingChanges.username) {
                window.location.reload();
            }
        }
    };

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

    const openModal = (type) => {
        let content = {};

        switch (type) {
            case 'username':
                content = {
                    title: t('Zmień nazwę użytkownika'),
                    currentValueLabel: t('Obecna nazwa użytkownika:'),
                    currentValue: userData?.username || '',
                    newInputLabel: t('Nowa nazwa użytkownika'),
                    inputType: 'text',
                    buttonText: t('Zmień nazwę użytkownika'),
                    saveType: 'username',
                    hideCurrent: false,
                    oldValue: userData?.username
                };
                break;
            case 'password':
                content = {
                    title: t('Zmień hasło'),
                    currentValueLabel: t('Obecne hasło:'),
                    currentValue: '**********',
                    newInputLabel: t('Wyślemy ci maila, aby zmienić hasło'),
                    inputType: 'password', 
                    buttonText: t('Zmień hasło'),
                    saveType: 'password',
                    hideCurrent: true
                };
                break;
            case 'deleteAccount':
                content = {
                    title: t('Usuń konto'),
                    newInputLabel: t('Czy jesteś na 100% pewny, że chcesz usunąć hasło?'),
                    inputType: 'password',
                    buttonText: t('Usuń konto'),
                    saveType: 'deleteAccount',
                    hideCurrent: true,
                    isDelete: true
                };
                break;
            default:
                return;
        }

        setModalContent(content);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalContent({});
    };

    const handleButtonClick = (type) => (event) => {
        event.stopPropagation();
        openModal(type);
    };

    const renderAvatar = () => {
        if (avatarPreviewUrl) {
            return (
                <img
                    src={avatarPreviewUrl}
                    alt={t('userSettings.profilePhotoAlt')}
                    className={styles.userAvatarImage}
                />
            );
        }
        return userData?.name?.charAt(0) || userData?.username?.charAt(0) || "U";
    };

    return (
        <div className={styles.settingsMainContainer}>
            <div className={styles.titleContainer}>
                <h2 className={styles.title}>{t('userSettings.title')}</h2>
            </div>

            <div className={styles.sectionContainer}>
                <div className={styles.sectionOption}>
                    <div className={styles.textWrapper}>
                        <label className={styles.sectionTitle}>{t('userSettings.profilePhoto')}</label>
                        <label className={styles.optionLabel}>{t('userSettings.profilePhotoDescription')} Obsługiwane formaty: .jpeg, .jpg, .png. Maksymalny rozmiar pliku to 32MB</label>
                    </div>
                    <div className={styles.avatarActionWrapper}>
                        <div
                            className={styles.userAvatar}
                            onClick={handleAvatarChangeClick}
                            role="button"
                            tabIndex="0">
                            {renderAvatar()}
                        </div>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".jpeg, .jpg, .png"
                        style={{ display: 'none' }}
                    />
                </div>
                <div className={styles.section}>
                    <div className={styles.sectionOption}>
                        <div className={styles.textWrapper}>
                            <label className={styles.sectionTitle}>{t('userSettings.username')}</label>
                            <label className={styles.optionLabel}>
                                {pendingChanges.username || userData?.username}
                            </label>
                        </div>
                        <button className={styles.optionButton} onClick={handleButtonClick('username')}>{t('userSettings.edit')}</button>
                    </div>
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionOption}>
                        <div className={styles.textWrapper}>
                            <label className={styles.sectionTitle}>{t('userSettings.password')}</label>
                            <label className={styles.optionLabel}>{t('userSettings.passwordDescription')}</label>
                        </div>
                        <button className={styles.optionButton} onClick={handleButtonClick('password')}>{t('userSettings.change')}</button>
                    </div>
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionOption}>
                        <div className={styles.textWrapper}>
                            <label className={styles.sectionTitle}>{t('userSettings.deleteAccount')}</label>
                            <label className={styles.optionLabel}>{t('To jest moje przypomnienie, zeby przetlumaczyc sobie to')}</label>
                        </div>
                        <button className={styles.deleteAccountButton} onClick={handleButtonClick('deleteAccount')}>{t('userSettings.deleteAccountButton')}</button>
                    </div>
                </div>
            </div>

            <div className={`${styles.savedMessage} ${showSavedMessage ? styles.show : ''}`}>
                <p>{t('settings.savedMessage')}</p>
            </div>
            <div className={`${styles.unsavedMessage} ${hasUnsavedChanges ? styles.show : ''}`}>
                <p>{t('settings.unsavedMessage')}</p>
            </div>

            <div className={styles.buttonsContainer}>
                <button className={styles.saveButton} onClick={handleSave} disabled={!hasUnsavedChanges}>{t('settings.saveChanges')}</button>
                <button className={styles.cancelButton} onClick={handleCancel} disabled={!hasUnsavedChanges}>{t('settings.cancel')}</button>
            </div>

            {isModalOpen && (
                <Modal
                    title={modalContent.title}
                    currentValueLabel={modalContent.currentValueLabel}
                    currentValue={modalContent.currentValue}
                    newInputLabel={modalContent.newInputLabel}
                    inputType={modalContent.inputType}
                    buttonText={modalContent.buttonText}
                    onClose={closeModal}
                    onSave={handleSaveModal}
                    saveType={modalContent.saveType}
                    hideCurrent={modalContent.hideCurrent}
                    isDelete={modalContent.isDelete}
                    oldValue={modalContent.oldValue}
                />
            )}
        </div>
    );
}