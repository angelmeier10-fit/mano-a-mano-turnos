import React, { useState, useEffect } from "react";
import { Check, Download, Copy, Share2, Pencil, Trash2, Plus, MapPin } from "lucide-react";
import styles from "../../shared/styles";
import { STATUS, formatPrice, getAppointmentPrice, dateKey, getReferralAmount } from "../../shared/helpers";
import { reservasUrl } from "../../shared/firestoreApi";

function ShareLinkCard({ label, url, shareTitle }) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareLink() {
    try { await navigator.share({ url, title: shareTitle }); } catch {}
  }

  return (
    <div style={{ background: "#F5F0E8", borderRadius: 12, padding: "12px 14px", marginBottom: 20 }}>
      <p style={{ fontSize: 12, color: "#8A8275", margin: "0 0 4px 0" }}>{label}</p>
      <p style={{ fontSize: 13, color: "#2A2622", wordBreak: "break-all", margin: "0 0 10px 0", fontWeight: 500 }}>{url}</p>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" style={{ ...styles.saveBtn, flex: 1 }} onClick={copyLink}>
          <Copy size={14} /> {copied ? "Copiado ✓" : "Copiar link"}
        </button>
        {"share" in navigator && (
          <button type="button" style={{ ...styles.exportBtn, flex: 1 }} onClick={shareLink}>
            <Share2 size={14} /> Compartir
          </button>
        )}
      </div>
    </div>
  );
}

function LocationForm({ initial, onSubmit, onCancel }) {
  const [name, setName] = useState(initial?.name || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [addressDetail, setAddressDetail] = useState(initial?.addressDetail || "");

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), address: address.trim(), addressDetail: addressDetail.trim() });
  }

  return (
    <form style={{ ...styles.newServiceForm, marginTop: 4 }} onSubmit={handleSubmit}>
      <label style={styles.fieldLabel}>Nombre del lugar</label>
      <input style={styles.input} value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Consultorio Centro" autoFocus />
      <label style={styles.fieldLabel}>Dirección</label>
      <input style={styles.input} value={address} onChange={e => setAddress(e.target.value)} placeholder="Calle y número, localidad" />
      <label style={styles.fieldLabel}>Referencia</label>
      <input style={styles.input} value={addressDetail} onChange={e => setAddressDetail(e.target.value)} placeholder="Entre calles, piso, timbre, etc." />
      <div style={styles.modalActions}>
        <button type="button" style={styles.cancelBtn} onClick={onCancel}>Cancelar</button>
        <button type="submit" style={styles.saveBtn}><Check size={16} /> Guardar</button>
      </div>
    </form>
  );
}

function LocationsSection({ locations, onAdd, onUpdate, onDelete }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  async function run(action) {
    try { await action(); } catch (err) { alert("No se pudo guardar el lugar: " + err.message); }
  }

  function handleDelete(loc) {
    if (!window.confirm(`¿Borrar "${loc.name}"? Los turnos ya reservados conservan la dirección, pero los cupos libres de ese lugar dejan de mostrarse en reservas.`)) return;
    run(() => onDelete(loc.id));
  }

  return (
    <>
      <h2 style={{ ...styles.sectionTitle, marginTop: 4 }}>Lugares de atención</h2>
      <p style={styles.helperText}>
        Si atendés en más de un lugar, cargalos acá: tus clientes eligen el lugar al reservar y cada cupo se abre en un lugar.
        Con uno solo (o ninguno) todo funciona como siempre.
      </p>
      <div style={{ ...styles.serviceList, marginBottom: 12 }}>
        {locations.map(loc => (
          <div key={loc.id}>
            <div style={styles.serviceRow}>
              <MapPin size={15} color="#B5654A" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={styles.serviceRowName}>{loc.name}</div>
                <div style={styles.serviceRowMeta}>{[loc.address, loc.addressDetail].filter(Boolean).join(" · ")}</div>
              </div>
              <button type="button" style={styles.iconBtnGhost} onClick={() => setEditingId(editingId === loc.id ? null : loc.id)}><Pencil size={15} /></button>
              <button type="button" style={styles.iconBtnGhost} onClick={() => handleDelete(loc)}><Trash2 size={15} /></button>
            </div>
            {editingId === loc.id && (
              <LocationForm
                initial={loc}
                onCancel={() => setEditingId(null)}
                onSubmit={(data) => run(async () => { await onUpdate(loc.id, data); setEditingId(null); })}
              />
            )}
          </div>
        ))}
      </div>
      {adding ? (
        <LocationForm onCancel={() => setAdding(false)} onSubmit={(data) => run(async () => { await onAdd(data); setAdding(false); })} />
      ) : (
        <button type="button" style={{ ...styles.addServiceBtn, marginBottom: 24 }} onClick={() => setAdding(true)}>
          <Plus size={16} /> Agregar lugar
        </button>
      )}
    </>
  );
}

