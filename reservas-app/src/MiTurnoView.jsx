import React, { useState, useMemo } from "react";
import { Clock, Check, MessageCircle, X, ChevronLeft, Search } from "lucide-react";
import {
  dateKey, timeToMinutes, minutesToTime, isPastSlot,
  formatDateLong, formatDateShort, DAY_NAMES, formatPhoneForWhatsapp,
} from "../../shared/helpers";
import styles from "../../shared/styles";

const LS_KEY = "mam_bookings";

function getLocalTokenMap() {
  try {
    const stored = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    return Object.fromEntries(stored.map(b => [b.apptId, b]));
  } catch {
    return {};
  }
}

function saveToLocalStorage(apptId, cancelToken, dateKey, start, end, serviceName) {
  try {
    const stored = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    const filtered = stored.filter(b => b.apptId !== apptId);
    filtered.push({ apptId, cancelToken, dateKey, start, end, serviceName });
    localStorage.setItem(LS_KEY, JSON.stringify(filtered.slice(-20)));
  } catch {}
}

function removeFromLocalStorage(apptId) {
  try {
    const stored = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    localStorage.setItem(LS_KEY, JSON.stringify(stored.filter(b => b.apptId !== apptId)));
  } catch {}
}

function isMoreThan24hAway(dKey, startTime) {
  const apptMs = new Date(`${dKey}T${startTime}:00`).getTime();
  return apptMs - Date.now() > 24 * 60 * 60 * 1000;
}

