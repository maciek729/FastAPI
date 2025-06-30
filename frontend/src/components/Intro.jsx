import React, { useState, useEffect } from 'react';
import { MessageCircle, FileText, Zap, FolderOpen, Menu, X, Star, Users, Sparkles } from 'lucide-react';
import '../css/Intro.css';

const Intro = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState({});

  const features = [
    {
      icon: <MessageCircle className="feature-icon" />,
      title: "Porozmawiaj z AI Study Buddy",
      description: "Uzyskaj natychmiastowe odpowiedzi, wyjaśnienia i spersonalizowane wskazówki na dowolny temat. Twój prywatny korepetytor dostępny 24/7.",
      highlight: "Inteligentne odpowiedzi w sekundach",
    //   mockup: "💬 Jak działa fotosynteza?\n🤖 Fotosynteza to proces, w którym rośliny...\n💬 Czy możesz to wyjaśnić prościej?\n🤖 Oczywiście! Wyobraź sobie, że rośliny..."
    },
    {
      icon: <FileText className="feature-icon" />,
      title: "Bezproblemowe robienie notatek",
      description: "Rób jasne, zwięzłe notatki bezpośrednio w zdAI. Organizuj je łatwo i uzyskuj dostęp w dowolnym miejscu i czasie.",
      highlight: "Synchronizacja w chmurze",
    //   mockup: "📝 Historia Polski\n├─ Średniowiecze\n├─ Renesans\n└─ Czasy współczesne\n\n✨ Auto-organizacja tematów"
    },
    {
      icon: <Zap className="feature-icon" />,
      title: "Generuj skuteczne materiały",
      description: "Przekształć swoje notatki w niestandardowe fiszki i testy sprawdzające. Ucz się mądrzej, a nie ciężej.",
      highlight: "AI tworzy idealne fiszki",
    //   mockup: "🎯 FISZKA #1\nPytanie: Co to jest fotosynteza?\nOdpowiedź: Proces wytwarzania...\n\n🎯 QUIZ\n1. Które organelle odpowiadają za fotosyntezę?\na) Mitochondria b) Chloroplasty ✓"
    },
    {
      icon: <FolderOpen className="feature-icon" />,
      title: "Scentralizowane centrum nauki",
      description: "Przechowuj wszystkie materiały do nauki - notatki, fiszki, quizy - starannie zorganizowane w jednym miejscu.",
      highlight: "Wszystko pod ręką",
    //   mockup: "📚 Moje Materiały\n├─ 📖 Biologia (15 notatek)\n├─ 🧮 Matematyka (8 fiszek)\n├─ 🌍 Geografia (12 quizów)\n└─ 📜 Historia (20 notatek)"
    }
  ];

  const stats = [
    { number: "10K+", label: "Aktywnych uczniów" },
    { number: "50K+", label: "Wygenerowanych fiszek" },
    { number: "98%", label: "Zadowolonych użytkowników" }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(prev => ({
            ...prev,
            [entry.target.id]: entry.isIntersecting
          }));
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('[id]').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    
    <div className="intro-container">
      {/* Decorative background elements */}
      <div className="intro-bg-decorations">
        <div className="intro-bg-blob intro-bg-blob-1"></div>
        <div className="intro-bg-blob intro-bg-blob-2"></div>
        <div className="intro-bg-blob intro-bg-blob-3"></div>
      </div>

      {/* Header */}
      <header className="intro-header">
        <div className="intro-header-content">
          <div className="intro-logo">
            <div className="intro-logo-icon">
              <Sparkles className="intro-logo-sparkles" />
            </div>
            <span className="intro-logo-text">zdAI to!</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="intro-nav desktop-nav">
            <button className="intro-nav-login">Zaloguj się</button>
            <button className="intro-nav-signup">Zarejestruj się</button>
          </nav>

          {/* Mobile menu button */}
          <button
            className="intro-mobile-menu-btn"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="intro-menu-icon" /> : <Menu className="intro-menu-icon" />}
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="intro-mobile-menu">
            <button className="intro-mobile-login">Zaloguj się</button>
            <button className="intro-mobile-signup">Zarejestruj się</button>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="hero" className="intro-hero">
        <div className="intro-hero-content">
          <div className={`intro-hero-wrapper ${isVisible.hero ? 'visible' : ''}`}>
            <div className="intro-hero-badge">
              <Star className="intro-badge-icon" />
              Nowa era nauki z AI
            </div>
            
            <h1 className="intro-hero-title">
              <span className="intro-hero-title-line1">Doładuj swoją</span>
              <span className="intro-hero-title-line2">naukę z zdAI!</span>
            </h1>
            
            <p className="intro-hero-description">
              Twój inteligentny asystent nauki: <strong>Czat, notatki, fiszki i więcej</strong> - wszystko w jednym magicznym miejscu zaprojektowanym dla komputerów.
            </p>

            <div className="intro-hero-buttons">
              <button className="intro-btn-primary">
                <span className="intro-btn-content">
                  Rozpocznij przygodę
                  <Sparkles className="intro-btn-icon" />
                </span>
              </button>
              <button className="intro-btn-secondary">
                Zobacz demo
              </button>
            </div>

            {/* Stats */}
            <div className="intro-stats">
              {stats.map((stat, index) => (
                <div key={index} className="intro-stat-item">
                  <div className="intro-stat-number">{stat.number}</div>
                  <div className="intro-stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="intro-features">
        <div className="intro-features-content">
          <div className={`intro-features-header ${isVisible.features ? 'visible' : ''}`}>
            <h2 className="intro-features-title">
              Supermoce dla Twojej nauki
            </h2>
            <p className="intro-features-description">
              Odkryj narzędzia zaprojektowane specjalnie dla komputerów, które zmienią sposób, w jaki się uczysz. 
              Każda funkcja została stworzona z myślą o maksymalnej produktywności na dużym ekranie.
            </p>
          </div>

          {/* Feature cards */}
          <div className="intro-features-grid">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`intro-feature-card ${currentSlide === index ? 'active' : ''}`}
              >
                <div className="intro-feature-content">
                  <div className="intro-feature-icon-wrapper">
                    {feature.icon}
                  </div>
                  <div className="intro-feature-text">
                    <div className="intro-feature-highlight">
                      {feature.highlight}
                    </div>
                    <h3 className="intro-feature-title">
                      {feature.title}
                    </h3>
                    <p className="intro-feature-description">
                      {feature.description}
                    </p>
                  </div>
                </div>
                <div className="intro-feature-mockup">
                  <pre className="intro-mockup-text">{feature.mockup}</pre>
                </div>
              </div>
            ))}
          </div>

          {/* Progress indicators */}
          <div className="intro-progress-indicators">
            {features.map((_, index) => (
              <button
                key={index}
                className={`intro-progress-dot ${currentSlide === index ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="intro-cta">
        <div className="intro-cta-content">
          <div className={`intro-cta-wrapper ${isVisible.cta ? 'visible' : ''}`}>
            <h2 className="intro-cta-title">
              Gotowy na rewolucję w nauce?
            </h2>
            <p className="intro-cta-description">
              Dołącz do tysięcy uczniów, którzy już odkryli moc AI w nauce na komputerze. 
              Rozpocznij swoją przygodę już dziś - całkowicie za darmo!
            </p>
            
            <div className="intro-cta-buttons">
              <button className="intro-cta-primary">
                <span className="intro-cta-btn-content">
                  <Users className="intro-cta-icon" />
                  Stwórz konto teraz
                  <Sparkles className="intro-cta-sparkles" />
                </span>
              </button>
              
              <div className="intro-cta-social-proof">
                <div className="intro-cta-free-text">Darmowy start • Bez zobowiązań</div>
                <div className="intro-cta-rating">
                  <div className="intro-rating-stars">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="intro-star-icon" />
                    ))}
                  </div>
                  <span className="intro-rating-text">4.9/5 z 2,500+ opinii</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="intro-footer">
        <div className="intro-footer-content">
          <div className="intro-footer-logo">
            <div className="intro-footer-logo-icon">
              <Sparkles className="intro-footer-sparkles" />
            </div>
            <span className="intro-footer-logo-text">zdAI to!</span>
          </div>
          
          <div className="intro-footer-links">
            <div className="intro-footer-nav">
              <a href="#" className="intro-footer-link">Warunki użytkowania</a>
              <a href="#" className="intro-footer-link">Polityka prywatności</a>
              <a href="#" className="intro-footer-link">Kontakt</a>
            </div>
            <div className="intro-footer-copyright">
              © 2025 zdAI to! Wszystkie prawa zastrzeżone.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Intro;