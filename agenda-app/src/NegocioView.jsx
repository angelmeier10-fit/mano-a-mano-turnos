import React, { useState, useEffect } from "react";
import { Check, Download, Copy, Share2 } from "lucide-react";
import styles from "../../shared/styles";
import { STATUS, formatPrice, getAppointmentPrice, dateKey } from "../../shared/helpers";

const RESERVAS_URL = "https://angelmeier10-fit.github.io/mano-a-mano-turnos/mano-a-mano-reservas/";

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

export default function NegocioView({ businessInfo, onSave, appointments = [], clients = [], services = [] }) {
  const [name, setName] = useState(businessInfo?.name || "");
  const [address, setAddress] = useState(businessInfo?.address || "");
  const [addressDetail, setAddressDetail] = useState(businessInfo?.addressDetail || "");
  const [hoursLabel, setHoursLabel] = useState(businessInfo?.hoursLabel || "");
  const [whatsapp, setWhatsapp] = useState(businessInfo?.whatsapp || "");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setName(businessInfo?.name || "");
    setAddress(businessInfo?.address || "");
    setAddressDetail(businessInfo?.addressDetail || "");
    setHoursLabel(businessInfo?.hoursLabel || "");
    setWhatsapp(businessInfo?.whatsapp || "");
  }, [businessInfo]);

  function copyLink() {
    navigator.clipboard.writeText(RESERVAS_URL).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareLink() {
    try { await navigator.share({ url: RESERVAS_URL, title: "Reservá tu sesión" }); } catch {}
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ name, address, addressDetail, hoursLabel, whatsapp });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function exportAppointmentsCsv() {
    const sorted = [...appointments].sort((a, b) => (a.dateKey + a.start).localeCompare(b.dateKey + b.start));
    const rows = [
      ["Fecha", "Hora inicio", "Hora fin", "Cliente", "Teléfono", "Servicio", "Precio", "Descuento", "Total cobrado", "Estado", "Notas"],
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

      <div style={{ background: "#F5F0E8", borderRadius: 12, padding: "12px 14px", marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: "#8A8275", margin: "0 0 4px 0" }}>Link de reservas para tus clientes</p>
        <p style={{ fontSize: 13, color: "#2A2622", wordBreak: "break-all", margin: "0 0 10px 0", fontWeight: 500 }}>{RESERVAS_URL}</p>
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

      <h2 style={{ ...styles.sectionTitle, marginTop: 4 }}>Ingresos</h2>
      <IncomesPanel appointments={appointments} services={services} />

      <p style={styles.helperText}>Esta info aparece en la app de reservas para tus clientes.</p>

      <form onSubmit={handleSubmit}>
        <label style={styles.fieldLabel}>Nombre</label>
        <input style={styles.input} value={name} onChange={e => setName(e.target.value)} />

        <label style={styles.fieldLabel}>Dirección</label>
        <input style={styles.input} value={address} onChange={e => setAddress(e.target.value)} placeholder="Calle y número, localidad" />

        <label style={styles.fieldLabel}>Referencia de dirección</label>
        <input style={styles.input} value={addressDetail} onChange={e => setAddressDetail(e.target.value)} placeholder="Entre calles, piso, etc." />

        <label style={styles.fieldLabel}>Horario de atención (texto)</label>
        <input style={styles.input} value={hoursLabel} onChange={e => setHoursLabel(e.target.value)} placeholder="Ej: Lunes a viernes de 10 a 20 hs" />

        <label style={styles.fieldLabel}>Tu WhatsApp (para que te escriban tus clientes)</label>
        <input style={styles.input} value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="Ej: 1112345678 (sin 0 ni 15)" />
        <p style={styles.helperText}>Se va a mostrar como botón de contacto en la app de reservas.</p>

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
