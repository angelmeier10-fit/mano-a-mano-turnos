import React, { useState, useEffect, useRef } from "react";
import { Download, Check, Gift } from "lucide-react";
import { getGiftCard } from "../../shared/firestoreApi";
import { formatPrice, formatDateLong, dateKey } from "../../shared/helpers";
import styles from "../../shared/styles";
import ReservarView from "./ReservarView";

function GiftCardVisual({ gc, canvasRef }) {
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
        <div style={styles.giftCardVisualService}>{gc.serviceName}</div>
        <div style={styles.giftCardVisualTo}>Para <strong>{gc.toName}</strong> · de parte de {gc.fromName}</div>
        {gc.message && <div style={styles.giftCardVisualMessage}>"{gc.message}"</div>}
        <div style={styles.giftCardVisualCode}>Código: {gc.code}</div>
      </div>
    </div>
  );
}

export default function GiftCardRedeemView({ code, services, availability, businessInfo, onBookSlot, onUpsertClient }) {
  const [gc, setGc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    getGiftCard(code).then(data => {
      if (!data) setNotFound(true);
      else setGc(data);
      setLoading(false);
    });
  }, [code]);

  async function handleDownload() {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true });
      const link = document.createElement("a");
      link.download = `gift-card-mano-a-mano.png`;
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
        <div style={{ fontSize: 40, marginBottom: 16 }}>🎁</div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20 }}>Gift card no encontrada</h2>
        <p style={{ color: "#8A8275", fontSize: 13 }}>El link puede ser incorrecto o la gift card fue eliminada.</p>
      </div>
    );
  }

  const today = dateKey(new Date());
  const isExpired = gc.status === "active" && today > gc.expiresAt;
  const isUsed = gc.status === "used";
  const isPending = gc.status === "pending";
  const isActive = gc.status === "active" && !isExpired;

  if (showBooking) {
    // Importamos ReservarView dinámicamente para el canje
    return <BookingForGiftCard gc={gc} services={services} availability={availability} businessInfo={businessInfo} onBookSlot={onBookSlot} onUpsertClient={onUpsertClient} onBack={() => setShowBooking(false)} />;
  }

  return (
    <div style={{ padding: "20px 16px 40px" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <Gift size={28} color="#B5654A" />
        <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 22, margin: "8px 0 4px" }}>Gift Card</h2>
        <p style={{ fontSize: 13, color: "#8A8275", margin: 0 }}>Angel Meier · Masoterapia</p>
      </div>

      <GiftCardVisual gc={gc} canvasRef={cardRef} />

      <button
        onClick={handleDownload}
        style={{ ...styles.cancelBtn, width: "100%", justifyContent: "center", marginTop: 12, marginBottom: 20 }}
        disabled={downloading}
      >
        <Download size={15} /> {downloading ? "Descargando…" : "Descargar imagen"}
      </button>

      {isPending && (
        <div style={{ background: "#FFF8EC", border: "1.5px solid #C9973A", borderRadius: 12, padding: "16px", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#7A5C20", marginBottom: 4 }}>Esperando confirmación de pago</div>
          <div style={{ fontSize: 12.5, color: "#8A7040", lineHeight: 1.5 }}>
            El profesional confirmará el pago y activará la gift card. Una vez activa vas a poder usarla para reservar.
          </div>
        </div>
      )}

      {isExpired && (
        <div style={{ background: "#FDF0EE", border: "1.5px solid #A6483A", borderRadius: 12, padding: "16px", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#A6483A" }}>Gift card vencida</div>
          <div style={{ fontSize: 12.5, color: "#8A4A40", marginTop: 4 }}>Esta gift card venció el {formatDateLong(gc.expiresAt)}.</div>
        </div>
      )}

      {isUsed && (
        <div style={{ background: "#F5F5F5", border: "1.5px solid #C0B8AE", borderRadius: 12, padding: "16px", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#6E6555" }}>Gift card ya utilizada</div>
          <div style={{ fontSize: 12.5, color: "#8A8275", marginTop: 4 }}>Esta gift card fue canjeada por un turno.</div>
        </div>
      )}

      {isActive && (
        <div style={{ marginTop: 4 }}>
          <div style={{ background: "#EBF3E6", border: "1.5px solid #9AB88A", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 12.5, color: "#4A5A40" }}>
            <strong>Gift card activa</strong> · Válida hasta el {formatDateLong(gc.expiresAt)}
          </div>
          <button
            style={{ ...styles.saveBtn, width: "100%", justifyContent: "center" }}
            onClick={() => setShowBooking(true)}
          >
            <Check size={16} /> Reservar turno con esta gift card
          </button>
        </div>
      )}
    </div>
  );
}

// Sub-componente: flujo de reserva adaptado para gift card
function BookingForGiftCard({ gc, services, availability, businessInfo, onBookSlot, onUpsertClient, onBack }) {
  return (
    <ReservarView
      services={services}
      availability={availability}
      businessInfo={businessInfo}
      onBookSlot={onBookSlot}
      onUpsertClient={onUpsertClient}
      giftCardCode={gc.code}
      preselectedServiceId={gc.serviceId}
      onBack={onBack}
    />
  );
}
