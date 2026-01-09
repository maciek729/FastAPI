import React from 'react';
import { createRoot } from 'react-dom/client';
import { X } from 'lucide-react';
import translations from '../translations/translation.json';

export const confirmModal = (message) => {
  return new Promise((resolve) => {
    const modalContainer = document.createElement('div');
    document.body.appendChild(modalContainer);
    const root = createRoot(modalContainer);

    const handleConfirm = () => {
      root.unmount();
      document.body.removeChild(modalContainer);
      resolve(true);
    };

    const handleCancel = () => {
      root.unmount();
      document.body.removeChild(modalContainer);
      resolve(false);
    };

    const ConfirmModal = () => {
      const language = typeof window !== 'undefined' ? (localStorage.getItem('language') || 'pl') : 'pl';
      const t = translations[language] || translations.pl;
      const title = (t.confirm && t.confirm.title) || (t.noteEditor && t.noteEditor.deleteTitle) || 'Confirm';
      const cancelText = (t.confirm && t.confirm.cancel) || (t.noteEditor && t.noteEditor.cancel) || 'Cancel';
      const confirmText = (t.confirm && t.confirm.confirm) || 'Confirm';

      return (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem',
          }}
          onClick={handleCancel}
        >
          <div
            style={{
              background: 'var(--inner_section_bg)',
              borderRadius: '16px',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(148, 163, 184, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.5rem 1.5rem 1rem',
                borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: 'var(--title)',
                }}
              >
                {title}
              </h3>
              <button
                onClick={handleCancel}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--subtitle)',
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--title)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--subtitle)')}
              >
                <X size={20} />
              </button>
            </div>
            <div
              style={{
                padding: '1.5rem',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '0.9375rem',
                  color: 'var(--subtitle)',
                  lineHeight: 1.6,
                }}
              >
                {message}
              </p>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                padding: '1rem 1.5rem 1.5rem',
                borderTop: '1px solid rgba(148, 163, 184, 0.1)',
              }}
            >
              <button
                onClick={handleCancel}
                style={{
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '8px',
                  background: 'var(--inner_inner_section_bg)',
                  color: 'var(--subtitle)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--inner_section_bg)';
                  e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--inner_inner_section_bg)';
                  e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)';
                }}
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                autoFocus
                style={{
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  border: 'none',
                  borderRadius: '8px',
                  background: '#ef4444',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#dc2626';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ef4444';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      );
    };

    root.render(<ConfirmModal />);
  });
};
