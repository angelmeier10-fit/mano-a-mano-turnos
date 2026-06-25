import React, { useState, useEffect } from "react";
import { listenServices, listenBusinessInfo } from "../../shared/firestoreApi";
import { DEFAULT_BUSINESS_INFO, GoogleFontsHref, formatPrice, formatPhoneForWhatsapp } from "../../shared/helpers";

const RESERVAR_URL = "/mano-a-mano-turnos/mano-a-mano-reservas/";
const INSTAGRAM_URL = "https://www.instagram.com/angelmasaje.fit/";

const HERO_PHOTO = "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200&q=80&fit=crop&crop=center";
const ABOUT_PHOTO = "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800&q=80&fit=crop&crop=center";

const C = {
  bg: "#EFE9DF",
  dark: "#2A2622",
  accent: "#B5654A",
  green: "#6E7F5C",
  muted: "#8A8275",
  border: "#E3DBCB",
  cardBg: "#fff",
};

function GoogleFontsLoader() {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = GoogleFontsHref();
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
    <section style={{
      position: "relative",
      minHeight: "92vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `url(${HERO_PHOTO})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(42,38,34,0.3) 0%, rgba(42,38,34,0.85) 100%)",
      }} />

      <div style={{ position: "relative", padding: "0 22px 52px", maxWidth: 560, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 20 }}>
          <LogoMark size={28} />
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.75)", letterSpacing: "0.01em" }}>
            {businessInfo.name}
          </span>
        </div>

        <h1 style={{
          fontFamily: "'Fraunces', serif", fontWeight: 700,
          fontSize: "clamp(32px, 9vw, 48px)", color: "#fff",
          margin: "0 0 14px", lineHeight: 1.1, letterSpacing: "-0.02em",
        }}>
          Masajes terapéuticos en Don Torcuato
        </h1>

        <p style={{
          fontSize: 16, color: "rgba(255,255,255,0.75)",
          margin: "0 0 32px", lineHeight: 1.6, maxWidth: 380,
        }}>
          Descontracturante · Deportivo · Tratamiento del dolor.<br />
          Reservá tu turno online en minutos.
        </p>

        <a href={RESERVAR_URL} style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          background: C.accent, color: "#fff",
          fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 16,
          padding: "17px", borderRadius: 14, textDecoration: "none",
        }}>
          Reservar mi turno
        </a>

        {businessInfo.address && (
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "18px 0 0" }}>
            {businessInfo.address}{businessInfo.addressDetail ? ` · ${businessInfo.addressDetail}` : ""} · Don Torcuato, Buenos Aires
          </p>
        )}
      </div>
    </section>
  );
}

function Especialidades() {
  const items = [
    {
      title: "Masaje descontracturante",
      desc: "Libera tensiones musculares profundas. Ideal para contracturas cervicales, dorsales y lumbares.",
      icon: "💆",
    },
    {
      title: "Masaje deportivo",
      desc: "Preparación y recuperación muscular para deportistas. Mejora el rendimiento y previene lesiones.",
      icon: "⚡",
    },
    {
      title: "Tratamiento del dolor",
      desc: "Técnicas específicas para aliviar dolores crónicos y agudos. Trabajo profundo y focalizado.",
      icon: "🌿",
    },
  ];

  return (
    <section style={{ padding: "48px 20px", background: C.bg }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 600, color: C.dark, margin: "0 0 6px" }}>
          Especialidades
        </h2>
        <p style={{ fontSize: 14, color: C.muted, margin: "0 0 24px", lineHeight: 1.5 }}>
          Masoterapia terapéutica en Don Torcuato, zona norte del Gran Buenos Aires.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((item) => (
            <div key={item.title} style={{
              display: "flex", gap: 16, alignItems: "flex-start",
              background: C.cardBg, border: `1px solid ${C.border}`,
              borderRadius: 16, padding: "18px",
            }}>
              <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16, color: C.dark, marginBottom: 5 }}>{item.title}</div>
                <div style={{ fontSize: 13.5, color: "#5A5248", lineHeight: 1.55 }}>{item.desc}</div>
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
    <section style={{ padding: "0 20px 48px", maxWidth: 560, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 600, margin: "0 0 20px", color: C.dark }}>
        Servicios y precios
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {services.map((s) => (
          <div key={s.id} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 14,
            padding: "14px 16px", gap: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color || C.accent, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.dark }}>{s.name}</div>
                <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>{s.duration} min</div>
              </div>
            </div>
            {s.price > 0 && (
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600, color: C.dark, whiteSpace: "nowrap" }}>
                {formatPrice(s.price)}
              </div>
            )}
          </div>
        ))}
      </div>
      <a href={RESERVAR_URL} style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        marginTop: 16, padding: "14px", borderRadius: 12,
        background: C.dark, color: "#EFE9DF",
        fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15,
        textDecoration: "none",
      }}>
        Elegir servicio y reservar
      </a>
    </section>
  );
}

