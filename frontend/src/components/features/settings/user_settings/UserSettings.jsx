import React, { useContext } from 'react';
import styles from "../../../../css/features/settings/UserSettings.module.css"
import { LanguageContext } from "../../../../translations/LanguageContext";
import translations from "../../../../translations/translation.json";

export default function UserSettings({userData}) {
    const { language } = useContext(LanguageContext);

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
                    <div className={styles.userAvatar}>
                        {userData?.name?.charAt(0) || userData?.username?.charAt(0) || "U"}
                    </div>
                </div>
                <div className={styles.section}>
                    <div className={styles.sectionOption}>
                        <div className={styles.textWrapper}>
                            <label className={styles.sectionTitle}>{t('userSettings.username')}</label>
                            <label className={styles.optionLabel}>{userData?.username}</label>
                        </div>    
                        <button className={styles.optionButton}>{t('userSettings.edit')}</button>
                    </div>
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionOption}>
                        <div className={styles.textWrapper}>
                            <label className={styles.sectionTitle}>{t('userSettings.email')}</label>
                            <label className={styles.optionLabel}>{userData?.email}</label>
                        </div>    
                        <button className={styles.optionButton}>{t('userSettings.edit')}</button>
                    </div>
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionOption}>
                        <div className={styles.textWrapper}>
                            <label className={styles.sectionTitle}>{t('userSettings.password')}</label>
                            <label className={styles.optionLabel}>{t('userSettings.passwordDescription')}</label>
                        </div>    
                        <button className={styles.optionButton}>{t('userSettings.change')}</button>
                    </div>
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionOption}>
                        <div className={styles.textWrapper}>
                            <label className={styles.sectionTitle}>{t('userSettings.deleteAccount')}</label>
                        </div>    
                        <button className={styles.deleteAccountButton}>{t('userSettings.deleteAccountButton')}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}