import React, { useState } from "react";
import { Gift, ChevronLeft, Copy } from "lucide-react";
import { formatPrice, formatDateLong, dateKey, addDays } from "../../shared/helpers";
import { createGiftCard } from "../../shared/firestoreApi";
import styles from "../../shared/styles";

const BASE_URL = "https://angelmeier10-fit.github.io/mano-a-mano-turnos/mano-a-mano-reservas/";

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 8; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c.slice(0, 4) + "-" + c.slice(4);
}

export default function GiftCardView({ services, businessInfo, onBack }) {
  const todayStr = dateKey(new Date());
  const [serviceId, setServiceId] = useState(services[0]?.id || "");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [fromName, setFromName] = useState("");
  const [toName, setToName] = useState("");
  const [message, setMessage] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(todayStr);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null);
  const [copied, setCopied] = useState(false);

  const svc = services.find(s => s.id === serviceId);

  async function handleGenerate() {
    if (!buyerName.trim() || !buyerPhone.trim() || !fromName.trim() || !toName.trim() || !serviceId || loading) return;
    setLoading(true);
    try {
      const code = generateCode();
      const expiresAt = dateKey(addDays(new Date(deliveryDate), 30));
      const data = {
        code,
        serviceId,
        serviceName: svc?.name || "",
        servicePrice: svc?.price || 0,
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.replace(/\D/g, ""),
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
      setDone({ code, link: `${BASE_URL}?giftcard=${code}`, data });
    } catch (e) {
      console.error(e);
      window.alert("Hubo un problema al generar la gift card. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    navigator.clipboard?.writeText(done.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp() {
    const msg = `Hola ${done.data.toName}! Te comparto tu gift card de Angel Meier Masoterapia 🎁\nServicio: ${done.data.serviceName}\nDe parte de: ${done.data.fromName}${done.data.message ? `\n"${done.data.message}"` : ""}\n\nLink para usarla:\n${done.link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  if (done) {
    return (
      <div style={{ padding: "20px 16px" }}>
        <div style={{ ...styles.giftCardVisual, marginBottom: 20 }}>
          <div style={styles.giftCardVisualLogo}>Angel Meier Masoterapia</div>
          <div style={styles.giftCardVisualService}>{done.data.serviceName}</div>
          <div style={styles.giftCardVisualTo}>Para {done.data.toName} · de parte de {done.data.fromName}</div>
          {done.data.message && <div style={styles.giftCardVisualMessage}>"{done.data.message}"</div>}
          <div style={styles.giftCardVisualCode}>Código: {done.code}</div>
        </div>

        <div style={{ background: "#F0F7EC", border: "1.5px solid #6E7F5C", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: "#3D5430", marginBottom: 8 }}>Datos para transferir</div>
          <div style={{ fontSize: 13.5, color: "#2A2622", lineHeight: 1.9 }}>
            <div><strong>Angel Anibal Meier</strong></div>
            <div>CVU: <strong>angel.meier</strong></div>
            <div style={{ marginTop: 4, fontWeight: 700, fontSize: 15, color: "#3D5430" }}>{formatPrice(done.data.servicePrice)}</div>
          </div>
        </div>

        <div style={{ background: "#FFF8EC", border: "1.5px solid #C9973A", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: "#7A5C20", marginBottom: 4 }}>Esperando confirmación de pago</div>
          <div style={{ fontSize: 12.5, color: "#8A7040" }}>
            Realizá la transferencia y el profesional confirmará el pago. Cuando se active, podrás compartir el link con {done.data.toName}.
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", marginBottom: 12, border: "1px solid #E8E0D4" }}>
          <div style={{ fontSize: 12, color: "#8A8275", marginBottom: 6 }}>Link de la gift card (compartir una vez activada):</div>
          <div style={{ fontSize: 13, color: "#2A2622", wordBreak: "break-all", fontWeight: 500 }}>{done.link}</div>
        </div>

        <button
          style={{ ...styles.saveBtn, width: "100%", justifyContent: "center", marginBottom: 10 }}
          onClick={copyLink}
        >
          <Copy size={15} /> {copied ? "¡Copiado!" : "Copiar link"}
        </button>
        <button
          style={{ ...styles.saveBtn, width: "100%", justifyContent: "center", marginBottom: 10, background: "#25D366" }}
          onClick={shareWhatsApp}
        >
          Enviar link por WhatsApp a {done.data.toName}
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

        <div style={styles.fieldRow}>
          <div style={{ flex: 1 }}>
            <label style={styles.fieldLabel}>Tu nombre</label>
            <input style={styles.input} placeholder="Nombre de quien compra" value={buyerName} onChange={e => setBuyerName(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.fieldLabel}>Tu teléfono</label>
            <input style={styles.input} placeholder="Ej: 1134567890" type="tel" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} />
          </div>
        </div>

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
          style={{ ...styles.saveBtn, width: "100%", justifyContent: "center", opacity: (!buyerName.trim() || !buyerPhone.trim() || !fromName.trim() || !toName.trim()) ? 0.5 : 1 }}
          onClick={handleGenerate}
          disabled={!buyerName.trim() || !buyerPhone.trim() || !fromName.trim() || !toName.trim() || loading}
        >
          <Gift size={16} /> {loading ? "Generando…" : "Generar gift card"}
        </button>
      </div>
    </div>
  );
}
