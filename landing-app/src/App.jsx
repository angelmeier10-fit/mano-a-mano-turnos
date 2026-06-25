import React, { useState, useEffect } from "react";
import { listenServices, listenBusinessInfo } from "../../shared/firestoreApi";
import { DEFAULT_BUSINESS_INFO, formatPrice, formatPhoneForWhatsapp } from "../../shared/helpers";
import "./landing.css";

const RESERVAR_URL = "/mano-a-mano-turnos/mano-a-mano-reservas/";
const INSTAGRAM_URL = "https://www.instagram.com/angelmasaje.fit/";
const FONTS_HREF = "https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700;800&family=Questrial&display=swap";

const HERO_PHOTO = "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1400&q=80&fit=crop&crop=center";
const ABOUT_PHOTO = "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=900&q=80&fit=crop&crop=center";

const C = {
  bg: "#EFE9DF",
  dark: "#2A2622",
  accent: "#B5654A",
  muted: "#8A8275",
  border: "#E3DBCB",
  cardBg: "#fff",
};

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

function LogoMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M4 14C4 8 8.5 4 14 4C19.5 4 24 8 24 14" stroke="#B5654A" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M7 14C7 10 10 7.5 14 7.5C18 7.5 21 10 21 14" stroke="#EFE9DF" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
      <circle cx="14" cy="19" r="2.6" fill="#B5654A" />
    </svg>
  );
}

function Hero({ businessInfo }) {
  return (
    <section style={{ position: "relative", minHeight: "92vh", display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${HERO_PHOTO})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(42,38,34,0.25) 0%, rgba(42,38,34,0.88) 60%, rgba(42,38,34,0.95) 100%)" }} />
      <div className="hero-content" style={{ position: "relative", padding: "0 22px 52px", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 20 }}>
          <LogoMark size={28} />
          <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>
            {businessInfo.name}
          </span>
        </div>
        <h1 style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 800, fontSize: "clamp(32px, 9vw, 52px)", color: "#fff", margin: "0 0 14px", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
          Masajes terapéuticos en Don Torcuato
        </h1>
        <p style={{ fontFamily: "'Questrial', sans-serif", fontSize: 16, color: "rgba(255,255,255,0.75)", margin: "0 0 32px", lineHeight: 1.65, maxWidth: 400 }}>
          Descontracturante · Deportivo · Tratamiento del dolor.<br />
          Reservá tu turno online en minutos.
        </p>
        <a href={RESERVAR_URL} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: C.accent, color: "#fff", fontFamily: "'Questrial', sans-serif", fontWeight: 600, fontSize: 16, padding: "16px 36px", borderRadius: 14, textDecoration: "none", letterSpacing: "0.02em" }}>
          Reservar mi turno
        </a>
        {businessInfo.address && (
          <p style={{ fontFamily: "'Questrial', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "18px 0 0" }}>
            {businessInfo.address}{businessInfo.addressDetail ? ` · ${businessInfo.addressDetail}` : ""} · Don Torcuato, Buenos Aires
          </p>
        )}
      </div>
    </section>
  );
}

