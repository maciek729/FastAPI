import React, {useState} from 'react';
import styles from "../../../../css/features/settings/Settings.module.css"
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
    const [theme, setTheme] = useState("light");

    const [language, setLanguage] = useState("pl");

    const handleThemeChange = (event) => {
        setTheme(event.target.value);
    };

    const handleLanguageChange = (event) => {
        setLanguage(event.target.value);
    };

    return (
        <div className={styles.settingsMainContainer}>
            
             <div className={styles.titleContainer}>
                <h2 className={styles.title}>Ustawienia ogólne</h2>
                <p className={styles.subtitle}>Dostosuj aplikację według swoich preferencji.</p>
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