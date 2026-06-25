import React, { useState } from "react";
import { Search, ChevronLeft } from "lucide-react";
import { getGiftCardsByPhone } from "../../shared/firestoreApi";
import { formatDateLong, dateKey } from "../../shared/helpers";
import styles from "../../shared/styles";

const BASE_URL = "https://angelmeier10-fit.github.io/mano-a-mano-turnos/mano-a-mano-reservas/";

const STATUS_LABEL = {
  pending: { label: "Esperando pago", color: "#C9973A", bg: "#FFF8EC" },
  active:  { label: "Activa", color: "#6E7F5C", bg: "#EBF3E6" },
  used:    { label: "Utilizada", color: "#8A8275", bg: "#F5F5F5" },
};

export default function GiftCardLookupView({ onSelectGiftCard, onBack }) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  async function handleSearch() {
    if (!phone.trim() || loading) return;
    setLoading(true);
    try {
      const cards = await getGiftCardsByPhone(phone.trim());
      setResults(cards);
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  const today = dateKey(new Date());

  return (
    <div style={{ padding: "0 0 32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px 8px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#6E6555", display: "flex", padding: 4 }}>
          <ChevronLeft size={20} />
        </button>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 20, margin: 0 }}>Buscar mis gift cards</h2>
      </div>

      <div style={{ padding: "0 16px" }}>
        <p style={{ fontSize: 13, color: "#8A8275", marginTop: 0, marginBottom: 20 }}>
          Ingresá el número con el que compraste tu gift card.
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
            No encontramos gift cards para ese número.
          </p>
        )}

        {results && results.map(gc => {
          const isExpired = gc.status === "active" && today > gc.expiresAt;
          const effectiveStatus = isExpired ? "used" : gc.status;
          const s = STATUS_LABEL[effectiveStatus] || STATUS_LABEL.pending;
          return (
            <div
              key={gc.id}
              style={{ background: "#fff", border: "1px solid #E8E0D4", borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}
            >
              <div
                onClick={() => onSelectGiftCard(gc.code)}
                style={{ cursor: "pointer" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#2A2622" }}>{gc.serviceName}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: s.color, background: s.bg, borderRadius: 6, padding: "2px 8px" }}>{s.label}</span>
                </div>
                <div style={{ fontSize: 13, color: "#6E6555" }}>Para <strong>{gc.toName}</strong> · de parte de {gc.fromName}</div>
                <div style={{ fontSize: 12, color: "#8A8275", marginTop: 4 }}>
                  Vence {formatDateLong(gc.expiresAt)}
                </div>
              </div>
              <button
                style={{ ...styles.saveBtn, background: "#25D366", width: "100%", justifyContent: "center", marginTop: 10 }}
                onClick={() => {
                  const link = `${BASE_URL}?giftcard=${gc.code}`;
                  const msg = `Hola ${gc.toName}! Te comparto tu gift card de Angel Meier Masoterapia 🎁\nServicio: ${gc.serviceName}\nDe parte de: ${gc.fromName}${gc.message ? `\n"${gc.message}"` : ""}\n\nLink para usarla:\n${link}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                }}
              >
                Enviar por WhatsApp
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
