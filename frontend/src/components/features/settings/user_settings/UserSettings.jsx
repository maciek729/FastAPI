import React, { useContext, useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import styles from "../../../../css/features/settings/UserSettings.module.css";
import { LanguageContext } from "../../../../translations/LanguageContext";
import translations from "../../../../translations/translation.json";
import Modal from "./Modal.jsx";
import AvatarModal from "./AvatarModal.jsx";
import {
    changeUsername,
    requestPasswordReset,
    uploadAvatar,
    deleteAvatar,
    archiveUserAccount,
    fetchUserCredits
} from '../../../../services/userService';

const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
};

export default function UserSettings({ userData }) {
    const { language } = useContext(LanguageContext);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState({});

    const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
    const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(userData?.avatar_url || null);
    const [isPendingDelete, setIsPendingDelete] = useState(false);

    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showSavedMessage, setShowSavedMessage] = useState(false);
    const [pendingChanges, setPendingChanges] = useState({});
    const [creditsData, setCreditsData] = useState(null);

    const t = (key, params = {}) => {
        const keys = key.split('.');
        let translation = translations[language];
        for (const k of keys) {
            translation = translation?.[k];
            if (!translation) return key;
        }
        if (typeof translation === 'string' && Object.keys(params).length > 0) {
            return translation.replace(/\{(\w+)\}/g, (match, key) => params[key] || match);
        }
        return translation || key;
    };

    useEffect(() => {
        if (selectedAvatarFile) {
            const objectUrl = URL.createObjectURL(selectedAvatarFile);
            setAvatarPreviewUrl(objectUrl);
            setHasUnsavedChanges(true);
            return () => URL.revokeObjectURL(objectUrl);
        } else if (isPendingDelete) {
            setAvatarPreviewUrl(null);
            setHasUnsavedChanges(true);
        } else {
            setAvatarPreviewUrl(userData?.avatar_url || null);
        }
    }, [selectedAvatarFile, userData?.avatar_url, isPendingDelete]);

    useEffect(() => {
        if (showSavedMessage) {
            const timer = setTimeout(() => setShowSavedMessage(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showSavedMessage]);

    useEffect(() => {
        const loadCredits = async () => {
            const token = getCookie('access_token');
            if (!token) return;
            try {
                const data = await fetchUserCredits(token);
                setCreditsData(data);
            } catch {
                setCreditsData(null);
            }
        };

        loadCredits();
    }, []);

    const handleAvatarSaveFromModal = (croppedFile) => {
        setSelectedAvatarFile(croppedFile);
        setIsPendingDelete(false);
        setIsAvatarModalOpen(false);
        setHasUnsavedChanges(true);
    };

    const handleMarkAvatarForDeletion = () => {
        setIsPendingDelete(true);
        setSelectedAvatarFile(null);
        setIsAvatarModalOpen(false);
        setHasUnsavedChanges(true);
    };

    const handleCancel = () => {
        setSelectedAvatarFile(null);
        setIsPendingDelete(false);
        setPendingChanges({});
        setHasUnsavedChanges(false);
    };

    const handleSave = async () => {
        const token = getCookie('access_token');
        if (!token) return;

        let success = true;

        if (isPendingDelete) {
            try {
                await deleteAvatar(token);
                setIsPendingDelete(false);
            } catch (error) {
                success = false;
                toast.error("Błąd podczas usuwania zdjęcia.");
            }
        }

        if (selectedAvatarFile && success) {
            try {
                await uploadAvatar(selectedAvatarFile, token);
            } catch (error) {
                success = false;
                toast.error("Błąd podczas wgrywania nowego zdjęcia.");
            }
        }

        if (pendingChanges.username && success) {
            try {
                await changeUsername(pendingChanges.username, token);
            } catch (error) {
                success = false;
                toast.error(`Błąd nazwy: ${error.message}`);
            }
        }

        if (success) {
            setHasUnsavedChanges(false);
            setShowSavedMessage(true);
            setPendingChanges({});
            setSelectedAvatarFile(null);
            window.dispatchEvent(new Event("refreshUserData"));
        }
    };

    const handleSaveModal = async (type, newValue) => {
        const token = getCookie('access_token');

        if (type === 'password') {
            if (!userData?.email) return closeModal();
            try {
                await requestPasswordReset(userData.email);
                toast.success(t('Wysłano wiadomość email z linkiem do resetowania hasła!'));
            } catch (error) {
                toast.error(`Błąd: ${error.message}`);
            }
            closeModal();
            return;
        }

        if (type === 'deleteAccount') {
            try {
                await archiveUserAccount(token);

                toast.success(t('Twoje konto zostało pomyślnie zarchiwizowane. Nastąpi wylogowanie.'));

                setTimeout(() => {
                    document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                    window.location.href = '/login';
                }, 1500);
            } catch (error) {
                toast.error(`${t('Błąd podczas usuwania konta')}: ${error.message}`);
            }
            closeModal();
            return;
        }

        setPendingChanges(prev => ({ ...prev, [type]: newValue }));
        closeModal();
        setHasUnsavedChanges(true);
    };

    const openModal = (type) => {
        let content = {};
        if (type === 'username') {
            content = {
                title: t('userSettings.username'),
                currentValueLabel: t('userSettings.username'),
                currentValue: userData?.username || '',
                newInputLabel: t('userSettings.edit'),
                inputType: 'text',
                buttonText: t('userSettings.edit'),
                saveType: 'username',
                oldValue: userData?.username
            };
        } else if (type === 'password') {
            content = {
                title: t('userSettings.changePasswordTitle'),
                newInputLabel: t('userSettings.changePasswordDescription'),
                inputType: 'password',
                buttonText: t('userSettings.change'),
                saveType: 'password',
                hideCurrent: true
            };
        } else if (type === 'deleteAccount') {
            content = {
                title: t('userSettings.deleteAccountButton'),
                newInputLabel: t('userSettings.deleteAccountDescriptionModal'),
                inputType: 'password',
                buttonText: t('userSettings.deleteAccountButton'),
                saveType: 'deleteAccount',
                hideCurrent: true,
                isDelete: true
            };
        }
        setModalContent(content);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalContent({});
    };

    const renderAvatar = () => {
        if (avatarPreviewUrl) {
            return <img src={avatarPreviewUrl} alt="Avatar" className={styles.userAvatarImage} />;
        }
        return userData?.username?.charAt(0).toUpperCase() || "U";
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
                        <label className={styles.optionLabel}>{t('userSettings.profilePhotoDescription')}</label>
                    </div>
                    <div className={styles.avatarActionWrapper}>
                        <div className={styles.userAvatar} onClick={() => setIsAvatarModalOpen(true)}>
                            {renderAvatar()}
                        </div>
                    </div>
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionOption}>
                        <div className={styles.textWrapper}>
                            <label className={styles.sectionTitle}>
                                {language === 'pl' ? 'Kredyty AI' : 'AI Credits'}
                            </label>
                            <label className={styles.optionLabel}>
                                {creditsData
                                    ? `${creditsData.used}/${creditsData.quota} (${creditsData.used_percent}%) - ${language === 'pl' ? 'Pozostało' : 'Remaining'}: ${creditsData.remaining}`
                                    : (language === 'pl' ? 'Nie udało się pobrać stanu kredytów.' : 'Unable to load credits usage.')}
                            </label>
                        </div>
                        {creditsData && (
                            <div className={styles.creditPill}>
                                {creditsData.remaining}
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionOption}>
                        <div className={styles.textWrapper}>
                            <label className={styles.sectionTitle}>{t('userSettings.username')}</label>
                            <label className={styles.optionLabel}>{pendingChanges.username || userData?.username}</label>
                        </div>
                        <button className={styles.optionButton} onClick={() => openModal('username')}>{t('userSettings.edit')}</button>
                    </div>
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionOption}>
                        <div className={styles.textWrapper}>
                            <label className={styles.sectionTitle}>{t('userSettings.password')}</label>
                            <label className={styles.optionLabel}>{t('userSettings.passwordDescription')}</label>
                        </div>
                        <button className={styles.optionButton} onClick={() => openModal('password')}>{t('userSettings.change')}</button>
                    </div>
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionOption}>
                        <div className={styles.textWrapper}>
                            <label className={styles.sectionTitle}>{t('userSettings.deleteAccount')}</label>
                            <label className={styles.optionLabel}>{t('userSettings.deleteAccountDescription')}</label>
                        </div>
                        <button className={styles.deleteAccountButton} onClick={() => openModal('deleteAccount')}>{t('userSettings.deleteAccount')}</button>
                    </div>
                </div>
            </div>

            <div className={`${styles.savedMessage} ${showSavedMessage ? styles.show : ''}`}><p>{t('settings.savedMessage')}</p></div>
            <div className={`${styles.unsavedMessage} ${hasUnsavedChanges ? styles.show : ''}`}><p>{t('settings.unsavedMessage')}</p></div>

            <div className={styles.buttonsContainer}>
                <button className={styles.saveButton} onClick={handleSave} disabled={!hasUnsavedChanges}>{t('settings.saveChanges')}</button>
                <button className={styles.cancelButton} onClick={handleCancel} disabled={!hasUnsavedChanges}>{t('settings.cancel')}</button>
            </div>

            {isAvatarModalOpen && (
                <AvatarModal 
                    onClose={() => setIsAvatarModalOpen(false)} 
                    onSave={handleAvatarSaveFromModal} 
                    onDelete={handleMarkAvatarForDeletion}
                    userData={userData}
                />
            )}

            {isModalOpen && (
                <Modal {...modalContent} onClose={closeModal} onSave={handleSaveModal} />
            )}
        </div>
    );
}