import React, { useState, useMemo } from "react";
import { Calendar, Plus, X, Check, Clock, ChevronLeft, ChevronRight, Trash2, MessageCircle, DollarSign, CalendarPlus } from "lucide-react";
import {
  dateKey, timeToMinutes, minutesToTime, addDays, startOfWeek,
  formatPrice, formatDateLong, formatDateShort, pad, DAY_NAMES, MONTH_NAMES, STATUS, getRecurringDateKeys,
  formatPhoneForWhatsapp,
} from "../../shared/helpers";
import styles from "../../shared/styles";
import { MonthView, MiniCalendar } from "./CalendarViews";

export function AgendaView({
  services, appointments, availability, clients, businessInfo,
  onCreateAppt, onUpdateAppt, onDeleteAppt,
  onAddSlot, onRemoveSlot, onCloseDay, onAddSlotsBatch,
  upsertClientByName,
}) {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [calendarView, setCalendarView] = useState("week");
  const [monthDate, setMonthDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [showApptForm, setShowApptForm] = useState(false);
  const [editingAppt, setEditingAppt] = useState(null);
  const [prefillSlot, setPrefillSlot] = useState(null);
  const [showAvailForm, setShowAvailForm] = useState(null);
  const [showRecurringForm, setShowRecurringForm] = useState(false);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayKey = dateKey(new Date());

  const apptsForDay = (d) => appointments
    .filter(a => a.dateKey === dateKey(d) && a.status !== "cancelado")
    .sort((a,b) => timeToMinutes(a.start) - timeToMinutes(b.start));

  const todayAppts = useMemo(() => appointments
    .filter(a => a.dateKey === todayKey && a.status !== "cancelado")
    .sort((a,b) => timeToMinutes(a.start) - timeToMinutes(b.start)), [appointments, todayKey]);

  const tomorrowKey = dateKey(addDays(new Date(), 1));
  const tomorrowAppts = useMemo(() => appointments
    .filter(a => a.dateKey === tomorrowKey && (a.status === "confirmado"))
    .sort((a,b) => timeToMinutes(a.start) - timeToMinutes(b.start)), [appointments, tomorrowKey]);

  function reminderWhatsappLink(appt, when) {
    if (!appt.clientPhone) return null;
    const waPhone = formatPhoneForWhatsapp(appt.clientPhone);
    if (!waPhone) return null;
    const svc = services.find(s => s.id === appt.serviceId);
    const msg = `Hola ${appt.clientName}! Te recuerdo tu turno de ${svc?.name || "masaje"} ${when} a las ${appt.start} hs en ${businessInfo?.address || ""}. ¡Te espero!`;
    return `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
  }

  const monthStats = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${pad(now.getMonth()+1)}`;
    const monthAppts = appointments.filter(a => a.dateKey.startsWith(ym) && a.status !== "cancelado");
    let completedTotal = 0, upcomingTotal = 0, completedCount = 0, ausentCount = 0;
    monthAppts.forEach(a => {
      const svc = services.find(s => s.id === a.serviceId);
      const price = svc?.price || 0;
      if (a.status === "completado") { completedTotal += price; completedCount++; }
      else if (a.status === "confirmado") upcomingTotal += price;
      else if (a.status === "ausente") ausentCount++;
    });
    return { completedTotal, upcomingTotal, completedCount, ausentCount };
  }, [appointments, services]);

  const availabilityByDate = useMemo(() => {
    const map = {};
    availability.forEach(slot => {
      if (!map[slot.dateKey]) map[slot.dateKey] = [];
      map[slot.dateKey].push(slot);
    });
    return map;
  }, [availability]);

  function openNewAppt(slotDate, slotTime, fromSlotId) {
    setPrefillSlot({ dateKey: dateKey(slotDate), start: slotTime || "10:00", fromAvailabilityId: fromSlotId || null });
    setEditingAppt(null);
    setShowApptForm(true);
  }
  function openEditAppt(appt) {
    setEditingAppt(appt);
    setPrefillSlot(null);
    setShowApptForm(true);
  }
  function deleteAppt(id) {
    onDeleteAppt(id);
  }
  function setApptStatus(id, status) {
    onUpdateAppt(id, { status });
  }
  async function saveAppt(data) {
    let clientId = null;
    if (data.clientName) {
      try {
        clientId = await upsertClientByName(data.clientName, data.clientPhone);
      } catch (err) {
        console.error("No se pudo registrar la ficha de cliente:", err);
      }
    }
    if (editingAppt) {
      onUpdateAppt(editingAppt.id, { ...data, ...(clientId ? { clientId } : {}) });
    } else {
      onCreateAppt({ status: "confirmado", ...data, ...(clientId ? { clientId } : {}) });
    }
    setShowApptForm(false);
  }

  const weekLabel = `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()}`;

  return (
    <div style={styles.viewWrap}>
      {todayAppts.length > 0 && (
        <div style={styles.todayCard}>
          <div style={styles.todayCardHeader}>
            <span style={styles.todayCardTitle}>Hoy</span>
            <span style={styles.todayCardCount}>{todayAppts.length} turno{todayAppts.length !== 1 ? "s" : ""}</span>
          </div>
          <div style={styles.todayList}>
            {todayAppts.map(a => {
              const waLink = reminderWhatsappLink(a, "hoy");
              return (
                <div key={a.id} style={styles.todayRow}>
                  <button style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }} onClick={() => openEditAppt(a)}>
                    <span style={styles.todayTime}>{a.start}</span>
                    <span style={styles.todayName}>{a.clientName}</span>
                    <span style={{ ...styles.statusDot, background: STATUS[a.status]?.color }} />
                  </button>
                  {waLink && a.status !== "completado" && a.status !== "cancelado" && (
                    <a href={waLink} target="_blank" rel="noopener noreferrer" style={styles.reminderWaBtn} onClick={e => e.stopPropagation()}>
                      <MessageCircle size={13} /> Recordar
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tomorrowAppts.length > 0 && (
        <div style={styles.reminderCard}>
          <div style={styles.todayCardHeader}>
            <span style={{ ...styles.todayCardTitle, color: "#2A2622" }}>Mañana · recordatorios</span>
            <span style={{ ...styles.todayCardCount, color: "#8A8275" }}>{tomorrowAppts.length} turno{tomorrowAppts.length !== 1 ? "s" : ""}</span>
          </div>
          <div style={styles.todayList}>
            {tomorrowAppts.map(a => {
              const waLink = reminderWhatsappLink(a, "mañana");
              return (
                <div key={a.id} style={styles.reminderRow}>
                  <span style={styles.reminderTime}>{a.start}</span>
                  <span style={styles.reminderName}>{a.clientName}</span>
                  {waLink ? (
                    <a href={waLink} target="_blank" rel="noopener noreferrer" style={styles.reminderWaBtn} onClick={e => e.stopPropagation()}>
                      <MessageCircle size={13} /> Recordar
                    </a>
                  ) : (
                    <span style={styles.reminderNoPhone}>Sin tel.</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={styles.statsCard}>
        <div style={styles.statsRow}>
          <DollarSign size={15} color="#6E7F5C" />
          <div>
            <div style={styles.statsValue}>{formatPrice(monthStats.completedTotal)}</div>
            <div style={styles.statsLabel}>Cobrado este mes · {monthStats.completedCount} sesiones</div>
          </div>
        </div>
        {monthStats.upcomingTotal > 0 && (
          <div style={styles.statsSubRow}>Por cobrar (turnos confirmados): {formatPrice(monthStats.upcomingTotal)}</div>
        )}
        {monthStats.ausentCount > 0 && (
          <div style={styles.statsSubRowWarn}>{monthStats.ausentCount} inasistencia{monthStats.ausentCount !== 1 ? "s" : ""} este mes</div>
        )}
      </div>

      <button style={styles.recurringBtn} onClick={() => setShowRecurringForm(true)}>
        <CalendarPlus size={15} /> Cargar horario semanal recurrente
      </button>

      <div style={styles.viewToggle}>
        <button
          style={{ ...styles.viewToggleBtn, ...(calendarView === "week" ? styles.viewToggleBtnActive : {}) }}
          onClick={() => setCalendarView("week")}
        >
          Semana
        </button>
        <button
          style={{ ...styles.viewToggleBtn, ...(calendarView === "month" ? styles.viewToggleBtnActive : {}) }}
          onClick={() => setCalendarView("month")}
        >
          Mes
        </button>
      </div>

      {calendarView === "month" ? (
        <>
          <div style={styles.weekNav}>
            <button style={styles.navBtn} onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))}>
              <ChevronLeft size={18} />
            </button>
            <div style={{ textAlign: "center" }}>
              <div style={styles.weekLabel}>{MONTH_NAMES[monthDate.getMonth()]} {monthDate.getFullYear()}</div>
              <button style={styles.todayBtn} onClick={() => setMonthDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Hoy</button>
            </div>
            <button style={styles.navBtn} onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))}>
              <ChevronRight size={18} />
            </button>
          </div>
          <MonthView
            appointments={appointments}
            monthDate={monthDate}
            onSelectDay={(d) => {
              setWeekStart(startOfWeek(d));
              setCalendarView("week");
            }}
          />
        </>
      ) : (
        <>
          <div style={styles.weekNav}>
            <button style={styles.navBtn} onClick={() => setWeekStart(addDays(weekStart, -7))}>
              <ChevronLeft size={18} />
            </button>
            <div style={{ textAlign: "center" }}>
              <div style={styles.weekLabel}>{weekLabel}</div>
              <button style={styles.todayBtn} onClick={() => setWeekStart(startOfWeek(new Date()))}>Hoy</button>
            </div>
            <button style={styles.navBtn} onClick={() => setWeekStart(addDays(weekStart, 7))}>
              <ChevronRight size={18} />
            </button>
          </div>

          <div style={styles.weekGrid}>
            {days.map((d, i) => {
              const isToday = dateKey(d) === todayKey;
              const dKey = dateKey(d);
              const dayAppts = apptsForDay(d);
              const dayAvail = (availabilityByDate[dKey] || []).slice().sort((a,b) => timeToMinutes(a.start)-timeToMinutes(b.start));
              const bookedSlotIds = new Set(dayAppts.map(a => a.fromAvailabilityId).filter(Boolean));
              const openSlots = dayAvail.filter(s => !bookedSlotIds.has(s.id) && !s.booked);

              return (
                <div key={i} style={{ ...styles.dayCol, ...(isToday ? styles.dayColToday : {}) }}>
                  <div style={styles.dayHeader}>
                    <span style={styles.dayName}>{DAY_NAMES[d.getDay()]}</span>
                    <span style={{ ...styles.dayNum, ...(isToday ? styles.dayNumToday : {}) }}>{d.getDate()}</span>
                    <button style={styles.availAddBtn} onClick={() => setShowAvailForm(dKey)} title="Abrir cupos">
                      <CalendarPlus size={14} />
                    </button>
                  </div>
                  <div style={styles.dayBody}>
                    {dayAppts.length === 0 && openSlots.length === 0 && (
                      <button style={styles.emptySlot} onClick={() => openNewAppt(d)}>
                        <Plus size={14} />
                      </button>
                    )}
                    {dayAppts.map(a => {
                      const svc = services.find(s => s.id === a.serviceId) || {};
                      const maxDur = Math.max(...services.map(s => s.duration), 60);
                      const thickness = 3 + Math.round((svc.duration / maxDur) * 7);
                      return (
                        <button
                          key={a.id}
                          onClick={() => openEditAppt(a)}
                          style={{
                            ...styles.apptCard,
                            borderLeftWidth: thickness,
                            borderLeftColor: svc.color || "#B5654A",
                          }}
                        >
                          <div style={styles.apptTopRow}>
                            <span style={styles.apptTime}>{a.start}–{a.end}</span>
                            <span style={{ ...styles.statusDot, background: STATUS[a.status]?.color }} />
                          </div>
                          <div style={styles.apptClient}>{a.clientName}</div>
                          <div style={styles.apptService}>{svc.name}</div>
                        </button>
                      );
                    })}
                    {openSlots.map(slot => (
                      <div key={slot.id} style={styles.openSlotCard}>
                        <div style={styles.openSlotInfo}>
                          <Clock size={12} color="#6E7F5C" />
                          <span>{slot.start}–{slot.end}</span>
                          <span style={styles.openSlotTag}>Cupo libre</span>
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button style={styles.slotMiniBtn} onClick={() => openNewAppt(d, slot.start, slot.id)} title="Cargar turno acá">
                            <Plus size={12} />
                          </button>
                          <button style={styles.slotMiniBtnGhost} onClick={() => onRemoveSlot(slot.id)} title="Quitar cupo">
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(dayAppts.length > 0 || openSlots.length > 0) && (
                      <button style={styles.addMoreBtn} onClick={() => openNewAppt(d)}>
                        <Plus size={12} /> Agregar turno
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {showApptForm && (
        <ApptFormModal
          services={services}
          clients={clients}
          businessInfo={businessInfo}
          initial={editingAppt}
          prefill={prefillSlot}
          onClose={() => setShowApptForm(false)}
          onSave={saveAppt}
          onDelete={editingAppt ? () => { deleteAppt(editingAppt.id); setShowApptForm(false); } : null}
          onStatusChange={editingAppt ? (status) => { setApptStatus(editingAppt.id, status); setShowApptForm(false); } : null}
        />
      )}

      {showAvailForm && (
        <AvailabilityFormModal
          dateKey={showAvailForm}
          existing={availabilityByDate[showAvailForm] || []}
          bookedSlotIds={new Set(
            appointments
              .filter(a => a.dateKey === showAvailForm && a.status !== "cancelado")
              .map(a => a.fromAvailabilityId)
              .filter(Boolean)
          )}
          onClose={() => setShowAvailForm(null)}
          onAdd={(slot) => onAddSlot({ dateKey: showAvailForm, ...slot })}
          onRemove={(slotId) => onRemoveSlot(slotId)}
          onCloseDay={onCloseDay}
        />
      )}

      {showRecurringForm && (
        <RecurringAvailabilityModal
          onClose={() => setShowRecurringForm(false)}
          onConfirm={onAddSlotsBatch}
        />
      )}
    </div>
  );
}

function AvailabilityFormModal({ dateKey: dKey, existing, bookedSlotIds, onClose, onAdd, onRemove, onCloseDay }) {
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("11:00");
  const [overlapError, setOverlapError] = useState(null);

  function handleAdd(e) {
    e.preventDefault();
    const newStart = timeToMinutes(start);
    const newEnd = timeToMinutes(end);
    if (newEnd <= newStart) return;

    const slots = [];
    let t = newStart;
    while (t + 60 <= newEnd) {
      slots.push({ start: minutesToTime(t), end: minutesToTime(t + 60) });
      t += 60;
    }
    if (slots.length === 0) return;

    for (const slot of slots) {
      const sStart = timeToMinutes(slot.start);
      const sEnd = timeToMinutes(slot.end);
      const overlap = existing.find(ex => sStart < timeToMinutes(ex.end) && timeToMinutes(ex.start) < sEnd);
      if (overlap) {
        setOverlapError(`El cupo ${slot.start}–${slot.end} se superpone con ${overlap.start}–${overlap.end}.`);
        return;
      }
    }

    setOverlapError(null);
    slots.forEach(slot => onAdd(slot));
    setStart(end);
    const next = minutesToTime(Math.min(newEnd + 60, 23*60+45));
    setEnd(next);
  }

  const slotCount = Math.floor((timeToMinutes(end) - timeToMinutes(start)) / 60);

  const sorted = existing.slice().sort((a,b) => timeToMinutes(a.start)-timeToMinutes(b.start));
  const removableIds = sorted.filter(s => !bookedSlotIds?.has(s.id)).map(s => s.id);
  const hasReservedSlots = sorted.some(s => bookedSlotIds?.has(s.id));

  function handleCloseDay() {
    if (removableIds.length === 0) return;
    const msg = hasReservedSlots
      ? "Esto va a quitar los cupos libres de este día. Los turnos ya reservados no se tocan. ¿Confirmás?"
      : "¿Cerrar este día? Se van a borrar todos los cupos libres que abriste.";
    if (window.confirm(msg)) {
      onCloseDay(removableIds);
      onClose();
    }
  }

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>Cupos · {formatDateLong(dKey)}</h3>
          <button type="button" style={styles.iconBtn} onClick={onClose}><X size={18} /></button>
        </div>
        <p style={styles.helperText}>Estos horarios van a aparecer disponibles para que tus clientes reserven.</p>

        {sorted.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "12px 0" }}>
            {sorted.map(s => {
              const isBooked = bookedSlotIds?.has(s.id);
              return (
                <div key={s.id} style={styles.availExistingRow}>
                  <Clock size={13} color={isBooked ? "#B08A3E" : "#6E7F5C"} />
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>
                    {s.start} – {s.end}
                    {isBooked && <span style={{ fontSize: 11, fontWeight: 600, color: "#B08A3E", marginLeft: 6 }}>· reservado</span>}
                  </span>
                  {!isBooked && (
                    <button type="button" style={styles.iconBtnGhost} onClick={() => onRemove(s.id)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {removableIds.length > 0 && (
          <button type="button" style={styles.closeDayBtn} onClick={handleCloseDay}>
            <X size={14} /> Cerrar día completo
          </button>
        )}

        <form onSubmit={handleAdd}>
          <div style={styles.fieldRow}>
            <div style={{ flex: 1 }}>
              <label style={styles.fieldLabel}>Desde</label>
              <input type="time" style={styles.input} value={start} onChange={e => { setStart(e.target.value); setOverlapError(null); }} required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.fieldLabel}>Hasta</label>
              <input type="time" style={styles.input} value={end} onChange={e => { setEnd(e.target.value); setOverlapError(null); }} required />
            </div>
          </div>
          {overlapError && (
            <p style={{ fontSize: 12, color: "#A6483A", margin: "6px 0 0", fontWeight: 600 }}>{overlapError}</p>
          )}
          <div style={styles.modalActions}>
            <div style={{ flex: 1 }} />
            <button type="button" style={styles.cancelBtn} onClick={onClose}>Listo</button>
            <button type="submit" style={styles.saveBtn}>
              <Plus size={16} /> {slotCount > 1 ? `Agregar ${slotCount} cupos` : "Agregar cupo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecurringAvailabilityModal({ onClose, onConfirm }) {
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]);
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("14:00");
  const [slotLength, setSlotLength] = useState(60);
  const [weeksCount, setWeeksCount] = useState(4);
  const [saving, setSaving] = useState(false);

  const weekdayOptions = [
    { value: 1, label: "Lun" }, { value: 2, label: "Mar" }, { value: 3, label: "Mié" },
    { value: 4, label: "Jue" }, { value: 5, label: "Vie" }, { value: 6, label: "Sáb" }, { value: 0, label: "Dom" },
  ];

  function toggleDay(day) {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort());
  }

  function buildDaySlots() {
    const slots = [];
    let t = timeToMinutes(start);
    const endMin = timeToMinutes(end);
    while (t + slotLength <= endMin) {
      slots.push({ start: minutesToTime(t), end: minutesToTime(t + slotLength) });
      t += slotLength;
    }
    return slots;
  }

  const daySlots = buildDaySlots();
  const dateKeys = selectedDays.length > 0 ? getRecurringDateKeys(selectedDays, weeksCount) : [];
  const totalSlots = dateKeys.length * daySlots.length;

  async function handleConfirm() {
    if (selectedDays.length === 0 || daySlots.length === 0 || saving) return;
    setSaving(true);
    const allSlots = [];
    dateKeys.forEach(dKey => {
      daySlots.forEach(s => allSlots.push({ dateKey: dKey, start: s.start, end: s.end }));
    });
    try {
      await onConfirm(allSlots);
      onClose();
    } catch (err) {
      console.error(err);
      window.alert("Hubo un problema al cargar el horario. Probá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>Horario semanal recurrente</h3>
          <button type="button" style={styles.iconBtn} onClick={onClose}><X size={18} /></button>
        </div>
        <p style={styles.helperText}>
          Elegí los días y el rango horario. Se va a dividir en turnos de la duración que indiques
          y se va a repetir durante varias semanas, sin que tengas que cargar día por día.
        </p>

        <label style={styles.fieldLabel}>Días</label>
        <div style={styles.weekdayPicker}>
          {weekdayOptions.map(opt => (
            <button
              type="button"
              key={opt.value}
              onClick={() => toggleDay(opt.value)}
              style={{ ...styles.weekdayChip, ...(selectedDays.includes(opt.value) ? styles.weekdayChipActive : {}) }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div style={styles.fieldRow}>
          <div style={{ flex: 1 }}>
            <label style={styles.fieldLabel}>Desde</label>
            <input type="time" style={styles.input} value={start} onChange={e => setStart(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.fieldLabel}>Hasta</label>
            <input type="time" style={styles.input} value={end} onChange={e => setEnd(e.target.value)} />
          </div>
        </div>

        <div style={styles.fieldRow}>
          <div style={{ flex: 1 }}>
            <label style={styles.fieldLabel}>Duración de cada turno (min)</label>
            <input type="number" style={styles.input} value={slotLength} onChange={e => setSlotLength(Number(e.target.value) || 30)} min={10} step={5} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.fieldLabel}>Repetir por (semanas)</label>
            <input type="number" style={styles.input} value={weeksCount} onChange={e => setWeeksCount(Number(e.target.value) || 1)} min={1} max={26} />
          </div>
        </div>

        <p style={styles.recurringPreview}>
          {totalSlots > 0
            ? `Se van a crear ${totalSlots} cupos (${daySlots.length} por día, ${dateKeys.length} días) entre hoy y ${weeksCount} semana${weeksCount !== 1 ? "s" : ""}.`
            : "Elegí al menos un día y un rango horario válido para ver la vista previa."}
        </p>

        <div style={styles.modalActions}>
          <div style={{ flex: 1 }} />
          <button type="button" style={styles.cancelBtn} onClick={onClose}>Cancelar</button>
          <button type="button" style={styles.saveBtn} onClick={handleConfirm} disabled={totalSlots === 0 || saving}>
            <Check size={16} /> {saving ? "Cargando…" : "Cargar horario"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ApptFormModal({ services, clients, initial, prefill, onClose, onSave, onDelete, onStatusChange, businessInfo }) {
  const base = initial || {
    dateKey: prefill?.dateKey || dateKey(new Date()),
    start: prefill?.start || "10:00",
    serviceId: services[0]?.id || "",
    clientName: "",
    clientPhone: "",
    notes: "",
  };
  const [dateVal, setDateVal] = useState(base.dateKey);
  const [start, setStart] = useState(base.start);
  const [serviceId, setServiceId] = useState(base.serviceId);
  const [clientName, setClientName] = useState(base.clientName);
  const [clientPhone, setClientPhone] = useState(base.clientPhone || "");
  const [notes, setNotes] = useState(base.notes || "");
  const [showClientList, setShowClientList] = useState(false);
  const [showDateCalendar, setShowDateCalendar] = useState(false);
  const fromAvailabilityId = initial?.fromAvailabilityId || prefill?.fromAvailabilityId || null;

  const svc = services.find(s => s.id === serviceId);
  const end = svc ? minutesToTime(timeToMinutes(start) + svc.duration) : start;

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientName.toLowerCase()) && clientName.length > 0
  ).slice(0, 5);

  function handleSubmit(e) {
    e.preventDefault();
    if (!clientName.trim() || !serviceId) return;
    onSave({
      dateKey: dateVal, start, end, serviceId, clientName, clientPhone, notes,
      ...(fromAvailabilityId ? { fromAvailabilityId } : {}),
    });
  }

  function whatsappLink() {
    const waPhone = formatPhoneForWhatsapp(clientPhone);
    if (!waPhone) return null;
    const msg = `Hola ${clientName}! Te confirmo tu turno de ${svc?.name} el ${formatDateLong(dateVal)} a las ${start} hs en ${businessInfo?.address || ""}. ¡Te espero!`;
    return `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
  }
  const waLink = whatsappLink();

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <form style={styles.modal} onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>{initial ? "Editar turno" : "Nuevo turno"}</h3>
          <button type="button" style={styles.iconBtn} onClick={onClose}><X size={18} /></button>
        </div>

        {initial && (
          <div style={styles.statusRow}>
            {Object.entries(STATUS).map(([key, val]) => (
              <button
                type="button"
                key={key}
                onClick={() => onStatusChange(key)}
                style={{
                  ...styles.statusChip,
                  ...(initial.status === key ? { background: val.color, color: "#fff", borderColor: val.color } : {}),
                }}
              >
                {val.label}
              </button>
            ))}
          </div>
        )}

        <label style={styles.fieldLabel}>Cliente</label>
        <div style={{ position: "relative" }}>
          <input
            style={styles.input}
            value={clientName}
            onChange={e => { setClientName(e.target.value); setShowClientList(true); }}
            onFocus={() => setShowClientList(true)}
            placeholder="Nombre del cliente"
            autoComplete="off"
          />
          {showClientList && filteredClients.length > 0 && (
            <div style={styles.suggestList}>
              {filteredClients.map(c => (
                <button
                  type="button"
                  key={c.id}
                  style={styles.suggestItem}
                  onClick={() => { setClientName(c.name); setClientPhone(c.phone || ""); setShowClientList(false); }}
                >
                  {c.name} {c.phone ? <span style={{ color: "#8A8275" }}>· {c.phone}</span> : null}
                </button>
              ))}
            </div>
          )}
        </div>

        <label style={styles.fieldLabel}>Teléfono (WhatsApp)</label>
        <input style={styles.input} value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="11 1234 5678" />

        <div style={styles.fieldRow}>
          <div style={{ flex: 1 }}>
            <label style={styles.fieldLabel}>Fecha</label>
            <button
              type="button"
              style={{ ...styles.input, textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
              onClick={() => setShowDateCalendar(v => !v)}
            >
              <span>{formatDateShort(dateVal)}</span>
              <CalendarPlus size={15} color="#8A8275" />
            </button>
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.fieldLabel}>Hora</label>
            <input type="time" style={styles.input} value={start} onChange={e => setStart(e.target.value)} required />
          </div>
        </div>
        {showDateCalendar && (
          <div style={{ marginTop: 8, marginBottom: 4 }}>
            <MiniCalendar
              selectedDateKey={dateVal}
              onSelectDate={(dKey) => { setDateVal(dKey); setShowDateCalendar(false); }}
            />
          </div>
        )}

        <label style={styles.fieldLabel}>Servicio</label>
        <div style={styles.serviceChips}>
          {services.map(s => (
            <button
              type="button"
              key={s.id}
              onClick={() => setServiceId(s.id)}
              style={{
                ...styles.serviceChip,
                ...(serviceId === s.id ? { background: s.color, color: "#EFE9DF", borderColor: s.color } : {}),
              }}
            >
              {s.name} <span style={{ opacity: 0.75 }}>· {s.duration}min{s.price ? ` · ${formatPrice(s.price)}` : ""}</span>
            </button>
          ))}
        </div>
        <div style={styles.endTimeNote}>Finaliza a las {end}</div>

        <label style={styles.fieldLabel}>Notas</label>
        <textarea style={{ ...styles.input, minHeight: 60, resize: "vertical" }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Zona a trabajar, contracturas, preferencias…" />

        {waLink && (
          <a href={waLink} target="_blank" rel="noopener noreferrer" style={styles.waBtn}>
            <MessageCircle size={16} /> Enviar confirmación por WhatsApp
          </a>
        )}

        <div style={styles.modalActions}>
          {onDelete && (
            <button type="button" style={styles.deleteBtn} onClick={onDelete}>
              <Trash2 size={16} /> Eliminar
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button type="button" style={styles.cancelBtn} onClick={onClose}>Cancelar</button>
          <button type="submit" style={styles.saveBtn}>
            <Check size={16} /> {initial ? "Guardar" : "Crear turno"}
          </button>
        </div>
      </form>
    </div>
  );
}
