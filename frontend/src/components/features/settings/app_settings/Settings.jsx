import React, {useState, useEffect, useContext} from 'react';
import styles from "../../../../css/features/settings/Settings.module.css"
import SettingsSelectElement from './SettingsSelectElement';
import { useLanguage } from "../../../../translations/LanguageContext";
import translations from "../../../../translations/translation.json";

export default function Settings({userData, onGoToSection}) {
    const { language, changeLanguage } = useLanguage();
    
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

    // Theme options z tłumaczeniami
    const ThemeOptions = [
        { value: 'light', label: t('settings.themeOptions.light') },
        { value: 'dark', label: t('settings.themeOptions.dark') },
        { value: 'system', label: t('settings.themeOptions.system') }
    ];

    // Language options z tłumaczeniami
    const LanguageOptions = [
        { value: 'pl', label: t('settings.languageOptions.polish') },
        { value: 'en', label: t('settings.languageOptions.english') }
    ];

    // Local Storage
    const getInitialTheme = () => {
        const savedTheme = localStorage.getItem('appTheme');
        return savedTheme ? savedTheme : 'light';
    }

    // Obsluga zmiany ustawien
    const [theme, setTheme] = useState(getInitialTheme());
    const [selectedLanguage, setSelectedLanguage] = useState(language);

    // Wartosci z bazy danych (które ma już zapisane)
    // Potrzebne do porównania czy są jakieś zmiany
    // i do przywrócenia ustawień przy anulowaniu
    // i do wyswietlenia komunikatu "Masz niezapisane zmiany"
    const [savedTheme, setSavedTheme] = useState(getInitialTheme()); // muszę zmienić na userData.theme
    const [savedLanguage, setSavedLanguage] = useState(language); // userData.language

    const [saved, setSaved] = useState(false);

    /*
    To użyć, gdy będę mieć theme i language w tabeli usera
    useEffect(() => {
        if (userData) {
            setTheme(userData.theme || "light");
            setLanguage(userData.language || "pl");
            setSavedTheme(userData.theme || "light");
            setSavedLanguage(userData.language || "pl");
        }
    }, [userData]);
    */
    useEffect(() => {
        if (savedTheme === 'light') {
            document.documentElement.removeAttribute('data-theme');
        } else if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else if (savedTheme === 'system') {
            // automatyczne dopasowanie do systemu
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        }
    }, [savedTheme]);

    const hasUnsavedChanges = (theme !== savedTheme) || (selectedLanguage !== savedLanguage);

    const handleThemeChange = (event) => {
        setTheme(event.target.value);
    };

    const handleLanguageChange = (event) => {
        setSelectedLanguage(event.target.value);
    };

    const handleSave = () => {
        localStorage.setItem('appTheme', theme);
        setSavedTheme(theme);
        setSavedLanguage(selectedLanguage);
        changeLanguage(selectedLanguage);
        setSaved(true);
        setTimeout(() => {
            setSaved(false);
        }, 3000);
    };

    const handleCancel = () => {
        setTheme(savedTheme);
        setSelectedLanguage(savedLanguage);
    }

    return (
        <div className={styles.settingsMainContainer}>
            
            <div className={styles.titleContainer}>
                <h2 className={styles.title}>{t('settings.title')}</h2>
                {/*<p className={styles.subtitle}>Dostosuj aplikację według swoich preferencji.</p>*/}
            </div>

            <div className={styles.sectionContainer}>
                {/* Sekcja Konto - umożliwia przejście na profil konto
                gdyby użytkownik nie mógł go znaleźć */}
                <div className={styles.section}>
                    <div className={styles.sectionOption}>
                        <div className={styles.textWrapper}>
                            <label className={styles.sectionTitle}>{t('settings.account')}</label>
                            <label className={styles.optionLabel}>{t('settings.accountDescription')}</label>
                        </div>    
                        <button className={styles.optionButton} onClick={()=>onGoToSection('user_settings')}>{t('settings.manage')}</button>
                    </div>
                </div>
        
                {/* Sekcja Motyw - umożliwia zmianę motywu aplikacji */}
                <div className={styles.section}>
                    <div className={styles.sectionOption}>
                        <div className={styles.textWrapper}>
                            <label className={styles.sectionTitle}>{t('settings.theme')}</label>
                            <label className={styles.optionLabel}>{t('settings.themeDescription')}</label>
                        </div>    
                        <div className={styles.selectWrapper}>
                            <select
                                className={styles.optionSelect}
                                value={theme}
                                onChange={handleThemeChange}
                            >
                                {ThemeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                
                {/* Sekcja Język - umożliwia zmianę języka aplikacji */}
                <div className={styles.section}>
                    <div className={styles.sectionOption}>
                        <div className={styles.textWrapper}>
                            <label className={styles.sectionTitle}>{t('settings.language')}</label>
                            <label className={styles.optionLabel}>{t('settings.languageDescription')}</label>
                        </div>    
                        <div className={styles.selectWrapper}>
                            <select 
                                className={styles.optionSelect}
                                value={selectedLanguage}
                                onChange={handleLanguageChange}
                            >
                                {LanguageOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Sekcja Powiadomienia - umożliwia przejście do ustawień powiadomień
                gdyby użytkownik nie mógł ich znaleźć */}
                <div className={styles.section}>
                    <div className={styles.sectionOption}>
                        <div className={styles.textWrapper}>
                            <label className={styles.sectionTitle}>{t('settings.notifications')}</label>
                            <label className={styles.optionLabel}>{t('settings.notificationsDescription')}</label>
                        </div>
                        <button className={styles.optionButton} onClick={()=>onGoToSection('notifications')}>{t('settings.manage')}</button>
                    </div>
                </div>
            </div>

            {/* Komunikaty */}
            <div className={`${styles.savedMessage} ${saved ? styles.show : ''}`}>
                <p>{t('settings.savedMessage')}</p>
            </div>
            <div className={`${styles.unsavedMessage} ${hasUnsavedChanges ? styles.show : ''}`}>
                <p>{t('settings.unsavedMessage')}</p>
            </div>

            {/* Przyciski */}
            <div className={styles.buttonsContainer}>
                <button className={styles.saveButton} onClick={handleSave} disabled={!hasUnsavedChanges}>{t('settings.saveChanges')}</button>
                <button className={styles.cancelButton} onClick={handleCancel} disabled={!hasUnsavedChanges}>{t('settings.cancel')}</button>
            </div>
        </div>
    );
}