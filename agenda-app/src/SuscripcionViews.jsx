import React, { useCallback, useEffect, useState } from "react";
import { DEFAULT_BUSINESS_ID, getBillingConfig, getOwnBilling, listSubscriptions, registerSubscriptionPayment, saveBillingConfig, updateBilling, updateSubscription } from "../../shared/firestoreApi";
import { DEFAULT_PRICES, FOUNDER_LIMIT, FOUNDER_MONTHS, GRACE_DAYS, addOneMonth, dateKey, formatPhoneForWhatsapp, formatPrice, isHttpsUrl, subscriptionPlan, subscriptionStatus } from "../../shared/helpers";
import styles from "../../shared/styles";

const DAY_MS = 86400000;
const WARN_DAYS = 7;
const STATE_LABEL = { exempt: "Exento", trial: "Prueba gratis", active: "Activa", grace: "Vencida, en gracia", blocked: "Bloqueada" };
const STATE_COLOR = { exempt: "#6E6555", trial: "#55654A", active: "#55654A", grace: "#A6483A", blocked: "#A6483A" };

const fmtDate = (ms) => new Date(ms).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
const daysUntil = (ms) => Math.max(0, Math.ceil((ms - Date.now()) / DAY_MS));
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

const box = { background: "#fff", borderRadius: 12, padding: 16, margin: "12px 16px", color: "#2A2622" };
const primary = { display: "block", textAlign: "center", textDecoration: "none", boxSizing: "border-box", width: "100%", padding: 12, borderRadius: 10, border: "none", background: "#2A2622", color: "#EFE9DF", fontWeight: 600, fontSize: 14, cursor: "pointer", marginTop: 10 };
const secondary = { ...primary, background: "transparent", color: "#2A2622", border: "1.5px solid #2A2622" };
const label = { display: "block", fontSize: 12, fontWeight: 600, color: "#6E6555", margin: "12px 0 6px" };

export function SubscriptionBanner({ status, onOpen }) {
  const { state, until, blocksAt } = status;
  let text = "";
  if (state === "blocked") text = "Tu suscripción venció: no entran reservas nuevas. Tocá para pagar y reactivarla.";
  else if (state === "grace") text = `Tu suscripción venció. Te quedan ${plural(daysUntil(blocksAt), "día")} para pagar sin que se pausen las reservas.`;
  else if ((state === "trial" || state === "active") && daysUntil(until) <= WARN_DAYS) {
    text = `${state === "trial" ? "Tu prueba gratis termina" : "Tu suscripción vence"} en ${plural(daysUntil(until), "día")}. Tocá para ver cómo pagar.`;
  }
  if (!text) return null;
  return (
    <button onClick={onOpen} style={{ display: "block", width: "100%", textAlign: "left", background: state === "blocked" ? "#A6483A" : "#2A2622", color: "#fff", border: "none", padding: "12px 16px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
      {text}
    </button>
  );
}

export function SubscriptionSection({ businessId, businessInfo, status }) {
  const [config, setConfig] = useState(null);
  const [billing, setBilling] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([getBillingConfig(), getOwnBilling()])
      .then(([c, b]) => { setConfig(c); setBilling(b); })
      .catch(err => { console.error("[suscripción] No se pudo cargar:", err); setError(true); });
  }, []);

  if (error) return <div style={box}>No se pudieron cargar los datos de la suscripción. Probá de nuevo más tarde.</div>;
  if (!config) return null;

  const { state, until, blocksAt } = status;
  const plan = subscriptionPlan(billing, config);
  const adminWhatsapp = formatPhoneForWhatsapp(config.whatsapp);
  const message = encodeURIComponent(`Hola, ya pagué la suscripción de ${businessInfo.name} (${businessId}).`);
  const dateText = state === "blocked" || state === "grace" ? `Venció el ${fmtDate(until)}.`
    : state === "trial" ? `Termina el ${fmtDate(until)}.`
    : `Vence el ${fmtDate(until)}.`;

  return (
    <section style={box}>
      <h2 style={{ ...styles.sectionTitle, margin: "0 0 8px" }}>Suscripción</h2>
      <p style={{ margin: 0, fontWeight: 700, color: STATE_COLOR[state] }}>{STATE_LABEL[state]}</p>
      <p style={{ margin: "4px 0 0", fontSize: 14 }}>{dateText}</p>
      {state === "grace" && <p style={{ margin: "4px 0 0", fontSize: 14 }}>Las reservas nuevas se pausan el {fmtDate(blocksAt)}.</p>}
      {state === "blocked" && <p style={{ margin: "4px 0 0", fontSize: 14 }}>Tus datos siguen guardados: podés verlos, exportarlos y cancelar turnos. Al registrarse el pago vuelve todo a la normalidad.</p>}
      <p style={{ margin: "10px 0 0", fontSize: 15, fontWeight: 600 }}>{formatPrice(plan.price)} por mes{plan.plan === "founder" ? " (precio de fundador)" : ""}</p>
      {plan.plan === "founder" && <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6E6555" }}>Hasta el {fmtDate(billing.founderUntil)}.</p>}
      {isHttpsUrl(plan.link) && <a href={plan.link} target="_blank" rel="noreferrer" style={primary}>Pagar</a>}
      {adminWhatsapp && <a href={`https://wa.me/${adminWhatsapp}?text=${message}`} target="_blank" rel="noreferrer" style={secondary}>Avisar que pagué</a>}
      <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "#6E6555" }}>El pago se registra a mano, así que puede demorar hasta que lo confirmemos.</p>
    </section>
  );
}

