import React from 'react';
import styles from "../../../../css/features/settings/UserSettings.module.css"

export default function UserSettings({userData}) {
    return (
        <div className={styles.settingsMainContainer}>
            <div className={styles.titleContainer}>
                <h2 className={styles.title}>Konto</h2>
                {/*<p className={styles.subtitle}>Zmień informacje o koncie.</p>*/}
            </div>

            <div className={styles.sectionContainer}>
                <div className={styles.sectionOption}>
                    <div className={styles.textWrapper}>
                        <label className={styles.sectionTitle}>Zdjęcie profilowe</label>
                        <label className={styles.optionLabel}>Zmień swoje zdjęcie.</label>
                    </div>
                    <div className={styles.userAvatar}>
                        {userData?.name?.charAt(0) || userData?.username?.charAt(0) || "U"}
                    </div>
                </div>
                <div className={styles.section}>
                    <div className={styles.sectionOption}>
                        <div className={styles.textWrapper}>
                            <label className={styles.sectionTitle}>Nazwa użytkownika</label>
                            <label className={styles.optionLabel}>{userData?.username}</label>
                        </div>    
                        <button className={styles.optionButton}>Edytuj</button>
                    </div>
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionOption}>
                        <div className={styles.textWrapper}>
                            <label className={styles.sectionTitle}>Adres e-mail</label>
                            <label className={styles.optionLabel}>{userData?.email}</label>
                        </div>    
                        <button className={styles.optionButton}>Edytuj</button>
                    </div>
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionOption}>
                        <div className={styles.textWrapper}>
                            <label className={styles.sectionTitle}>Hasło</label>
                            <label className={styles.optionLabel}>Zmień swoje hasło.</label>
                        </div>    
                        <button className={styles.optionButton}>Zmień</button>
                    </div>
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionOption}>
                        <div className={styles.textWrapper}>
                            <label className={styles.sectionTitle}>Deaktywuj / Usuń konto ?</label>
                            <label className={styles.optionLabel}>Nie wiem, czy usuwać kaskadowo, czy zmienić zmienną isActive w userData na false</label>
                        </div>    
                        <button className={styles.deleteAccountButton}>Usuń konto</button>
                    </div>
                </div>
            </div>
        </div>
    );
}