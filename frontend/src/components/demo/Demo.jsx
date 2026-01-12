import React, { useState, useEffect, useContext } from 'react';
import { X, ChevronRight, ChevronLeft, Globe } from 'lucide-react';
import styles from '../../css/demo/Demo.module.css';
import { LanguageContext } from '../../translations/LanguageContext';
import translations from '../../translations/translation.json';
import { getNotebooks } from '../../services/notebookService';
import { completeTutorial } from '../../services/userService';

const Demo = ({ onSelectNotebook, onNavigateToResource, userData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { language, changeLanguage } = useContext(LanguageContext);

  useEffect(() => {
    // Check from database field instead of localStorage
    console.log('Demo check - userData:', userData);
    console.log('Demo check - has_completed_tutorial:', userData?.has_completed_tutorial);

    if (userData && !userData.has_completed_tutorial) {
      console.log('Opening demo - user has not completed tutorial');
      setTimeout(() => setIsOpen(true), 1000);
    } else {
      console.log('Not opening demo - userData:', userData, 'has_completed:', userData?.has_completed_tutorial);
    }

    const handleReopenDemo = () => {
      setIsOpen(true);
      setCurrentStep(0);
    };

    window.addEventListener('reopenDemo', handleReopenDemo);
    return () => {
      window.removeEventListener('reopenDemo', handleReopenDemo);
    };
  }, [userData]);

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  // Get first shared notebook for demo purposes
  const [firstNotebook, setFirstNotebook] = useState(null);

  useEffect(() => {
    const fetchFirstNotebook = async () => {
      if (!userData?.id) return;

      try {
        const sharedNotebooks = await getNotebooks(userData.id, 'shared');
        if (sharedNotebooks && sharedNotebooks.length > 0) {
          setFirstNotebook(sharedNotebooks[0]);
        }
      } catch (err) {
        console.log('No notebooks available for demo');
      }
    };
    fetchFirstNotebook();
  }, [userData]);

  const steps = [
    {
      title: t('demo.steps.welcome.title'),
      description: t('demo.steps.welcome.description'),
      subdescription: t('demo.steps.welcome.subdescription'),
      showLanguageSelector: true,
      icon: "🎓",
      action: null
    },
    {
      title: t('demo.steps.createNotebooks.title'),
      description: t('demo.steps.createNotebooks.description'),
      icon: "📚",
      action: null // Just shows dashboard/sidebar
    },
    {
      title: t('demo.steps.addNotes.title'),
      description: t('demo.steps.addNotes.description'),
      icon: "📝",
      action: firstNotebook ? () => {
        onSelectNotebook?.(firstNotebook);
        setTimeout(() => {
          // Ensure we're on files tab after selecting notebook
          window.dispatchEvent(new CustomEvent('selectNotebookTab', { detail: 'files' }));
        }, 100);
      } : null
    },
    {
      title: t('demo.steps.pinOrganize.title'),
      description: t('demo.steps.pinOrganize.description'),
      icon: "📌",
      action: firstNotebook ? () => {
        onSelectNotebook?.(firstNotebook);
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('selectNotebookTab', { detail: 'files' }));
        }, 100);
      } : null
    },
    {
      title: t('demo.steps.folderMaterials.title'),
      description: t('demo.steps.folderMaterials.description'),
      icon: "📁",
      action: firstNotebook ? () => {
        onSelectNotebook?.(firstNotebook);
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('selectNotebookTab', { detail: 'files' }));
        }, 100);
      } : null
    },
    {
      title: t('demo.steps.generateFlashcards.title'),
      description: t('demo.steps.generateFlashcards.description'),
      icon: "🎯",
      action: firstNotebook ? () => {
        onSelectNotebook?.(firstNotebook);
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('selectNotebookTab', { detail: 'flashcards' }));
        }, 100);
      } : null
    },
    {
      title: t('demo.steps.listenPodcasts.title'),
      description: t('demo.steps.listenPodcasts.description'),
      icon: "🎧",
      action: firstNotebook ? () => {
        onSelectNotebook?.(firstNotebook);
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('selectNotebookTab', { detail: 'podcasts' }));
        }, 100);
      } : null
    },
    {
      title: t('demo.steps.chatWithAI.title'),
      description: t('demo.steps.chatWithAI.description'),
      icon: "💬",
      action: firstNotebook ? () => {
        onSelectNotebook?.(firstNotebook);
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('selectNotebookTab', { detail: 'chat' }));
        }, 100);
      } : null
    },
    {
      title: t('demo.steps.groupChat.title'),
      description: t('demo.steps.groupChat.description'),
      icon: "👥",
      action: firstNotebook ? () => {
        onNavigateToResource?.({
          type: 'notebook',
          notebookId: firstNotebook.id,
          tab: 'group-chat'
        });
      } : null
    },
    {
      title: t('demo.steps.ready.title'),
      description: t('demo.steps.ready.description'),
      icon: "🚀",
      action: null
    }
  ];

  const handleClose = async () => {
    setIsOpen(false);
    // Mark tutorial as completed in database
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await completeTutorial(token);
      } catch (err) {
        console.error('Failed to mark tutorial as completed:', err);
      }
    }
  };

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);

      if (steps[nextStep].action && typeof steps[nextStep].action === 'function') {
        steps[nextStep].action();
      }
    } else {
      setIsOpen(false);
      // Mark tutorial as completed in database
      const token = localStorage.getItem('token');
      if (token) {
        try {
          await completeTutorial(token);
        } catch (err) {
          console.error('Failed to mark tutorial as completed:', err);
        }
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleLanguageChange = (lang) => {
    changeLanguage(lang);
    setCurrentStep(1);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.demoContainer}>
      <div className={styles.demoHeader}>
        <h3 className={styles.demoTitle}>
          {steps[currentStep].title}
        </h3>
        <div className={styles.demoActions}>
          <button
            className={styles.closeBtn}
            onClick={handleClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className={styles.demoContent}>
        {steps[currentStep].icon && (
          <div className={styles.demoIcon}>
            {steps[currentStep].icon}
          </div>
        )}

        <p className={styles.demoDescription}>
          {steps[currentStep].description}
        </p>

        {steps[currentStep].subdescription && (
          <p className={styles.demoSubdescription}>
            {steps[currentStep].subdescription}
          </p>
        )}

        {steps[currentStep].showLanguageSelector && (
          <div className={styles.languageSelector}>
            <Globe size={18} className={styles.globeIcon} />
            <button
              className={`${styles.langBtn} ${language === 'pl' ? styles.active : ''}`}
              onClick={() => handleLanguageChange('pl')}
            >
              PL
            </button>
            <button
              className={`${styles.langBtn} ${language === 'en' ? styles.active : ''}`}
              onClick={() => handleLanguageChange('en')}
            >
              EN
            </button>
          </div>
        )}
      </div>

      <div className={styles.demoFooter}>
        <div className={styles.stepIndicator}>
          {steps.map((_, index) => (
            <span
              key={index}
              className={`${styles.dot} ${index === currentStep ? styles.active : ''} ${index < currentStep ? styles.completed : ''}`}
            />
          ))}
        </div>

        <div className={styles.demoButtons}>
          {currentStep > 0 && (
            <button
              className={styles.prevBtn}
              onClick={handlePrevious}
            >
              <ChevronLeft size={18} />
              {t('demo.buttons.back')}
            </button>
          )}

          <button
            className={styles.nextBtn}
            onClick={handleNext}
          >
            {currentStep === steps.length - 1 ? (
              <>
                {t('demo.buttons.finish')}
                <ChevronRight size={18} />
              </>
            ) : (
              <>
                {t('demo.buttons.next')}
                <ChevronRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Demo;