export default function MiTurnoView({
  services, availability, businessInfo,
  onGetMyBookings, onCancelAppointment, onReschedule,
  initialPhone = "",
}) {
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState(initialPhone);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [localTokens, setLocalTokens] = useState({});

  // cancel / reschedule state
  const [selected, setSelected] = useState(null);
  const [working, setWorking] = useState(false);
  const [workError, setWorkError] = useState(null);
  const [doneMsg, setDoneMsg] = useState(null);

  // reschedule sub-steps
  const [reschedServiceId, setReschedServiceId] = useState("");
  const [reschedDate, setReschedDate] = useState(null);
  const [reschedSlot, setReschedSlot] = useState(null);

  // ---- Availability index ----
  const availabilityByDate = useMemo(() => {
    const map = {};
    availability.forEach(slot => {
      if (!map[slot.dateKey]) map[slot.dateKey] = [];
      map[slot.dateKey].push(slot);
    });
    return map;
  }, [availability]);

  const todayKey = dateKey(new Date());
  const availableDates = useMemo(() =>
    Object.keys(availabilityByDate)
      .filter(dKey => dKey >= todayKey && availabilityByDate[dKey].some(s => !s.booked))
      .sort()
  , [availabilityByDate, todayKey]);

  const reschedSvc = services.find(s => s.id === reschedServiceId);
  const reschedSlots = useMemo(() => {
    if (!reschedDate || !reschedSvc) return [];
    return (availabilityByDate[reschedDate] || [])
      .filter(s => !s.booked)
      .filter(s => !isPastSlot(reschedDate, s.start))
      .filter(s => timeToMinutes(s.end) - timeToMinutes(s.start) >= reschedSvc.duration)
      .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  }, [reschedDate, reschedSvc, availabilityByDate]);

  // ---- Handlers ----
  async function handleSearch(e) {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setLoadError(null);
    try {
      const refs = await onGetMyBookings(phone);
      const tokens = getLocalTokenMap();
      setLocalTokens(tokens);
      const today = dateKey(new Date());
      const future = refs
        .filter(b => (b.status === "confirmado" || b.status === "pendiente") && b.dateKey >= today)
        .sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.start.localeCompare(b.start));
      setBookings(future);
      setStep("list");
    } catch (e) {
      setLoadError("No pudimos buscar tus turnos. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function startCancel(booking) {
    if (!isMoreThan24hAway(booking.dateKey, booking.start)) return;
    setSelected(booking);
    setWorkError(null);
    setStep("cancel");
  }

  async function confirmCancel() {
    if (!selected || working) return;
    if (!isMoreThan24hAway(selected.dateKey, selected.start)) {
      setWorkError("Ya no es posible cancelar: faltan menos de 24 hs para el turno. Escribime por WhatsApp.");
      return;
    }
    const token = localTokens[selected.id]?.cancelToken;
    if (!token) return;
    setWorking(true);
    setWorkError(null);
    try {
      await onCancelAppointment(selected.id, token, selected.fromAvailabilityId, phone);
      removeFromLocalStorage(selected.id);
      setDoneMsg("Tu turno fue cancelado. El cupo quedó libre para que otro cliente pueda reservarlo.");
      setStep("done");
    } catch (e) {
      setWorkError("No pudimos cancelar tu turno. " + (e.message || "Intentá de nuevo."));
    } finally {
      setWorking(false);
    }
  }

  function startReschedule(booking) {
    if (!isMoreThan24hAway(booking.dateKey, booking.start)) return;
    setSelected(booking);
    setWorkError(null);
    setReschedServiceId(booking.serviceId || services[0]?.id || "");
    setReschedDate(availableDates[0] || null);
    setReschedSlot(null);
    setStep("reschedule");
  }

  async function confirmReschedule() {
    if (!selected || !reschedSlot || !reschedSvc || working) return;
    if (!isMoreThan24hAway(selected.dateKey, selected.start)) {
      setWorkError("Ya no es posible reprogramar: faltan menos de 24 hs para el turno. Escribime por WhatsApp.");
      return;
    }
    const token = localTokens[selected.id]?.cancelToken;
    if (!token) return;
    setWorking(true);
    setWorkError(null);
    try {
      const newEnd = minutesToTime(timeToMinutes(reschedSlot.start) + reschedSvc.duration);
      const result = await onReschedule({
        oldApptId: selected.id,
        oldCancelToken: token,
        oldSlotId: selected.fromAvailabilityId || null,
        newAppt: {
          dateKey: reschedDate,
          start: reschedSlot.start,
          end: newEnd,
          serviceId: reschedSvc.id,
          clientName: selected.clientName || "",
          clientPhone: phone,
          clientId: selected.clientId || null,
          notes: "",
          fromAvailabilityId: reschedSlot.id,
        },
        phone,
      });
      // Actualizar localStorage: quitar el viejo, guardar el nuevo
      removeFromLocalStorage(selected.id);
      saveToLocalStorage(
        result.apptId, result.cancelToken,
        reschedDate, reschedSlot.start, newEnd,
        reschedSvc.name,
      );
      setDoneMsg(
        `Tu turno fue cambiado al ${formatDateLong(reschedDate)}, ${reschedSlot.start} hs.`
      );
      setStep("done");
    } catch (e) {
      setWorkError("No pudimos reprogramar tu turno. " + (e.message || "Intentá de nuevo."));
    } finally {
      setWorking(false);
    }
  }

  const waLink = businessInfo?.whatsapp
    ? `https://wa.me/${formatPhoneForWhatsapp(businessInfo.whatsapp)}`
    : null;

  // ---- Render ----

  if (step === "done") {
    return (
      <div style={styles.viewWrap}>
        <div style={styles.confirmCard}>
          <div style={styles.confirmCheck}><Check size={28} color="#EFE9DF" /></div>
          <h2 style={styles.confirmTitle}>¡Listo!</h2>
          <p style={styles.confirmDetail}>{doneMsg}</p>
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              style={{ ...styles.businessWaBtn, marginTop: 14 }}>
              <MessageCircle size={14} /> Escribime por WhatsApp
            </a>
          )}
          <button style={{ ...styles.saveBtn, marginTop: 20 }}
            onClick={() => { setStep("phone"); setPhone(""); setBookings([]); setDoneMsg(null); }}>
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (step === "cancel") {
    const svcName = services.find(s => s.id === selected?.serviceId)?.name || "";
    return (
      <div style={styles.viewWrap}>
        <button style={styles.backBtn} onClick={() => setStep("list")}>
          <ChevronLeft size={16} /> Volver
        </button>
        <h2 style={styles.sectionTitle}>Cancelar turno</h2>
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E3DBCB", padding: "16px", marginBottom: 16 }}>
          <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15 }}>{formatDateLong(selected?.dateKey)}</p>
          <p style={{ margin: 0, fontSize: 13.5, color: "#6E6555" }}>
            {selected?.start} hs · {svcName}
          </p>
        </div>
        <p style={{ fontSize: 13.5, color: "#4A4337", marginBottom: 20 }}>
          Al cancelar, el cupo va a quedar libre para que otro cliente pueda reservarlo.
          Esta acción no se puede deshacer.
        </p>
        {workError && (
          <p style={{ fontSize: 13, color: "#A6483A", fontWeight: 600, marginBottom: 12 }}>{workError}</p>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button style={styles.cancelBtn} onClick={() => setStep("list")} disabled={working}>
            Volver
          </button>
          <button
            style={{ ...styles.deleteBtn, flex: 1, justifyContent: "center" }}
            onClick={confirmCancel}
            disabled={working}
          >
            {working ? "Cancelando…" : <><X size={15} /> Confirmar cancelación</>}
          </button>
        </div>
      </div>
    );
  }

  if (step === "reschedule") {
    const svcName = reschedSvc?.name || "";
    return (
      <div style={styles.viewWrap}>
        <button style={styles.backBtn} onClick={() => setStep("list")}>
          <ChevronLeft size={16} /> Volver
        </button>
        <h2 style={styles.sectionTitle}>Cambiar horario</h2>

        {services.length > 1 && (
          <>
            <label style={styles.fieldLabel}>Tipo de masaje</label>
            <div style={styles.serviceChips}>
              {services.map(s => (
                <button key={s.id} onClick={() => { setReschedServiceId(s.id); setReschedSlot(null); }}
                  style={{
                    ...styles.serviceChip,
                    ...(reschedServiceId === s.id ? { background: s.color, color: "#EFE9DF", borderColor: s.color } : {}),
                  }}>
                  <span style={{ display: "block", fontWeight: 700 }}>{s.name}</span>
                  <span style={{ opacity: 0.8, fontSize: 12 }}>{s.duration} min</span>
                </button>
              ))}
            </div>
          </>
        )}

        <label style={styles.fieldLabel}>Elegí el día</label>
        {availableDates.length === 0 ? (
          <p style={styles.emptyMsg}>Por ahora no hay turnos disponibles. Escribime directamente.</p>
        ) : (
          <div style={styles.dateScroller}>
            {availableDates.map(dKey => {
              const d = new Date(dKey + "T00:00:00");
              const active = dKey === reschedDate;
              return (
                <button key={dKey} onClick={() => { setReschedDate(dKey); setReschedSlot(null); }}
                  style={{ ...styles.dateChip, ...(active ? styles.dateChipActive : {}) }}>
                  <span style={{ ...styles.dateChipDay, ...(active ? styles.dateChipDayActive : {}) }}>{DAY_NAMES[d.getDay()]}</span>
                  <span style={{ ...styles.dateChipNum, ...(active ? styles.dateChipNumActive : {}) }}>{d.getDate()}</span>
                </button>
              );
            })}
          </div>
        )}

        {reschedDate && (
          <>
            <p style={styles.selectedDateLabel}>{formatDateShort(reschedDate)}</p>
            <label style={styles.fieldLabel}>Horarios disponibles</label>
            {reschedSlots.length === 0 ? (
              <p style={styles.emptyMsg}>No hay horarios libres este día. Probá otra fecha.</p>
            ) : (
              <div style={styles.slotsGrid}>
                {reschedSlots.map(s => (
                  <button key={s.id}
                    onClick={() => setReschedSlot(s)}
                    style={{
                      ...styles.slotBtn,
                      ...(reschedSlot?.id === s.id
                        ? { background: "#2A2622", color: "#EFE9DF", borderColor: "#2A2622" }
                        : {}),
                    }}>
                    <Clock size={13} /> {s.start}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {workError && (
          <p style={{ fontSize: 13, color: "#A6483A", fontWeight: 600, margin: "12px 0 0" }}>{workError}</p>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button style={styles.cancelBtn} onClick={() => setStep("list")} disabled={working}>
            Volver
          </button>
          <button
            style={{ ...styles.saveBtn, flex: 1, justifyContent: "center", opacity: (!reschedSlot || working) ? 0.5 : 1 }}
            onClick={confirmReschedule}
            disabled={!reschedSlot || working}
          >
            {working ? "Guardando…" : "Confirmar cambio"}
          </button>
        </div>
      </div>
    );
  }

  if (step === "list") {
    return (
      <div style={styles.viewWrap}>
        <h2 style={styles.sectionTitle}>Mis turnos</h2>
        <p style={{ fontSize: 13, color: "#8A8275", marginBottom: 16 }}>
          Turnos para <strong>{phone}</strong>
        </p>
        {bookings.length === 0 ? (
          <p style={styles.emptyMsg}>No encontramos turnos futuros para ese teléfono.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {bookings.map(b => {
              const svc = services.find(s => s.id === b.serviceId);
              const hasToken = !!localTokens[b.id]?.cancelToken;
              const canModify = hasToken && isMoreThan24hAway(b.dateKey, b.start);
              const tooClose = hasToken && !isMoreThan24hAway(b.dateKey, b.start);
              return (
                <div key={b.id} style={{
                  background: "#fff", borderRadius: 14, border: "1px solid #E3DBCB", padding: "14px 16px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14.5 }}>
                      {formatDateLong(b.dateKey)}
                    </p>
                    <span style={{
                      fontSize: 11.5, fontWeight: 600, borderRadius: 20, padding: "2px 9px",
                      ...(b.status === "confirmado"
                        ? { background: "#E6F4EA", color: "#2E7D32" }
                        : { background: "#FFF8E1", color: "#B37D00" }),
                    }}>
                      {b.status === "confirmado" ? "Confirmado" : "Pendiente"}
                    </span>
                  </div>
                  <p style={{ margin: "0 0 10px", fontSize: 13, color: "#6E6555" }}>
                    {b.start} hs · {svc?.name || "Masaje"}
                  </p>

                  {canModify && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        style={{ ...styles.deleteBtn, flex: 1, justifyContent: "center", fontSize: 13 }}
                        onClick={() => startCancel(b)}
                      >
                        <X size={14} /> Cancelar turno
                      </button>
                      <button
                        style={{ ...styles.saveBtn, flex: 1, justifyContent: "center", fontSize: 13 }}
                        onClick={() => startReschedule(b)}
                      >
                        Cambiar horario
                      </button>
                    </div>
                  )}

                  {(tooClose || !hasToken) && (
                    <div style={{
                      background: "#FBF5EC", border: "1px solid #E8D9B8", borderRadius: 10,
                      padding: "10px 12px",
                    }}>
                      <p style={{ margin: "0 0 8px", fontSize: 12.5, color: "#6E6555" }}>
                        {tooClose
                          ? "Faltan menos de 24 hs para tu turno. Para cambios con tan poca anticipación, escribime directamente."
                          : "Para gestionar este turno desde otro dispositivo, escribime directamente."}
                      </p>
                      {waLink && (
                        <a href={waLink} target="_blank" rel="noopener noreferrer"
                          style={{ ...styles.businessWaBtn, marginTop: 0 }}>
                          <MessageCircle size={14} /> Escribir por WhatsApp
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <button style={{ ...styles.cancelBtn, marginTop: 20, width: "100%" }}
          onClick={() => { setStep("phone"); setBookings([]); }}>
          Buscar con otro teléfono
        </button>
      </div>
    );
  }

  // step === "phone"
  return (
    <div style={styles.viewWrap}>
      <h2 style={styles.sectionTitle}>Mis turnos</h2>
      <p style={{ fontSize: 13.5, color: "#4A4337", marginBottom: 20 }}>
        Ingresá tu número de teléfono para ver y gestionar tus turnos.
      </p>
      <form onSubmit={handleSearch}>
        <label style={styles.fieldLabel}>Tu teléfono (WhatsApp)</label>
        <input
          style={styles.input}
          type="tel"
          value={phone}
          onChange={e => { setPhone(e.target.value); setLoadError(null); }}
          placeholder="11 1234 5678"
          autoFocus
        />
        {loadError && (
          <p style={{ fontSize: 13, color: "#A6483A", fontWeight: 600, margin: "8px 0 0" }}>{loadError}</p>
        )}
        <button
          type="submit"
          disabled={loading || !phone.trim()}
          style={{
            ...styles.saveBtn, marginTop: 16, width: "100%", justifyContent: "center",
            opacity: (loading || !phone.trim()) ? 0.5 : 1,
          }}
        >
          {loading ? "Buscando…" : <><Search size={15} /> Buscar mis turnos</>}
        </button>
      </form>
    </div>
  );
}
