import React, { useContext } from 'react';
import { X, Download, ExternalLink, AlertCircle } from 'lucide-react';
import generatorStyles from "../../../css/features/FlashcardGenerator.module.css";
import { LanguageContext } from '../../../translations/LanguageContext';
import translations from '../../../translations/translation.json';

const FileViewer = ({ file, onClose }) => {
    // --- Dodanie obsługi tłumaczeń ---
    const { language } = useContext(LanguageContext);
    
    const t = (key, params = {}) => {
        const keys = key.split('.');
        let translation = translations[language];
        for (const k of keys) {
            translation = translation?.[k];
            if (!translation) return key;
        }
        if (typeof translation === 'string' && Object.keys(params).length > 0) {
            return translation.replace(/\{(\w+)\}/g, (_, k) => params[k] || `{${k}}`);
        }
        return translation || key;
    };
    // -------------------------------

    if (!file) return null;

    const extension = file.file_name.split('.').pop().toLowerCase();
    
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension);
    const isPdf = ['pdf'].includes(extension);
    const isGoogleSupported = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt'].includes(extension);

    const renderContent = () => {
        if (isImage) {
            return (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', overflow: 'auto' }}>
                    <img 
                        src={file.file_url} 
                        alt={file.file_name} 
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                    />
                </div>
            );
        }

        if (isPdf) {
            return (
                <iframe 
                    src={file.file_url} 
                    title={file.file_name}
                    style={{ width: '100%', height: '100%', border: 'none', borderRadius: '4px', background: '#fff' }}
                />
            );
        }

        if (isGoogleSupported) {
            const encodedUrl = encodeURIComponent(file.file_url);
            return (
                <iframe 
                    src={`https://docs.google.com/gview?url=${encodedUrl}&embedded=true`}
                    title={file.file_name}
                    style={{ width: '100%', height: '100%', border: 'none', borderRadius: '4px', background: '#fff' }}
                />
            );
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', gap: '1rem' }}>
                <AlertCircle size={48} />
                <p>{t('filesView.previewNotAvailable', { ext: extension })}</p>
                <a 
                    href={file.file_url} 
                    download 
                    className={generatorStyles.btnSubmit}
                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Download size={18} /> {t('filesView.downloadFile')}
                </a>
            </div>
        );
    };

    return (
        <div className={generatorStyles.modalOverlay} onClick={onClose} style={{zIndex: 2000}}>
            <div 
                className={generatorStyles.modalContainer} 
                onClick={(e) => e.stopPropagation()}
                style={{ 
                    width: '95vw', 
                    height: '95vh', 
                    maxWidth: '1400px',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--bg-secondary)' 
                }}
            >
                <div className={generatorStyles.header} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    <h2 className={generatorStyles.title} style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {file.file_name}
                    </h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <a 
                            href={file.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className={generatorStyles.closeBtn}
                            title={t('filesView.openOriginal')}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <ExternalLink size={20} />
                        </a>
                        <button
                            className={generatorStyles.closeBtn}
                            onClick={onClose}
                            title={t('filesView.close')}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
                
                <div style={{ flex: 1, padding: '1rem', overflow: 'hidden', position: 'relative' }}>
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default FileViewer;