function Especialidades() {
  const items = [
    { title: "Masaje descontracturante", desc: "Libera tensiones musculares profundas. Ideal para contracturas cervicales, dorsales y lumbares.", icon: "💆" },
    { title: "Masaje deportivo", desc: "Preparación y recuperación muscular para deportistas. Mejora el rendimiento y previene lesiones.", icon: "⚡" },
    { title: "Tratamiento del dolor", desc: "Técnicas específicas para aliviar dolores crónicos y agudos. Trabajo profundo y focalizado.", icon: "🌿" },
  ];
  return (
    <section className="section-pad" style={{ padding: "48px 0", background: C.bg }}>
      <div className="section-inner">
        <h2 style={{ fontFamily: "'Raleway', sans-serif", fontSize: 28, fontWeight: 700, color: C.dark, margin: "0 0 6px" }}>Especialidades</h2>
        <p style={{ fontFamily: "'Questrial', sans-serif", fontSize: 14.5, color: C.muted, margin: "0 0 24px", lineHeight: 1.55 }}>
          Masoterapia terapéutica en Don Torcuato, zona norte del Gran Buenos Aires.
        </p>
        <div className="especialidades-grid">
          {items.map((item) => (
            <div key={item.title} style={{ display: "flex", gap: 16, alignItems: "flex-start", background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 18px" }}>
              <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 700, fontSize: 16, color: C.dark, marginBottom: 6 }}>{item.title}</div>
                <div style={{ fontFamily: "'Questrial', sans-serif", fontSize: 14, color: "#5A5248", lineHeight: 1.6 }}>{item.desc}</div>
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
    <section className="section-pad" style={{ padding: "0 0 48px", background: C.bg }}>
      <div className="section-inner">
        <h2 style={{ fontFamily: "'Raleway', sans-serif", fontSize: 28, fontWeight: 700, margin: "0 0 20px", color: C.dark }}>Servicios y precios</h2>
        <div className="services-grid">
          {services.map((s) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color || C.accent, flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: "'Questrial', sans-serif", fontSize: 15, fontWeight: 600, color: C.dark }}>{s.name}</div>
                  <div style={{ fontFamily: "'Questrial', sans-serif", fontSize: 12.5, color: C.muted, marginTop: 2 }}>{s.duration} min</div>
                </div>
              </div>
              {s.price > 0 && (
                <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 16, fontWeight: 700, color: C.dark, whiteSpace: "nowrap" }}>{formatPrice(s.price)}</div>
              )}
            </div>
          ))}
        </div>
        <a href={RESERVAR_URL} style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 18, padding: "15px", borderRadius: 12, background: C.dark, color: "#EFE9DF", fontFamily: "'Questrial', sans-serif", fontWeight: 600, fontSize: 15, textDecoration: "none", letterSpacing: "0.02em" }}>
          Elegir servicio y reservar
        </a>
      </div>
    </section>
  );
}

function About() {
  return (
    <section style={{ background: C.dark, overflow: "hidden" }}>
      <div className="about-wrap">
        <div className="about-img" style={{ backgroundImage: `url(${ABOUT_PHOTO})` }} />
        <div className="about-text" style={{ padding: "32px 22px 40px" }}>
          <div className="section-inner" style={{ padding: 0, maxWidth: "100%" }}>
            <h2 style={{ fontFamily: "'Raleway', sans-serif", fontSize: 28, fontWeight: 700, color: "#EFE9DF", margin: "0 0 14px" }}>
              Masoterapia profesional
            </h2>
            <p style={{ fontFamily: "'Questrial', sans-serif", fontSize: 15, color: "#B5A98F", lineHeight: 1.8, margin: 0 }}>
              Especializado en masajes descontracturantes, masaje deportivo y tratamiento del dolor muscular. Técnicas manuales y con ventosas para aliviar contracturas, tensión y lesiones. Sesiones personalizadas de medio torso y cuerpo completo en Don Torcuato, zona norte del Gran Buenos Aires.
            </p>
            <a href={RESERVAR_URL} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", marginTop: 24, padding: "14px 32px", borderRadius: 12, background: C.accent, color: "#fff", fontFamily: "'Questrial', sans-serif", fontWeight: 600, fontSize: 15, textDecoration: "none" }}>
              Reservar turno
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "1", title: "Elegís el servicio", desc: "Descontracturante, deportivo o tratamiento del dolor" },
    { n: "2", title: "Elegís día y horario", desc: "Ves los turnos disponibles en tiempo real" },
    { n: "3", title: "Confirmación instantánea", desc: "Recibís los datos del turno al instante, sin llamadas" },
  ];
  return (
    <section className="section-pad" style={{ padding: "48px 0", background: "#F5EFE6" }}>
      <div className="section-inner">
        <h2 style={{ fontFamily: "'Raleway', sans-serif", fontSize: 28, fontWeight: 700, color: C.dark, margin: "0 0 28px" }}>¿Cómo reservar?</h2>
        <div className="how-steps">
          {steps.map((s) => (
            <div key={s.n} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Raleway', sans-serif", fontWeight: 800, fontSize: 15, color: "#fff", flexShrink: 0 }}>{s.n}</div>
              <div style={{ paddingTop: 6 }}>
                <div style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 700, fontSize: 15, color: C.dark }}>{s.title}</div>
                <div style={{ fontFamily: "'Questrial', sans-serif", fontSize: 13.5, color: C.muted, marginTop: 4 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <a href={RESERVAR_URL} style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 32, padding: "15px", borderRadius: 12, background: C.accent, color: "#fff", fontFamily: "'Questrial', sans-serif", fontWeight: 600, fontSize: 15, textDecoration: "none" }}>
          Reservar turno ahora
        </a>
      </div>
    </section>
  );
}