function ConfigForm({ config, onSaved }) {
  const [form, setForm] = useState({
    priceRegular: config.priceRegular ?? DEFAULT_PRICES.priceRegular,
    priceFounder: config.priceFounder ?? DEFAULT_PRICES.priceFounder,
    linkRegular: config.linkRegular || "",
    linkFounder: config.linkFounder || "",
    whatsapp: config.whatsapp || "",
    signupOpen: config.signupOpen === true,
  });
  const [message, setMessage] = useState("");
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  async function save(e) {
    e.preventDefault();
    for (const link of [form.linkRegular, form.linkFounder]) {
      if (link && !isHttpsUrl(link)) { setMessage("Los links deben empezar con https://"); return; }
    }
    if (form.signupOpen && !(isHttpsUrl(form.linkRegular) && isHttpsUrl(form.linkFounder) && formatPhoneForWhatsapp(form.whatsapp))) {
      setMessage("Para abrir el registro faltan los dos links y tu WhatsApp.");
      return;
    }
    try {
      await saveBillingConfig({ ...form, priceRegular: Number(form.priceRegular) || 0, priceFounder: Number(form.priceFounder) || 0 });
      setMessage("Guardado.");
      onSaved();
    } catch (err) {
      console.error("[admin] Guardar configuración:", err);
      setMessage("No se pudo guardar.");
    }
  }

  return (
    <form onSubmit={save} style={box}>
      <h2 style={{ ...styles.sectionTitle, margin: "0 0 8px" }}>Precios y registro</h2>
      <label style={label} htmlFor="cfg-price">Precio normal</label>
      <input id="cfg-price" style={styles.input} type="number" min="0" value={form.priceRegular} onChange={set("priceRegular")} />
      <label style={label} htmlFor="cfg-link">Link de pago, precio normal</label>
      <input id="cfg-link" style={styles.input} value={form.linkRegular} onChange={set("linkRegular")} placeholder="https://..." />
      <label style={label} htmlFor="cfg-fprice">Precio de fundador</label>
      <input id="cfg-fprice" style={styles.input} type="number" min="0" value={form.priceFounder} onChange={set("priceFounder")} />
      <label style={label} htmlFor="cfg-flink">Link de pago, precio de fundador</label>
      <input id="cfg-flink" style={styles.input} value={form.linkFounder} onChange={set("linkFounder")} placeholder="https://..." />
      <label style={label} htmlFor="cfg-wa">Tu WhatsApp para los avisos de pago</label>
      <input id="cfg-wa" style={styles.input} type="tel" value={form.whatsapp} onChange={set("whatsapp")} />
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, marginTop: 14 }}>
        <input type="checkbox" checked={form.signupOpen} onChange={set("signupOpen")} />
        Registro abierto a colegas nuevos
      </label>
      <button style={primary} type="submit">Guardar</button>
      {message && <p role="status" style={{ margin: "8px 0 0", fontSize: 13 }}>{message}</p>}
    </form>
  );
}

function founderEnd(now = Date.now()) {
  let end = now;
  for (let i = 0; i < FOUNDER_MONTHS; i++) end = addOneMonth(end);
  return end;
}

