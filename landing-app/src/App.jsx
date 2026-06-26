import React, { useState, useEffect } from "react";
import { listenServices, listenBusinessInfo } from "../../shared/firestoreApi";
import { DEFAULT_BUSINESS_INFO, formatPrice, formatPhoneForWhatsapp } from "../../shared/helpers";
import "./landing.css";

const RESERVAR_URL = "/mano-a-mano-turnos/mano-a-mano-reservas/";
const INSTAGRAM_URL = "https://www.instagram.com/angelmasaje.fit/";
const FONTS_HREF = "https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700;800&family=Questrial&display=swap";
const HERO_PHOTO = "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1600&q=85&fit=crop&crop=center";
const ABOUT_PHOTO = "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=900&q=85&fit=crop&crop=center";

function GoogleFontsLoader() {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = FONTS_HREF;
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);
  return null;
}

function LogoMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M4 14C4 8 8.5 4 14 4C19.5 4 24 8 24 14" stroke="#B5654A" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M7 14C7 10 10 7.5 14 7.5C18 7.5 21 10 21 14" stroke="#EFE9DF" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
      <circle cx="14" cy="19" r="2.6" fill="#B5654A" />
    </svg>
  );
}

function Navbar({ businessName }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav className={`nav ${scrolled ? "scrolled" : "top"}`}>
      <div className="nav-inner">
        <a href="#" className="nav-logo">
          <LogoMark size={26} />
          <span className="nav-logo-name">{businessName}</span>
        </a>
        <ul className="nav-links">
          <li><a href="#especialidades">Especialidades</a></li>
          <li><a href="#servicios">Servicios</a></li>
          <li><a href="#nosotros">Nosotros</a></li>
          <li><a href="#contacto">Contacto</a></li>
        </ul>
        <a href={RESERVAR_URL} className="nav-cta">Reservar turno</a>
      </div>
    </nav>
  );
}

function Hero({ businessInfo }) {
  return (
    <section className="hero">
      <div className="hero-bg" style={{ backgroundImage: `url(${HERO_PHOTO})` }} />
      <div className="hero-overlay" />
      <div className="hero-content">
        <span className="hero-tag">Don Torcuato · Buenos Aires</span>
        <h1 className="hero-title">Masajes terapéuticos que transforman tu cuerpo</h1>
        <p className="hero-subtitle">
          Descontracturante · Deportivo · Tratamiento del dolor.<br />
          Reservá tu turno online en minutos, sin llamadas ni esperas.
        </p>
        <div className="hero-actions">
          <a href={RESERVAR_URL} className="btn-primary">Reservar mi turno</a>
          <a href="#especialidades" className="btn-ghost">Ver servicios</a>
        </div>
        {businessInfo.address && (
          <p className="hero-address">
            {businessInfo.address}{businessInfo.addressDetail ? ` · ${businessInfo.addressDetail}` : ""}
          </p>
        )}
      </div>
    </section>
  );
}

