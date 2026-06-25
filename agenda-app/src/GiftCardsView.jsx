import React, { useState } from "react";
import { Check, Gift, Search } from "lucide-react";
import { activateGiftCard, getGiftCard } from "../../shared/firestoreApi";
import { formatPrice, formatDateLong } from "../../shared/helpers";
import styles from "../../shared/styles";

const STATUS_LABEL = {
  pending: "Pendiente de pago",
  active: "Activa",
  used: "Utilizada",
};

export default function GiftCardsView({ giftCards }) {
  const [confirming, setConfirming] = useState(null);
  const [codeInput, setCodeInput] = useState("");
  const [codeSearch, setCodeSearch] = useState(null); // { loading, result, error }

  const pending = giftCards.filter(g => g.status === "pending");
  const active = giftCards.filter(g => g.status === "active");
  const used = giftCards.filter(g => g.status === "used");

  async function handleActivate(code) {
    setConfirming(code);
    try {
      await activateGiftCard(code);
      if (codeSearch?.result?.code === code) {
        setCodeSearch(prev => ({ ...prev, result: { ...prev.result, status: "active" } }));
      }
    } catch (e) {
      console.error(e);
      window.alert("No se pudo activar la gift card. Intentá de nuevo.");
    } finally {
      setConfirming(null);
    }
  }

  async function handleCodeSearch(e) {
    e.preventDefault();
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setCodeSearch({ loading: true, result: null, error: null });
    try {
      const gc = await getGiftCard(code);
      if (gc) {
        setCodeSearch({ loading: false, result: gc, error: null });
      } else {
        setCodeSearch({ loading: false, result: null, error: "No se encontró ninguna gift card con ese código." });
      }
    } catch {
      setCodeSearch({ loading: false, result: null, error: "Error al buscar. Intentá de nuevo." });
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
            {gc.buyerName && (
              <div style={{ ...styles.giftCardRowMeta, marginTop: 4, color: "#6E6555" }}>
                Comprador: <strong>{gc.buyerName}</strong>
                {gc.buyerPhone ? ` · ${gc.buyerPhone}` : ""}
              </div>
            )}
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

  return (
    <div style={{ padding: "16px 14px 40px" }}>

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E8E0D4", padding: "14px 16px", marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, color: "#2A2622", marginBottom: 10 }}>Validar por código</div>
        <form onSubmit={handleCodeSearch} style={{ display: "flex", gap: 8 }}>
          <input
            style={{ ...styles.input, flex: 1, margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}
            placeholder="Ej: ABCD-1234"
            value={codeInput}
            onChange={e => setCodeInput(e.target.value)}
          />
          <button
            type="submit"
            style={{ ...styles.saveBtn, padding: "0 14px", flexShrink: 0 }}
            disabled={codeSearch?.loading || !codeInput.trim()}
          >
            <Search size={16} />
          </button>
        </form>
        {codeSearch?.loading && (
          <div style={{ fontSize: 13, color: "#8A8275", marginTop: 10 }}>Buscando…</div>
        )}
        {codeSearch?.error && (
          <div style={{ fontSize: 13, color: "#A6483A", marginTop: 10 }}>{codeSearch.error}</div>
        )}
        {codeSearch?.result && (
          <div style={{ marginTop: 12 }}>
            <GiftCardRow gc={codeSearch.result} />
          </div>
        )}
      </div>

      {giftCards.length === 0 ? (
        <div style={{ padding: "20px 0", textAlign: "center" }}>
          <Gift size={32} color="#B5A98F" style={{ marginBottom: 12 }} />
          <p style={{ color: "#8A8275", fontSize: 14 }}>Todavía no hay gift cards generadas.</p>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
