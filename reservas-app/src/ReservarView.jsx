import React, { useState, useEffect, useMemo } from "react";
import { Calendar, Clock, Check, MessageCircle, CalendarDays, List } from "lucide-react";
import {
  dateKey, timeToMinutes, minutesToTime, isPastSlot,
  formatPrice, formatDateLong, formatDateShort, DAY_NAMES, formatPhoneForWhatsapp,
} from "../../shared/helpers";
import { MiniCalendar } from "../../shared/MiniCalendar";
import styles from "../../shared/styles";

const LS_KEY = "mam_bookings";

function saveBookingToLocalStorage(apptId, cancelToken, appt, serviceName) {
  try {
    const stored = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    const filtered = stored.filter(b => b.apptId !== apptId);
    filtered.push({ apptId, cancelToken, dateKey: appt.dateKey, start: appt.start, end: appt.end, serviceName });
    localStorage.setItem(LS_KEY, JSON.stringify(filtered.slice(-20)));
  } catch {}
}

export default function ReservarView({ services, availability, businessInfo, onBookSlot, onUpsertClient, onNavigateToMiTurno, giftCardCode, preselectedServiceId, onBack, onGoGiftCard }) {
  const availabilityByDate = useMemo(() => {
    const map = {};
    availability.forEach(slot => {
      if (!map[slot.dateKey]) map[slot.dateKey] = [];
      map[slot.dateKey].push(slot);
    });
    return map;
  }, [availability]);

  const availableDates = useMemo(() => {
    const todayK = dateKey(new Date());
    return Object.keys(availabilityByDate)
      .filter(dKey => dKey >= todayK && (availabilityByDate[dKey] || []).length > 0)
      .sort();
  }, [availabilityByDate]);

  const availableDatesSet = useMemo(() => new Set(availableDates), [availableDates]);

  const [selectedDate, setSelectedDate] = useState(null);
  const [serviceId, setServiceId] = useState(preselectedServiceId || services[0]?.id || "");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [confirmed, setConfirmed] = useState(null);
  const [booking, setBooking] = useState(false);
  const [dateViewMode, setDateViewMode] = useState("list");
  const [phoneError, setPhoneError] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    if (!selectedDate && availableDates.length > 0) setSelectedDate(availableDates[0]);
  }, [availableDates, selectedDate]);

  useEffect(() => {
    if (!serviceId && services.length > 0) setServiceId(services[0].id);
  }, [services, serviceId]);

  const svc = services.find(s => s.id === serviceId);

  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate || !svc) return [];
    return (availabilityByDate[selectedDate] || [])
      .filter(s => !s.booked)
      .filter(s => !isPastSlot(selectedDate, s.start))
      .filter(s => timeToMinutes(s.end) - timeToMinutes(s.start) >= svc.duration)
      .sort((a,b) => timeToMinutes(a.start)-timeToMinutes(b.start));
  }, [selectedDate, svc, availabilityByDate]);

  async function bookSlot(slot) {
    if (!clientName.trim() || !clientPhone.trim() || !svc || booking) return;
    setBooking(true);

    let clientId = null;
    if (onUpsertClient) {
      try {
        clientId = await onUpsertClient(clientName, clientPhone);
      } catch (err) {
        console.error("No se pudo registrar la ficha de cliente:", err);
      }
    }

    const end = minutesToTime(timeToMinutes(slot.start) + svc.duration);
    const appt = {
      dateKey: selectedDate,
      start: slot.start,
      end,
      serviceId,
      clientName: clientName.trim(),
      clientPhone,
      notes: "",
      status: "pendiente",
      fromAvailabilityId: slot.id,
      ...(clientId ? { clientId } : {}),
      ...(giftCardCode ? { giftCardCode } : {}),
    };
    let result;
    try {
      result = await onBookSlot(appt);
    } catch (err) {
      console.error(err);
      alert("Hubo un problema al reservar. Probá de nuevo, puede que alguien haya tomado ese horario.");
      setBooking(false);
      return;
    }
    const confirmedAppt = { ...appt, apptId: result.apptId, cancelToken: result.cancelToken };
    saveBookingToLocalStorage(result.apptId, result.cancelToken, appt, svc?.name || "");
    if (businessInfo?.whatsapp) {
      const msg = `Hola! Reservé un turno de ${svc.name} para el ${formatDateLong(selectedDate)} a las ${slot.start}. Mi nombre es ${clientName.trim()}.`;
      window.open(`https://wa.me/${formatPhoneForWhatsapp(businessInfo.whatsapp)}?text=${encodeURIComponent(msg)}`, "_blank");
    }
    setSelectedSlot(null);
    setConfirmed(confirmedAppt);
    setBooking(false);
  }

  if (confirmed) {
    const cSvc = services.find(s => s.id === confirmed.serviceId);
    return (
      <div style={styles.viewWrap}>
        <div style={styles.confirmCard}>
          <div style={styles.confirmCheck}><Check size={28} color="#EFE9DF" /></div>
          <h2 style={styles.confirmTitle}>{giftCardCode ? "Turno confirmado" : "Turno pendiente de confirmación"}</h2>
          {giftCardCode
            ? <p style={{ ...styles.confirmDetail, color: "#4A5A40", fontWeight: 600, marginBottom: 4 }}>🎁 Pago con gift card</p>
            : <p style={{ ...styles.confirmDetail, color: "#8A8275", marginBottom: 4 }}>Te confirmamos el turno pronto por WhatsApp.</p>
          }
          <p style={styles.confirmDetail}>{cSvc?.name} · {confirmed.start} a {confirmed.end}</p>
          {cSvc?.price && <p style={styles.confirmPrice}>{formatPrice(cSvc.price)}</p>}
          <p style={styles.confirmDetail}>{formatDateLong(confirmed.dateKey)}</p>
          <p style={{ ...styles.confirmDetail, marginTop: 10 }}>{businessInfo?.address}</p>
          {businessInfo?.whatsapp && (
            <a
              href={`https://wa.me/${formatPhoneForWhatsapp(businessInfo.whatsapp)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...styles.businessWaBtn, marginTop: 14 }}
            >
              <MessageCircle size={14} /> Cualquier duda, escribime por WhatsApp
            </a>
          )}
          <button style={{ ...styles.saveBtn, marginTop: 16 }} onClick={() => { setConfirmed(null); setClientName(""); setClientPhone(""); setSelectedSlot(null); }}>
            Reservar otro turno
          </button>
          {onNavigateToMiTurno && (
            <button
              style={{ ...styles.cancelBtn, marginTop: 8 }}
              onClick={() => onNavigateToMiTurno(confirmed.clientPhone)}
            >
              Modificar mi turno
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.viewWrap}>
      {giftCardCode && onBack && (
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#B5654A", fontWeight: 600, fontSize: 13, padding: "0 0 12px", display: "flex", alignItems: "center", gap: 4 }}>
          ← Volver a la gift card
        </button>
      )}
      {giftCardCode && (
        <div style={{ background: "#EBF3E6", border: "1.5px solid #9AB88A", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#4A5A40", fontWeight: 600 }}>
          🎁 Reserva con gift card — este turno ya está pago
        </div>
      )}
      {!giftCardCode && onGoGiftCard && (
        <div style={styles.giftCardBanner} onClick={onGoGiftCard} role="button">
          <div style={styles.giftCardBannerIcon}>🎁</div>
          <div style={styles.giftCardBannerText}>
            <p style={styles.giftCardBannerTitle}>Regalá una sesión</p>
            <p style={styles.giftCardBannerSub}>Gift cards para regalar · válidas 30 días</p>
          </div>
          <div style={styles.giftCardBannerArrow}>›</div>
        </div>
      )}
      <h2 style={styles.sectionTitle}>Reservá tu sesión</h2>
      <div style={styles.businessInfoCard}>
        <div style={styles.businessInfoRow}>
          <Clock size={14} color="#8A8275" />
          <span>{businessInfo?.hoursLabel}</span>
        </div>
        <div style={styles.businessInfoRow}>
          <Calendar size={14} color="#8A8275" />
          <span>{businessInfo?.address} <span style={{ color: "#8A8275" }}>· {businessInfo?.addressDetail}</span></span>
        </div>
        {businessInfo?.whatsapp && (
          <a
            href={`https://wa.me/${formatPhoneForWhatsapp(businessInfo.whatsapp)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.businessWaBtn}
          >
            <MessageCircle size={14} /> Escribime por WhatsApp ante cualquier duda
          </a>
        )}
      </div>

      <label style={styles.fieldLabel}>Tu nombre</label>
      <input id="client-name-input" style={styles.input} value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nombre y apellido" />
      <label style={styles.fieldLabel}>Teléfono (WhatsApp)</label>
      <input id="client-phone-input" style={styles.input} value={clientPhone} onChange={e => { setClientPhone(e.target.value); if (phoneError) setPhoneError(""); }} placeholder="11 1234 5678" />
      {phoneError && <p style={{ color: "#c0392b", fontSize: 13, marginTop: 4, marginBottom: 0 }}>{phoneError}</p>}

      <label style={styles.fieldLabel}>Tipo de masaje</label>
      <div style={styles.serviceChips}>
        {services.map(s => (
          <button
            key={s.id}
            onClick={() => setServiceId(s.id)}
            style={{
              ...styles.serviceChip,
              ...(serviceId === s.id ? { background: s.color, color: "#EFE9DF", borderColor: s.color } : {}),
            }}
          >
            <span style={{ display: "block", fontWeight: 700 }}>{s.name}</span>
            <span style={{ opacity: 0.8, fontSize: 12, fontWeight: 500 }}>
              {s.duration} min{s.price ? ` · ${formatPrice(s.price)}` : ""}
            </span>
          </button>
        ))}
      </div>

      {availableDates.length === 0 ? (
        <p style={styles.emptyMsg}>Por ahora no hay turnos abiertos. Escribime directamente y vemos un horario.</p>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, marginBottom: 6 }}>
            <label style={{ ...styles.fieldLabel, margin: 0 }}>Elegí el día</label>
            <div style={styles.dateViewToggle}>
              <button
                type="button"
                style={{ ...styles.dateViewToggleBtn, ...(dateViewMode === "list" ? styles.dateViewToggleBtnActive : {}) }}
                onClick={() => setDateViewMode("list")}
                title="Ver como lista"
              >
                <List size={14} />
              </button>
              <button
                type="button"
                style={{ ...styles.dateViewToggleBtn, ...(dateViewMode === "calendar" ? styles.dateViewToggleBtnActive : {}) }}
                onClick={() => setDateViewMode("calendar")}
                title="Ver como calendario"
              >
                <CalendarDays size={14} />
              </button>
            </div>
          </div>

          {dateViewMode === "calendar" ? (
            <MiniCalendar
              selectedDateKey={selectedDate}
              onSelectDate={(dKey) => setSelectedDate(dKey)}
              markedDateKeys={availableDatesSet}
              isDaySelectable={(dKey) => availableDatesSet.has(dKey)}
            />
          ) : (
            <div style={styles.dateScroller}>
              {availableDates.map(dKey => {
                const d = new Date(dKey + "T00:00:00");
                const active = dKey === selectedDate;
                return (
                  <button
                    key={dKey}
                    onClick={() => setSelectedDate(dKey)}
                    style={{ ...styles.dateChip, ...(active ? styles.dateChipActive : {}) }}
                  >
                    <span style={{ ...styles.dateChipDay, ...(active ? styles.dateChipDayActive : {}) }}>{DAY_NAMES[d.getDay()]}</span>
                    <span style={{ ...styles.dateChipNum, ...(active ? styles.dateChipNumActive : {}) }}>{d.getDate()}</span>
                  </button>
                );
              })}
            </div>
          )}

          {selectedDate && (
            <p style={styles.selectedDateLabel}>{formatDateShort(selectedDate)}</p>
          )}

          <label style={styles.fieldLabel}>Horarios disponibles</label>
          {slotsForSelectedDate.length === 0 ? (
            <p style={styles.emptyMsg}>No hay horarios libres este día para este servicio. Probá otra fecha o un servicio más corto.</p>
          ) : (
            <div style={styles.slotsGrid}>
              {slotsForSelectedDate.map(s => (
                <button
                  key={s.id}
                  disabled={booking}
                  style={{
                    ...styles.slotBtn,
                    opacity: booking ? 0.5 : 1,
                    ...(selectedSlot?.id === s.id ? { background: "#2A2622", color: "#EFE9DF", borderColor: "#2A2622" } : {}),
                  }}
                  onClick={() => {
                    if (!clientName.trim()) {
                      document.getElementById("client-name-input")?.focus();
                      return;
                    }
                    if (!clientPhone.trim()) {
                      setPhoneError("Ingresá tu número de teléfono para poder reservar");
                      document.getElementById("client-phone-input")?.focus();
                      return;
                    }
                    setPhoneError("");
                    setSelectedSlot(s);
                  }}
                >
                  <Clock size={13} /> {s.start}
                </button>
              ))}
            </div>
          )}

          {selectedSlot && slotsForSelectedDate.some(s => s.id === selectedSlot.id) && (
            <div style={{ background: "#F5F0E8", borderRadius: 12, padding: "14px 16px", marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#2A2622" }}>{svc?.name}</div>
              <div style={{ fontSize: 13, color: "#5A5046" }}>
                {formatDateLong(selectedDate)} · {selectedSlot.start} a {minutesToTime(timeToMinutes(selectedSlot.start) + (svc?.duration || 0))}
              </div>
              {svc?.price && <div style={{ fontSize: 13, color: "#5A5046" }}>{formatPrice(svc.price)}</div>}
              <button
                style={{ ...styles.saveBtn, marginTop: 10, opacity: booking ? 0.6 : 1 }}
                disabled={booking}
                onClick={() => bookSlot(selectedSlot)}
              >
                {booking ? "Reservando…" : "Confirmar turno"}
              </button>
            </div>
          )}

        </>
      )}
    </div>
  );
}
