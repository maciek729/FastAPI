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

export default function Settings({userData}) {
    const [theme, setTheme] = useState("light");

    const [language, setLanguage] = useState("pl");

    const [saved, setSaved] = useState(false);

    const handleThemeChange = (event) => {
        setTheme(event.target.value);
    };

    const handleLanguageChange = (event) => {
        setLanguage(event.target.value);
    };

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => {
            setSaved(false);
        }, 3000);
    };

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
                        <button className={styles.optionButton}>Zarządzaj</button>
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
                        <button className={styles.optionButton}>Zarządzaj</button>
                    </div>
                </div>
            </div>

            {/* Komunikat */}
            <div className={`${styles.infoMessage} ${saved ? styles.show : ''}`}>
                <p>Pomyślnie zapisano.</p>
            </div>

            {/* Przyciski */}
            <div className={styles.buttonsContainer}>
                <button className={styles.saveButton} onClick={handleSave}>Zapisz zmiany</button>
                <button className={styles.cancelButton}>Anuluj</button>
            </div>
        </div>
    );
}