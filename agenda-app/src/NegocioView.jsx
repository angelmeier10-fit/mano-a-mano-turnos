import React, { useState, useEffect } from "react";
import { Check, Download } from "lucide-react";
import styles from "../../shared/styles";
import { STATUS, formatPrice } from "../../shared/helpers";

function csvEscape(value) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(filename, rows) {
  const csvContent = rows.map(row => row.map(csvEscape).join(",")).join("\n");
  // BOM al inicio para que Excel reconozca tildes y ñ correctamente
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function NegocioView({ businessInfo, onSave, appointments = [], clients = [], services = [] }) {
  const [name, setName] = useState(businessInfo?.name || "");
  const [address, setAddress] = useState(businessInfo?.address || "");
  const [addressDetail, setAddressDetail] = useState(businessInfo?.addressDetail || "");
  const [hoursLabel, setHoursLabel] = useState(businessInfo?.hoursLabel || "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(businessInfo?.name || "");
    setAddress(businessInfo?.address || "");
    setAddressDetail(businessInfo?.addressDetail || "");
    setHoursLabel(businessInfo?.hoursLabel || "");
  }, [businessInfo]);

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ name, address, addressDetail, hoursLabel });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function exportAppointmentsCsv() {
    const sorted = [...appointments].sort((a, b) => (a.dateKey + a.start).localeCompare(b.dateKey + b.start));
    const rows = [
      ["Fecha", "Hora inicio", "Hora fin", "Cliente", "Teléfono", "Servicio", "Precio", "Estado", "Notas"],
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