function Especialidades() {
  const items = [
    { title: "Masaje descontracturante", desc: "Libera tensiones musculares profundas. Ideal para contracturas cervicales, dorsales y lumbares.", icon: "💆" },
    { title: "Masaje deportivo", desc: "Preparación y recuperación muscular. Mejora el rendimiento y previene lesiones en deportistas.", icon: "⚡" },
    { title: "Tratamiento del dolor", desc: "Técnicas focalizadas para aliviar dolores crónicos y agudos con trabajo profundo y personalizado.", icon: "🌿" },
  ];
  return (
    <section className="section" id="especialidades" style={{ background: "#EFE9DF" }}>
      <div className="section-inner">
        <span className="section-tag">Lo que hacemos</span>
        <h2 className="section-title">Especialidades</h2>
        <p className="section-sub">Masoterapia terapéutica en zona norte del Gran Buenos Aires.</p>
        <div className="esp-grid">
          {items.map((item) => (
            <div key={item.title} className="esp-card">
              <span className="esp-icon">{item.icon}</span>
              <div>
                <div className="esp-title">{item.title}</div>
                <div className="esp-desc">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Beneficios() {
  const items = [
    { icon: "🧘", title: "Reduce el estrés", desc: "Disminuye el cortisol y activa el sistema parasimpático" },
    { icon: "💪", title: "Alivia el dolor", desc: "Contracturas, tensión muscular y dolor crónico" },
    { icon: "🔄", title: "Mejora la circulación", desc: "Activa el flujo sanguíneo y linfático" },
    { icon: "⚡", title: "Recuperación deportiva", desc: "Acelera la regeneración muscular post esfuerzo" },
    { icon: "😴", title: "Mejor sueño", desc: "Favorece el descanso profundo y la relajación" },
    { icon: "🦴", title: "Flexibilidad", desc: "Aumenta la movilidad articular y muscular" },
    { icon: "🧠", title: "Bienestar mental", desc: "Reduce la ansiedad y mejora el estado de ánimo" },
    { icon: "🌡️", title: "Ventosas", desc: "Técnica complementaria para descontracturar en profundidad" },
  ];
  return (
    <section className="section ben-section" id="nosotros">
      <div className="section-inner">
        <span className="section-tag" style={{ color: "#B5654A" }}>Por qué el masaje</span>
        <h2 className="section-title light">Beneficios terapéuticos</h2>
        <p className="section-sub light">El masaje terapéutico no es un lujo — es salud.</p>
        <div className="ben-grid">
          {items.map((item) => (
            <div key={item.title} className="ben-item">
              <div className="ben-icon">{item.icon}</div>
              <div>
                <div className="ben-title">{item.title}</div>
                <div className="ben-desc">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Services({ services }) {
  if (!services.length) return null;
  return (
    <section className="section srv-section" id="servicios">
      <div className="section-inner">
        <span className="section-tag">Precios</span>
        <h2 className="section-title">Servicios y precios</h2>
        <p className="section-sub">Sesiones de medio torso y cuerpo completo, con o sin ventosas.</p>
        <div className="srv-grid">
          {services.map((s) => (
            <div key={s.id} className="srv-card">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="srv-dot" style={{ background: s.color || "#B5654A" }} />
                <div>
                  <div className="srv-name">{s.name}</div>
                  <div className="srv-dur">{s.duration} min</div>
                </div>
              </div>
              {s.price > 0 && <div className="srv-price">{formatPrice(s.price)}</div>}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24 }}>
          <a href={RESERVAR_URL} className="btn-primary">Reservar turno</a>
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="section" style={{ background: "#EFE9DF" }}>
      <div className="section-inner">
        <div className="about-wrap">
          <div className="about-img" style={{ backgroundImage: `url(${ABOUT_PHOTO})` }} />
          <div className="about-text">
            <span className="section-tag">El profesional</span>
            <h2 className="section-title light">Masoterapia profesional en Don Torcuato</h2>
            <p>
              Especializado en masajes descontracturantes, masaje deportivo y tratamiento del dolor muscular. Técnicas manuales y con ventosas para aliviar contracturas, tensión y lesiones. Sesiones personalizadas adaptadas a cada necesidad.
            </p>
            <a href={RESERVAR_URL} className="btn-primary" style={{ alignSelf: "flex-start" }}>Reservar mi turno</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonios() {
  const items = [
    { text: "Llegué con una contractura terrible en el cuello y salí nuevo. Lo recomiendo a todos.", author: "Martín G." },
    { text: "Muy profesional y el lugar muy cómodo. Ya reservé el próximo turno desde la app, facilísimo.", author: "Laura P." },
    { text: "Hago crossfit y el masaje deportivo fue un cambio total en mi recuperación. 10 puntos.", author: "Diego F." },
  ];
  return (
    <section className="section" style={{ background: "#F5EFE6" }}>
      <div className="section-inner">
        <span className="section-tag">Clientes</span>
        <h2 className="section-title">Lo que dicen nuestros clientes</h2>
        <p className="section-sub">Reservá con confianza — más de 600 personas nos siguen en Instagram.</p>
        <div className="testi-grid">
          {items.map((t) => (
            <div key={t.author} className="testi-card">
              <div className="testi-stars">★★★★★</div>
              <p className="testi-text">"{t.text}"</p>
              <div className="testi-author">{t.author}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "1", title: "Elegís el servicio", desc: "Descontracturante, deportivo o tratamiento del dolor" },
    { n: "2", title: "Elegís día y horario", desc: "Ves los turnos disponibles en tiempo real" },
    { n: "3", title: "Confirmación instantánea", desc: "Recibís los datos al instante, sin llamadas" },
  ];
  return (
    <section className="section how-section">
      <div className="section-inner">
        <span className="section-tag">Reserva online</span>
        <h2 className="section-title">¿Cómo reservar?</h2>
        <p className="section-sub">Sin llamadas, sin esperas. Tu turno en 3 pasos.</p>
        <div className="how-grid">
          {steps.map((s) => (
            <div key={s.n} className="how-step">
              <div className="how-num">{s.n}</div>
              <div>
                <div className="how-title">{s.title}</div>
                <div className="how-desc">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 36 }}>
          <a href={RESERVAR_URL} className="btn-primary">Reservar ahora</a>
        </div>
      </div>
    </section>
  );
}

function InstagramSection() {
  return (
    <section className="section ig-section" id="contacto">
      <div className="section-inner">
        <span className="section-tag">Redes sociales</span>
        <h2 className="section-title" style={{ margin: "0 auto 10px" }}>Seguinos en Instagram</h2>
        <p className="section-sub" style={{ margin: "0 auto 28px" }}>
          Mirá técnicas, resultados y tips en <strong style={{ color: "#2A2622" }}>@angelmasaje.fit</strong>
        </p>
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 28px", borderRadius: 12, border: "2px solid #2A2622", color: "#2A2622", fontFamily: "'Questrial', sans-serif", fontWeight: 600, fontSize: 14.5, textDecoration: "none" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
          </svg>
          Ver @angelmasaje.fit
        </a>
      </div>
    </section>
  );
}

function Footer({ businessInfo }) {
  const waNumber = formatPhoneForWhatsapp(businessInfo.whatsapp);
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <LogoMark size={30} />
          <div className="footer-brand-name">{businessInfo.name}</div>
          <p className="footer-tagline">
            {businessInfo.address && <>{businessInfo.address}<br /></>}
            {businessInfo.addressDetail && <>{businessInfo.addressDetail}<br /></>}
            Don Torcuato, Buenos Aires<br />
            {businessInfo.hoursLabel}
          </p>
        </div>
        <div>
          <div className="footer-heading">Servicios</div>
          <ul className="footer-links">
            <li><a href="#especialidades">Masaje descontracturante</a></li>
            <li><a href="#especialidades">Masaje deportivo</a></li>
            <li><a href="#especialidades">Tratamiento del dolor</a></li>
            <li><a href="#servicios">Ver precios</a></li>
          </ul>
        </div>
        <div>
          <div className="footer-heading">Reservas</div>
          <ul className="footer-links">
            <li><a href={RESERVAR_URL}>Reservar turno online</a></li>
            {waNumber && <li><a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer">Consultas por WhatsApp</a></li>}
            <li><a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">Instagram</a></li>
          </ul>
        </div>
        <div>
          <div className="footer-heading">Zona</div>
          <ul className="footer-links">
            <li><a href="#">Don Torcuato</a></li>
            <li><a href="#">Tigre</a></li>
            <li><a href="#">Grand Bourg</a></li>
            <li><a href="#">El Talar</a></li>
            <li><a href="#">Benavídez</a></li>
          </ul>
        </div>
      </div>
      <hr className="footer-divider" />
      <div className="footer-copy">
        <span>© 2025 {businessInfo.name}. Todos los derechos reservados.</span>
        <a href={RESERVAR_URL} style={{ color: "#B5654A", textDecoration: "none", fontWeight: 600 }}>Reservar turno →</a>
      </div>
    </footer>
  );
}

export default function App() {
  const [services, setServices] = useState([]);
  const [businessInfo, setBusinessInfo] = useState(DEFAULT_BUSINESS_INFO);

  useEffect(() => {
    const unsubServices = listenServices(setServices);
    const unsubBiz = listenBusinessInfo((data) => { if (data) setBusinessInfo(data); });
    return () => { unsubServices(); unsubBiz(); };
  }, []);

  return (
    <div>
      <GoogleFontsLoader />
      <Navbar businessName={businessInfo.name} />
      <Hero businessInfo={businessInfo} />
      <Especialidades />
      <Beneficios />
      <Services services={services} />
      <About />
      <Testimonios />
      <HowItWorks />
      <InstagramSection />
      <Footer businessInfo={businessInfo} />
    </div>
  );
}
