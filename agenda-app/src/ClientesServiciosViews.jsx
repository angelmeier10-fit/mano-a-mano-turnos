import React, { useState } from "react";
import { ChevronLeft, Trash2, User, FileText, Star, MessageCircle, Plus, Check } from "lucide-react";
import { formatPrice, STATUS, formatPhoneForWhatsapp } from "../../shared/helpers";
import styles from "../../shared/styles";

export function ClientesView({ clients, onUpdateClient, onDeleteClient, appointments, services }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  function clientHistory(client) {
    return appointments
      .filter(a =>
        (a.clientId && a.clientId === client.id) ||
        (!a.clientId && a.clientName.trim().toLowerCase() === client.name.trim().toLowerCase())
      )
      .sort((a,b) => (b.dateKey+b.start).localeCompare(a.dateKey+a.start));
  }
  function clientStats(client) {
    const hist = clientHistory(client);
    const completed = hist.filter(a => a.status === "completado");
    const totalSpent = completed.reduce((sum, a) => {
      const svc = services.find(s => s.id === a.serviceId);
      return sum + (svc?.price || 0);
    }, 0);
    const ausencias = hist.filter(a => a.status === "ausente").length;
    return { sessions: hist.length, completed: completed.length, totalSpent, ausencias, isNew: hist.length <= 1 };
  }

  const filtered = clients
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => a.name.localeCompare(b.name));

  function updateNotes(id, notes) {
    onUpdateClient(id, { notes });
  }
  function deleteClient(id) {
    onDeleteClient(id);
    setSelected(null);
  }

  if (selected) {
    const history = clientHistory(selected);
    const stats = clientStats(selected);
    const waLink = formatPhoneForWhatsapp(selected.phone) ? `https://wa.me/${formatPhoneForWhatsapp(selected.phone)}` : null;
    return (
      <div style={styles.viewWrap}>
        <button style={styles.backBtn} onClick={() => setSelected(null)}>
          <ChevronLeft size={16} /> Clientes
        </button>
        <div style={styles.clientDetailHeader}>
          <div style={styles.clientAvatar}><User size={20} color="#EFE9DF" /></div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={styles.clientDetailName}>{selected.name}</h2>
              {stats.isNew && <span style={styles.newBadge}><Star size={10} /> Nuevo</span>}
            </div>
            {selected.phone && <p style={styles.clientDetailPhone}>{selected.phone}</p>}
          </div>
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer" style={styles.waIconBtn}>
              <MessageCircle size={17} />
            </a>
          )}
        </div>

        <div style={styles.clientStatsGrid}>
          <div style={styles.clientStatBox}>
            <div style={styles.clientStatValue}>{stats.completed}</div>
            <div style={styles.clientStatLabel}>Sesiones</div>
          </div>
          <div style={styles.clientStatBox}>
            <div style={styles.clientStatValue}>{formatPrice(stats.totalSpent)}</div>
            <div style={styles.clientStatLabel}>Total gastado</div>
          </div>
          <div style={styles.clientStatBox}>
            <div style={{ ...styles.clientStatValue, color: stats.ausencias > 0 ? "#A6483A" : "#2A2622" }}>{stats.ausencias}</div>
            <div style={styles.clientStatLabel}>Inasistencias</div>
          </div>
        </div>

        <label style={styles.fieldLabel}>Notas clínicas</label>
        <textarea
          style={{ ...styles.input, minHeight: 90, resize: "vertical" }}
          value={selected.notes || ""}
          onChange={e => { updateNotes(selected.id, e.target.value); setSelected({ ...selected, notes: e.target.value }); }}
          placeholder="Contracturas recurrentes, lesiones, preferencias de presión…"
        />

        <label style={styles.fieldLabel}>Historial de sesiones ({history.length})</label>
        {history.length === 0 ? (
          <p style={styles.emptyMsg}>Sin sesiones registradas todavía.</p>
        ) : (
          <div style={styles.historyList}>
            {history.map(h => {
              const svc = services.find(s => s.id === h.serviceId);
              return (
                <div key={h.id} style={styles.historyItem}>
                  <div style={{ width: 4, borderRadius: 2, background: svc?.color || "#B5654A", alignSelf: "stretch" }} />
                  <div style={{ flex: 1 }}>
                    <div style={styles.historyDate}>
                      {new Date(h.dateKey + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                      {" · "}{h.start}–{h.end}
                    </div>
                    <div style={styles.historyService}>{svc?.name}{svc?.price ? ` · ${formatPrice(svc.price)}` : ""}</div>
                    {h.notes && <div style={styles.historyNotes}>{h.notes}</div>}
                  </div>
                  <span style={{ ...styles.historyStatusTag, color: STATUS[h.status]?.color }}>{STATUS[h.status]?.label}</span>
                </div>
              );
            })}
          </div>
        )}

        <button style={{ ...styles.deleteBtn, marginTop: 20 }} onClick={() => deleteClient(selected.id)}>
          <Trash2 size={16} /> Eliminar cliente
        </button>
      </div>
    );
  }

  return (
    <div style={styles.viewWrap}>
      <h2 style={styles.sectionTitle}>Clientes ({clients.length})</h2>
      <input
        style={styles.input}
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar cliente…"
      />
      {filtered.length === 0 ? (
        <p style={styles.emptyMsg}>{clients.length === 0 ? "Todavía no tenés clientes cargados. Aparecerán acá al crear turnos." : "Sin resultados."}</p>
      ) : (
        <div style={styles.clientList}>
          {filtered.map(c => {
            const stats = clientStats(c);
            return (
              <button key={c.id} style={styles.clientRow} onClick={() => setSelected(c)}>
                <div style={styles.clientAvatarSm}><User size={16} color="#EFE9DF" /></div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={styles.clientRowName}>{c.name}</span>
                    {stats.isNew && <span style={styles.newBadgeSm}>Nuevo</span>}
                  </div>
                  <div style={styles.clientRowMeta}>{stats.sessions} sesión{stats.sessions !== 1 ? "es" : ""}{c.phone ? ` · ${c.phone}` : ""}</div>
                </div>
                <FileText size={14} color="#8A8275" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ====================================================================
// SERVICIOS VIEW
// ====================================================================
export function ServiciosView({ services, onAddService, onDeleteService }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(60);
  const [price, setPrice] = useState(20000);
  const [color, setColor] = useState("#B5654A");

  const palette = ["#B5654A", "#6E7F5C", "#8B4226", "#4A5A6B", "#7A5C3E", "#5C4A6B"];

  function addService(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onAddService({ name: name.trim(), duration: Number(duration), color, price: Number(price) || 0 });
    setName(""); setDuration(60); setPrice(20000); setColor("#B5654A");
    setShowForm(false);
  }
  function removeService(id) {
    onDeleteService(id);
  }

  return (
    <div style={styles.viewWrap}>
      <h2 style={styles.sectionTitle}>Servicios</h2>
      <div style={styles.serviceList}>
        {services.map(s => (
          <div key={s.id} style={styles.serviceRow}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color }} />
            <div style={{ flex: 1 }}>
              <div style={styles.serviceRowName}>{s.name}</div>
              <div style={styles.serviceRowMeta}>{s.duration} minutos{s.price ? ` · ${formatPrice(s.price)}` : ""}</div>
            </div>
            <button style={styles.iconBtnGhost} onClick={() => removeService(s.id)}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      {!showForm ? (
        <button style={styles.addServiceBtn} onClick={() => setShowForm(true)}>
          <Plus size={16} /> Agregar servicio
        </button>
      ) : (
        <form style={styles.newServiceForm} onSubmit={addService}>
          <label style={styles.fieldLabel}>Nombre</label>
          <input style={styles.input} value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Drenaje linfático" autoFocus />
          <div style={styles.fieldRow}>
            <div style={{ flex: 1 }}>
              <label style={styles.fieldLabel}>Duración (min)</label>
              <input type="number" style={styles.input} value={duration} onChange={e => setDuration(e.target.value)} min={10} step={5} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.fieldLabel}>Precio ($)</label>
              <input type="number" style={styles.input} value={price} onChange={e => setPrice(e.target.value)} min={0} step={500} />
            </div>
          </div>
          <label style={styles.fieldLabel}>Color</label>
          <div style={styles.colorRow}>
            {palette.map(c => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                style={{ ...styles.colorDot, background: c, ...(color === c ? styles.colorDotActive : {}) }}
              />
            ))}
          </div>
          <div style={styles.modalActions}>
            <button type="button" style={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancelar</button>
            <button type="submit" style={styles.saveBtn}><Check size={16} /> Guardar</button>
          </div>
        </form>
      )}
    </div>
  );
}
