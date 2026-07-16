import React, { useState, useEffect } from "react";
import { ChevronLeft, Trash2, User, FileText, Star, MessageCircle, Plus, Check, Pencil, UserPlus, ChevronDown, ChevronUp } from "lucide-react";
import { formatPrice, getAppointmentPrice, STATUS, formatPhoneForWhatsapp, formatDateLong } from "../../shared/helpers";
import { getAppointmentHistory, subscribeClientSessions, addClientSession, updateClientSession, deleteClientSession } from "../../shared/firestoreApi";
import styles from "../../shared/styles";

const SESION_FIELDS = [
  { key: "zones",        label: "Zonas trabajadas"          },
  { key: "techniques",   label: "Técnicas aplicadas"        },
  { key: "observations", label: "Observaciones / evolución" },
  { key: "nextGoals",    label: "Próximos objetivos"        },
];

const EMPTY_SESION = { date: "", appointmentId: null, zones: "", techniques: "", observations: "", nextGoals: "" };

function SessionesSection({ client, history }) {
  const [sessions, setSessions] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY_SESION);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const unsub = subscribeClientSessions(client.id, setSessions);
    return unsub;
  }, [client.id]);

  function openNew(prefill = {}) {
    setDraft({ ...EMPTY_SESION, ...prefill });
    setEditingId(null);
    setFormOpen(true);
  }
  function openEdit(s) {
    setDraft({ date: s.date, appointmentId: s.appointmentId, zones: s.zones, techniques: s.techniques, observations: s.observations, nextGoals: s.nextGoals });
    setEditingId(s.id);
    setFormOpen(true);
  }
  async function save() {
    if (!draft.date) return;
    if (editingId) {
      await updateClientSession(client.id, editingId, draft);
    } else {
      await addClientSession(client.id, draft);
    }
    setFormOpen(false);
    setEditingId(null);
    setDraft(EMPTY_SESION);
  }
  async function remove(sessionId) {
    await deleteClientSession(client.id, sessionId);
    if (expanded === sessionId) setExpanded(null);
  }

  const sessionsByAppt = new Set(sessions.filter(s => s.appointmentId).map(s => s.appointmentId));
  const completedWithoutNotes = history.filter(h => h.status === "completado" && !sessionsByAppt.has(h.id));

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#2A2622" }}>
          Seguimiento de sesiones{sessions.length > 0 ? ` (${sessions.length})` : ""}
        </span>
        <button style={styles.saveBtn} onClick={() => openNew()}>
          <Plus size={14} /> Nueva sesión
        </button>
      </div>

      {formOpen && (
        <div style={{ background: "#E8E2D8", borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <div style={{ marginBottom: 10 }}>
            <label style={styles.fieldLabel}>Fecha</label>
            <input
              type="date"
              style={styles.input}
              value={draft.date}
              onChange={e => setDraft(d => ({ ...d, date: e.target.value }))}
            />
          </div>
          {SESION_FIELDS.map(f => (
            <div key={f.key} style={{ marginBottom: 10 }}>
              <label style={styles.fieldLabel}>{f.label}</label>
              <textarea
                style={{ ...styles.input, minHeight: 55, resize: "vertical" }}
                value={draft[f.key]}
                onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button style={styles.cancelBtn} onClick={() => { setFormOpen(false); setEditingId(null); setDraft(EMPTY_SESION); }}>Cancelar</button>
            <button style={styles.saveBtn} onClick={save} disabled={!draft.date}><Check size={15} /> Guardar</button>
          </div>
        </div>
      )}

      {sessions.length === 0 && !formOpen && (
        <p style={styles.emptyMsg}>Sin registros de sesiones todavía.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sessions.map(s => {
          const isOpen = expanded === s.id;
          const linkedAppt = history.find(h => h.id === s.appointmentId);
          return (
            <div key={s.id} style={{ background: "#E8E2D8", borderRadius: 10, overflow: "hidden" }}>
              <button
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none",
                  border: "none", cursor: "pointer", padding: "10px 14px", textAlign: "left" }}
                onClick={() => setExpanded(isOpen ? null : s.id)}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#2A2622" }}>
                    {s.date
                      ? new Date(s.date + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
                      : "Sin fecha"}
                  </div>
                  {s.zones && <div style={{ fontSize: 12, color: "#6A6055", marginTop: 2 }}>{s.zones}</div>}
                </div>
                {s.appointmentId && (
                  <span style={{ fontSize: 11, background: "#6E7F5C", color: "#EFE9DF", borderRadius: 6, padding: "2px 7px" }}>Turno</span>
                )}
                {isOpen ? <ChevronUp size={14} color="#8A7E70" /> : <ChevronDown size={14} color="#8A7E70" />}
              </button>

              {isOpen && (
                <div style={{ padding: "0 14px 14px" }}>
                  {linkedAppt && (
                    <div style={{ fontSize: 12, color: "#6E7F5C", marginBottom: 8 }}>
                      Turno: {linkedAppt.dateKey} · {linkedAppt.start} hs
                    </div>
                  )}
                  {SESION_FIELDS.filter(f => s[f.key]?.trim()).map(f => (
                    <div key={f.key} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: "#8A7E70", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{f.label}</div>
                      <div style={{ fontSize: 13, color: "#2A2622", marginTop: 2 }}>{s[f.key]}</div>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button style={styles.cancelBtn} onClick={() => openEdit(s)}><Pencil size={13} /> Editar</button>
                    <button style={{ ...styles.deleteBtn, padding: "6px 12px", fontSize: 12 }} onClick={() => remove(s.id)}><Trash2 size={13} /> Eliminar</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {completedWithoutNotes.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: "#8A7E70", marginBottom: 6 }}>Agregar notas a turnos completados:</div>
          {completedWithoutNotes.map(h => (
            <button
              key={h.id}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none",
                border: "1px solid #C8C0B4", borderRadius: 8, padding: "6px 12px",
                cursor: "pointer", fontSize: 12, color: "#2A2622", marginBottom: 6 }}
              onClick={() => openNew({ date: h.dateKey, appointmentId: h.id })}
            >
              <Plus size={12} />
              {new Date(h.dateKey + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })} · {h.start} hs
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const ANAMNESIS_FIELDS = [
  { key: "birthDate",          label: "Fecha de nacimiento",     type: "input"    },
  { key: "occupation",         label: "Ocupación",               type: "input"    },
  { key: "consultationReason", label: "Motivo de consulta",      type: "textarea" },
  { key: "medicalHistory",     label: "Antecedentes médicos",    type: "textarea" },
  { key: "currentMedication",  label: "Medicación actual",       type: "textarea" },
  { key: "painZones",          label: "Zonas de dolor o tensión",type: "textarea" },
  { key: "contraindications",  label: "Contraindicaciones",      type: "textarea" },
  { key: "generalNotes",       label: "Observaciones generales", type: "textarea" },
];

function AnamnesisSection({ client, onUpdateClient }) {
  const hasData = client.anamnesis && Object.values(client.anamnesis).some(v => v?.trim());
  const [open, setOpen] = useState(hasData);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(client.anamnesis || {});

  function save() {
    onUpdateClient(client.id, { anamnesis: draft, anamnesisUpdatedAt: Date.now() });
    setEditing(false);
  }
  function cancel() {
    setDraft(client.anamnesis || {});
    setEditing(false);
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <button
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
          cursor: "pointer", padding: "8px 0", color: "#2A2622", fontSize: 13, fontWeight: 600, width: "100%" }}
        onClick={() => { if (!editing) setOpen(v => !v); }}
      >
        <span style={{ flex: 1, textAlign: "left" }}>Anamnesis</span>
        {!editing && (open ? <ChevronUp size={15} /> : <ChevronDown size={15} />)}
      </button>

      {open && (
        <div style={{ background: "#E8E2D8", borderRadius: 10, padding: 14 }}>
          {editing ? (
            <>
              {ANAMNESIS_FIELDS.map(f => (
                <div key={f.key} style={{ marginBottom: 10 }}>
                  <label style={styles.fieldLabel}>{f.label}</label>
                  {f.type === "textarea" ? (
                    <textarea
                      style={{ ...styles.input, minHeight: 60, resize: "vertical" }}
                      value={draft[f.key] || ""}
                      onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                    />
                  ) : (
                    <input
                      style={styles.input}
                      value={draft[f.key] || ""}
                      onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button style={styles.cancelBtn} onClick={cancel}>Cancelar</button>
                <button style={styles.saveBtn} onClick={save}><Check size={15} /> Guardar</button>
              </div>
            </>
          ) : (
            <>
              {!hasData ? (
                <p style={{ ...styles.emptyMsg, marginBottom: 10 }}>Sin datos cargados todavía.</p>
              ) : (
                ANAMNESIS_FIELDS.filter(f => client.anamnesis?.[f.key]?.trim()).map(f => (
                  <div key={f.key} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: "#8A7E70", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{f.label}</div>
                    <div style={{ fontSize: 13, color: "#2A2622", marginTop: 2 }}>{client.anamnesis[f.key]}</div>
                  </div>
                ))
              )}
              <button
                style={{ ...styles.saveBtn, marginTop: 4 }}
                onClick={() => { setDraft(client.anamnesis || {}); setEditing(true); }}
              >
                <Pencil size={14} /> {hasData ? "Editar" : "Completar anamnesis"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function ClientesView({ clients, onUpdateClient, onDeleteClient, onAddClient, appointments, services, onOpenAppt }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [movements, setMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const canImportContact = typeof navigator !== "undefined" && !!navigator.contacts?.select;
  const [editingClient, setEditingClient] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDiscounts, setEditDiscounts] = useState({});

  useEffect(() => {
    if (!selected) { setMovements([]); return; }
    setMovementsLoading(true);
    getAppointmentHistory(selected.id)
      .then(setMovements)
      .catch(() => setMovements([]))
      .finally(() => setMovementsLoading(false));
  }, [selected?.id]);

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
      return sum + getAppointmentPrice(a, svc);
    }, 0);
    const ausencias = hist.filter(a => a.status === "ausente").length;
    return { sessions: hist.length, completed: completed.length, totalSpent, ausencias, isNew: hist.length <= 1 };
  }

  const searchDigits = search.replace(/[^\d]/g, "");
  const filtered = clients
    .filter(c => {
      const nameMatch = c.name.toLowerCase().includes(search.toLowerCase());
      const phoneMatch = searchDigits.length >= 3 &&
        (c.phone || "").replace(/[^\d]/g, "").includes(searchDigits);
      return nameMatch || phoneMatch;
    })
    .sort((a,b) => a.name.localeCompare(b.name));

  function updateNotes(id, notes) {
    onUpdateClient(id, { notes });
  }
  function deleteClient(id) {
    onDeleteClient(id);
    setSelected(null);
  }

  async function importContact() {
    try {
      const [contact] = await navigator.contacts.select(["name", "tel"], { multiple: false });
      if (!contact) return;
      if (contact.name?.[0]) setNewName(contact.name[0]);
      if (contact.tel?.[0]) setNewPhone(contact.tel[0]);
    } catch {
      // el usuario canceló el picker o no hay permiso; no hacemos nada
    }
  }

  async function addClient(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    await onAddClient(newName.trim(), newPhone.trim());
    setNewName(""); setNewPhone(""); setShowAddForm(false);
  }

  function startEditClient(client) {
    setEditName(client.name || "");
    setEditPhone(client.phone || "");
    setEditDiscounts(client.discounts || {});
    setEditingClient(true);
  }

  function setServiceDiscountType(serviceId, discountType) {
    setEditDiscounts(prev => {
      if (!discountType) {
        const { [serviceId]: _omit, ...rest } = prev;
        return rest;
      }
      return { ...prev, [serviceId]: { discountType, discountValue: prev[serviceId]?.discountValue || 0 } };
    });
  }

  function setServiceDiscountValue(serviceId, discountValue) {
    setEditDiscounts(prev => ({
      ...prev,
      [serviceId]: { ...prev[serviceId], discountValue: Number(discountValue) || 0 },
    }));
  }

  function saveEditClient(e) {
    e.preventDefault();
    if (!editName.trim()) return;
    const updates = {
      name: editName.trim(),
      phone: editPhone.trim(),
      discounts: editDiscounts,
    };
    onUpdateClient(selected.id, updates);
    setSelected(s => ({ ...s, ...updates }));
    setEditingClient(false);
  }

  function downloadVCard(client) {
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${client.name}`,
      `N:${client.name};;;;`,
    ];
    if (client.phone) lines.push(`TEL;TYPE=CELL:${client.phone}`);
    if (client.email) lines.push(`EMAIL:${client.email}`);
    lines.push("END:VCARD");
    const blob = new Blob([lines.join("\r\n")], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${client.name.replace(/\s+/g, "_")}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
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
        {editingClient ? (
          <form style={styles.newServiceForm} onSubmit={saveEditClient}>
            <label style={styles.fieldLabel}>Nombre</label>
            <input style={styles.input} value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
            <label style={styles.fieldLabel}>Teléfono</label>
            <input style={styles.input} value={editPhone} onChange={e => setEditPhone(e.target.value)} />
            <label style={styles.fieldLabel}>Descuento VIP por servicio</label>
            {services.map(service => {
              const d = editDiscounts[service.id];
              return (
                <div key={service.id} style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#2A2622" }}>{service.name}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select
                      style={{ ...styles.input, flex: 1 }}
                      value={d?.discountType || ""}
                      onChange={e => setServiceDiscountType(service.id, e.target.value)}
                    >
                      <option value="">Sin descuento</option>
                      <option value="percent">Porcentaje (%)</option>
                      <option value="fixed">Monto fijo ($)</option>
                    </select>
                    {d?.discountType && (
                      <input
                        style={{ ...styles.input, flex: 1 }}
                        type="number"
                        min="0"
                        value={d.discountValue || ""}
                        onChange={e => setServiceDiscountValue(service.id, e.target.value)}
                        placeholder={d.discountType === "percent" ? "Ej: 10" : "Ej: 5000"}
                      />
                    )}
                  </div>
                </div>
              );
            })}
            <div style={styles.modalActions}>
              <button type="button" style={styles.cancelBtn} onClick={() => setEditingClient(false)}>Cancelar</button>
              <button type="submit" style={styles.saveBtn}><Check size={16} /> Guardar</button>
            </div>
          </form>
        ) : (
          <div style={styles.clientDetailHeader}>
            <div style={styles.clientAvatar}><User size={20} color="#EFE9DF" /></div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={styles.clientDetailName}>{selected.name}</h2>
                {stats.isNew && <span style={styles.newBadge}><Star size={10} /> Nuevo</span>}
              </div>
              {selected.phone && <p style={styles.clientDetailPhone}>{selected.phone}</p>}
            </div>
            <button onClick={() => startEditClient(selected)} style={styles.waIconBtn} title="Editar datos">
              <Pencil size={17} />
            </button>
            {waLink && (
              <a href={waLink} target="_blank" rel="noopener noreferrer" style={styles.waIconBtn}>
                <MessageCircle size={17} />
              </a>
            )}
            <button onClick={() => downloadVCard(selected)} style={styles.waIconBtn} title="Guardar contacto">
              <UserPlus size={17} />
            </button>
          </div>
        )}

        {!editingClient && selected.discounts && Object.keys(selected.discounts).length > 0 && (
          <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#8A8275", textTransform: "uppercase" }}>Descuento VIP</span>
            {Object.entries(selected.discounts).map(([serviceId, d]) => {
              const service = services.find(s => s.id === serviceId);
              if (!service) return null;
              return (
                <span key={serviceId} style={{ fontSize: 13, color: "#2A2622" }}>
                  {service.name} · {d.discountType === "percent" ? `${d.discountValue}% off` : `${formatPrice(d.discountValue)} off`}
                </span>
              );
            })}
          </div>
        )}

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

        <AnamnesisSection
          client={selected}
          onUpdateClient={(id, data) => { onUpdateClient(id, data); setSelected(s => ({ ...s, ...data })); }}
        />

        <label style={styles.fieldLabel}>Notas clínicas</label>
        <textarea
          style={{ ...styles.input, minHeight: 90, resize: "vertical" }}
          value={selected.notes || ""}
          onChange={e => { updateNotes(selected.id, e.target.value); setSelected({ ...selected, notes: e.target.value }); }}
          placeholder="Contracturas recurrentes, lesiones, preferencias de presión…"
        />

        <SessionesSection client={selected} history={history} />

        <label style={styles.fieldLabel}>Historial de sesiones ({history.length})</label>
        {history.length === 0 ? (
          <p style={styles.emptyMsg}>Sin sesiones registradas todavía.</p>
        ) : (
          <div style={styles.historyList}>
            {history.map(h => {
              const svc = services.find(s => s.id === h.serviceId);
              return (
                <div
                  key={h.id}
                  style={{ ...styles.historyItem, cursor: onOpenAppt ? "pointer" : "default" }}
                  onClick={() => onOpenAppt?.(h.id)}
                >
                  <div style={{ width: 4, borderRadius: 2, background: svc?.color || "#B5654A", alignSelf: "stretch" }} />
                  <div style={{ flex: 1 }}>
                    <div style={styles.historyDate}>
                      {new Date(h.dateKey + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                      {" · "}{h.start}–{h.end}
                    </div>
                    <div style={styles.historyService}>{svc?.name}{svc?.price ? ` · ${formatPrice(getAppointmentPrice(h, svc))}${h.discount ? ` (${h.discount > 0 ? "desc." : "recargo"} ${formatPrice(Math.abs(h.discount))})` : ""}` : ""}</div>
                    {h.notes && <div style={styles.historyNotes}>{h.notes}</div>}
                  </div>
                  <span style={{ ...styles.historyStatusTag, color: STATUS[h.status]?.color }}>{STATUS[h.status]?.label}</span>
                </div>
              );
            })}
          </div>
        )}

        <label style={{ ...styles.fieldLabel, marginTop: 24 }}>
          Movimientos{movements.length > 0 ? ` (${movements.length})` : ""}
        </label>
        {movementsLoading ? (
          <p style={styles.emptyMsg}>Cargando…</p>
        ) : movements.length === 0 ? (
          <p style={styles.emptyMsg}>Sin cancelaciones ni reprogramaciones registradas.</p>
        ) : (
          <div style={styles.historyList}>
            {movements.map(m => {
              const isCancelled = m.eventType === "cancelado_cliente" || m.eventType === "cancelado_profesional";
              return (
                <div key={m.id} style={styles.historyItem}>
                  <div style={{ width: 4, borderRadius: 2, alignSelf: "stretch", background: isCancelled ? "#A6483A" : "#6E7F5C" }} />
                  <div style={{ flex: 1 }}>
                    <div style={styles.historyDate}>
                      {new Date(m.happenedAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                      {" · "}
                      {new Date(m.happenedAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div style={{ ...styles.historyService, fontWeight: 600 }}>
                      {m.eventType === "cancelado_cliente" && "El cliente canceló"}
                      {m.eventType === "cancelado_profesional" && "Cancelaste vos"}
                      {m.eventType === "reprogramado_cliente" && "El cliente cambió el horario"}
                      {m.eventType === "reprogramado_profesional" && "Modificaste el horario"}
                    </div>
                    {isCancelled ? (
                      <div style={styles.historyNotes}>
                        {m.originalDateKey ? formatDateLong(m.originalDateKey) : "?"} · {m.originalStart} hs
                        {m.serviceName ? ` · ${m.serviceName}` : ""}
                      </div>
                    ) : (
                      <div style={styles.historyNotes}>
                        De {m.originalDateKey ? formatDateLong(m.originalDateKey) : "?"} {m.originalStart} hs
                        {" → "}
                        {m.newDateKey ? formatDateLong(m.newDateKey) : "?"} {m.newStart} hs
                      </div>
                    )}
                  </div>
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

      {!showAddForm ? (
        <button style={styles.addServiceBtn} onClick={() => setShowAddForm(true)}>
          <UserPlus size={16} /> Nuevo cliente
        </button>
      ) : (
        <form style={styles.newServiceForm} onSubmit={addClient}>
          {canImportContact && (
            <button type="button" style={{ ...styles.addServiceBtn, marginBottom: 10 }} onClick={importContact}>
              <UserPlus size={16} /> Importar contacto
            </button>
          )}
          <label style={styles.fieldLabel}>Nombre</label>
          <input style={styles.input} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre y apellido" autoFocus />
          <label style={styles.fieldLabel}>Teléfono</label>
          <input style={styles.input} value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Ej: 11 2345 6789" />
          <div style={styles.modalActions}>
            <button type="button" style={styles.cancelBtn} onClick={() => { setShowAddForm(false); setNewName(""); setNewPhone(""); }}>Cancelar</button>
            <button type="submit" style={styles.saveBtn}><Check size={16} /> Guardar</button>
          </div>
        </form>
      )}

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
export function ServiciosView({ services, onAddService, onUpdateService, onDeleteService, businessInfo, onSaveBusinessInfo }) {
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState(null); // { id, name, duration, price, color }
  const [showMsgs, setShowMsgs] = useState(false);
  const [msgRecordatorio, setMsgRecordatorio] = useState("");
  const [msgConfirmacion, setMsgConfirmacion] = useState("");
  const [msgSaved, setMsgSaved] = useState(false);

  useEffect(() => {
    if (businessInfo) {
      setMsgRecordatorio(businessInfo.msgRecordatorio || "");
      setMsgConfirmacion(businessInfo.msgConfirmacion || "");
    }
  }, [businessInfo?.msgRecordatorio, businessInfo?.msgConfirmacion]);

  function saveMsgs(e) {
    e.preventDefault();
    onSaveBusinessInfo({ msgRecordatorio, msgConfirmacion });
    setMsgSaved(true);
    setTimeout(() => setMsgSaved(false), 2000);
  }
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

  function startEdit(s) {
    setEditingService(s);
    setName(s.name); setDuration(s.duration); setPrice(s.price || 0); setColor(s.color);
    setShowForm(false);
  }

  function saveEdit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onUpdateService(editingService.id, { name: name.trim(), duration: Number(duration), color, price: Number(price) || 0 });
    setEditingService(null);
    setName(""); setDuration(60); setPrice(20000); setColor("#B5654A");
  }

  return (
    <div style={styles.viewWrap}>
      <h2 style={styles.sectionTitle}>Servicios</h2>
      <div style={styles.serviceList}>
        {services.map(s => (
          <div key={s.id}>
            <div style={styles.serviceRow}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={styles.serviceRowName}>{s.name}</div>
                <div style={styles.serviceRowMeta}>{s.duration} minutos{s.price ? ` · ${formatPrice(s.price)}` : ""}</div>
              </div>
              <button style={styles.iconBtnGhost} onClick={() => editingService?.id === s.id ? setEditingService(null) : startEdit(s)}>
                <Pencil size={15} />
              </button>
              <button style={styles.iconBtnGhost} onClick={() => onDeleteService(s.id)}>
                <Trash2 size={15} />
              </button>
            </div>
            {editingService?.id === s.id && (
              <form style={{ ...styles.newServiceForm, marginTop: 4 }} onSubmit={saveEdit}>
                <label style={styles.fieldLabel}>Nombre</label>
                <input style={styles.input} value={name} onChange={e => setName(e.target.value)} autoFocus />
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
                    <button type="button" key={c} onClick={() => setColor(c)}
                      style={{ ...styles.colorDot, background: c, ...(color === c ? styles.colorDotActive : {}) }} />
                  ))}
                </div>
                <div style={styles.modalActions}>
                  <button type="button" style={styles.cancelBtn} onClick={() => setEditingService(null)}>Cancelar</button>
                  <button type="submit" style={styles.saveBtn}><Check size={16} /> Guardar</button>
                </div>
              </form>
            )}
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

      <div style={{ marginTop: 24, borderTop: "1px solid #D8D0C4", paddingTop: 16 }}>
        <button
          type="button"
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, color: "#2A2622", fontSize: 14, fontWeight: 600 }}
          onClick={() => setShowMsgs(v => !v)}
        >
          <MessageCircle size={15} />
          Mensajes de WhatsApp
          {showMsgs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showMsgs && (
          <form style={{ marginTop: 12 }} onSubmit={saveMsgs}>
            <p style={{ fontSize: 12, color: "#8A7E70", marginBottom: 12, lineHeight: 1.5 }}>
              Variables disponibles: <code>{"{nombre}"}</code>, <code>{"{servicio}"}</code>, <code>{"{hora}"}</code>, <code>{"{direccion}"}</code>, <code>{"{cuando}"}</code> (recordatorio), <code>{"{fecha}"}</code> (confirmación)
            </p>

            <label style={styles.fieldLabel}>Recordatorio (hoy / mañana)</label>
            <textarea
              style={{ ...styles.input, height: 72, resize: "vertical", fontFamily: "inherit", fontSize: 13 }}
              value={msgRecordatorio}
              onChange={e => setMsgRecordatorio(e.target.value)}
            />

            <label style={{ ...styles.fieldLabel, marginTop: 10 }}>Confirmación de turno</label>
            <textarea
              style={{ ...styles.input, height: 72, resize: "vertical", fontFamily: "inherit", fontSize: 13 }}
              value={msgConfirmacion}
              onChange={e => setMsgConfirmacion(e.target.value)}
            />

            <div style={styles.modalActions}>
              <button type="submit" style={styles.saveBtn}>
                {msgSaved ? <><Check size={16} /> Guardado</> : <><Check size={16} /> Guardar mensajes</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
