import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, FileText, Zap, FolderOpen, Menu, X, Star, Users, Sparkles, LogIn } from 'lucide-react';
import styles from '../css/Intro.module.css';

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
      icon: <MessageCircle className={styles.featureIcon} />,
      title: "Porozmawiaj z AI Study Buddy",
      description: "Uzyskaj natychmiastowe odpowiedzi, wyjaśnienia i spersonalizowane wskazówki na dowolny temat. Twój prywatny korepetytor dostępny 24/7.",
      highlight: "Inteligentne odpowiedzi w sekundach",
    },
    {
      icon: <FileText className={styles.featureIcon} />,
      title: "Bezproblemowe robienie notatek",
      description: "Rób jasne, zwięzłe notatki bezpośrednio w zdAI. Organizuj je łatwo i uzyskuj dostęp w dowolnym miejscu i czasie.",
      highlight: "Synchronizacja w chmurze",
    },
    {
      icon: <Zap className={styles.featureIcon} />,
      title: "Generuj skuteczne materiały",
      description: "Przekształć swoje notatki w niestandardowe fiszki i testy sprawdzające. Ucz się mądrzej, a nie ciężej.",
      highlight: "AI tworzy idealne fiszki",
    },
    {
      icon: <FolderOpen className={styles.featureIcon} />,
      title: "Scentralizowane centrum nauki",
      description: "Przechowuj wszystkie materiały do nauki - notatki, fiszki, quizy - starannie zorganizowane w jednym miejscu.",
      highlight: "Wszystko w jednym miejscu",
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
            <a href="#features" className={styles.introNavLink}>Funkcje</a>
            <a href="#benefits" className={styles.introNavLink}>Korzyści</a>
            <a href="#testimonials" className={styles.introNavLink}>Opinie</a>
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
              Rozpocznij
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
            <a href="#features" onClick={() => setIsMenuOpen(false)}>Funkcje</a>
            <a href="#benefits" onClick={() => setIsMenuOpen(false)}>Korzyści</a>
            <a href="#testimonials" onClick={() => setIsMenuOpen(false)}>Opinie</a>
            <button className={styles.introMobileLogin} onClick={handleLogin}>
              Zaloguj się
            </button>
            <button className={styles.introMobileSignup} onClick={handleGetStarted}>
              Rozpocznij za darmo
            </button>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className={styles.introHero}>
        <div className={styles.introHeroContent}>
          <div className={styles.introHeroBadge}>
            <Sparkles size={16} />
            <span>Wspierane przez AI • Zaufane przez 10,000+ uczniów</span>
          </div>
          
          <h1 className={styles.introHeroTitle}>
            Twoja osobista <span className={styles.introGradientText}>AI nauka</span> rewolucja
          </h1>
          
          <p className={styles.introHeroDescription}>
            zdAI to! łączy w sobie inteligentną konwersację AI, łatwe notatowanie i inteligentne 
            narzędzia do generowania materiałów edukacyjnych - wszystko w jednym, pięknie 
            zaprojektowanym miejscu.
          </p>
          
          <div className={styles.introHeroButtons}>
            <button 
              className={styles.introBtnPrimary}
              onClick={handleGetStarted}
            >
              <Users size={20} />
              Zacznij za darmo
              <Sparkles className={styles.introBtnSparkle} size={16} />
            </button>
            <button className={styles.introBtnSecondary}>
              <MessageCircle size={20} />
              Zobacz jak działa
            </button>
          </div>
          
          <div className={styles.introHeroStats}>
            <div className={styles.introStat}>
              <div className={styles.introStatNumber}>10,000+</div>
              <div className={styles.introStatLabel}>Aktywnych uczniów</div>
            </div>
            <div className={styles.introStatDivider}></div>
            <div className={styles.introStat}>
              <div className={styles.introStatNumber}>50,000+</div>
              <div className={styles.introStatLabel}>Utworzonych fiszek</div>
            </div>
            <div className={styles.introStatDivider}></div>
            <div className={styles.introStat}>
              <div className={styles.introStatNumber}>4.9/5</div>
              <div className={styles.introStatLabel}>Ocena użytkowników</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.introFeatures}>
        <div className={styles.introSectionHeader}>
          <h2 className={styles.introSectionTitle}>
            Wszystko czego potrzebujesz <span className={styles.introGradientText}>w jednym miejscu</span>
          </h2>
          <p className={styles.introSectionDescription}>
            Kompleksowy ekosystem do nauki, zaprojektowany aby Ci pomóc osiągnąć więcej
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
              <div className={styles.introFeatureIconWrapper}>
                {feature.icon}
              </div>
              <h3 className={styles.introFeatureTitle}>{feature.title}</h3>
              <p className={styles.introFeatureDescription}>{feature.description}</p>
              <div className={styles.introFeatureHighlight}>
                <Sparkles size={14} />
                <span>{feature.highlight}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className={styles.introBenefits}>
        <div className={styles.introBenefitsContent}>
          <div className={styles.introBenefitsText}>
            <h2 className={styles.introBenefitsTitle}>
              Ucz się <span className={styles.introGradientText}>mądrzej</span>, nie ciężej
            </h2>
            <div className={styles.introBenefitsList}>
              <div className={styles.introBenefitItem}>
                <div className={styles.introBenefitIcon}>
                  <Zap size={20} />
                </div>
                <div>
                  <h3>Oszczędzaj czas</h3>
                  <p>AI automatycznie tworzy fiszki i quizy z Twoich notatek</p>
                </div>
              </div>
              <div className={styles.introBenefitItem}>
                <div className={styles.introBenefitIcon}>
                  <MessageCircle size={20} />
                </div>
                <div>
                  <h3>Uzyskaj natychmiastową pomoc</h3>
                  <p>24/7 dostęp do AI asystenta nauki dla każdego tematu</p>
                </div>
              </div>
              <div className={styles.introBenefitItem}>
                <div className={styles.introBenefitIcon}>
                  <FolderOpen size={20} />
                </div>
                <div>
                  <h3>Zachowaj porządek</h3>
                  <p>Wszystkie materiały do nauki w jednym, zorganizowanym miejscu</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className={styles.introBenefitsVisual}>
            <div className={styles.introMockupCard}>
              <div className={styles.introMockupHeader}>
                <div className={styles.introMockupDots}>
                  <span></span><span></span><span></span>
                </div>
              </div>
              <div className={styles.introMockupContent}>
                <div className={`${styles.introMockupMessage} ${styles.user}`}>
                  Wyjaśnij fotosyntezę prostymi słowami
                </div>
                <div className={`${styles.introMockupMessage} ${styles.ai}`}>
                  Oczywiście! Fotosynteza to sposób, w jaki rośliny...
                </div>
                <div className={styles.introMockupTyping}>
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className={styles.introTestimonials}>
        <h2 className={styles.introSectionTitle}>
          Co mówią <span className={styles.introGradientText}>nasi użytkownicy</span>
        </h2>
        
        <div className={styles.introTestimonialsGrid}>
          <div className={styles.introTestimonialCard}>
            <div className={styles.introTestimonialStars}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} fill="currentColor" className={styles.introStarIcon} />
              ))}
            </div>
            <p className={styles.introTestimonialText}>
              "zdAI to! całkowicie zmieniło moje podejście do nauki. AI asystent jest niesamowity!"
            </p>
            <div className={styles.introTestimonialAuthor}>
              <div className={styles.introAuthorAvatar}>A</div>
              <div>
                <div className={styles.introAuthorName}>Anna Kowalska</div>
                <div className={styles.introAuthorRole}>Uczennica liceum</div>
              </div>
            </div>
          </div>

          <div className={styles.introTestimonialCard}>
            <div className={styles.introTestimonialStars}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} fill="currentColor" className={styles.introStarIcon} />
              ))}
            </div>
            <p className={styles.introTestimonialText}>
              "Najlepsza aplikacja do nauki jakiej używałem. Automatyczne fiszki oszczędzają mi godziny!"
            </p>
            <div className={styles.introTestimonialAuthor}>
              <div className={styles.introAuthorAvatar}>P</div>
              <div>
                <div className={styles.introAuthorName}>Piotr Nowak</div>
                <div className={styles.introAuthorRole}>Student uniwersytetu</div>
              </div>
            </div>
          </div>

          <div className={styles.introTestimonialCard}>
            <div className={styles.introTestimonialStars}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} fill="currentColor" className={styles.introStarIcon} />
              ))}
            </div>
            <p className={styles.introTestimonialText}>
              "Wreszcie wszystkie moje notatki w jednym miejscu. Interfejs jest piękny i intuicyjny."
            </p>
            <div className={styles.introTestimonialAuthor}>
              <div className={styles.introAuthorAvatar}>M</div>
              <div>
                <div className={styles.introAuthorName}>Maria Wiśniewska</div>
                <div className={styles.introAuthorRole}>Maturzystka</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.introCta}>
        <div className={styles.introCtaContent}>
          <div className={`${styles.introCtaBox} ${isVisible['cta'] ? styles.visible : ''}`}>
            <h2 className={styles.introCtaTitle}>
              Gotowy na rewolucję w nauce?
            </h2>
            <p className={styles.introCtaDescription}>
              Dołącz do tysięcy uczniów, którzy już odkryli moc AI w nauce. 
              Rozpocznij swoją przygodę już dziś - całkowicie za darmo!
            </p>
            
            <div className={styles.introCtaButtons}>
              <button 
                className={styles.introCtaPrimary}
                onClick={handleGetStarted}
              >
                <span className={styles.introCtaBtnContent}>
                  <Users className={styles.introCtaIcon} />
                  Stwórz konto teraz
                  <Sparkles className={styles.introCtaSparkles} />
                </span>
              </button>
              
              <div className={styles.introCtaSocialProof}>
                <div className={styles.introCtaFreeText}>Darmowy start • Bez zobowiązań</div>
                <div className={styles.introCtaRating}>
                  <div className={styles.introRatingStars}>
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={styles.introStarIcon} fill="currentColor" />
                    ))}
                  </div>
                  <span className={styles.introRatingText}>4.9/5 z 2,500+ opinii</span>
                </div>
              </div>
            </div>
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