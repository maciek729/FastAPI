import React, { useState, useContext } from 'react';
import styles from "../../../../css/features/settings/Modal.module.css"; 
import { checkUsernameAvailability as checkAvailabilityService } from '../../../../services/userService';
import { LanguageContext } from "../../../../translations/LanguageContext";
import translations from "../../../../translations/translation.json";

const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
};

export default function Modal({
    title,
    currentValueLabel,
    currentValue,
    newInputLabel,
    inputType,
    buttonText,
    onClose,
    onSave,
    saveType,
    hideCurrent,
    isDelete,
    oldValue
}) {
    const { language } = useContext(LanguageContext);
    const [newInputValue, setNewInputValue] = useState('');
    const [validationError, setValidationError] = useState('');

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

    const isInputValid = () => {
        const value = newInputValue;
        if (hideCurrent) {
            return true;
        }
        if (saveType === 'username') {
            return value.length >= 3 && value.length <= 15 && value != oldValue;
        }
        
        return value.length > 0;
    };
    
    const runValidationAndSetError = (value) => {
        setValidationError('');
        
        if (!hideCurrent && saveType === 'username') {
            if (value.length > 0) {
                if (value.length < 3) {
                    setValidationError(t('userSettings.usernameShorterThan'));
                    return false;
                }
                if (value.length > 15) {
                    setValidationError(t('userSettings.usernameLongerThan'));
                    return false;
                }
                if (value == oldValue) {
                    setValidationError(t('userSettings.usernameTaken'));
                    return false;
                }
            }
        }
        
        return true;
    };

    const checkUsernameAvailability = async (username) => {
        try {
            const token = getCookie('access_token');
            
            const data = await checkAvailabilityService(username, token);
            
            return data.available;
        } catch (error) {
            setValidationError('Nie można sprawdzić dostępności nazwy. Spróbuj później.');
            return false; 
        }
    };

    const handleSave = async () => {
        if (!isInputValid()) {
            runValidationAndSetError(newInputValue);
            return;
        }

        if (saveType === 'username' && newInputValue !== oldValue) {
            const isAvailable = await checkUsernameAvailability(newInputValue);
            
            if (!isAvailable) {
                setValidationError('userSettings.usernameTaken');
                return;
            }
        }
        onSave(saveType, newInputValue);
        setNewInputValue('');
        setValidationError('');
    };

    const handleChange = (e) => {
        const value = e.target.value;
        setNewInputValue(value);
        if (!hideCurrent) {
            runValidationAndSetError(value); 
        }
    };

    const closeIcon = '\u2715'; 

    const shouldShowError = validationError && !hideCurrent && newInputValue.length > 0;

    return (
        <div className={styles.modalBackdrop} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                
                <button className={styles.closeButton} onClick={onClose} aria-label="Zamknij">
                    {closeIcon}
                </button>

                <h3 className={styles.modalTitle}>{title}</h3>
                
                {!hideCurrent && (
                <div className={styles.displayRow}>
                    <label className={styles.currentLabel}>{currentValueLabel}:</label>
                    <span className={styles.currentValue}>{currentValue}</span>
                </div>
                )}
                
                <div className={styles.inputRow}>
                    <label htmlFor="new-input" className={styles.newLabel}>{newInputLabel}</label>
                    
                    {!hideCurrent && (
                    <input
                        id="new-input"
                        type={inputType}
                        value={newInputValue}
                        className={styles.inputField}
                        onChange={handleChange}
                    />
                    )}
                    
                    {shouldShowError && (
                        <p className={styles.validationError}>{validationError}</p>
                    )}
                </div>

                <div className={styles.buttonContainer}>
                    <button 
                        className={styles.saveButton} 
                        onClick={handleSave}
                        disabled={!isInputValid()}
                    >
                        {buttonText}
                    </button>
                </div>
            </div>
        </div>
    );
}