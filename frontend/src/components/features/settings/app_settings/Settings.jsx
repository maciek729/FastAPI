import React, {useState} from 'react';
import styles from "../../../../css/features/settings/Settings.module.css"
import SettingsSelectElement from './SettingsSelectElement';

const ThemeOptions = [
    { value: 'light', label: 'Jasny' },
    { value: 'dark', label: 'Ciemny' },
    { value: 'system', label: 'Systemowy' }
];

const LanguageOptions = [
    { value: 'pl', label: 'Polski (Polish)' },
    { value: 'en', label: 'English (Angielski)' }
];

export default function Settings({userData, onGoToSection}) {
    // Obsluga zmiany ustawien
    const [theme, setTheme] = useState("light");
    const [language, setLanguage] = useState("pl");

    // Wartosci z bazy danych (które ma już zapisane)
    // Potrzebne do porównania czy są jakieś zmiany
    // i do przywrócenia ustawień przy anulowaniu
    // i do wyswietlenia komunikatu "Masz niezapisane zmiany"
    const [savedTheme, setSavedTheme] = useState("light");
    const [savedLanguage, setSavedLanguage] = useState("pl");

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
    const hasUnsavedChanges = (theme !== savedTheme) || (language !== savedLanguage);

    const handleThemeChange = (event) => {
        setTheme(event.target.value);
    };

    const handleLanguageChange = (event) => {
        setLanguage(event.target.value);
    };

    const handleSave = () => {
        setSavedTheme(theme);
        setSavedLanguage(language);
        setSaved(true);
        setTimeout(() => {
            setSaved(false);
        }, 3000);
    };

    const handleCancel = () => {
        setTheme(savedTheme);
        setLanguage(savedLanguage);
    }

    return (
        <div className={styles.settingsMainContainer}>
            
            <div className={styles.titleContainer}>
                <h2 className={styles.title}>Ustawienia</h2>
                {/*<p className={styles.subtitle}>Dostosuj aplikację według swoich preferencji.</p>*/}
            </div>

            <div className={styles.sectionContainer}>
                {/* Sekcja Konto - umożliwia przejście na profil konto
                gdyby użytkownik nie mógł go znaleźć */}
                <div className={styles.section}>
                    <div className={styles.sectionOption}>
                        <div className={styles.textWrapper}>
                            <label className={styles.sectionTitle}>Konto</label>
                            <label className={styles.optionLabel}>Zmień swoje dane, edytuj hasło lub e-mail i zarządzaj bezpieczeństwem konta.</label>
                        </div>    
                        <button className={styles.optionButton} onClick={()=>onGoToSection('user_settings')}>Zarządzaj</button>
                    </div>
                </div>
        
                {/* Sekcja Motyw - umożliwia zmianę motywu aplikacji */}
                <div className={styles.section}>
                    <div className={styles.sectionOption}>
                        <div className={styles.textWrapper}>
                            <label className={styles.sectionTitle}>Motyw</label>
                            <label className={styles.optionLabel}>Dostosuj wygląd aplikacji.</label>
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
                            <label className={styles.sectionTitle}>Język</label>
                            <label className={styles.optionLabel}>Wybierz preferowany język aplikacji.</label>
                        </div>    
                        <div className={styles.selectWrapper}>
                            <select 
                                className={styles.optionSelect}
                                value={language}
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
                            <label className={styles.sectionTitle}>Powiadomienia</label>
                            <label className={styles.optionLabel}>Skonfiguruj swoje preferencje dotyczące powiadomień powiadomień.</label>
                        </div>
                        <button className={styles.optionButton} onClick={()=>onGoToSection('notifications')}>Zarządzaj</button>
                    </div>
                </div>
            </div>

            {/* Komunikaty */}
            <div className={`${styles.savedMessage} ${saved ? styles.show : ''}`}>
                <p>Pomyślnie zapisano.</p>
            </div>
            <div className={`${styles.unsavedMessage} ${hasUnsavedChanges ? styles.show : ''}`}>
                <p>Masz niezapisane zmiany.</p>
            </div>

            {/* Przyciski */}
            <div className={styles.buttonsContainer}>
                <button className={styles.saveButton} onClick={handleSave} disabled={!hasUnsavedChanges}>Zapisz zmiany</button>
                <button className={styles.cancelButton} onClick={handleCancel} disabled={!hasUnsavedChanges}>Anuluj</button>
            </div>
        </div>
    );
}