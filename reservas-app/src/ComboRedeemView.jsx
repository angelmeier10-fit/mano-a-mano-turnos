import React, { useState, useEffect, useRef } from "react";
import { Download, Check, Package } from "lucide-react";
import { getCombo } from "../../shared/firestoreApi";
import { formatDateLong, dateKey } from "../../shared/helpers";
import styles from "../../shared/styles";
import ReservarView from "./ReservarView";

const BASE_URL = "https://angelmeier10-fit.github.io/mano-a-mano-turnos/mano-a-mano-reservas/";

function ComboVisual({ combo, canvasRef }) {
  return (
    <div ref={canvasRef} style={{ ...styles.giftCardVisual, display: "flex", flexDirection: "column", padding: 0 }}>
      <div style={{ position: "relative", height: 110, overflow: "hidden", flexShrink: 0 }}>
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1.5, background: "linear-gradient(90deg, transparent, #C9A84C 20%, #F0D060 50%, #C9A84C 80%, transparent)" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 1.5, background: "linear-gradient(180deg, transparent, #C9A84C 20%, #F0D060 50%, #C9A84C 80%, transparent)" }} />
        <div style={{ position: "absolute", top: 8, left: 8, width: 60, height: 60, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.15) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", top: 20, right: 25, width: 40, height: 40, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: 10, right: 12, width: 55, height: 55, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", top: 5, right: 80, width: 25, height: 25, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)" }} />
        <svg style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} width="72" height="60" viewBox="0 0 72 60" fill="none">
          <path d="M36 30 C24 18, 2 12, 5 26 C7 38, 26 34, 36 30Z" fill="#C9A84C"/>
          <path d="M36 30 C48 18, 70 12, 67 26 C65 38, 46 34, 36 30Z" fill="#C9A84C"/>
          <path d="M36 30 C24 42, 2 48, 5 34 C7 22, 26 26, 36 30Z" fill="#A87E2A"/>
          <path d="M36 30 C48 42, 70 48, 67 34 C65 22, 46 26, 36 30Z" fill="#A87E2A"/>
          <ellipse cx="36" cy="30" rx="5.5" ry="5" fill="#D4AF37"/>
          <ellipse cx="36" cy="30" rx="3" ry="2.8" fill="#F0D060"/>
        </svg>
      </div>
      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #C9A84C 20%, #D4AF37 50%, #C9A84C 80%, transparent)", flexShrink: 0 }} />
      <div style={{ padding: "18px 22px 20px", flex: 1 }}>
        <div style={styles.giftCardVisualLogo}>Angel Meier Masoterapia</div>
        <div style={styles.giftCardVisualService}>{combo.serviceName} · x{combo.totalSessions}</div>
        <div style={styles.giftCardVisualTo}>Para <strong>{combo.clientName}</strong>{combo.fromName ? ` · de parte de ${combo.fromName}` : ""}</div>
        <div style={styles.giftCardVisualCode}>Código: {combo.id}</div>
        <div style={styles.giftCardVisualLink}>{`${BASE_URL}?combo=${combo.id}`}</div>
      </div>
    </div>
  );
}

export default function ComboRedeemView({ comboId, services, availability, businessInfo, onBookSlot, onUpsertClient }) {
  const [combo, setCombo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    getCombo(comboId).then(data => {
      if (!data) setNotFound(true);
      else setCombo(data);
      setLoading(false);
    });
  }, [comboId]);

  async function handleDownload() {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true });
      const link = document.createElement("a");
      link.download = `combo-mano-a-mano.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <div style={styles.loadingMark} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📦</div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20 }}>Combo no encontrado</h2>
        <p style={{ color: "#8A8275", fontSize: 13 }}>El link puede ser incorrecto o el combo fue eliminado.</p>
      </div>
    );
  }

  const today = dateKey(new Date());
  const isExpired = combo.status === "active" && today > combo.expiresAt;
  const isCompleted = combo.status === "completed";
  const isPending = combo.status === "pending";
  const isActive = combo.status === "active" && !isExpired;

  if (showBooking) {
    return (
      <ReservarView
        services={services}
        availability={availability}
        businessInfo={businessInfo}
        onBookSlot={onBookSlot}
        onUpsertClient={onUpsertClient}
        preselectedServiceId={combo.serviceId}
        onBack={() => setShowBooking(false)}
      />
    );
  }

  return (
    <div style={{ padding: "20px 16px 40px" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <Package size={28} color="#B5654A" />
        <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 22, margin: "8px 0 4px" }}>Combo de sesiones</h2>
        <p style={{ fontSize: 13, color: "#8A8275", margin: 0 }}>Angel Meier · Masoterapia</p>
      </div>

      <ComboVisual combo={combo} canvasRef={cardRef} />

      <button
        onClick={handleDownload}
        style={{ ...styles.cancelBtn, width: "100%", justifyContent: "center", marginTop: 12, marginBottom: 20 }}
        disabled={downloading}
      >
        <Download size={15} /> {downloading ? "Descargando…" : "Descargar imagen"}
      </button>

      {isPending && (
        <div style={{ background: "#FFF8EC", border: "1.5px solid #C9973A", borderRadius: 12, padding: "16px", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#7A5C20", marginBottom: 4 }}>Pendiente de activación</div>
          <div style={{ fontSize: 12.5, color: "#8A7040", lineHeight: 1.5 }}>
            Este combo se activará en breve. Una vez activo vas a poder usarlo para reservar tus sesiones.
          </div>
        </div>
      )}

      {isExpired && (
        <div style={{ background: "#FDF0EE", border: "1.5px solid #A6483A", borderRadius: 12, padding: "16px", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#A6483A" }}>Combo vencido</div>
          <div style={{ fontSize: 12.5, color: "#8A4A40", marginTop: 4 }}>Este combo venció el {formatDateLong(combo.expiresAt)}.</div>
        </div>
      )}

      {isCompleted && (
        <div style={{ background: "#F5F5F5", border: "1.5px solid #C0B8AE", borderRadius: 12, padding: "16px", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#6E6555" }}>Combo ya utilizado</div>
          <div style={{ fontSize: 12.5, color: "#8A8275", marginTop: 4 }}>Las {combo.totalSessions} sesiones de este combo ya fueron usadas.</div>
        </div>
      )}

      {isActive && (
        <div style={{ marginTop: 4 }}>
          <div style={{ background: "#EBF3E6", border: "1.5px solid #9AB88A", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 12.5, color: "#4A5A40" }}>
            <strong>Combo activo</strong> · {combo.sessionsRemaining}/{combo.totalSessions} sesiones disponibles · Válido hasta el {formatDateLong(combo.expiresAt)}
          </div>
          <button
            style={{ ...styles.saveBtn, width: "100%", justifyContent: "center" }}
            onClick={() => setShowBooking(true)}
          >
            <Check size={16} /> Reservar turno con este combo
          </button>
        </div>
      )}
    </div>
  );
}
