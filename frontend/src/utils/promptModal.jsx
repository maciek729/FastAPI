import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { X } from 'lucide-react';

export const promptModal = (message, defaultValue = '') => {
  return new Promise((resolve) => {
    const modalContainer = document.createElement('div');
    document.body.appendChild(modalContainer);
    const root = createRoot(modalContainer);

    const handleSubmit = (value) => {
      root.unmount();
      document.body.removeChild(modalContainer);
      resolve(value);
    };

    const handleCancel = () => {
      root.unmount();
      document.body.removeChild(modalContainer);
      resolve(null);
    };

    const PromptModal = () => {
      const [value, setValue] = useState(defaultValue);

      return (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '2rem',
          }}
          onClick={handleCancel}
        >
          <div
            style={{
              background: 'var(--inner_section_bg)',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '450px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: 'var(--title)' }}>
                {message}
              </h3>
              <button
                onClick={handleCancel}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--subtitle)',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(148, 163, 184, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit(value);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <input
                autoFocus
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Wpisz nazwę..."
                style={{
                  padding: '0.75rem 1rem',
                  border: '2px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  background: 'var(--inner_inner_section_bg)',
                  color: 'var(--title)',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#8b5cf6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleCancel}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: '2px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '10px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    background: 'var(--inner_inner_section_bg)',
                    color: 'var(--subtitle)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--inner_section_bg)';
                    e.currentTarget.style.color = 'var(--title)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--inner_inner_section_bg)';
                    e.currentTarget.style.color = 'var(--subtitle)';
                  }}
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
                  }}
                >
                  OK
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    };

    root.render(<PromptModal />);
  });
};
