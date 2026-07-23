import React, { useState } from "react";
import { Search, ChevronLeft } from "lucide-react";
import { getCombosByPhone } from "../../shared/firestoreApi";
import { formatDateLong, formatPrice } from "../../shared/helpers";
import styles from "../../shared/styles";

export default function MisCombosView({ onBack }) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  async function handleSearch() {
    if (!phone.trim() || loading) return;
    setLoading(true);
    try {
      const combos = await getCombosByPhone(phone.trim());
      setResults(combos.sort((a, b) => b.createdAt - a.createdAt));
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  const now = Date.now();

  function statusFor(c) {
    if (c.status === "pending") return { label: "Esperando confirmación de pago", color: "#C9973A", bg: "#FFF8EC" };
    if (c.status === "completed") return { label: "Usado", color: "#8A8275", bg: "#F5F5F5" };
    if (c.expiresAt < now) return { label: "Vencido", color: "#A6483A", bg: "#F1D9D5" };
    return { label: "Activo", color: "#6E7F5C", bg: "#EBF3E6" };
  }

  return (
    <div style={{ padding: "0 0 32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px 8px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#6E6555", display: "flex", padding: 4 }}>
          <ChevronLeft size={20} />
        </button>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 20, margin: 0 }}>Mis combos</h2>
      </div>

      <div style={{ padding: "0 16px" }}>
        <p style={{ fontSize: 13, color: "#8A8275", marginTop: 0, marginBottom: 20 }}>
          Ingresá el número con el que compraste tu combo.
        </p>

        <label style={styles.fieldLabel}>Tu teléfono</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <input
            style={{ ...styles.input, flex: 1, marginBottom: 0 }}
            placeholder="Ej: 1134567890"
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
          />
          <button
            style={{ ...styles.saveBtn, paddingLeft: 16, paddingRight: 16, opacity: !phone.trim() ? 0.5 : 1 }}
            onClick={handleSearch}
            disabled={!phone.trim() || loading}
          >
            <Search size={16} />
          </button>
        </div>

        {results !== null && results.length === 0 && (
          <p style={{ textAlign: "center", color: "#8A8275", fontSize: 13 }}>
            No encontramos combos para ese número.
          </p>
        )}

        {results && results.map(c => {
          const s = statusFor(c);
          return (
            <div
              key={c.id}
              style={{ background: "#fff", border: "1px solid #E8E0D4", borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#2A2622" }}>{c.serviceName}</div>
                <span style={{ fontSize: 11, fontWeight: 700, color: s.color, background: s.bg, borderRadius: 6, padding: "2px 8px" }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 13, color: "#6E6555" }}>
                {c.sessionsRemaining}/{c.totalSessions} sesiones · {formatPrice(c.pricePaid)}
              </div>
              {c.status === "active" && (
                <div style={{ fontSize: 12, color: "#8A8275", marginTop: 4 }}>
                  Vence {formatDateLong(new Date(c.expiresAt).toISOString().slice(0, 10))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
