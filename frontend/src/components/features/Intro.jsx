import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, Users, Sparkles, LogIn } from 'lucide-react';
import styles from '../../css/features/Intro.module.css';
import { LanguageContext } from "../../translations/LanguageContext";
import translations from "../../translations/translation.json";
import logoLight from "../layout/logolight.png";

const Intro = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState({});
  const { language } = useContext(LanguageContext);

  const t = (key, params = {}) => {
    const keys = key.split('.');
    let translation = translations[language];
    
    for (const k of keys) {
      translation = translation?.[k];
      if (!translation) return key;
    }
    
    if (typeof translation === 'string' && Object.keys(params).length > 0) {
      return translation.replace(/\{(\w+)\}/g, (match, key) => {
        return params[key] || match;
      });
    }
    
    return translation || key;
  };

  const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  useEffect(() => {
    const token = getCookie('access_token');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const features = [
    {
      title: t('intro.features.aiChat.title') || "Czat z AI asystentem",
      description: t('intro.features.aiChat.description') || "Zadawaj pytania i otrzymuj natychmiastowe odpowiedzi. AI pomaga wyjaśnić trudne koncepcje prostym językiem.",
    },
    {
      title: t('intro.features.notes.title') || "Smart notatki",
      description: t('intro.features.notes.description') || "Twórz notatki z formatowaniem, obrazami i tabelami. Wszystko zapisywane w chmurze, dostępne z każdego urządzenia.",
    },
    {
      title: t('intro.features.flashcards.title') || "Fiszki",
      description: t('intro.features.flashcards.description') || "AI automatycznie generuje fiszki z Twoich notatek. Ucz się efektywnie metodą powtórek.",
    },
    {
      title: t('intro.features.tests.title') || "Testy",
      description: t('intro.features.tests.description') || "Sprawdź swoją wiedzę z automatycznie generowanymi testami. Śledź postępy i poprawiaj wyniki.",
    },
    {
      title: t('intro.features.podcasts.title') || "Podkasty audio",
      description: t('intro.features.podcasts.description') || "Przekształć notatki w podkasty audio. Ucz się w drodze, na spacerze czy w siłowni.",
    },
    {
      title: t('intro.features.collaboration.title') || "Wspólna nauka",
      description: t('intro.features.collaboration.description') || "Udostępniaj notatniki i ucz się razem z przyjaciółmi. Współpracuj w czasie rzeczywistym.",
    },
    {
      title: t('intro.features.chatWithFriends.title') || "Czatuj z przyjaciółmi",
      description: t('intro.features.chatWithFriends.description') || "Omawiaj materiały, zadawaj pytania i pomagaj sobie nawzajem w nauce.",
    },
    {
      title: t('intro.features.organization.title') || "Wszystko w jednym miejscu",
      description: t('intro.features.organization.description') || "Notebooki, foldery, etykiety, wyszukiwanie - wszystkie materiały zorganizowane tak, jak lubisz.",
    },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('[id^="feature-"]').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const slides = t('intro.showcase.slides') || [];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handleGetStarted = () => {
    navigate('/register');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  return (
    <div className={styles.introContainer}>
      <header className={styles.introHeader}>
        <div className={styles.introNav}>
          <div className={styles.introLogo}>
            {/* <Sparkles className={styles.introLogoIcon} /> */}
            <img src={logoLight} alt="zdAI to logo" className={styles.logoImg} />
            <span className={styles.introLogoText}>{t('intro.logo')}</span>
          </div>

          <div className={styles.introAuthButtons}>
            <button 
              className={styles.introBtnLogin}
              onClick={handleLogin}
            >
              <LogIn size={18} />
              {t('intro.auth.login')}
            </button>
            <button 
              className={styles.introBtnSignup}
              onClick={handleGetStarted}
            >
              <Users size={18} />
              {t('intro.auth.start')}
            </button>
          </div>

          <button 
            className={styles.introMobileMenuBtn}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMenuOpen && (
          <div className={styles.introMobileMenu}>
            <button className={styles.introMobileLogin} onClick={handleLogin}>
              {t('intro.auth.login')}
            </button>
            <button className={styles.introMobileSignup} onClick={handleGetStarted}>
              {t('intro.auth.startFree')}
            </button>
          </div>
        )}
      </header>

      <section className={styles.introHero}>
        <div className={styles.introHeroTop}>
          <div className={styles.introHeroContent}>
            <h1 className={styles.introHeroTitle}>
              <span className={styles.introHeroTitleLarge}>{t('intro.hero.title1')}</span>
              <br />
              {t('intro.hero.subtitle')}
              <br />
              <span className={`${styles.introGradientText} ${styles.introHeroTitleLarge}`}>{t('intro.hero.title2')}</span>{t('intro.hero.title3')}
            </h1>

            <p className={styles.introHeroDescription}>
              {t('intro.hero.description')}
            </p>

            <div className={styles.introHeroButtons}>
              <button
                className={styles.introBtnPrimary}
                onClick={handleGetStarted}
              >
                {t('intro.hero.startFree')}
              </button>
            </div>
          </div>

          <div className={styles.introHeroCarouselSection}>
            <div className={styles.introHeroCarousel}>
              <div className={styles.introHeroCarouselContent}>
                <div className={styles.introHeroCarouselSlide}>
                  <div className={styles.introHeroImagePlaceholder}>
                    <Sparkles size={40} className={styles.introHeroPlaceholderIcon} />
                  </div>
                  <div className={styles.introHeroSlideInfo}>
                    <h3 className={styles.introHeroSlideTitle}>{slides[currentSlide]?.title}</h3>
                    <p className={styles.introHeroSlideDesc}>{slides[currentSlide]?.description}</p>
                  </div>
                </div>
              </div>

              <div className={styles.introHeroCarouselDots}>
                {slides.map((_, index) => (
                  <button
                    key={index}
                    className={`${styles.introHeroCarouselDot} ${index === currentSlide ? styles.active : ''}`}
                    onClick={() => goToSlide(index)}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className={styles.introFeatures}>
        <div className={styles.introSectionHeader}>
          <h2 className={styles.introSectionTitle}>
            {t('intro.features.title1')}<span className={styles.introGradientText}>{t('intro.features.title2')}</span>
          </h2>
          <p className={styles.introSectionDescription}>
            {t('intro.features.description')}
          </p>
        </div>

        <div className={styles.introFeaturesGrid}>
          {features.map((feature, index) => (
            <div
              key={index}
              id={`feature-${index}`}
              className={`${styles.introFeatureCard} ${
                isVisible[`feature-${index}`] ? styles.visible : ''
              }`}
            >
              <h3 className={styles.introFeatureTitle}>{feature.title}</h3>
              <p className={styles.introFeatureDescription}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.introCta}>
        <div className={styles.introCtaContent}>
          <div className={`${styles.introCtaBox} ${isVisible['cta'] ? styles.visible : ''}`}>
            <h2 className={styles.introCtaTitle}>
              {t('intro.cta.title')}
            </h2>
            <p className={styles.introCtaDescription}>
              {t('intro.cta.description')}
            </p>
            
            <div className={styles.introCtaButtons}>
              <button 
                className={styles.introCtaPrimary}
                onClick={handleGetStarted}
              >
                <span className={styles.introCtaBtnContent}>
                  <Users className={styles.introCtaIcon} />
                  {t('intro.cta.createAccount')}
                  <Sparkles className={styles.introCtaSparkles} />
                </span>
              </button>
              
              <div className={styles.introCtaSocialProof}>
                <div className={styles.introCtaFreeText}>{t('intro.cta.freeStart')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.introFooter}>
        <div className={styles.introFooterContent}>
          <div className={styles.introFooterLogo}>
            <img src={logoLight} alt="zdAI to logo" className={styles.logoImg} />
            <span className={styles.introLogoText}>{t('intro.logo')}</span>
          </div>
          
          <div className={styles.introFooterLinks}>
            <div className={styles.introFooterNav}>
              <a href="#" className={styles.introFooterLink}>{t('intro.footer.terms')}</a>
              <a href="#" className={styles.introFooterLink}>{t('intro.footer.privacy')}</a>
              <a href="#" className={styles.introFooterLink}>{t('intro.footer.contact')}</a>
            </div>
            <div className={styles.introFooterCopyright}>
              {t('intro.footer.copyright')}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Intro;