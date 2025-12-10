import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, FileText, Zap, FolderOpen, Menu, X, Star, Users, Sparkles, LogIn } from 'lucide-react';
import styles from '../../css/features/Intro.module.css';

const Intro = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState({});

  // Helper function to get cookie
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

  // Check if user is already logged in and redirect to dashboard
  useEffect(() => {
    const token = getCookie('access_token');
    if (token) {
      // User is already logged in, redirect to dashboard
      navigate('/dashboard');
    }
  }, [navigate]);

  const features = [
    {
      icon: <FolderOpen className={styles.featureIcon} />,
      title: "Materiały w jednym miejscu",
      description: "Notatki, pliki, fiszki, testy - wszystko zorganizowane i gotowe na egzamin",
    },
    {
      icon: <Users className={styles.featureIcon} />,
      title: "Grupy i współpraca",
      description: "Dziel się materiałami, twórz wspólne przestrzenie, uczcie się razem",
    },
    {
      icon: <Zap className={styles.featureIcon} />,
      title: "AI generuje za Ciebie",
      description: "Fiszki i testy automatycznie z Twoich notatek - zero papierkowej roboty",
    },
    {
      icon: <MessageCircle className={styles.featureIcon} />,
      title: "Pytaj AI o wszystko",
      description: "Wyjaśnienia, odpowiedzi, pomoc - natychmiast, kiedy tylko potrzebujesz",
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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [features.length]);

  const handleGetStarted = () => {
    navigate('/register');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <div className={styles.introContainer}>
      {/* Navigation Header */}
      <header className={styles.introHeader}>
        <div className={styles.introNav}>
          <div className={styles.introLogo}>
            <Sparkles className={styles.introLogoIcon} />
            <span className={styles.introLogoText}>zdAI to!</span>
          </div>
          
          {/* Desktop Navigation */}
          <nav className={styles.introNavLinks}>
          </nav>
          
          {/* Auth Buttons */}
          <div className={styles.introAuthButtons}>
            <button 
              className={styles.introBtnLogin}
              onClick={handleLogin}
            >
              <LogIn size={18} />
              Zaloguj się
            </button>
            <button
              className={styles.introBtnSignup}
              onClick={handleGetStarted}
            >
              <Users size={18} />
              Utwórz konto
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className={styles.introMobileMenuBtn}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className={styles.introMobileMenu}>
            <button className={styles.introMobileLogin} onClick={handleLogin}>
              Zaloguj się
            </button>
            <button className={styles.introMobileSignup} onClick={handleGetStarted}>
              Utwórz konto
            </button>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className={styles.introHero}>
        <div className={styles.introHeroContent}>
          <div className={styles.introHeroBadge}>
            <Sparkles size={16} />
            <span>Wspierane przez AI • Twój inteligentny asystent nauki</span>
          </div>

          <h1 className={styles.introHeroTitle}>
            Wszystko czego potrzebujesz <span className={styles.introGradientText}>w jednym miejscu</span>
          </h1>

          <p className={styles.introHeroDescription}>
            Organizuj materiały do nauki, twórz fiszki i testy, rozmawiaj z AI, współpracuj w grupach.
            zdAI to! to kompletna platforma edukacyjna, która pomaga Ci efektywnie przygotować się
            do sprawdzianów, egzaminów i kolokwiów - wszystko wygodnie i szybko w jednym miejscu.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.introFeatures}>
        <div className={styles.introFeaturesGrid}>
          {features.map((feature, index) => (
            <div
              key={index}
              id={`feature-${index}`}
              className={`${styles.introFeatureCard} ${
                isVisible[`feature-${index}`] ? styles.visible : ''
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={styles.introFeatureIconWrapper}>
                {feature.icon}
              </div>
              <h3 className={styles.introFeatureTitle}>{feature.title}</h3>
              <p className={styles.introFeatureDescription}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works Section */}
      <section className={styles.introHowItWorks}>
        <h2 className={styles.introSectionTitle}>
          Jak to <span className={styles.introGradientText}>działa?</span>
        </h2>
        <div className={styles.introStepsContainer}>
          <div className={styles.introStep}>
            <div className={styles.introStepNumber}>1</div>
            <h3>Zbieraj materiały</h3>
            <p>Dodawaj notatki i PDF albo generuj już w czacie AI</p>
          </div>
          <div className={styles.introStepArrow}>→</div>
          <div className={styles.introStep}>
            <div className={styles.introStepNumber}>2</div>
            <h3>Twórz z AI</h3>
            <p>Generuj fiszki i testy jednym kliknięciem</p>
          </div>
          <div className={styles.introStepArrow}>→</div>
          <div className={styles.introStep}>
            <div className={styles.introStepNumber}>3</div>
            <h3>Współpracuj</h3>
            <p>Dziel się w grupach i przygotowujcie się razem</p>
          </div>
          <div className={styles.introStepArrow}>→</div>
          <div className={styles.introStep}>
            <div className={styles.introStepNumber}>4</div>
            <h3>Zdaj za 1 razem</h3>
            <p>Zawsze przygotowany, zawsze pewny siebie</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.introFooter}>
        <div className={styles.introFooterContent}>
          <div className={styles.introFooterLogo}>
            <div className={styles.introFooterLogoIcon}>
              <Sparkles className={styles.introFooterSparkles} />
            </div>
            <span className={styles.introFooterLogoText}>zdAI to!</span>
          </div>
          
          <div className={styles.introFooterLinks}>
            <div className={styles.introFooterNav}>
              <a href="#" className={styles.introFooterLink}>Warunki użytkowania</a>
              <a href="#" className={styles.introFooterLink}>Polityka prywatności</a>
              <a href="#" className={styles.introFooterLink}>Kontakt</a>
            </div>
            <div className={styles.introFooterCopyright}>
              © 2025 zdAI to! Wszystkie prawa zastrzeżone.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Intro;