import React, { useState, useEffect } from "react";
import { listenServices, listenBusinessInfo } from "../../shared/firestoreApi";
import { DEFAULT_BUSINESS_INFO, GoogleFontsHref, formatPrice, formatPhoneForWhatsapp } from "../../shared/helpers";

const RESERVAR_URL = "/mano-a-mano-turnos/mano-a-mano-reservas/";

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
      background: C.dark,
      padding: "48px 20px 52px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <LogoMark size={36} />
        <span style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, color: "#EFE9DF", letterSpacing: "-0.01em" }}>
          {businessInfo.name}
        </span>
      </div>

      <h1 style={{
        fontFamily: "'Fraunces', serif", fontWeight: 700,
        fontSize: "clamp(28px, 8vw, 42px)", color: "#EFE9DF",
        margin: "0 0 14px", lineHeight: 1.15, letterSpacing: "-0.02em",
        maxWidth: 480,
      }}>
        Masajes terapéuticos en Don Torcuato
      </h1>

      <p style={{
        fontSize: 16, color: "#B5A98F", margin: "0 0 32px",
        lineHeight: 1.55, maxWidth: 360,
      }}>
        Reservá tu turno online en minutos, sin llamadas ni esperas.
      </p>

      <a
        href={RESERVAR_URL}
        style={{
          display: "inline-block",
          background: C.accent, color: "#fff",
          fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 16,
          padding: "16px 36px", borderRadius: 14, textDecoration: "none",
          letterSpacing: "0.01em",
        }}
      >
        Reservar mi turno
      </a>

      {businessInfo.address && (
        <p style={{ fontSize: 12.5, color: "#6E6358", margin: "22px 0 0" }}>
          {businessInfo.address}{businessInfo.addressDetail ? ` · ${businessInfo.addressDetail}` : ""}
        </p>
      )}
    </section>
  );
}

function Services({ services }) {
  if (!services.length) return null;
  return (
    <section style={{ padding: "40px 20px", maxWidth: 560, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, margin: "0 0 20px", color: C.dark }}>
        Servicios
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
      <a
        href={RESERVAR_URL}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          marginTop: 20, padding: "14px", borderRadius: 12,
          background: C.dark, color: "#EFE9DF",
          fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15,
          textDecoration: "none",
        }}
      >
        Elegir servicio y reservar
      </a>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "1", title: "Elegís el servicio", desc: "Medio torso, cuerpo completo o con ventosas" },
    { n: "2", title: "Elegís día y horario", desc: "Ves los turnos disponibles en tiempo real" },
    { n: "3", title: "Confirmación instantánea", desc: "Recibís los datos del turno al instante" },
  ];
  return (
    <section style={{ background: C.dark, padding: "40px 20px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, color: "#EFE9DF", margin: "0 0 24px", textAlign: "center" }}>
          ¿Cómo funciona?
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {steps.map((s) => (
            <div key={s.n} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", background: C.accent,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 15, color: "#fff", flexShrink: 0,
              }}>{s.n}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: "#EFE9DF" }}>{s.title}</div>
                <div style={{ fontSize: 13, color: "#9A9183", marginTop: 3 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyUs() {
  const points = [
    { icon: "📍", title: "En Don Torcuato", desc: "Arata 1967, entre Brasil y Ecuador", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Arata+1967+Don+Torcuato+Buenos+Aires" },
    { icon: "🕐", title: "Lunes a viernes de 10 a 20 hs", desc: "Agenda tu turno cuando quieras, las 24 horas" },
    { icon: "✅", title: "Sin intermediarios", desc: "Reservá directo desde el celular, sin llamadas" },
  ];
  return (
    <section style={{ padding: "40px 20px", background: "#F5EFE6" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, color: C.dark, margin: "0 0 20px" }}>
          Por qué elegirnos
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {points.map((p) => (
            <div key={p.title} style={{
              display: "flex", gap: 14, alignItems: "flex-start",
              background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px",
            }}>
              <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{p.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14.5, color: C.dark }}>{p.title}</div>
                {p.mapsUrl ? (
                  <a href={p.mapsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: C.accent, marginTop: 3, display: "block", textDecoration: "none" }}>{p.desc} →</a>
                ) : (
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>{p.desc}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer({ businessInfo }) {
  const waNumber = formatPhoneForWhatsapp(businessInfo.whatsapp);
  return (
    <footer style={{ background: C.dark, padding: "36px 20px 48px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LogoMark size={28} />
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, color: "#EFE9DF" }}>
            {businessInfo.name}
          </span>
        </div>

        <a
          href={RESERVAR_URL}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "14px", borderRadius: 12,
            background: C.accent, color: "#fff",
            fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15,
            textDecoration: "none",
          }}
        >
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

        <p style={{ fontSize: 12, color: "#4A453D", margin: 0, lineHeight: 1.6 }}>
          {businessInfo.address && <>{businessInfo.address}<br /></>}
          {businessInfo.hoursLabel && <>{businessInfo.hoursLabel}<br /></>}
          Don Torcuato, Buenos Aires
        </p>
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
      <Services services={services} />
      <HowItWorks />
      <WhyUs />
      <Footer businessInfo={businessInfo} />
    </div>
  );
}
