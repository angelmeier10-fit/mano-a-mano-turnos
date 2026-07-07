import React, { useState, useEffect } from "react";
import { listenServices, listenBusinessInfo } from "../../shared/firestoreApi";
import { DEFAULT_BUSINESS_INFO, formatPrice, formatPhoneForWhatsapp } from "../../shared/helpers";
import "./landing.css";

const RESERVAR_URL = "/mano-a-mano-turnos/mano-a-mano-reservas/";
const INSTAGRAM_URL = "https://www.instagram.com/angelmasaje.fit/";
const HERO_PHOTO = "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1600&q=85&fit=crop&crop=center";
const ABOUT_PHOTO = "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=900&q=85&fit=crop&crop=center";
const VENTOSAS_PHOTO = "https://images.unsplash.com/photo-1745327883389-17150e99dcf7?w=900&q=85&fit=crop&crop=center";

function trackEvent(name, params = {}) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", name, params);
  }
}

const WA_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.116.552 4.106 1.524 5.832L0 24l6.336-1.498A11.942 11.942 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.795 9.795 0 01-5.004-1.374l-.36-.214-3.73.882.916-3.617-.235-.372A9.77 9.77 0 012.182 12C2.182 6.573 6.573 2.182 12 2.182S21.818 6.573 21.818 12 17.427 21.818 12 21.818z"/>
  </svg>
);

