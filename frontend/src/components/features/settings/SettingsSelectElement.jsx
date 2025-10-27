import React from "react";
import styles from "../../../css/features/Settings.module.css";

export default function SettingsSelectElement({id, label, value, onChange, options}) {
    return (
        <div className={styles.selectWrapper}>
            {/* Etykieta dla pola wyboru */}
            <label htmlFor={id} className={styles.selectLabel}>
                {label}
            </label>
            
            {/* Pole select */}
            <select
                id={id}
                className={styles.selectElement}
                value={value}
                onChange={onChange}
            >
                {/* Mapujemy przekazane opcje */}
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}