function About() {
  return (
    <section style={{ background: C.dark, overflow: "hidden" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{
          height: 260,
          backgroundImage: `url(${ABOUT_PHOTO})`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }} />
        <div style={{ padding: "30px 22px 36px" }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 600, color: "#EFE9DF", margin: "0 0 14px" }}>
            Masoterapia profesional
          </h2>
          <p style={{ fontSize: 14.5, color: "#B5A98F", lineHeight: 1.75, margin: 0 }}>
            Especializado en masajes descontracturantes, masaje deportivo y tratamiento del dolor muscular. Técnicas manuales y con ventosas para aliviar contracturas, tensión y lesiones. Sesiones personalizadas de medio torso y cuerpo completo en Don Torcuato, zona norte del Gran Buenos Aires.
          </p>
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
    <section style={{ background: "#F5EFE6", padding: "48px 20px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 600, color: C.dark, margin: "0 0 24px" }}>
          ¿Cómo reservar?
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {steps.map((s) => (
            <div key={s.n} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%", background: C.accent,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 15, color: "#fff", flexShrink: 0,
              }}>{s.n}</div>
              <div style={{ paddingTop: 6 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: C.dark }}>{s.title}</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <a href={RESERVAR_URL} style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          marginTop: 28, padding: "15px", borderRadius: 12,
          background: C.accent, color: "#fff",
          fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15,
          textDecoration: "none",
        }}>
          Reservar turno ahora
        </a>
      </div>
    </section>
  );
}

function InstagramSection() {
  return (
    <section style={{ background: C.bg, padding: "48px 20px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📸</div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, color: C.dark, margin: "0 0 10px" }}>
          Seguinos en Instagram
        </h2>
        <p style={{ fontSize: 14, color: C.muted, margin: "0 0 22px", lineHeight: 1.6 }}>
          Mirá técnicas, resultados y tips en{" "}
          <strong style={{ color: C.dark }}>@angelmasaje.fit</strong>
        </p>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "13px 28px", borderRadius: 12,
            border: `2px solid ${C.dark}`, color: C.dark,
            fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14.5,
            textDecoration: "none",
          }}
        >
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
    <footer style={{ background: C.dark, padding: "40px 20px 52px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LogoMark size={28} />
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, color: "#EFE9DF" }}>
            {businessInfo.name}
          </span>
        </div>

        <a href={RESERVAR_URL} style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "15px", borderRadius: 12,
          background: C.accent, color: "#fff",
          fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15,
          textDecoration: "none",
        }}>
          Reservar turno online
        </a>

        {waNumber && (
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "13px", borderRadius: 12,
              border: "1.5px solid #3DA854", color: "#3DA854",
              fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14.5,
              textDecoration: "none",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#3DA854">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.116.552 4.106 1.524 5.832L0 24l6.336-1.498A11.942 11.942 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.795 9.795 0 01-5.004-1.374l-.36-.214-3.73.882.916-3.617-.235-.372A9.77 9.77 0 012.182 12C2.182 6.573 6.573 2.182 12 2.182S21.818 6.573 21.818 12 17.427 21.818 12 21.818z" />
            </svg>
            Consultas por WhatsApp
          </a>
        )}

        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "13px", borderRadius: 12,
            border: "1.5px solid #6E6358", color: "#9A9183",
            fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14,
            textDecoration: "none",
          }}
        >
          @angelmasaje.fit en Instagram
        </a>

        <div style={{ borderTop: "1px solid #3D372F", paddingTop: 16 }}>
          <p style={{ fontSize: 12.5, color: "#4A453D", margin: 0, lineHeight: 1.8 }}>
            {businessInfo.address && <>{businessInfo.address}<br /></>}
            {businessInfo.addressDetail && <>{businessInfo.addressDetail}<br /></>}
            Don Torcuato, Buenos Aires<br />
            {businessInfo.hoursLabel && <>{businessInfo.hoursLabel}</>}
          </p>
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
    <div style={{ fontFamily: "'Inter', sans-serif", background: C.bg, minHeight: "100vh", color: C.dark }}>
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
