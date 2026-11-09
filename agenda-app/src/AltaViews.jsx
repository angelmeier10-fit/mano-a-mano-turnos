import React, { useEffect, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { refreshEmailVerified, resendVerification } from "./auth";
import { businessExists, createOwnBusiness, getBillingConfig, reservasUrl } from "../../shared/firestoreApi";
import { TRIAL_DAYS, isValidSlug, slugFromName } from "../../shared/helpers";
import styles from "../../shared/styles";

const screen = {
  wrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#2A2622", fontFamily: "'Inter', sans-serif", padding: 20 },
  card: { background: "#EFE9DF", borderRadius: 16, padding: "32px 28px", width: "100%", maxWidth: 400, boxSizing: "border-box" },
  title: { fontFamily: "'Fraunces', serif", fontSize: 24, margin: "0 0 8px", color: "#2A2622" },
  text: { fontSize: 14, lineHeight: 1.45, color: "#6E6555", margin: "0 0 16px" },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#6E6555", margin: "14px 0 6px", textTransform: "uppercase", letterSpacing: "0.03em" },
  input: { width: "100%", padding: "11px 13px", borderRadius: 10, border: "1.5px solid #DCD4C4", fontSize: 14.5, fontFamily: "'Inter', sans-serif", background: "#fff", color: "#2A2622", boxSizing: "border-box" },
  hint: { fontSize: 12.5, color: "#6E6555", margin: "6px 0 0", overflowWrap: "anywhere" },
  error: { color: "#A6483A", fontSize: 13, margin: "10px 0 0" },
  notice: { color: "#4A5A40", fontSize: 13, margin: "10px 0 0" },
  button: { width: "100%", marginTop: 18, padding: 12, borderRadius: 10, border: "none", background: "#2A2622", color: "#EFE9DF", fontWeight: 600, fontSize: 14, cursor: "pointer" },
  linkButton: { display: "block", margin: "12px auto 0", padding: 4, border: "none", background: "none", color: "#B5654A", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  terms: { display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, lineHeight: 1.4, color: "#2A2622", marginTop: 16 },
};

const RESERVAS_BASE = "https://angelmeier10-fit.github.io/mano-a-mano-turnos/mano-a-mano-reservas/?b=";

function VerifyEmail({ email, onVerified, onLogout }) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function check() {
    setError("");
    setNotice("");
    setLoading(true);
    try {
      if (await refreshEmailVerified()) onVerified();
      else setError("Todavía no figura verificado. Tocá el link del mail y volvé a probar.");
    } catch (err) {
      console.error("[alta] Verificar mail:", err);
      setError("No se pudo comprobar. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setError("");
    setNotice("");
    setLoading(true);
    try {
      await resendVerification();
      setNotice("Te mandamos otro mail. Revisá también el correo no deseado.");
    } catch (err) {
      console.error("[alta] Reenviar mail:", err);
      setError("No se pudo reenviar. Esperá unos minutos y probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={screen.wrap}>
      <div style={screen.card}>
        <h1 style={screen.title}>Verificá tu email</h1>
        <p style={screen.text}>Te mandamos un link a <strong>{email}</strong>. Tocalo y volvé acá para crear tu negocio.</p>
        {error && <p style={screen.error}>{error}</p>}
        {notice && <p style={screen.notice}>{notice}</p>}
        <button style={screen.button} onClick={check} disabled={loading}>Ya lo verifiqué</button>
        <button style={screen.linkButton} onClick={resend} disabled={loading}>Reenviar el mail</button>
        <button style={screen.linkButton} onClick={onLogout} disabled={loading}>Cerrar sesión</button>
      </div>
    </div>
  );
}

function CreateBusinessForm({ user, onCreated, onLogout }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function changeName(value) {
    setName(value);
    if (!slugEdited) setSlug(slugFromName(value));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!isValidSlug(slug)) {
      setError("El link debe tener entre 3 y 40 letras o números, separados por un guion. Algunos nombres están reservados.");
      return;
    }
    setLoading(true);
    try {
      if (await businessExists(slug)) {
        setError("Ese link ya está en uso. Probá con otro.");
        return;
      }
      await createOwnBusiness({ slug, name, uid: user.uid, email: user.email });
      onCreated(slug);
    } catch (err) {
      console.error("[alta] Crear negocio:", err);
      setError("No se pudo crear el negocio. Probá de nuevo o cerrá sesión y volvé a entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={screen.wrap}>
      <form style={screen.card} onSubmit={submit}>
        <h1 style={screen.title}>Creá tu negocio</h1>
        <p style={screen.text}>Tenés {TRIAL_DAYS} días de prueba gratis, sin cargar ningún medio de pago.</p>
        <label style={screen.label} htmlFor="alta-name">Nombre del negocio</label>
        <input id="alta-name" style={screen.input} value={name} maxLength={80} onChange={e => changeName(e.target.value)} required />
        <label style={screen.label} htmlFor="alta-slug">Link de reservas</label>
        <input
          id="alta-slug"
          style={screen.input}
          value={slug}
          maxLength={40}
          autoCapitalize="none"
          onChange={e => { setSlugEdited(true); setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-")); }}
          required
        />
        <p style={screen.hint}>{RESERVAS_BASE}{slug || "tu-negocio"}</p>
        <label style={screen.terms}>
          <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} required />
          <span>Acepto los <a href={`${import.meta.env.BASE_URL}terminos.html`} target="_blank" rel="noreferrer" style={{ color: "#B5654A" }}>términos y la política de privacidad</a>.</span>
        </label>
        {error && <p style={screen.error}>{error}</p>}
        <button style={screen.button} type="submit" disabled={loading || !accepted}>{loading ? "Un momento…" : "Crear negocio"}</button>
        <button style={screen.linkButton} type="button" onClick={onLogout} disabled={loading}>Cerrar sesión</button>
      </form>
    </div>
  );
}

// Lo que ve una cuenta sin negocio. El registro cerrado se mira primero para no pedir verificación en vano.
export function NoBusinessScreen({ user, onCreated, onLogout }) {
  const [signupOpen, setSignupOpen] = useState(undefined);
  const [verified, setVerified] = useState(user.emailVerified);

  useEffect(() => {
    getBillingConfig()
      .then(config => setSignupOpen(config.signupOpen === true))
      .catch(err => { console.error("[alta] No se pudo leer la configuración:", err); setSignupOpen(false); });
  }, []);

  if (signupOpen === undefined) {
    return <div style={styles.loadingScreen}><div style={styles.loadingMark} /></div>;
  }
  if (!signupOpen) {
    return (
      <div style={{ ...styles.loadingScreen, flexDirection: "column", gap: 16, padding: 24, textAlign: "center" }}>
        <p style={{ fontSize: 15, color: "#2A2622", margin: 0 }}>Esta cuenta todavía no tiene un negocio configurado.</p>
        <button onClick={onLogout} style={{ background: "#2A2622", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 14, cursor: "pointer" }}>
          Cerrar sesión
        </button>
      </div>
    );
  }
  if (!verified) return <VerifyEmail email={user.email} onVerified={() => setVerified(true)} onLogout={onLogout} />;
  return <CreateBusinessForm user={user} onCreated={onCreated} onLogout={onLogout} />;
}

const HIDE_GUIDE_KEY = "hide_start_guide";
function readHidden() {
  try { return localStorage.getItem(HIDE_GUIDE_KEY) === "1"; } catch { return false; }
}

export function StartGuide({ businessInfo, services, availability, setView }) {
  const [hidden, setHidden] = useState(readHidden);
  const [copied, setCopied] = useState(false);
  const steps = [
    { label: "Cargá tus datos y tu WhatsApp", done: !!businessInfo.whatsapp, view: "negocio" },
    { label: "Agregá tus servicios y precios", done: services.length > 0, view: "servicios" },
    { label: "Abrí tus horarios en la agenda", done: availability.length > 0, view: "agenda" },
  ];
  if (hidden || steps.every(step => step.done)) return null;

  function hide() {
    try { localStorage.setItem(HIDE_GUIDE_KEY, "1"); } catch { /* solo se oculta en esta visita */ }
    setHidden(true);
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(reservasUrl());
      setCopied(true);
    } catch {
      window.prompt("Copiá tu link de reservas:", reservasUrl());
    }
  }

  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 16, margin: "12px 16px 0", color: "#2A2622" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <strong style={{ fontSize: 15 }}>Primeros pasos</strong>
        <button onClick={hide} aria-label="Ocultar primeros pasos" title="Ocultar" style={{ background: "none", border: "none", color: "#6E6555", cursor: "pointer", display: "flex", padding: 4 }}><X size={18} /></button>
      </div>
      {steps.map(step => (
        <button key={step.view} onClick={() => setView(step.view)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", background: "none", border: "none", padding: "9px 0", fontSize: 14, color: "#2A2622", cursor: "pointer" }}>
          <span style={{ flex: "0 0 auto", width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: step.done ? "#6E7F5C" : "#E8E2D8", color: "#fff" }}>
            {step.done && <Check size={14} />}
          </span>
          <span style={{ textDecoration: step.done ? "line-through" : "none", color: step.done ? "#6E6555" : "#2A2622" }}>{step.label}</span>
        </button>
      ))}
      <button onClick={copy} style={{ ...styles.exportBtn, marginTop: 8 }}>
        <Copy size={16} /> {copied ? "Link copiado" : "Copiar tu link de reservas"}
      </button>
    </div>
  );
}