function csvEscape(value) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(filename, rows) {
  const csvContent = rows.map(row => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getWeekRange(d) {
  const day = d.getDay(); // 0=dom
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d); mon.setDate(d.getDate() + diffToMon);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { from: dateKey(mon), to: dateKey(sun) };
}

function getMonthRange(d) {
  const from = new Date(d.getFullYear(), d.getMonth(), 1);
  const to = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { from: dateKey(from), to: dateKey(to) };
}

const PERIODS = [
  { id: "day", label: "Hoy" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mes" },
  { id: "custom", label: "Rango" },
];

function IncomesPanel({ appointments, services }) {
  const today = dateKey(new Date());
  const [period, setPeriod] = useState("day");
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);

  function getRange() {
    const now = new Date();
    if (period === "day") return { from: today, to: today };
    if (period === "week") return getWeekRange(now);
    if (period === "month") return getMonthRange(now);
    return { from: customFrom, to: customTo };
  }

  const { from, to } = getRange();

  const rangeAppointments = appointments.filter(a => a.dateKey >= from && a.dateKey <= to);
  const completed = rangeAppointments.filter(a => a.status === "completado");
  const total = completed.reduce((sum, a) => {
    const svc = services.find(s => s.id === a.serviceId);
    return sum + getAppointmentPrice(a, svc);
  }, 0);

  // Agrupar por día para el desglose (solo días con completados)
  const byDay = completed.reduce((acc, a) => {
    if (!acc[a.dateKey]) acc[a.dateKey] = { count: 0, total: 0 };
    const svc = services.find(s => s.id === a.serviceId);
    acc[a.dateKey].count += 1;
    acc[a.dateKey].total += getAppointmentPrice(a, svc);
    return acc;
  }, {});
  const dayEntries = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b));

  const btnBase = {
    flex: 1, padding: "7px 4px", borderRadius: 8, border: "1px solid #E3DBCB",
    fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
  };
  const btnActive = { ...btnBase, background: "#2A2622", color: "#EFE9DF", borderColor: "#2A2622" };
  const btnInactive = { ...btnBase, background: "#fff", color: "#5A5248" };

  return (
    <div style={{ background: "#F5F0E8", borderRadius: 12, padding: "16px 14px", marginBottom: 24 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {PERIODS.map(p => (
          <button key={p.id} type="button" style={period === p.id ? btnActive : btnInactive} onClick={() => setPeriod(p.id)}>
            {p.label}
          </button>
        ))}
      </div>

      {period === "custom" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ ...styles.input, flex: 1, marginBottom: 0 }} />
          <span style={{ fontSize: 12, color: "#8A8275", flexShrink: 0 }}>al</span>
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ ...styles.input, flex: 1, marginBottom: 0 }} />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, color: "#8A8275" }}>Turnos completados</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#6E7F5C" }}>{completed.length}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E3DBCB", paddingTop: 10, marginTop: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#2A2622" }}>Total ingresado</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#B5654A" }}>{formatPrice(total)}</span>
        </div>
      </div>

      {period !== "day" && dayEntries.length > 0 && (
        <div style={{ marginTop: 12, borderTop: "1px solid #E3DBCB", paddingTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
          {dayEntries.map(([dk, { count, total: t }]) => {
            const d = new Date(dk + "T00:00:00");
            const label = d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
            return (
              <div key={dk} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#5A5248" }}>
                <span style={{ textTransform: "capitalize" }}>{label} · {count} turno{count !== 1 ? "s" : ""}</span>
                <span style={{ fontWeight: 600 }}>{formatPrice(t)}</span>
              </div>
            );
          })}
        </div>
      )}

      {period === "day" && completed.length > 0 && (
        <div style={{ marginTop: 12, borderTop: "1px solid #E3DBCB", paddingTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
          {completed.map(a => {
            const svc = services.find(s => s.id === a.serviceId);
            return (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#5A5248" }}>
                <span>{a.start} — {a.clientName}</span>
                <span>{formatPrice(getAppointmentPrice(a, svc))}</span>
              </div>
            );
          })}
        </div>
      )}

      {completed.length === 0 && (
        <p style={{ fontSize: 12, color: "#8A8275", marginTop: 10, textAlign: "center" }}>Sin turnos completados en este período.</p>
      )}
    </div>
  );
}

export default function NegocioView({ businessInfo, onSave, appointments = [], clients = [], services = [], locations = [], onAddLocation, onUpdateLocation, onDeleteLocation }) {
  const [name, setName] = useState(businessInfo?.name || "");
  const [address, setAddress] = useState(businessInfo?.address || "");
  const [addressDetail, setAddressDetail] = useState(businessInfo?.addressDetail || "");
  const [hoursLabel, setHoursLabel] = useState(businessInfo?.hoursLabel || "");
  const [whatsapp, setWhatsapp] = useState(businessInfo?.whatsapp || "");
  const [referralAmount, setReferralAmount] = useState(String(getReferralAmount(businessInfo)));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(businessInfo?.name || "");
    setAddress(businessInfo?.address || "");
    setAddressDetail(businessInfo?.addressDetail || "");
    setHoursLabel(businessInfo?.hoursLabel || "");
    setWhatsapp(businessInfo?.whatsapp || "");
    setReferralAmount(String(getReferralAmount(businessInfo)));
  }, [businessInfo]);

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ name, address, addressDetail, hoursLabel, whatsapp, referralAmount: Math.max(0, Number(referralAmount) || 0) });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function exportAppointmentsCsv() {
    const sorted = [...appointments].sort((a, b) => (a.dateKey + a.start).localeCompare(b.dateKey + b.start));
    const rows = [
      ["Fecha", "Hora inicio", "Hora fin", "Cliente", "Teléfono", "Servicio", "Precio", "Descuento", "Total cobrado", "Estado", "Notas", "Origen"],
      ...sorted.map(a => {
        const svc = services.find(s => s.id === a.serviceId);
        return [
          a.dateKey,
          a.start,
          a.end,
          a.clientName,
          a.clientPhone || "",
          svc?.name || "",
          svc?.price || 0,
          a.discount || 0,
          getAppointmentPrice(a, svc),
          STATUS[a.status]?.label || a.status,
          a.notes || "",
          a.source || "",
        ];
      }),
    ];
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(`turnos_${today}.csv`, rows);
  }

  function exportClientsCsv() {
    const rows = [
      ["Nombre", "Teléfono", "Notas"],
      ...clients.map(c => [c.name, c.phone || "", c.notes || ""]),
    ];
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(`clientes_${today}.csv`, rows);
  }

  return (
    <div style={styles.viewWrap}>
      <h2 style={styles.sectionTitle}>Mi negocio</h2>

      <ShareLinkCard label="Link de reservas para tus clientes" url={reservasUrl()} shareTitle="Reservá tu sesión" />
      {getReferralAmount(businessInfo) > 0 && (
        <ShareLinkCard
          label={`Link de referidos: ${formatPrice(getReferralAmount(businessInfo))} de descuento en la primera sesión`}
          url={reservasUrl({ ref: "amigo" })}
          shareTitle="Te recomiendo este lugar de masajes"
        />
      )}

      <h2 style={{ ...styles.sectionTitle, marginTop: 4 }}>Ingresos</h2>
      <IncomesPanel appointments={appointments} services={services} />

      <LocationsSection locations={locations} onAdd={onAddLocation} onUpdate={onUpdateLocation} onDelete={onDeleteLocation} />

      <p style={styles.helperText}>Esta info aparece en la app de reservas para tus clientes.</p>

      <form onSubmit={handleSubmit}>
        <label style={styles.fieldLabel}>Nombre</label>
        <input style={styles.input} value={name} onChange={e => setName(e.target.value)} />

        <label style={styles.fieldLabel}>Dirección{locations.length > 0 ? " (si no cargaste lugares)" : ""}</label>
        <input style={styles.input} value={address} onChange={e => setAddress(e.target.value)} placeholder="Calle y número, localidad" />

        <label style={styles.fieldLabel}>Referencia de dirección</label>
        <input style={styles.input} value={addressDetail} onChange={e => setAddressDetail(e.target.value)} placeholder="Entre calles, piso, etc." />

        <label style={styles.fieldLabel}>Horario de atención (texto)</label>
        <input style={styles.input} value={hoursLabel} onChange={e => setHoursLabel(e.target.value)} placeholder="Ej: Lunes a viernes de 10 a 20 hs" />

        <label style={styles.fieldLabel}>Tu WhatsApp (para que te escriban tus clientes)</label>
        <input style={styles.input} value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="Ej: 1112345678 (sin 0 ni 15)" />
        <p style={styles.helperText}>Se va a mostrar como botón de contacto en la app de reservas.</p>

        <label style={styles.fieldLabel}>Descuento por referidos ($)</label>
        <input style={styles.input} type="number" min="0" step="500" value={referralAmount} onChange={e => setReferralAmount(e.target.value)} />
        <p style={styles.helperText}>Lo que descuenta la primera sesión de quien llega recomendado, y el crédito que recibe quien recomendó. Poné 0 si no querés usar referidos.</p>

        <div style={styles.modalActions}>
          <div style={{ flex: 1 }} />
          {saved && <span style={{ color: "#6E7F5C", fontSize: 13, fontWeight: 600 }}>Guardado ✓</span>}
          <button type="submit" style={styles.saveBtn}><Check size={16} /> Guardar</button>
        </div>
      </form>

      <h2 style={{ ...styles.sectionTitle, marginTop: 32 }}>Exportar datos</h2>
      <p style={styles.helperText}>
        Descargá tus datos en formato CSV (se abre en Excel, Google Sheets o Numbers).
        Útil como respaldo o para llevar a una planilla de impuestos.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
        <button type="button" style={{ ...styles.exportBtn, opacity: appointments.length === 0 ? 0.5 : 1 }} onClick={exportAppointmentsCsv} disabled={appointments.length === 0}>
          <Download size={16} /> Exportar turnos ({appointments.length})
        </button>
        <button type="button" style={{ ...styles.exportBtn, opacity: clients.length === 0 ? 0.5 : 1 }} onClick={exportClientsCsv} disabled={clients.length === 0}>
          <Download size={16} /> Exportar clientes ({clients.length})
        </button>
      </div>
    </div>
  );
}