function WaBtn({ waNumber, variant = "green", label = "Consultar por WhatsApp" }) {
  if (!waNumber) return null;
  const styles = {
    green: { background: "#3DA854", color: "#fff", border: "none" },
    ghost: { background: "transparent", color: "rgba(255,255,255,0.85)", border: "1.5px solid rgba(255,255,255,0.35)" },
    outline: { background: "transparent", color: "#3DA854", border: "1.5px solid #3DA854" },
  };
  return (
    <a
      href={`https://wa.me/${waNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent("click_whatsapp", { label })}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 28px", borderRadius: 12, fontFamily: "'Questrial', sans-serif", fontWeight: 600, fontSize: 15, textDecoration: "none", ...styles[variant] }}
    >
      {WA_ICON}
      {label}
    </a>
  );
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
        <a href={RESERVAR_URL} className="nav-cta" onClick={() => trackEvent("click_reservar", { location: "nav" })}>Reservar turno</a>
      </div>
    </nav>
  );
}

function Hero({ businessInfo, waNumber }) {
  return (
    <section className="hero">
      <div className="hero-bg" style={{ backgroundImage: `url(${HERO_PHOTO})` }} />
      <div className="hero-overlay" />
      <div className="hero-content">
        <span className="hero-tag">Don Torcuato · Buenos Aires</span>
        <h1 className="hero-title">Masajista en Don Torcuato — masajes terapéuticos profesionales</h1>
        <p className="hero-subtitle">
          Descontracturante · Deportivo · Tratamiento del dolor.<br />
          Reservá tu turno online en minutos, sin llamadas ni esperas.
        </p>
        <div className="hero-actions">
          <a href={RESERVAR_URL} className="btn-primary" onClick={() => trackEvent("click_reservar", { location: "hero" })}>Reservar mi turno</a>
          <WaBtn waNumber={waNumber} variant="ghost" label="Consultar por WhatsApp" />
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

function MassageFinder({ services }) {
  const [step, setStep] = useState(0);
  const [zona, setZona] = useState(null);
  const [result, setResult] = useState(null);

  const findService = (zonaKey, ventosas) => {
    const durations = [...new Set(services.map((s) => s.duration))].sort((a, b) => a - b);
    if (!durations.length) return null;
    const targetDuration = zonaKey === "medio" ? durations[0] : durations[durations.length - 1];
    const group = services.filter((s) => s.duration === targetDuration).sort((a, b) => a.price - b.price);
    if (!group.length) return null;
    if (group.length === 1) return group[0];
    return ventosas ? group[group.length - 1] : group[0];
  };

  const zonaCopy = {
    medio: "Con eso alcanza el medio torso. Ahora, ¿querés sumar ventosas para un trabajo más profundo en esa zona?",
    completo: "Para eso, cuerpo completo es lo que más resultado da. ¿Sumamos ventosas para profundizar el efecto?",
  };

  const chooseZona = (z) => {
    setZona(z);
    setStep(1);
  };

  const chooseVentosas = (vent) => {
    const found = findService(zona, vent === "si");
    setResult(found);
    setStep(2);
    trackEvent("quiz_completado", { zona, ventosas: vent === "si", servicio: found?.name });
  };

  const reset = () => {
    setStep(0);
    setZona(null);
    setResult(null);
  };

  if (!services.length) return null;

  return (
    <section className="section finder-section" id="que-masaje-elegir">
      <div className="section-inner">
        <span className="section-tag">Guía rápida</span>
        <h2 className="section-title">¿No sabés qué masaje elegir?</h2>
        <p className="section-sub">Respondé dos preguntas y te decimos qué servicio te conviene.</p>

        <div className="finder-wrap">
        <div className="finder-photo" style={{ backgroundImage: `url(${VENTOSAS_PHOTO})` }} />
        <div className="finder-card">
          {step === 0 && (
            <>
              <p className="finder-question">¿Qué zona te molesta?</p>
              <button className="finder-opt" onClick={() => chooseZona("medio")}>Cintura, espalda y cuello/hombros</button>
              <button className="finder-opt" onClick={() => chooseZona("medio")}>Piernas</button>
              <button className="finder-opt" onClick={() => chooseZona("completo")}>Todo el cuerpo, o no estoy seguro</button>
            </>
          )}
          {step === 1 && (
            <>
              <p className="finder-question">{zonaCopy[zona]}</p>
              <p className="finder-info">
                Las ventosas son copas de succión que se apoyan sobre la piel y generan un vacío suave. Eso descomprime el músculo, mejora la circulación local y ayuda a liberar contracturas más en profundidad que el masaje solo.
              </p>
              <button className="finder-opt" onClick={() => chooseVentosas("si")}>Sí, quiero el trabajo más profundo</button>
              <button className="finder-opt" onClick={() => chooseVentosas("no")}>No, prefiero sin ventosas</button>
            </>
          )}
          {step === 2 && (
            <>
              {result ? (
                <div className="finder-result">
                  {result.name.toLowerCase().includes("ventosa") && <span className="finder-badge">Recomendado</span>}
                  <h3 className="finder-result-title">{result.name}</h3>
                  <div className="finder-result-price">{formatPrice(result.price)} · {result.duration} min</div>
                  <a href={RESERVAR_URL} className="btn-primary" style={{ marginTop: 16 }} onClick={() => trackEvent("click_reservar", { location: "quiz_resultado", servicio: result.name })}>Reservar este turno</a>
                </div>
              ) : (
                <p className="finder-question">Consultanos por WhatsApp y te contamos qué servicio te conviene.</p>
              )}
              <button className="finder-back" onClick={reset}>← Volver a empezar</button>
            </>
          )}
        </div>
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

function Services({ services, waNumber }) {
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
        <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 12 }}>
          <a href={RESERVAR_URL} className="btn-primary" onClick={() => trackEvent("click_reservar", { location: "servicios" })}>Reservar turno</a>
          <WaBtn waNumber={waNumber} variant="outline" label="Consultar por WhatsApp" />
        </div>
      </div>
    </section>
  );
}

function About({ waNumber }) {
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
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <a href={RESERVAR_URL} className="btn-primary" onClick={() => trackEvent("click_reservar", { location: "about" })}>Reservar mi turno</a>
              <WaBtn waNumber={waNumber} variant="outline" label="WhatsApp" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonios() {
  const items = [
    { text: "Super recomendable, el mejor en la zona.", author: "Gabriel Madero" },
    { text: "Muy buen servicio, dormí como un bb, gracias Angel.", author: "Gabriel Lastra" },
    { text: "La verdad muy bueno, recomiendo al 100%, terminas como nuevo.", author: "Toshio Nita" },
    { text: "Excelente profesional, muy buen servicio.", author: "Gonzalo Maurich" },
    { text: "Ángel es muy buen masajista, ha logrado apoyarme unas contracturas crónicas. Muy buen espacio de trabajo y relajante.", author: "Javier Francisco Arjona" },
    { text: "Increíble servicio, muy buena atención.", author: "Marcelo Fernandez" },
    { text: "Llegué sin tener el mínimo de fuerza en mi mano izquierda debido a la fuerte contractura y salí pípí cucú. Gracias Angelito.", author: "Evita Torcuatense" },
    { text: "Excelente atención con cordialidad y respeto, me sentí muy cómoda y tiene conocimiento del tema. El trabajo fue muy efectivo. Super recomendable.", author: "Claudia Zarratea" },
    { text: "Excelente el servicio prestado por Angel.", author: "Micaela Cappuccino" },
    { text: "Excelente la sesión de masajes.", author: "Miguel Curlo" },
    { text: "Agradecida siempre por el alivio. Excelente servicio y calidad humana.", author: "Mariela Pitsch" },
    { text: "Muy bueno, se nota cuando alguien sabe lo que hace. Muy recomendable.", author: "Jonny Gomez" },
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

function HowItWorks({ waNumber }) {
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
        <div style={{ marginTop: 36, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <a href={RESERVAR_URL} className="btn-primary" onClick={() => trackEvent("click_reservar", { location: "how_it_works" })}>Reservar ahora</a>
          <WaBtn waNumber={waNumber} variant="outline" label="¿Tenés dudas? Escribinos" />
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
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent("click_instagram", { location: "ig_section" })} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 28px", borderRadius: 12, border: "2px solid #2A2622", color: "#2A2622", fontFamily: "'Questrial', sans-serif", fontWeight: 600, fontSize: 14.5, textDecoration: "none" }}>
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
            <li><a href={RESERVAR_URL} onClick={() => trackEvent("click_reservar", { location: "footer" })}>Reservar turno online</a></li>
            {waNumber && <li><a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent("click_whatsapp", { label: "footer" })}>Consultas por WhatsApp</a></li>}
            <li><a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent("click_instagram", { location: "footer" })}>Instagram</a></li>
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
        <a href={RESERVAR_URL} style={{ color: "#B5654A", textDecoration: "none", fontWeight: 600 }} onClick={() => trackEvent("click_reservar", { location: "footer_bottom" })}>Reservar turno →</a>
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

  const waNumber = formatPhoneForWhatsapp(businessInfo.whatsapp);

  return (
    <div>
      <Navbar businessName={businessInfo.name} />
      <Hero businessInfo={businessInfo} waNumber={waNumber} />
      <Especialidades />
      <MassageFinder services={services} />
      <Beneficios />
      <Services services={services} waNumber={waNumber} />
      <About waNumber={waNumber} />
      <Testimonios />
      <HowItWorks waNumber={waNumber} />
      <InstagramSection />
      <Footer businessInfo={businessInfo} />
    </div>
  );
}
