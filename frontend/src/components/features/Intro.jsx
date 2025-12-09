import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, FileText, Zap, FolderOpen, Menu, X, Star, Users, Sparkles, LogIn } from 'lucide-react';
import styles from '../../css/features/Intro.module.css';
import { LanguageContext } from "../../translations/LanguageContext";
import translations from "../../translations/translation.json";

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
      icon: <MessageCircle className={styles.featureIcon} />,
      title: t('intro.features.aiChat.title') || "Porozmawiaj z AI Study Buddy",
      description: t('intro.features.aiChat.description') || "Uzyskaj natychmiastowe odpowiedzi, wyjaśnienia i spersonalizowane wskazówki na dowolny temat. Twój prywatny korepetytor dostępny 24/7.",
      highlight: t('intro.features.aiChat.highlight') || "Inteligentne odpowiedzi w sekundach",
    },
    {
      icon: <FileText className={styles.featureIcon} />,
      title: t('intro.features.notes.title') || "Bezproblemowe robienie notatek",
      description: t('intro.features.notes.description') || "Rób jasne, zwięzłe notatki bezpośrednio w zdAI. Organizuj je łatwo i uzyskuj dostęp w dowolnym miejscu i czasie.",
      highlight: t('intro.features.notes.highlight') || "Synchronizacja w chmurze",
    },
    {
      icon: <Zap className={styles.featureIcon} />,
      title: t('intro.features.materials.title') || "Generuj skuteczne materiały",
      description: t('intro.features.materials.description') || "Przekształć swoje notatki w niestandardowe fiszki i testy sprawdzające. Ucz się mądrzej, a nie ciężej.",
      highlight: t('intro.features.materials.highlight') || "AI tworzy idealne fiszki",
    },
    {
      icon: <FolderOpen className={styles.featureIcon} />,
      title: t('intro.features.organization.title') || "Scentralizowane centrum nauki",
      description: t('intro.features.organization.description') || "Przechowuj wszystkie materiały do nauki - notatki, fiszki, quizy - starannie zorganizowane w jednym miejscu.",
      highlight: t('intro.features.organization.highlight') || "Wszystko w jednym miejscu",
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
      <header className={styles.introHeader}>
        <div className={styles.introNav}>
          <div className={styles.introLogo}>
            <Sparkles className={styles.introLogoIcon} />
            <span className={styles.introLogoText}>{t('intro.logo')}</span>
          </div>
          
          <nav className={styles.introNavLinks}>
            <a href="#features" className={styles.introNavLink}>{t('intro.nav.features')}</a>
            <a href="#benefits" className={styles.introNavLink}>{t('intro.nav.benefits')}</a>
            <a href="#testimonials" className={styles.introNavLink}>{t('intro.nav.testimonials')}</a>
          </nav>
          
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
            <a href="#features" onClick={() => setIsMenuOpen(false)}>{t('intro.nav.features')}</a>
            <a href="#benefits" onClick={() => setIsMenuOpen(false)}>{t('intro.nav.benefits')}</a>
            <a href="#testimonials" onClick={() => setIsMenuOpen(false)}>{t('intro.nav.testimonials')}</a>
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
        <div className={styles.introHeroContent}>
          <div className={styles.introHeroBadge}>
            <Sparkles size={16} />
            <span>{t('intro.hero.badge')}</span>
          </div>
          
          <h1 className={styles.introHeroTitle}>
            {t('intro.hero.title1')}<span className={styles.introGradientText}>{t('intro.hero.title2')}</span>{t('intro.hero.title3')}
          </h1>
          
          <p className={styles.introHeroDescription}>
            {t('intro.hero.description')}
          </p>
          
          <div className={styles.introHeroButtons}>
            <button 
              className={styles.introBtnPrimary}
              onClick={handleGetStarted}
            >
              <Users size={20} />
              {t('intro.hero.startFree')}
              <Sparkles className={styles.introBtnSparkle} size={16} />
            </button>
            <button className={styles.introBtnSecondary}>
              <MessageCircle size={20} />
              {t('intro.hero.seeHow')}
            </button>
          </div>
          
          <div className={styles.introHeroStats}>
            <div className={styles.introStat}>
              <div className={styles.introStatNumber}>10,000+</div>
              <div className={styles.introStatLabel}>{t('intro.hero.stats.students')}</div>
            </div>
            <div className={styles.introStatDivider}></div>
            <div className={styles.introStat}>
              <div className={styles.introStatNumber}>50,000+</div>
              <div className={styles.introStatLabel}>{t('intro.hero.stats.flashcards')}</div>
            </div>
            <div className={styles.introStatDivider}></div>
            <div className={styles.introStat}>
              <div className={styles.introStatNumber}>4.9/5</div>
              <div className={styles.introStatLabel}>{t('intro.hero.stats.rating')}</div>
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

      <section id="benefits" className={styles.introBenefits}>
        <div className={styles.introBenefitsContent}>
          <div className={styles.introBenefitsText}>
            <h2 className={styles.introBenefitsTitle}>
              {t('intro.benefits.title1')}<span className={styles.introGradientText}>{t('intro.benefits.title2')}</span>{t('intro.benefits.title3')}
            </h2>
            <div className={styles.introBenefitsList}>
              <div className={styles.introBenefitItem}>
                <div className={styles.introBenefitIcon}>
                  <Zap size={20} />
                </div>
                <div>
                  <h3>{t('intro.benefits.saveTime')}</h3>
                  <p>{t('intro.benefits.saveTimeDesc')}</p>
                </div>
              </div>
              <div className={styles.introBenefitItem}>
                <div className={styles.introBenefitIcon}>
                  <MessageCircle size={20} />
                </div>
                <div>
                  <h3>{t('intro.benefits.instantHelp')}</h3>
                  <p>{t('intro.benefits.instantHelpDesc')}</p>
                </div>
              </div>
              <div className={styles.introBenefitItem}>
                <div className={styles.introBenefitIcon}>
                  <FolderOpen size={20} />
                </div>
                <div>
                  <h3>{t('intro.benefits.stayOrganized')}</h3>
                  <p>{t('intro.benefits.stayOrganizedDesc')}</p>
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

      <section id="testimonials" className={styles.introTestimonials}>
        <h2 className={styles.introSectionTitle}>
          {t('intro.testimonials.title1')}<span className={styles.introGradientText}>{t('intro.testimonials.title2')}</span>
        </h2>
        
        <div className={styles.introTestimonialsGrid}>
          <div className={styles.introTestimonialCard}>
            <div className={styles.introTestimonialStars}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} fill="currentColor" className={styles.introStarIcon} />
              ))}
            </div>
            <p className={styles.introTestimonialText}>
              {t('intro.testimonials.testimonial1')}
            </p>
            <div className={styles.introTestimonialAuthor}>
              <div className={styles.introAuthorAvatar}>A</div>
              <div>
                <div className={styles.introAuthorName}>Anna Kowalska</div>
                <div className={styles.introAuthorRole}>{t('intro.testimonials.highSchoolStudent')}</div>
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
              {t('intro.testimonials.testimonial2')}
            </p>
            <div className={styles.introTestimonialAuthor}>
              <div className={styles.introAuthorAvatar}>P</div>
              <div>
                <div className={styles.introAuthorName}>Piotr Nowak</div>
                <div className={styles.introAuthorRole}>{t('intro.testimonials.universityStudent')}</div>
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
              {t('intro.testimonials.testimonial3')}
            </p>
            <div className={styles.introTestimonialAuthor}>
              <div className={styles.introAuthorAvatar}>M</div>
              <div>
                <div className={styles.introAuthorName}>Maria Wiśniewska</div>
                <div className={styles.introAuthorRole}>{t('intro.testimonials.graduate')}</div>
              </div>
            </div>
          </div>
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
                <div className={styles.introCtaRating}>
                  <div className={styles.introRatingStars}>
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={styles.introStarIcon} fill="currentColor" />
                    ))}
                  </div>
                  <span className={styles.introRatingText}>{t('intro.cta.rating')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.introFooter}>
        <div className={styles.introFooterContent}>
          <div className={styles.introFooterLogo}>
            <div className={styles.introFooterLogoIcon}>
              <Sparkles className={styles.introFooterSparkles} />
            </div>
            <span className={styles.introFooterLogoText}>{t('intro.logo')}</span>
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