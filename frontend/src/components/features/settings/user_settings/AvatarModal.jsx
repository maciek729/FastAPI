import React, { useState, useCallback, useContext } from 'react';
import toast from 'react-hot-toast';
import Cropper from 'react-easy-crop';
import styles from "../../../../css/features/settings/Modal.module.css";
import { getCroppedImg } from './canvasUtils';
import { LanguageContext } from "../../../../translations/LanguageContext";
import translations from "../../../../translations/translation.json";

export default function AvatarModal({ onClose, onSave, onDelete, userData }) {
    const [image, setImage] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const { language } = useContext(LanguageContext);

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

    const onSelectFile = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];

            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
            if (!allowedTypes.includes(file.type)) {
                toast.error(t('userSettings.photoFormat'));
                e.target.value = null;
                return;
            }

            const reader = new FileReader();
            reader.readAsDataURL(e.target.files[0]);
            reader.onload = () => setImage(reader.result);
        }
    };

    const onCropComplete = useCallback((_croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleConfirm = async () => {
        try {
            const croppedBlob = await getCroppedImg(image, croppedAreaPixels);
            const croppedFile = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" });
            onSave(croppedFile);
        } catch (e) {
        }
    };

    return (
        <div className={styles.modalBackdrop} onClick={onClose}>
            <div className={`${styles.modalContent} ${styles.avatarModal}`} onClick={(e) => e.stopPropagation()}>
                <h3 className={styles.modalTitle}>{t('userSettings.adjustPhoto')}</h3>
                
                {!image ? (
                    <div className={styles.uploadContainer}>
                        <input 
                            type="file" 
                            accept=".jpg,.jpeg,.png"
                            onChange={onSelectFile}
                            id="avatar-upload"
                            style={{ display: 'none' }} 
                        />
                        <label htmlFor="avatar-upload" className={styles.saveButton}>
                            {t('userSettings.photoPick')}
                        </label>
                        
                        {userData?.avatar_url && (
                            <button 
                                type="button"
                                className={styles.deletePhotoButton} 
                                onClick={onDelete}
                                style={{ 
                                    marginTop: '20px', 
                                    color: '#ff4d4d', 
                                    background: 'none', 
                                    border: 'none', 
                                    cursor: 'pointer', 
                                    textDecoration: 'underline',
                                    fontWeight: '500'
                                }}
                            >
                                {t('userSettings.removePhoto')}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className={styles.cropperWrapper}>
                        <div style={{ position: 'relative', width: '100%', height: '300px', background: '#333' }}>
                            <Cropper
                                image={image}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                                cropShape="round"
                                showGrid={false}
                            />
                        </div>
                        <div className={styles.zoomSlider}>
                            <input 
                                type="range" 
                                value={zoom} 
                                min={1} 
                                max={3} 
                                step={0.1} 
                                onChange={(e) => setZoom(e.target.value)} 
                            />
                        </div>
                    </div>
                )}

                <div className={styles.buttonContainer}>
                    <button className={styles.cancelButton} onClick={onClose}>{t('userSettings.cancelPhoto')}</button>
                    {image && (
                        <button className={styles.saveButton} onClick={handleConfirm}>
                            {t('userSettings.cropAndPick')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}