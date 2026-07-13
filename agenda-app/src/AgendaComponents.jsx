import React, { useState, useMemo, useEffect } from "react";
import { Calendar, Plus, X, Check, Clock, ChevronLeft, ChevronRight, Trash2, MessageCircle, DollarSign, CalendarPlus, Copy, Share2, ChevronDown, ChevronUp } from "lucide-react";
import {
  dateKey, timeToMinutes, minutesToTime, addDays, startOfWeek,
  formatPrice, getAppointmentPrice, formatDateLong, formatDateShort, pad, DAY_NAMES, MONTH_NAMES, STATUS, getRecurringDateKeys, getRecurringDateKeysByRange,
  formatPhoneForWhatsapp, parseDateKeyAsLocal,
} from "../../shared/helpers";
import styles from "../../shared/styles";
import { MonthView, MiniCalendar } from "./CalendarViews";
import { ANAMNESIS_FIELDS } from "./ClientesServiciosViews";
import { markBookingRefCancelled, markBookingRefConfirmed, deleteBookingRef, updateBookingRef, updateAppointmentWithSlotSwap, addAppointmentHistory } from "../../shared/firestoreApi";

export function AgendaView({
  services, appointments, availability, clients, businessInfo,
  onCreateAppt, onUpdateAppt, onDeleteAppt,
  onAddSlot, onRemoveSlot, onCloseDay, onAddSlotsBatch, onFreeSlot,
  upsertClientByName, pendingGiftCards = 0, onGoGiftCards,
  openApptId, onOpenApptHandled,
}) {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [calendarView, setCalendarView] = useState("week");
  const [monthDate, setMonthDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [showApptForm, setShowApptForm] = useState(false);
  const [editingAppt, setEditingAppt] = useState(null);
  const [prefillSlot, setPrefillSlot] = useState(null);
  const [showAvailForm, setShowAvailForm] = useState(null);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayKey = dateKey(new Date());

  const STATUS_BG = {
    pendiente:  { bg: "#FFF8EC", border: "#C9973A" },
    confirmado: { bg: "#EEF2FB", border: "#5B7EC9" },
    completado: { bg: "#F0EDE8", border: "#5A5550" },
    ausente:    { bg: "#FDF5EC", border: "#B08A3E" },
  };

  const apptsForDay = (d) => appointments
    .filter(a => a.dateKey === dateKey(d) && a.status !== "cancelado")
    .sort((a,b) => timeToMinutes(a.start) - timeToMinutes(b.start));

  const todayAppts = useMemo(() => appointments
    .filter(a => a.dateKey === todayKey && a.status !== "cancelado")
    .sort((a,b) => timeToMinutes(a.start) - timeToMinutes(b.start)), [appointments, todayKey]);

  const tomorrowKey = dateKey(addDays(new Date(), 1));
  const tomorrowAppts = useMemo(() => appointments
    .filter(a => a.dateKey === tomorrowKey && (a.status === "confirmado" || a.status === "pendiente"))
    .sort((a,b) => timeToMinutes(a.start) - timeToMinutes(b.start)), [appointments, tomorrowKey]);

  function reminderWhatsappLink(appt, when) {
    if (!appt.clientPhone) return null;
    const waPhone = formatPhoneForWhatsapp(appt.clientPhone);
    if (!waPhone) return null;
    const svc = services.find(s => s.id === appt.serviceId);
    const template = businessInfo?.msgRecordatorio || "Hola {nombre}! Te recuerdo tu turno de {servicio} {cuando} a las {hora} hs en {direccion}. ¡Te espero!";
    const msg = template
      .replace("{nombre}", appt.clientName)
      .replace("{servicio}", svc?.name || "masaje")
      .replace("{cuando}", when)
      .replace("{hora}", appt.start)
      .replace("{direccion}", businessInfo?.address || "");
    return `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
  }

  const monthStats = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${pad(now.getMonth()+1)}`;
    const monthAppts = appointments.filter(a => a.dateKey.startsWith(ym) && a.status !== "cancelado");
    let completedTotal = 0, upcomingTotal = 0, completedCount = 0, ausentCount = 0;
    monthAppts.forEach(a => {
      const svc = services.find(s => s.id === a.serviceId);
      const price = getAppointmentPrice(a, svc);
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

  useEffect(() => {
    if (!openApptId) return;
    const appt = appointments.find(a => a.id === openApptId);
    if (appt) {
      openEditAppt(appt);
      onOpenApptHandled?.();
    }
  }, [openApptId]);

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
  function deleteAppt(id, clientPhone) {
    onDeleteAppt(id);
    deleteBookingRef(clientPhone, id).catch((e) => console.error("[deleteAppt] deleteBookingRef falló:", e));
  }
  async function setApptStatus(id, status, fromAvailabilityId, clientPhone, appt) {
    await onUpdateAppt(id, { status });
    if (status === "cancelado") {
      if (fromAvailabilityId && onFreeSlot) {
        try { await onFreeSlot(fromAvailabilityId); } catch (e) {
          console.error("No se pudo liberar el cupo:", e);
        }
      }
      markBookingRefCancelled(clientPhone, id).catch(() => {});
      if (appt) {
        const svc = services.find(s => s.id === appt.serviceId);
        addAppointmentHistory({
          clientId: appt.clientId || null,
          clientPhone: appt.clientPhone || "",
          clientName: appt.clientName || "",
          apptId: id,
          eventType: "cancelado_profesional",
          happenedAt: Date.now(),
          originalDateKey: appt.dateKey,
          originalStart: appt.start,
          originalEnd: appt.end,
          serviceId: appt.serviceId || null,
          serviceName: svc?.name || "",
        });
      }
    } else if (status === "confirmado") {
      console.log("[setApptStatus] confirmando turno en phoneIndex:", { id, clientPhone });
      markBookingRefConfirmed(clientPhone, id).catch((e) => console.error("[setApptStatus] markBookingRefConfirmed falló:", e));
    }
  }
  function duplicateAppt(appt) {
    const [y, m, d] = appt.dateKey.split("-").map(Number);
    const nextDate = addDays(new Date(y, m - 1, d), 7);
    setPrefillSlot({
      dateKey: dateKey(nextDate),
      start: appt.start,
      serviceId: appt.serviceId,
      clientName: appt.clientName,
      clientPhone: appt.clientPhone || "",
      notes: appt.notes || "",
    });
    setEditingAppt(null);
  }

  async function saveAppt(data) {
    const duplicate = appointments.find(a =>
      a.status !== "cancelado" &&
      a.dateKey === data.dateKey &&
      a.start === data.start &&
      a.id !== (editingAppt?.id)
    );
    if (duplicate) {
      alert(`Ya existe un turno a las ${data.start} el ${data.dateKey}. No se pueden tener turnos duplicados.`);
      return;
    }

    let clientId = null;
    if (data.clientName) {
      try {
        clientId = await upsertClientByName(data.clientName, data.clientPhone);
      } catch (err) {
        console.error("No se pudo registrar la ficha de cliente:", err);
      }
    }
    if (editingAppt) {
      const mergedData = { ...data, ...(clientId ? { clientId } : {}) };
      try {
        await updateAppointmentWithSlotSwap(editingAppt.id, editingAppt.fromAvailabilityId || null, mergedData);
      } catch (e) {
        alert(e.message || "No se pudo guardar el turno.");
        return;
      }
      if (data.clientPhone) {
        const svc = services.find(s => s.id === data.serviceId);
        updateBookingRef(data.clientPhone, editingAppt.id, {
          dateKey: data.dateKey,
          start: data.start,
          end: data.end,
          serviceName: svc?.name || "",
        }).catch((e) => console.error("[saveAppt] updateBookingRef falló:", e));
      }
      if (editingAppt.dateKey !== data.dateKey || editingAppt.start !== data.start) {
        const oldSvc = services.find(s => s.id === editingAppt.serviceId);
        addAppointmentHistory({
          clientId: clientId || editingAppt.clientId || null,
          clientPhone: data.clientPhone || editingAppt.clientPhone || "",
          clientName: data.clientName || editingAppt.clientName || "",
          apptId: editingAppt.id,
          eventType: "reprogramado_profesional",
          happenedAt: Date.now(),
          originalDateKey: editingAppt.dateKey,
          originalStart: editingAppt.start,
          originalEnd: editingAppt.end,
          serviceId: editingAppt.serviceId || null,
          serviceName: oldSvc?.name || "",
          newApptId: editingAppt.id,
          newDateKey: data.dateKey,
          newStart: data.start,
          newEnd: data.end,
        });
      }
    } else {
      const weeks = data.repeatWeeks || 1;
      const baseDate = parseDateKeyAsLocal(data.dateKey);
      for (let i = 0; i < weeks; i++) {
        const dKey = i === 0 ? data.dateKey : dateKey(addDays(baseDate, 7 * i));
        const dup = appointments.find(a => a.status !== "cancelado" && a.dateKey === dKey && a.start === data.start);
        if (dup) { alert(`Ya existe un turno a las ${data.start} el ${dKey}. Se omitió esa semana.`); continue; }
        onCreateAppt({ status: "confirmado", ...data, dateKey: dKey, ...(clientId ? { clientId } : {}) });
      }
    }
    setShowApptForm(false);
  }

  const weekLabel = `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()}`;

  return (
    <div style={styles.viewWrap}>
      {pendingGiftCards > 0 && (
        <div style={{ ...styles.giftCardPendingBanner, cursor: "pointer" }} onClick={onGoGiftCards} role="button" tabIndex={0}>
          <span style={{ fontSize: 20 }}>🎁</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 13.5, color: "#7A5C20" }}>
              {pendingGiftCards} gift card{pendingGiftCards !== 1 ? "s" : ""} pendiente{pendingGiftCards !== 1 ? "s" : ""} de pago
            </span>
            <div style={{ fontSize: 12, color: "#8A7040" }}>Tocá para confirmar el pago y activarlas</div>
          </div>
          <span style={{ color: "#C9973A", fontSize: 18 }}>›</span>
        </div>
      )}
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
      <button style={styles.recurringBtn} onClick={() => setShowExportModal(true)}>
        <Share2 size={15} /> Exportar disponibilidad
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
                    {[
                      ...dayAppts.map(a => ({ type: "appt", start: a.start, data: a })),
                      ...openSlots.map(s => ({ type: "slot", start: s.start, data: s })),
                    ]
                      .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start))
                      .map(item => {
                        if (item.type === "appt") {
                          const a = item.data;
                          const svc = services.find(s => s.id === a.serviceId) || {};
                          const maxDur = Math.max(...services.map(s => s.duration), 60);
                          const thickness = 3 + Math.round((svc.duration / maxDur) * 7);
                          return (
                            <button
                              key={a.id}
                              onClick={() => openEditAppt(a)}
                              style={{
                                ...styles.apptCard,
                                background: STATUS_BG[a.status]?.bg || "#FAF7F1",
                                borderLeftWidth: thickness,
                                borderLeftColor: STATUS_BG[a.status]?.border || "#B5654A",
                              }}
                            >
                              <div style={styles.apptTopRow}>
                                <span style={styles.apptTime}>{a.start}–{a.end}</span>
                                <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_BG[a.status]?.border, letterSpacing: "0.02em" }}>
                                  {STATUS[a.status]?.label}
                                </span>
                              </div>
                              <div style={styles.apptClient}>{a.clientName}</div>
                              <div style={styles.apptService}>
                                {svc.name}
                                {a.paidByGiftCard && <span style={{ marginLeft: 5, fontSize: 10, background: "#EBF3E6", color: "#4A5A40", borderRadius: 6, padding: "1px 6px", fontWeight: 700 }}>🎁 Gift Card</span>}
                              </div>
                            </button>
                          );
                        }
                        const slot = item.data;
                        return (
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
                        );
                      })
                    }
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
          key={editingAppt ? `edit-${editingAppt.id}` : `new-${prefillSlot?.dateKey}-${prefillSlot?.clientName || ""}`}
          services={services}
          clients={clients}
          businessInfo={businessInfo}
          initial={editingAppt}
          prefill={prefillSlot}
          onClose={() => setShowApptForm(false)}
          onSave={saveAppt}
          onDelete={editingAppt ? () => { deleteAppt(editingAppt.id, editingAppt.clientPhone); setShowApptForm(false); } : null}
          onStatusChange={editingAppt ? (status) => { setApptStatus(editingAppt.id, status, editingAppt.fromAvailabilityId, editingAppt.clientPhone, editingAppt); setShowApptForm(false); } : null}
          onDuplicate={editingAppt ? () => duplicateAppt(editingAppt) : null}
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
      {showExportModal && (
        <ExportDisponibilidadModal
          availability={availability}
          appointments={appointments}
          businessInfo={businessInfo}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}

function AvailabilityFormModal({ dateKey: dKey, existing, bookedSlotIds, onClose, onAdd, onRemove, onCloseDay }) {
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("11:00");
  const [statusMsg, setStatusMsg] = useState(null);

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

    const toAdd = [];
    let skipped = 0;
    for (const slot of slots) {
      const sStart = timeToMinutes(slot.start);
      const sEnd = timeToMinutes(slot.end);
      const overlap = existing.find(ex => sStart < timeToMinutes(ex.end) && timeToMinutes(ex.start) < sEnd);
      if (overlap) {
        skipped++;
      } else {
        toAdd.push(slot);
      }
    }

    if (toAdd.length === 0) {
      setStatusMsg({ type: "error", text: "Todos los cupos ya existen, no se agregó ninguno." });
      return;
    }

    toAdd.forEach(slot => onAdd(slot));

    if (skipped > 0) {
      setStatusMsg({
        type: "info",
        text: `Se agregaron ${toAdd.length} cupo${toAdd.length !== 1 ? "s" : ""}. Se saltaron ${skipped} que ya existían.`,
      });
    } else {
      setStatusMsg(null);
    }

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
              <input type="time" style={styles.input} value={start} onChange={e => { setStart(e.target.value); setStatusMsg(null); }} required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.fieldLabel}>Hasta</label>
              <input type="time" style={styles.input} value={end} onChange={e => { setEnd(e.target.value); setStatusMsg(null); }} required />
            </div>
          </div>
          {statusMsg && (
            <p style={{ fontSize: 12, color: statusMsg.type === "error" ? "#A6483A" : "#6E7F5C", margin: "6px 0 0", fontWeight: 600 }}>{statusMsg.text}</p>
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
  const todayStr = dateKey(new Date());
  const inFourWeeks = dateKey(addDays(new Date(), 28));
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]);
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("14:00");
  const [slotLength, setSlotLength] = useState(60);
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(inFourWeeks);
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
  const dateKeys = selectedDays.length > 0 && fromDate && toDate && fromDate <= toDate
    ? getRecurringDateKeysByRange(selectedDays, fromDate, toDate)
    : [];
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
        </div>

        <div style={styles.fieldRow}>
          <div style={{ flex: 1 }}>
            <label style={styles.fieldLabel}>Fecha inicio</label>
            <input type="date" style={styles.input} value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.fieldLabel}>Fecha fin</label>
            <input type="date" style={styles.input} value={toDate} onChange={e => setToDate(e.target.value)} min={fromDate} />
          </div>
        </div>

        <p style={styles.recurringPreview}>
          {totalSlots > 0
            ? `Se van a crear ${totalSlots} cupos (${daySlots.length} por día, ${dateKeys.length} días).`
            : "Elegí al menos un día, un rango horario válido y fechas para ver la vista previa."}
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

