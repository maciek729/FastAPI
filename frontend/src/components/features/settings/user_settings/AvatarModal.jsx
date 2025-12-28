import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import styles from "../../../../css/features/settings/Modal.module.css";
import { getCroppedImg } from './canvasUtils';

export default function AvatarModal({ onClose, onSave, onDelete, userData }) {
    const [image, setImage] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const onSelectFile = (e) => {
        if (e.target.files && e.target.files.length > 0) {
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
            console.error("Błąd przycinania:", e);
        }
    };

    return (
        <div className={styles.modalBackdrop} onClick={onClose}>
            <div className={`${styles.modalContent} ${styles.avatarModal}`} onClick={(e) => e.stopPropagation()}>
                <h3 className={styles.modalTitle}>Dostosuj zdjęcie profilowe</h3>
                
                {!image ? (
                    <div className={styles.uploadContainer}>
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={onSelectFile} 
                            id="avatar-upload" 
                            style={{ display: 'none' }} 
                        />
                        <label htmlFor="avatar-upload" className={styles.saveButton}>
                            Wybierz nowe zdjęcie
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
                                Usuń obecne zdjęcie
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
                    <button className={styles.cancelButton} onClick={onClose}>Anuluj</button>
                    {image && (
                        <button className={styles.saveButton} onClick={handleConfirm}>
                            Przytnij i wybierz
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}