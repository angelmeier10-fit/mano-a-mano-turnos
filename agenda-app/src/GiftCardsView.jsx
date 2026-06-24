import React, { useState } from "react";
import { Check, Gift } from "lucide-react";
import { activateGiftCard } from "../../shared/firestoreApi";
import { formatPrice, formatDateLong } from "../../shared/helpers";
import styles from "../../shared/styles";

const STATUS_LABEL = {
  pending: "Pendiente de pago",
  active: "Activa",
  used: "Utilizada",
};

export default function GiftCardsView({ giftCards }) {
  const [confirming, setConfirming] = useState(null);

  const pending = giftCards.filter(g => g.status === "pending");
  const active = giftCards.filter(g => g.status === "active");
  const used = giftCards.filter(g => g.status === "used");

  async function handleActivate(code) {
    setConfirming(code);
    try {
      await activateGiftCard(code);
    } catch (e) {
      console.error(e);
      window.alert("No se pudo activar la gift card. Intentá de nuevo.");
    } finally {
      setConfirming(null);
    }
  }

  function GiftCardRow({ gc }) {
    const today = new Date().toISOString().slice(0, 10);
    const expired = gc.status === "active" && today > gc.expiresAt;
    const badgeStyle = gc.status === "pending"
      ? { ...styles.giftCardStatusBadge, ...styles.giftCardBadgePending }
      : gc.status === "used"
        ? { ...styles.giftCardStatusBadge, ...styles.giftCardBadgeUsed }
        : expired
          ? { ...styles.giftCardStatusBadge, background: "#FDF0EE", color: "#A6483A" }
          : { ...styles.giftCardStatusBadge, ...styles.giftCardBadgeActive };

    return (
      <div style={styles.giftCardRow}>
        <div style={styles.giftCardRowHeader}>
          <div style={{ flex: 1 }}>
            <div style={styles.giftCardRowService}>{gc.serviceName}</div>
            <div style={styles.giftCardRowMeta}>
              Para <strong>{gc.toName}</strong> · de {gc.fromName} · {formatPrice(gc.servicePrice)}
            </div>
            {gc.message && (
              <div style={{ ...styles.giftCardRowMeta, fontStyle: "italic", marginTop: 2 }}>"{gc.message}"</div>
            )}
            <div style={{ ...styles.giftCardRowMeta, marginTop: 4 }}>
              Entrega: {formatDateLong(gc.deliveryDate)}
              {gc.status === "active" && !expired && ` · Vence: ${formatDateLong(gc.expiresAt)}`}
              {expired && <span style={{ color: "#A6483A" }}> · Vencida</span>}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <span style={badgeStyle}>
              {expired ? "Vencida" : STATUS_LABEL[gc.status]}
            </span>
            {gc.status === "pending" && (
              <button
                style={styles.giftCardConfirmBtn}
                onClick={() => handleActivate(gc.code)}
                disabled={confirming === gc.code}
              >
                <Check size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                {confirming === gc.code ? "Activando…" : "Confirmar pago"}
              </button>
            )}
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: "#B5A98F", letterSpacing: "0.06em" }}>
          Código: {gc.code}
        </div>
      </div>
    );
  }

  if (giftCards.length === 0) {
    return (
      <div style={{ padding: "40px 16px", textAlign: "center" }}>
        <Gift size={32} color="#B5A98F" style={{ marginBottom: 12 }} />
        <p style={{ color: "#8A8275", fontSize: 14 }}>Todavía no hay gift cards generadas.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 14px 40px" }}>
      {pending.length > 0 && (
        <>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600, margin: "0 0 10px" }}>
            Pendientes de pago ({pending.length})
          </h3>
          {pending.map(g => <GiftCardRow key={g.id} gc={g} />)}
        </>
      )}
      {active.length > 0 && (
        <>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600, margin: "16px 0 10px" }}>
            Activas ({active.length})
          </h3>
          {active.map(g => <GiftCardRow key={g.id} gc={g} />)}
        </>
      )}
      {used.length > 0 && (
        <>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600, margin: "16px 0 10px", color: "#8A8275" }}>
            Utilizadas ({used.length})
          </h3>
          {used.map(g => <GiftCardRow key={g.id} gc={g} />)}
        </>
      )}
    </div>
  );
}
