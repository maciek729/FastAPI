import React, {useState} from 'react';
import styles from "../../../css/features/Settings.module.css"
import SettingsSelectElement from './SettingsSelectElement';

const ThemeOptions = [
    { value: 'light', label: 'Jasny' },
    { value: 'dark', label: 'Ciemny' },
    { value: 'system', label: 'Systemowy' }
];

const LanguageOptions = [
    { value: 'pl', label: 'Polski' },
    { value: 'en', label: 'English' }
];

export default function Settings({userData}) {
    // Domyslny motyw to biały
    const [theme, setTheme] = useState("light");

    // Domyslny jezyk to polski
    const [language, setLanguage] = useState("pl");

    const handleThemeChange = (event) => {
        setTheme(event.target.value);
    };

    const handleLanguageChange = (event) => {
        setLanguage(event.target.value);
    };

    return (
        <div className={styles.settingsMainContainer}>
            
            {/* Nagłówek */}
             <div className={styles.titleContainer}>
                <h2 className={styles.title}>Ustawienia ogólne</h2>
                <p className={styles.subtitle}>Dostosuj aplikację według swoich preferencji.</p>
            </div>

            {/* Opcje ustawień */}
            <div className={styles.sectionHeader}>
                <p>Mam zamiar też dodać sekcje do tych ustawień teraz już nie mam na to czasu</p>
            </div>
            <div className={styles.settingsGroup}>
                <SettingsSelectElement
                    id="theme-select"
                    label="Wybierz motyw aplikacji:"
                    value={theme}
                    onChange={handleThemeChange}
                    options={ThemeOptions}
                />
                <SettingsSelectElement
                    id="language-select"
                    label="Wybierz język aplikacji:"
                    value={language}
                    onChange={handleLanguageChange}
                    options={LanguageOptions}
                />
            </div>

            {/* Przyciski */}
        </div>
    );
}