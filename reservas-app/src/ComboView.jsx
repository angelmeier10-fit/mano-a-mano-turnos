import React, { useState } from "react";
import { Package, ChevronLeft } from "lucide-react";
import { formatPrice } from "../../shared/helpers";
import { createCombo } from "../../shared/firestoreApi";
import styles from "../../shared/styles";

export default function ComboView({ services, onBack, onGoReservar }) {
  const comboServices = services.filter(s => s.price2 > 0 || s.price3 > 0);
  const [serviceId, setServiceId] = useState(comboServices[0]?.id || "");
  const [sessions, setSessions] = useState(2);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null);

  const svc = comboServices.find(s => s.id === serviceId);
  const price = sessions === 3 ? (svc?.price3 || 0) : (svc?.price2 || 0);

  async function handleGenerate() {
    if (!buyerName.trim() || !buyerPhone.trim() || !serviceId || !price || loading) return;
    setLoading(true);
    try {
      const data = {
        clientName: buyerName.trim(),
        clientPhone: buyerPhone.replace(/\D/g, ""),
        serviceId,
        serviceName: svc?.name || "",
        totalSessions: Number(sessions),
        pricePaid: price,
        status: "pending",
      };
      await createCombo(data);
      setDone(data);
    } catch (e) {
      console.error(e);
      window.alert("Hubo un problema al generar el pedido. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div style={{ padding: "20px 16px" }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", marginBottom: 16, border: "1px solid #E8E0D4" }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#2A2622", marginBottom: 4 }}>{done.serviceName} · x{done.totalSessions}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#6E7F5C" }}>{formatPrice(done.pricePaid)}</div>
        </div>

        <div style={{ background: "#F0F7EC", border: "1.5px solid #6E7F5C", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: "#3D5430", marginBottom: 8 }}>Datos para transferir</div>
          <div style={{ fontSize: 13.5, color: "#2A2622", lineHeight: 1.9 }}>
            <div><strong>Angel Anibal Meier</strong></div>
            <div>CVU: <strong>angel.meier</strong></div>
            <div style={{ marginTop: 4, fontWeight: 700, fontSize: 15, color: "#3D5430" }}>{formatPrice(done.pricePaid)}</div>
          </div>
        </div>

        <div style={{ background: "#FFF8EC", border: "1.5px solid #C9973A", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: "#7A5C20", marginBottom: 4 }}>Esperando confirmación de pago</div>
          <div style={{ fontSize: 12.5, color: "#8A7040" }}>
            Podés transferir ahora o pagar en efectivo en tu primera sesión — confirmo el pago de cualquiera de las dos formas.
            Mientras tanto ya podés reservar tu turno con normalidad.
          </div>
        </div>

        <button
          style={{ ...styles.saveBtn, width: "100%", justifyContent: "center", marginBottom: 10 }}
          onClick={onGoReservar}
        >
          Reservar mi turno
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
        <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 20, margin: 0 }}>Comprá un combo</h2>
      </div>

      <div style={{ padding: "0 16px" }}>
        <p style={{ fontSize: 13, color: "#8A8275", marginTop: 0, marginBottom: 20 }}>
          Pagá varias sesiones por adelantado y usalas cuando quieras (vencen a los 60 días).
        </p>

        {comboServices.length === 0 ? (
          <p style={{ fontSize: 13, color: "#8A8275" }}>No hay combos disponibles por el momento.</p>
        ) : (
          <>
            <div style={styles.fieldRow}>
              <div style={{ flex: 1 }}>
                <label style={styles.fieldLabel}>Tu nombre</label>
                <input style={styles.input} placeholder="Nombre y apellido" value={buyerName} onChange={e => setBuyerName(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.fieldLabel}>Tu teléfono</label>
                <input style={styles.input} placeholder="Ej: 1134567890" type="tel" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} />
              </div>
            </div>

            <label style={styles.fieldLabel}>Servicio</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {comboServices.map(s => (
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
                  }}
                >
                  {s.name}
                </button>
              ))}
            </div>

            <label style={styles.fieldLabel}>Cantidad de sesiones</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {[2, 3].map(n => {
                const svcPrice = n === 3 ? svc?.price3 : svc?.price2;
                if (!svcPrice) return null;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSessions(n)}
                    style={{
                      flex: 1, padding: "12px 14px", borderRadius: 10, border: "2px solid",
                      borderColor: sessions === n ? "#6E7F5C" : "#D0C5B4",
                      background: sessions === n ? "#6E7F5C" : "#fff",
                      color: sessions === n ? "#fff" : "#2A2622",
                      fontWeight: 600, cursor: "pointer",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                    }}
                  >
                    <span>x{n} sesiones</span>
                    <span style={{ fontSize: 12, opacity: 0.85 }}>{formatPrice(svcPrice)}</span>
                  </button>
                );
              })}
            </div>

            <button
              style={{ ...styles.saveBtn, width: "100%", justifyContent: "center", opacity: (!buyerName.trim() || !buyerPhone.trim() || !price) ? 0.5 : 1 }}
              onClick={handleGenerate}
              disabled={!buyerName.trim() || !buyerPhone.trim() || !price || loading}
            >
              <Package size={16} /> {loading ? "Enviando…" : "Pedir combo"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