function TurnoAnamnesisSection({ client }) {
  const [open, setOpen] = useState(false);
  const hasData = client.anamnesis && Object.values(client.anamnesis).some(v => v?.trim());

  return (
    <div style={{ marginBottom: 12 }}>
      <button
        type="button"
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
          cursor: "pointer", padding: "8px 0", color: "#2A2622", fontSize: 13, fontWeight: 600, width: "100%" }}
        onClick={() => setOpen(v => !v)}
      >
        <span style={{ flex: 1, textAlign: "left" }}>Anamnesis</span>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && (
        <div style={{ background: "#E8E2D8", borderRadius: 10, padding: 14 }}>
          {!hasData ? (
            <p style={styles.emptyMsg}>Sin anamnesis cargada.</p>
          ) : (
            ANAMNESIS_FIELDS.filter(f => client.anamnesis?.[f.key]?.trim()).map(f => (
              <div key={f.key} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: "#8A7E70", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{f.label}</div>
                <div style={{ fontSize: 13, color: "#2A2622", marginTop: 2 }}>{client.anamnesis[f.key]}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ApptFormModal({ services, clients, initial, prefill, onClose, onSave, onDelete, onStatusChange, onDuplicate, businessInfo }) {
  const base = initial || {
    dateKey: prefill?.dateKey || dateKey(new Date()),
    start: prefill?.start || "10:00",
    serviceId: prefill?.serviceId || services[0]?.id || "",
    clientName: prefill?.clientName || "",
    clientPhone: prefill?.clientPhone || "",
    notes: prefill?.notes || "",
  };
  const [dateVal, setDateVal] = useState(base.dateKey);
  const [start, setStart] = useState(base.start);
  const [serviceId, setServiceId] = useState(base.serviceId);
  const [clientName, setClientName] = useState(base.clientName);
  const [clientPhone, setClientPhone] = useState(base.clientPhone || "");
  const [notes, setNotes] = useState(base.notes || "");
  const [discount, setDiscount] = useState(base.discount || 0);
  const [showClientList, setShowClientList] = useState(false);
  const [showDateCalendar, setShowDateCalendar] = useState(false);
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  const fromAvailabilityId = initial?.fromAvailabilityId || prefill?.fromAvailabilityId || null;

  const svc = services.find(s => s.id === serviceId);
  const end = svc ? minutesToTime(timeToMinutes(start) + svc.duration) : start;

  const matchedClient = clients.find(c => {
    if (clientPhone.trim()) {
      return (c.phone || "").replace(/[^\d]/g, "") === clientPhone.replace(/[^\d]/g, "") && clientPhone.replace(/[^\d]/g, "");
    }
    return c.name.trim().toLowerCase() === clientName.trim().toLowerCase();
  });

  const clientSearchDigits = clientName.replace(/[^\d]/g, "");
  const filteredClients = clients.filter(c => {
    if (!clientName.length) return false;
    const nameMatch = c.name.toLowerCase().includes(clientName.toLowerCase());
    const phoneMatch = clientSearchDigits.length >= 3 &&
      (c.phone || "").replace(/[^\d]/g, "").includes(clientSearchDigits);
    return nameMatch || phoneMatch;
  }).slice(0, 5);

  function handleSubmit(e) {
    e.preventDefault();
    if (!clientName.trim() || !serviceId) return;
    onSave({
      dateKey: dateVal, start, end, serviceId, clientName, clientPhone, notes,
      discount: Number(discount) || 0,
      ...(fromAvailabilityId ? { fromAvailabilityId } : {}),
      ...(!initial && repeatWeeks > 1 ? { repeatWeeks } : {}),
    });
  }

  function whatsappLink() {
    const waPhone = formatPhoneForWhatsapp(clientPhone);
    if (!waPhone) return null;
    const template = businessInfo?.msgConfirmacion || "Hola {nombre}! Te confirmo tu turno de {servicio} el {fecha} a las {hora} hs en {direccion}. ¡Te espero!";
    const msg = template
      .replace("{nombre}", clientName)
      .replace("{servicio}", svc?.name || "")
      .replace("{fecha}", formatDateLong(dateVal))
      .replace("{hora}", start)
      .replace("{direccion}", businessInfo?.address || "");
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

        {matchedClient && <TurnoAnamnesisSection client={matchedClient} />}

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

        <label style={styles.fieldLabel}>Descuento / Recargo ($)</label>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "flex", border: "1.5px solid #D0C5B4", borderRadius: 10, overflow: "hidden" }}>
            <button
              type="button"
              onClick={() => setDiscount(d => -Math.abs(d))}
              style={{
                padding: "0 14px", border: "none", cursor: "pointer", fontWeight: 700,
                ...(Number(discount) <= 0 ? { background: "#A6483A", color: "#fff" } : { background: "#fff", color: "#5A5248" }),
              }}
            >Recargo</button>
            <button
              type="button"
              onClick={() => setDiscount(d => Math.abs(d))}
              style={{
                padding: "0 14px", border: "none", cursor: "pointer", fontWeight: 700,
                ...(Number(discount) > 0 ? { background: "#6E7F5C", color: "#fff" } : { background: "#fff", color: "#5A5248" }),
              }}
            >Descuento</button>
          </div>
          <input
            type="number"
            min="0"
            style={{ ...styles.input, flex: 1 }}
            value={Math.abs(discount) || ""}
            onChange={e => setDiscount(Number(discount) < 0 ? -Math.abs(e.target.value) : Math.abs(e.target.value))}
            placeholder="0"
          />
        </div>
        {svc && (
          <div style={styles.endTimeNote}>
            Precio: {formatPrice(svc.price)}
            {Number(discount) !== 0
              ? ` ${Number(discount) > 0 ? "−" : "+"} ${formatPrice(Math.abs(Number(discount)))} = ${formatPrice(getAppointmentPrice({ discount }, svc))}`
              : ""}
          </div>
        )}

        {!initial && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <label style={{ ...styles.fieldLabel, margin: 0, flex: 1 }}>Repetir semanalmente</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button type="button" onClick={() => setRepeatWeeks(w => Math.max(1, w - 1))} style={{ width: 28, height: 28, borderRadius: 8, border: "1.5px solid #D0C5B4", background: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
              <span style={{ minWidth: 60, textAlign: "center", fontSize: 13.5, fontWeight: 600 }}>{repeatWeeks === 1 ? "No" : `${repeatWeeks} veces`}</span>
              <button type="button" onClick={() => setRepeatWeeks(w => Math.min(52, w + 1))} style={{ width: 28, height: 28, borderRadius: 8, border: "1.5px solid #D0C5B4", background: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            </div>
          </div>
        )}

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
          {onDuplicate && (
            <button type="button" style={styles.duplicateBtn} onClick={onDuplicate}>
              <Copy size={16} /> Duplicar
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

function ExportDisponibilidadModal({ availability, appointments, businessInfo, onClose }) {
  const [days, setDays] = useState(7);
  const [generating, setGenerating] = useState(false);

  const today = new Date();
  const todayKey = dateKey(today);

  // Calcular cupos libres para los próximos N días
  function getOpenSlots() {
    const result = [];
    for (let i = 0; i < days; i++) {
      const d = addDays(today, i);
      const dKey = dateKey(d);
      const dayAvail = availability.filter(s => s.dateKey === dKey);
      if (dayAvail.length === 0) continue;
      const dayAppts = appointments.filter(a => a.dateKey === dKey && a.status !== "cancelado");
      const bookedSlotIds = new Set(dayAppts.map(a => a.fromAvailabilityId).filter(Boolean));
      const open = dayAvail
        .filter(s => !bookedSlotIds.has(s.id) && !s.booked)
        .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
      if (open.length > 0) result.push({ dKey, d, slots: open });
    }
    return result;
  }

  function exportImage() {
    setGenerating(true);
    const openDays = getOpenSlots();
    const W = 800;
    const PADDING = 40;
    const ROW_H = 44;
    const DAY_HEADER_H = 52;
    const HEADER_H = 100;
    const FOOTER_H = 60;

    const totalRows = openDays.reduce((sum, d) => sum + d.slots.length, 0);
    const H = HEADER_H + openDays.length * DAY_HEADER_H + totalRows * ROW_H + FOOTER_H + PADDING;

    const canvas = document.createElement("canvas");
    canvas.width = W * 2;
    canvas.height = H * 2;
    const ctx = canvas.getContext("2d");
    ctx.scale(2, 2);

    // Fondo
    ctx.fillStyle = "#EFE9DF";
    ctx.fillRect(0, 0, W, H);

    // Header
    ctx.fillStyle = "#2A2622";
    ctx.fillRect(0, 0, W, HEADER_H);
    ctx.fillStyle = "#EFE9DF";
    ctx.font = "bold 26px Georgia, serif";
    ctx.fillText(businessInfo?.name || "Angel Meier Turnos", PADDING, 42);
    ctx.font = "16px Arial, sans-serif";
    ctx.fillStyle = "#B5654A";
    ctx.fillText("Turnos disponibles", PADDING, 68);
    const rangeLabel = days === 1 ? "Hoy" : `Próximos ${days} días`;
    ctx.fillStyle = "rgba(239,233,223,0.55)";
    ctx.font = "13px Arial, sans-serif";
    ctx.fillText(rangeLabel, PADDING, 88);

    let y = HEADER_H + 16;

    if (openDays.length === 0) {
      ctx.fillStyle = "#8A8275";
      ctx.font = "16px Arial, sans-serif";
      ctx.fillText("Sin cupos disponibles para este período.", PADDING, y + 30);
    }

    for (const { dKey, d, slots } of openDays) {
      // Día
      const dayName = DAY_NAMES[d.getDay()];
      const monthName = MONTH_NAMES[d.getMonth()];
      ctx.fillStyle = "#B5654A";
      ctx.font = "bold 15px Arial, sans-serif";
      ctx.fillText(`${dayName} ${d.getDate()} de ${monthName}`.toUpperCase(), PADDING, y + 20);
      // línea
      ctx.strokeStyle = "#D0C5B4";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PADDING, y + 30);
      ctx.lineTo(W - PADDING, y + 30);
      ctx.stroke();
      y += DAY_HEADER_H;

      for (const slot of slots) {
        // pill de horario
        ctx.fillStyle = "#fff";
        roundRect(ctx, PADDING, y + 4, 160, ROW_H - 10, 10);
        ctx.fillStyle = "#2A2622";
        ctx.font = "bold 15px Arial, sans-serif";
        ctx.fillText(`${slot.start} – ${slot.end}`, PADDING + 14, y + ROW_H / 2 + 5);
        y += ROW_H;
      }
      y += 8;
    }

    // Footer
    ctx.fillStyle = "#8A8275";
    ctx.font = "12px Arial, sans-serif";
    ctx.fillText("Reservas: " + (businessInfo?.whatsapp ? `WhatsApp ${businessInfo.whatsapp}` : businessInfo?.name || ""), PADDING, H - 24);

    const link = document.createElement("a");
    link.download = `disponibilidad-${todayKey}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    setGenerating(false);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  const openDays = getOpenSlots();

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{ ...styles.modal, maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>Exportar disponibilidad</h3>
          <button type="button" style={styles.iconBtn} onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
          <label style={{ ...styles.fieldLabel, margin: 0, flex: 1 }}>Cantidad de días</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button type="button" onClick={() => setDays(d => Math.max(1, d - 1))} style={{ width: 28, height: 28, borderRadius: 8, border: "1.5px solid #D0C5B4", background: "#fff", fontSize: 16, cursor: "pointer" }}>−</button>
            <span style={{ minWidth: 28, textAlign: "center", fontWeight: 700, fontSize: 15 }}>{days}</span>
            <button type="button" onClick={() => setDays(d => Math.min(7, d + 1))} style={{ width: 28, height: 28, borderRadius: 8, border: "1.5px solid #D0C5B4", background: "#fff", fontSize: 16, cursor: "pointer" }}>+</button>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", marginBottom: 16, minHeight: 60 }}>
          {openDays.length === 0
            ? <p style={{ color: "#8A8275", fontSize: 13, margin: 0 }}>Sin cupos disponibles para los próximos {days} días.</p>
            : openDays.map(({ dKey, d, slots }) => (
              <div key={dKey} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#B5654A", textTransform: "uppercase", marginBottom: 4 }}>
                  {DAY_NAMES[d.getDay()]} {d.getDate()} de {MONTH_NAMES[d.getMonth()]}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {slots.map(s => (
                    <span key={s.id} style={{ background: "#EFE9DF", border: "1px solid #D0C5B4", borderRadius: 8, padding: "3px 10px", fontSize: 13, fontWeight: 600 }}>{s.start}–{s.end}</span>
                  ))}
                </div>
              </div>
            ))
          }
        </div>

        <button
          style={{ ...styles.saveBtn, width: "100%", justifyContent: "center", opacity: openDays.length === 0 ? 0.5 : 1 }}
          onClick={exportImage}
          disabled={generating || openDays.length === 0}
        >
          <Share2 size={16} /> {generating ? "Generando…" : "Descargar imagen"}
        </button>
      </div>
    </div>
  );
}
