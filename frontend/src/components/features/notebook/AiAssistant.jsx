import { useState, useContext, useEffect } from 'react';
import toast from 'react-hot-toast';
import { X, Send, Sparkles } from 'lucide-react';
import styles from '../../../css/features/FlashcardGenerator.module.css';
import ENDPOINTS from '../../../api/endpoints';
import { LanguageContext } from '../../../translations/LanguageContext';
import translations from '../../../translations/translation.json';

export default function AiAssistant({ onClose, onInsert, selectedText = '' }) {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { language } = useContext(LanguageContext);

    const t = (key, params = {}) => {
        const keys = key.split('.');
        let translation = translations[language];

        for (const k of keys) {
            translation = translation?.[k];
            if (!translation) return key;
        }

        if (typeof translation === 'string' && Object.keys(params).length > 0) {
            return translation.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
        }

        return translation || key;
    };

    // Prefill prompt when selectedText or language changes using localized template
    useEffect(() => {
        if (selectedText && selectedText.length > 0) {
            setPrompt(t('aiAssistant.explainTemplate', { text: selectedText }));
        } else {
            setPrompt('');
        }
    }, [selectedText, language]);

    const handleGenerate = async (e) => {
        e.preventDefault();

        if (!prompt.trim()) {
            toast.error(t('aiAssistant.emptyPrompt'));
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(ENDPOINTS.AI.CHAT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: prompt.trim(),
                    conversation: []
                })
            });

            if (!response.ok) {
                const bodyText = await response.text().catch(() => response.statusText);
                throw new Error(`AI service error: ${response.status} ${bodyText}`);
            }

            const data = await response.json();
            if (data && data.response) {
                onInsert(data.response);
            } else {
                onInsert(prompt);
                toast.warning(t('aiAssistant.returnedNoText'));
            }
            setPrompt('');
        } catch (err) {
            console.error('AI Error:', err);
            toast.error(t('aiAssistant.generateError', { message: err.message || err }));
            onInsert(prompt);
            setPrompt('');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Sparkles size={20} style={{ color: '#8b5cf6' }} />
                        {t('aiAssistant.title')}
                    </h2>
                    <button className={styles.closeBtn} onClick={onClose} title="Close">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleGenerate} className={styles.form}>
                    <div className={styles.formSection}>
                        <h3 className={styles.sectionTitle}>{t('aiAssistant.sectionTitle')}</h3>

                        <div className={styles.formGroup}>
                            <label>{t('aiAssistant.promptLabel')}</label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder={t('aiAssistant.promptPlaceholder')}
                                disabled={isLoading}
                                required
                                rows={6}
                                style={{ resize: 'vertical', minHeight: '120px' }}
                            />
                            <small style={{ color: 'var(--subtitle)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                {t('aiAssistant.helper')}
                            </small>
                        </div>
                    </div>

                    <div className={styles.formActions}>
                        <button
                            type="button"
                            className={styles.btnCancel}
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            {t('aiAssistant.cancel')}
                        </button>
                        <button
                            type="submit"
                            className={styles.btnSubmit}
                            disabled={isLoading}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                justifyContent: 'center'
                            }}
                        >
                            <Send size={16} />
                            {isLoading ? t('aiAssistant.generating') : t('aiAssistant.generate')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