function SubscriptionRow({ item, config, onChanged }) {
  const { id, business, billing } = item;
  const status = subscriptionStatus(business);
  const plan = subscriptionPlan(billing, config);
  const exempt = status.state === "exempt";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [date, setDate] = useState(status.until ? dateKey(new Date(status.until)) : "");

  async function run(action) {
    setBusy(true);
    setError("");
    try {
      await action();
      await onChanged();
    } catch (err) {
      console.error("[admin] Cambio de suscripción:", err);
      setError("No se pudo guardar. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }
  const pay = () => run(() => registerSubscriptionPayment(id, {
    activeUntil: addOneMonth(Math.max(Date.now(), status.until || 0)),
    amount: plan.price,
    plan: plan.plan,
  }));
  const saveDate = () => run(() => {
    const [y, m, d] = date.split("-").map(Number);
    return updateSubscription(id, { activeUntil: new Date(y, m - 1, d, 23, 59, 59).getTime() });
  });
  const toggleFounder = (e) => {
    const on = e.target.checked;
    return run(() => updateBilling(id, on ? { plan: "founder", founderUntil: founderEnd() } : { plan: "regular", founderUntil: null }));
  };
  const toggleExempt = (e) => {
    const on = e.target.checked;
    return run(() => updateSubscription(id, { exempt: on }));
  };
  const lastPayment = billing?.payments?.[billing.payments.length - 1];

  return (
    <article style={box}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
        <strong style={{ fontSize: 15 }}>{business.name || id}</strong>
        <span style={{ fontSize: 13, fontWeight: 700, color: STATE_COLOR[status.state] }}>{STATE_LABEL[status.state]}</span>
      </div>
      <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6E6555", overflowWrap: "anywhere" }}>{id}{billing?.ownerEmail ? ` · ${billing.ownerEmail}` : ""}</p>
      {status.until && <p style={{ margin: "4px 0 0", fontSize: 13 }}>{status.state === "trial" ? "Prueba hasta" : "Pagado hasta"} {fmtDate(status.until)}</p>}
      {!exempt && <p style={{ margin: "4px 0 0", fontSize: 13 }}>{formatPrice(plan.price)} por mes{plan.plan === "founder" ? ` · fundador hasta ${fmtDate(billing.founderUntil)}` : ""}</p>}
      {lastPayment && <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6E6555" }}>Último pago: {fmtDate(lastPayment.at)}, {formatPrice(lastPayment.amount)}</p>}
      {!exempt && <button style={primary} onClick={pay} disabled={busy}>Registrar pago de un mes</button>}
      <label style={label} htmlFor={`until-${id}`}>{exempt ? "Para empezar a cobrarle, poné un vencimiento" : "Cambiar vencimiento o dar prórroga"}</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input id={`until-${id}`} style={{ ...styles.input, flex: 1, minWidth: 0 }} type="date" value={date} onChange={e => setDate(e.target.value)} />
        <button style={{ ...secondary, width: "auto", marginTop: 0, padding: "0 14px" }} onClick={saveDate} disabled={busy || !date}>Guardar</button>
      </div>
      {!exempt && (
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, marginTop: 12 }}>
          <input type="checkbox" checked={billing?.plan === "founder"} onChange={toggleFounder} disabled={busy} />
          Precio de fundador por {FOUNDER_MONTHS} meses
        </label>
      )}
      {(!exempt || business.exempt === true) && (
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, marginTop: 8 }}>
          <input type="checkbox" checked={business.exempt === true} onChange={toggleExempt} disabled={busy} />
          Exento de pago
        </label>
      )}
      {error && <p role="alert" style={{ color: "#A6483A", fontSize: 13, margin: "8px 0 0" }}>{error}</p>}
    </article>
  );
}

export function AdminView() {
  const [items, setItems] = useState(null);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, cfg] = await Promise.all([listSubscriptions(), getBillingConfig()]);
      setItems(list);
      setConfig(cfg);
      setError(false);
    } catch (err) {
      console.error("[admin] No se pudo cargar:", err);
      setError(true);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (error) return <div style={box}>No se pudieron cargar las suscripciones.</div>;
  if (!items) return <div style={box}>Cargando…</div>;

  // Tu propio negocio no se lista: un vencimiento cargado por error lo bloquearía.
  const others = items.filter(i => i.id !== DEFAULT_BUSINESS_ID);
  const founders = others.filter(i => i.billing?.plan === "founder").length;
  const ORDER = { blocked: 0, grace: 1, trial: 2, active: 3, exempt: 4 };
  const sorted = [...others].sort((a, b) => ORDER[subscriptionStatus(a.business).state] - ORDER[subscriptionStatus(b.business).state]);

  return (
    <div>
      <ConfigForm config={config} onSaved={load} />
      <h2 style={{ ...styles.sectionTitle, margin: "20px 16px 0" }}>Negocios ({others.length})</h2>
      <p style={{ margin: "4px 16px 0", fontSize: 13, color: "#6E6555" }}>
        Fundadores: {founders} de {FOUNDER_LIMIT}. Se bloquean {GRACE_DAYS} días después de vencer.
      </p>
      {sorted.map(item => <SubscriptionRow key={item.id} item={item} config={config} onChanged={load} />)}
    </div>
  );
}
