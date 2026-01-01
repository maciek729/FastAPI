import React, { useState, useEffect, useContext } from 'react';
import { X, ChevronRight, ChevronLeft, Globe } from 'lucide-react';
import styles from '../../css/demo/Demo.module.css';
import { LanguageContext } from '../../translations/LanguageContext';
import translations from '../../translations/translation.json';

const Demo = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { language, changeLanguage } = useContext(LanguageContext);

  useEffect(() => {
    const hasSeenDemo = localStorage.getItem('hasSeenDemo');
    if (!hasSeenDemo) {
      setTimeout(() => setIsOpen(true), 1000);
    }
  }, []);

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  const steps = [
    {
      title: t('demo.steps.welcome.title'),
      description: t('demo.steps.welcome.description'),
      subdescription: t('demo.steps.welcome.subdescription'),
      showLanguageSelector: true,
      icon: "🎓"
    },
    {
      title: t('demo.steps.createNotebooks.title'),
      description: t('demo.steps.createNotebooks.description'),
      icon: "📚"
    },
    {
      title: t('demo.steps.addNotes.title'),
      description: t('demo.steps.addNotes.description'),
      icon: "📝"
    },
    {
      title: t('demo.steps.pinOrganize.title'),
      description: t('demo.steps.pinOrganize.description'),
      icon: "📌"
    },
    {
      title: t('demo.steps.folderMaterials.title'),
      description: t('demo.steps.folderMaterials.description'),
      icon: "📁"
    },
    {
      title: t('demo.steps.generateFlashcards.title'),
      description: t('demo.steps.generateFlashcards.description'),
      icon: "🎯"
    },
    {
      title: t('demo.steps.listenPodcasts.title'),
      description: t('demo.steps.listenPodcasts.description'),
      icon: "🎧"
    },
    {
      title: t('demo.steps.chatWithAI.title'),
      description: t('demo.steps.chatWithAI.description'),
      icon: "💬"
    },
    {
      title: t('demo.steps.groupChat.title'),
      description: t('demo.steps.groupChat.description'),
      icon: "👥"
    },
    {
      title: t('demo.steps.ready.title'),
      description: t('demo.steps.ready.description'),
      icon: "🚀"
    }
  ];

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('hasSeenDemo', 'true');
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsOpen(false);
      localStorage.setItem('hasSeenDemo', 'true');
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