function InstagramSection() {
  return (
    <section className="section-pad" style={{ padding: "48px 0", background: C.bg }}>
      <div className="section-inner" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📸</div>
        <h2 style={{ fontFamily: "'Raleway', sans-serif", fontSize: 26, fontWeight: 700, color: C.dark, margin: "0 0 10px" }}>Seguinos en Instagram</h2>
        <p style={{ fontFamily: "'Questrial', sans-serif", fontSize: 14.5, color: C.muted, margin: "0 0 22px", lineHeight: 1.6 }}>
          Mirá técnicas, resultados y tips en <strong style={{ color: C.dark }}>@angelmasaje.fit</strong>
        </p>
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 28px", borderRadius: 12, border: `2px solid ${C.dark}`, color: C.dark, fontFamily: "'Questrial', sans-serif", fontWeight: 600, fontSize: 14.5, textDecoration: "none" }}>
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
    <footer style={{ background: C.dark, padding: "48px 0 56px" }}>
      <div className="footer-inner">
        <div className="footer-brand">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <LogoMark size={28} />
            <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 18, fontWeight: 700, color: "#EFE9DF" }}>{businessInfo.name}</span>
          </div>
          <p style={{ fontFamily: "'Questrial', sans-serif", fontSize: 13, color: "#4A453D", margin: 0, lineHeight: 1.8 }}>
            {businessInfo.address && <>{businessInfo.address}<br /></>}
            {businessInfo.addressDetail && <>{businessInfo.addressDetail}<br /></>}
            Don Torcuato, Buenos Aires<br />
            {businessInfo.hoursLabel}
          </p>
        </div>

        <div className="footer-actions">
          <a href={RESERVAR_URL} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "14px", borderRadius: 12, background: C.accent, color: "#fff", fontFamily: "'Questrial', sans-serif", fontWeight: 600, fontSize: 15, textDecoration: "none" }}>
            Reservar turno online
          </a>
          {waNumber && (
            <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px", borderRadius: 12, border: "1.5px solid #3DA854", color: "#3DA854", fontFamily: "'Questrial', sans-serif", fontWeight: 600, fontSize: 14.5, textDecoration: "none" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#3DA854">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.116.552 4.106 1.524 5.832L0 24l6.336-1.498A11.942 11.942 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.795 9.795 0 01-5.004-1.374l-.36-.214-3.73.882.916-3.617-.235-.372A9.77 9.77 0 012.182 12C2.182 6.573 6.573 2.182 12 2.182S21.818 6.573 21.818 12 17.427 21.818 12 21.818z" />
              </svg>
              Consultas por WhatsApp
            </a>
          )}
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px", borderRadius: 12, border: "1.5px solid #6E6358", color: "#9A9183", fontFamily: "'Questrial', sans-serif", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
            @angelmasaje.fit en Instagram
          </a>
        </div>
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
    <div style={{ fontFamily: "'Questrial', sans-serif", background: C.bg, minHeight: "100vh", color: C.dark }}>
      <GoogleFontsLoader />
      <Hero businessInfo={businessInfo} />
      <Especialidades />
      <Services services={services} />
      <About />
      <HowItWorks />
      <InstagramSection />
      <Footer businessInfo={businessInfo} />
    </div>
  );
}
