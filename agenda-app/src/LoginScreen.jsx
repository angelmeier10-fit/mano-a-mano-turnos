import React, { useEffect, useState } from "react";
import { login, loginWithGoogle, resetPassword, signUp } from "./auth";
import { getBillingConfig } from "../../shared/firestoreApi";

const RESET_SENT = "Si hay una cuenta con ese email, te mandamos un link para elegir una contraseña nueva. Revisá también el correo no deseado.";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    getBillingConfig()
      .then(config => setSignupOpen(config.signupOpen === true))
      .catch(err => console.error("[login] No se pudo leer la configuración:", err));
  }, []);

  function switchMode() {
    setCreating(v => !v);
    setError("");
    setNotice("");
  }

  async function handleGoogle() {
    setError("");
    setNotice("");
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      if (err.code === "auth/account-exists-with-different-credential") {
        setError("Ese email ya tiene una cuenta. Entrá con tu contraseña.");
      } else if (err.code === "auth/popup-blocked") {
        setError("El navegador bloqueó la ventana de Google. Permitila y probá de nuevo.");
      } else if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request") {
        console.error("[login] Google:", err);
        setError("No se pudo entrar con Google. Probá de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setError("");
    setNotice("");
    if (!email.trim()) {
      setError("Escribí tu email y volvé a tocar \"Olvidé mi contraseña\".");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setNotice(RESET_SENT);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setNotice(RESET_SENT);
      } else if (err.code === "auth/invalid-email") {
        setError("Ese email no es válido.");
      } else {
        console.error("[login] Recuperar contraseña:", err);
        setError("No se pudo enviar el mail. Probá de nuevo en unos minutos.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      if (creating) await signUp(email.trim(), password);
      else await login(email, password);
    } catch (err) {
      if (!creating) setError("Email o contraseña incorrectos.");
      else if (err.code === "auth/email-already-in-use") setError("Ese email ya tiene una cuenta. Entrá con tu contraseña o con Google.");
      else if (err.code === "auth/weak-password") setError("La contraseña debe tener al menos 6 caracteres.");
      else if (err.code === "auth/invalid-email") setError("Ese email no es válido.");
      else {
        console.error("[login] Crear cuenta:", err);
        setError("No se pudo crear la cuenta. Probá de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={styles.title}>Agenda de turnos</h1>
        <p style={styles.subtitle}>{creating ? "Creá tu cuenta para empezar la prueba gratis" : "Iniciá sesión para ver tu agenda"}</p>
        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Email</label>
          <input
            style={styles.input}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <label style={styles.label}>Contraseña</label>
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={creating ? "new-password" : "current-password"}
            required
          />
          {error && <p style={styles.error}>{error}</p>}
          {notice && <p style={styles.notice}>{notice}</p>}
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? "Un momento…" : creating ? "Crear cuenta" : "Entrar"}
          </button>
          {!creating && (
            <button style={styles.linkButton} type="button" onClick={handleForgotPassword} disabled={loading}>
              Olvidé mi contraseña
            </button>
          )}
        </form>
        <button style={styles.googleButton} type="button" onClick={handleGoogle} disabled={loading}>
          {creating ? "Continuar con Google" : "Entrar con Google"}
        </button>
        {signupOpen && (
          <button style={styles.linkButton} type="button" onClick={switchMode} disabled={loading}>
            {creating ? "Ya tengo cuenta" : "Crear una cuenta nueva"}
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: "#2A2622", fontFamily: "'Inter', sans-serif", padding: 20,
  },
  card: {
    background: "#EFE9DF", borderRadius: 16, padding: "32px 28px", width: "100%", maxWidth: 360,
  },
  title: { fontFamily: "'Fraunces', serif", fontSize: 24, margin: "0 0 4px", color: "#2A2622" },
  subtitle: { fontSize: 13.5, color: "#6E6555", margin: "0 0 20px" },
  label: {
    display: "block", fontSize: 12, fontWeight: 600, color: "#6E6555",
    margin: "14px 0 6px", textTransform: "uppercase", letterSpacing: "0.03em",
  },
  input: {
    width: "100%", padding: "11px 13px", borderRadius: 10,
    border: "1.5px solid #DCD4C4", fontSize: 14.5, fontFamily: "'Inter', sans-serif",
    background: "#fff", color: "#2A2622", boxSizing: "border-box",
  },
  error: { color: "#A6483A", fontSize: 13, margin: "10px 0 0" },
  notice: { color: "#4A5A40", fontSize: 13, margin: "10px 0 0" },
  linkButton: {
    display: "block", margin: "12px auto 0", padding: 4, border: "none", background: "none",
    color: "#B5654A", fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  googleButton: {
    width: "100%", marginTop: 14, padding: "12px", borderRadius: 10, border: "1.5px solid #2A2622",
    background: "transparent", color: "#2A2622", fontWeight: 600, fontSize: 14, cursor: "pointer",
  },
  button: {
    width: "100%", marginTop: 20, padding: "12px", borderRadius: 10, border: "none",
    background: "#2A2622", color: "#EFE9DF", fontWeight: 600, fontSize: 14, cursor: "pointer",
  },
};
