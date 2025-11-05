import React from "react";
import styles from "../../../../css/features/settings/SettingsSelectElement.module.css";

export default function SettingsSelectElement({id, label, value, onChange, options}) {
    return (
        <div className={styles.selectWrapper}>
            <label htmlFor={id} className={styles.selectLabel}>
                {label}
            </label>
            
            <select
                id={id}
                className={styles.selectElement}
                value={value}
                onChange={onChange}
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}