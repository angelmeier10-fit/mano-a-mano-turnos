import React, { useState } from "react";
import { login } from "./auth";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError("Email o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={styles.title}>Mano a Mano</h1>
        <p style={styles.subtitle}>Iniciá sesión para ver tu agenda</p>
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
            autoComplete="current-password"
            required
          />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
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
  button: {
    width: "100%", marginTop: 20, padding: "12px", borderRadius: 10, border: "none",
    background: "#2A2622", color: "#EFE9DF", fontWeight: 600, fontSize: 14, cursor: "pointer",
  },
};
