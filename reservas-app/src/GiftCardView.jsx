import React, { useState } from "react";
import { Gift, ChevronLeft } from "lucide-react";
import { uid, formatPrice, formatDateLong, dateKey, addDays } from "../../shared/helpers";
import { createGiftCard } from "../../shared/firestoreApi";
import styles from "../../shared/styles";

const BASE_URL = "https://angelmeier10-fit.github.io/mano-a-mano-turnos/mano-a-mano-reservas/";

export default function GiftCardView({ services, businessInfo, onBack }) {
  const todayStr = dateKey(new Date());
  const [serviceId, setServiceId] = useState(services[0]?.id || "");
  const [fromName, setFromName] = useState("");
  const [toName, setToName] = useState("");
  const [message, setMessage] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(todayStr);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null); // { code, link }

  const svc = services.find(s => s.id === serviceId);

  async function handleGenerate() {
    if (!fromName.trim() || !toName.trim() || !serviceId || loading) return;
    setLoading(true);
    try {
      const code = uid() + uid();
      const expiresAt = dateKey(addDays(new Date(deliveryDate), 30));
      const data = {
        code,
        serviceId,
        serviceName: svc?.name || "",
        servicePrice: svc?.price || 0,
        fromName: fromName.trim(),
        toName: toName.trim(),
        message: message.trim(),
        deliveryDate,
        expiresAt,
        status: "pending",
        apptId: null,
        createdAt: Date.now(),
        activatedAt: null,
      };
      await createGiftCard(data);
      const link = `${BASE_URL}?giftcard=${code}`;
      setDone({ code, link, data });

      // Abrir WhatsApp con los detalles
      if (businessInfo?.whatsapp) {
        const waNum = businessInfo.whatsapp.replace(/\D/g, "");
        const msg = `Hola! Alguien compró una gift card 🎁\nServicio: ${svc?.name} (${formatPrice(svc?.price)})\nDe: ${fromName.trim()}\nPara: ${toName.trim()}${message.trim() ? `\nMensaje: "${message.trim()}"` : ""}\nFecha de entrega elegida: ${formatDateLong(deliveryDate)}\n\nLink de la gift card:\n${link}\n\nPor favor confirmá el pago y activala desde la Agenda.`;
        window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, "_blank");
      }
    } catch (e) {
      console.error(e);
      window.alert("Hubo un problema al generar la gift card. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div style={{ padding: "20px 16px" }}>
        <div style={{ ...styles.giftCardVisual, marginBottom: 20 }}>
          <div style={styles.giftCardVisualLogo}>Mano a Mano</div>
          <div style={styles.giftCardVisualService}>{done.data.serviceName}</div>
          <div style={styles.giftCardVisualTo}>Para {done.data.toName} · de parte de {done.data.fromName}</div>
          {done.data.message && <div style={styles.giftCardVisualMessage}>"{done.data.message}"</div>}
          <div style={styles.giftCardVisualCode}>Código: {done.code}</div>
        </div>

        <div style={{ background: "#FFF8EC", border: "1.5px solid #C9973A", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: "#7A5C20", marginBottom: 4 }}>Esperando confirmación de pago</div>
          <div style={{ fontSize: 12.5, color: "#8A7040" }}>Le avisamos al profesional por WhatsApp. Cuando confirme el pago, la gift card se activa y podrás compartir el link.</div>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", marginBottom: 12, border: "1px solid #E8E0D4" }}>
          <div style={{ fontSize: 12, color: "#8A8275", marginBottom: 6 }}>Link de la gift card:</div>
          <div style={{ fontSize: 13, color: "#2A2622", wordBreak: "break-all", fontWeight: 500 }}>{done.link}</div>
        </div>

        <button
          style={{ ...styles.saveBtn, width: "100%", justifyContent: "center", marginBottom: 10 }}
          onClick={() => { navigator.clipboard?.writeText(done.link); }}
        >
          Copiar link
        </button>
        <button style={{ ...styles.cancelBtn, width: "100%", justifyContent: "center" }} onClick={onBack}>
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 0 32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px 8px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#6E6555", display: "flex", padding: 4 }}>
          <ChevronLeft size={20} />
        </button>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 20, margin: 0 }}>Regalá una sesión</h2>
      </div>

      <div style={{ padding: "0 16px" }}>
        <p style={{ fontSize: 13, color: "#8A8275", marginTop: 0, marginBottom: 20 }}>
          Elegí el servicio, completá los datos y generamos una gift card con un link único.
        </p>

        <label style={styles.fieldLabel}>Servicio</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {services.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setServiceId(s.id)}
              style={{
                padding: "9px 14px", borderRadius: 10, border: "2px solid",
                borderColor: serviceId === s.id ? s.color : "#D0C5B4",
                background: serviceId === s.id ? s.color : "#fff",
                color: serviceId === s.id ? "#fff" : "#2A2622",
                fontWeight: 600, fontSize: 13, cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2,
              }}
            >
              <span>{s.name}</span>
              <span style={{ fontSize: 11, opacity: 0.85 }}>{formatPrice(s.price)}</span>
            </button>
          ))}
        </div>

        <div style={styles.fieldRow}>
          <div style={{ flex: 1 }}>
            <label style={styles.fieldLabel}>De parte de</label>
            <input style={styles.input} placeholder="Tu nombre" value={fromName} onChange={e => setFromName(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.fieldLabel}>Para</label>
            <input style={styles.input} placeholder="Nombre del destinatario" value={toName} onChange={e => setToName(e.target.value)} />
          </div>
        </div>

        <label style={styles.fieldLabel}>Mensaje (opcional)</label>
        <textarea
          style={{ ...styles.input, minHeight: 72, resize: "vertical", lineHeight: 1.5 }}
          placeholder="Un mensaje especial..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          maxLength={200}
        />

        <label style={styles.fieldLabel}>Fecha de entrega</label>
        <input
          type="date"
          style={styles.input}
          value={deliveryDate}
          min={todayStr}
          onChange={e => setDeliveryDate(e.target.value)}
        />
        <p style={{ fontSize: 12, color: "#8A8275", marginTop: 6, marginBottom: 20 }}>
          La gift card vence 30 días después de esta fecha.
        </p>

        <button
          style={{ ...styles.saveBtn, width: "100%", justifyContent: "center", opacity: (!fromName.trim() || !toName.trim()) ? 0.5 : 1 }}
          onClick={handleGenerate}
          disabled={!fromName.trim() || !toName.trim() || loading}
        >
          <Gift size={16} /> {loading ? "Generando…" : "Generar gift card"}
        </button>
      </div>
    </div>
  );
}
