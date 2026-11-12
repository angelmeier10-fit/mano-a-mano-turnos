import React, { useState, useEffect, useMemo } from "react";
import { Calendar, Clock, Check, MessageCircle, CalendarDays, List } from "lucide-react";
import {
  dateKey, timeToMinutes, minutesToTime, isPastSlot,
  formatPrice, formatDateLong, formatDateShort, DAY_NAMES, formatPhoneForWhatsapp,
  applyClientDiscount, getTrafficSource, HOW_FOUND_OPTIONS, getReferralAmount,
  slotLocationId, serviceAtLocation, servicePrice, locationSnapshot, servicePaymentLink, bookableStarts,
} from "../../shared/helpers";
import { PayButton } from "./TransferInfo";
import { getClientDiscountPublic, getCombosByPhone, isExistingClientPublic, getReferralCreditPublic } from "../../shared/firestoreApi";
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

// El celular puede recargar la página al volver de pagar: la confirmación se guarda para esta
// pestaña, y por poco tiempo para no mostrar una vieja.
const CONFIRMED_MAX_AGE_MS = 2 * 60 * 60 * 1000;
const confirmedKey = () => `confirmedBooking:${window.location.search}`;
function readConfirmed() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(confirmedKey()));
    return saved && Date.now() - saved.savedAt < CONFIRMED_MAX_AGE_MS ? saved.booking : null;
  } catch {
    return null;
  }
}
function writeConfirmed(booking) {
  try {
    if (booking) sessionStorage.setItem(confirmedKey(), JSON.stringify({ booking, savedAt: Date.now() }));
    else sessionStorage.removeItem(confirmedKey());
  } catch {
    // Sin almacenamiento, la confirmación funciona igual hasta que se recargue la página.
  }
}

export default function ReservarView({ services: allServices, availability: allAvailability, locations = [], businessInfo, onBookSlot, onUpsertClient, onNavigateToMiTurno, giftCardCode, preselectedServiceId, initialServiceId, onBack, onGoGiftCard, onGoCombo, referralMode = false }) {
  // Con 0 o 1 lugar no hay que elegir. Con varios, se filtran servicios y cupos por el lugar elegido.
  const multiLoc = locations.length > 1;
  const [locationId, setLocationId] = useState(multiLoc ? null : (locations[0]?.id || null));
  useEffect(() => {
    if (!multiLoc && locations[0] && !locationId) setLocationId(locations[0].id);
  }, [locations, multiLoc, locationId]);
  const location = locations.find(l => l.id === locationId) || null;
  // Gift card / combo: solo los lugares donde se ofrece ese servicio.
  const preselectedSvc = allServices.find(s => s.id === preselectedServiceId);
  const pickableLocations = preselectedSvc ? locations.filter(l => serviceAtLocation(preselectedSvc, l.id)) : locations;
  const services = useMemo(
    () => allServices.filter(s => serviceAtLocation(s, multiLoc ? locationId : null)),
    [allServices, multiLoc, locationId]
  );
  const availability = useMemo(
    () => multiLoc ? allAvailability.filter(s => slotLocationId(s, locations) === locationId) : allAvailability,
    [allAvailability, multiLoc, locations, locationId]
  );
  const address = location?.address || businessInfo?.address;
  const addressDetail = location ? location.addressDetail : businessInfo?.addressDetail;

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
  const [serviceId, setServiceId] = useState(preselectedServiceId || initialServiceId || services[0]?.id || "");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientDiscount, setClientDiscount] = useState(null);
  const [myCombos, setMyCombos] = useState([]);
  const [useCombo, setUseCombo] = useState(true);
  const [confirmed, setConfirmed] = useState(() => (preselectedServiceId ? null : readConfirmed()));
  const [booking, setBooking] = useState(false);
  const [dateViewMode, setDateViewMode] = useState("list");
  const [phoneError, setPhoneError] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [howFound, setHowFound] = useState("");
  const [isExistingClient, setIsExistingClient] = useState(false);
  const [referredByName, setReferredByName] = useState("");
  const [referralCredit, setReferralCredit] = useState(0);
  const trafficSource = useMemo(() => getTrafficSource(), []);

  useEffect(() => {
    if (!preselectedServiceId) writeConfirmed(confirmed);
  }, [confirmed, preselectedServiceId]);
  // Al ir a otra sección se olvida: el turno pudo cambiar o cancelarse desde ahí. Una recarga no pasa por acá.
  useEffect(() => () => {
    if (!preselectedServiceId) writeConfirmed(null);
  }, [preselectedServiceId]);

  useEffect(() => {
    if (!selectedDate && availableDates.length > 0) setSelectedDate(availableDates[0]);
  }, [availableDates, selectedDate]);

  // Si el servicio elegido no se ofrece en el lugar, se pasa al primero que sí.
  useEffect(() => {
    if (services.length > 0 && !services.some(s => s.id === serviceId)) setServiceId(services[0].id);
  }, [services, serviceId]);

  // Al cambiar de lugar, la fecha elegida puede no tener cupos ahí.
  useEffect(() => {
    if (selectedDate && !availableDatesSet.has(selectedDate)) { setSelectedDate(availableDates[0] || null); setSelectedSlot(null); }
  }, [availableDatesSet]);

  const referralAmount = getReferralAmount(businessInfo);
  const referralApplies = referralMode && referralAmount > 0 && !isExistingClient && !!referredByName.trim();
  function priceWithDiscounts(price, sId) {
    const { finalPrice, discountAmount } = applyClientDiscount(price, clientDiscount, sId);
    const referralDiscount = referralApplies ? Math.min(referralAmount, finalPrice) : 0;
    return { finalPrice: finalPrice - referralDiscount, discountAmount: discountAmount + referralDiscount, referralDiscount };
  }

  const svc = services.find(s => s.id === serviceId);
  const svcPrice = svc ? servicePrice(svc, locationId) : 0;
  const { finalPrice: svcFinalPrice, discountAmount: svcDiscountAmount, referralDiscount: svcReferralDiscount } = priceWithDiscounts(svcPrice, serviceId);
  const matchingCombo = myCombos.find(c => c.status === "active" && c.sessionsRemaining > 0 && c.serviceId === serviceId);

  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate || !svc) return [];
    return bookableStarts(availabilityByDate[selectedDate] || [], svc.duration)
      .filter(s => !isPastSlot(selectedDate, s.start, s.allowLastMinute ? 0 : 60));
  }, [selectedDate, svc, availabilityByDate]);

  // El crédito por recomendar se descuenta recién al pagar, así que no figura en el turno.
  function bookingPaymentLink(appt, service) {
    if (preselectedServiceId || appt.comboId || referralCredit > 0) return "";
    return servicePaymentLink(service, appt.price - appt.discount);
  }

  async function bookSlot(slot) {
    if (!clientName.trim() || !clientPhone.trim() || !svc || booking) return;
    setBooking(true);

    // Se re-verifica acá porque el chequeo del onBlur es asíncrono y la ficha se crea justo abajo.
    let referralDiscount = 0;
    if (referralApplies && !(useCombo && matchingCombo)) {
      const existing = await isExistingClientPublic(clientPhone);
      if (existing) {
        setIsExistingClient(true);
        setBooking(false);
        return;
      }
      referralDiscount = svcReferralDiscount;
    }

    let clientId = null;
    if (onUpsertClient) {
      try {
        clientId = await onUpsertClient(clientName, clientPhone);
      } catch (err) {
        console.error("No se pudo registrar la ficha de cliente:", err);
      }
    }

    const usingCombo = useCombo && !!matchingCombo;
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
      ...(slot.slotIds.length > 1 ? { extraAvailabilityIds: slot.slotIds.slice(1) } : {}),
      price: usingCombo ? 0 : svcPrice,
      discount: usingCombo ? 0 : svcDiscountAmount,
      ...locationSnapshot(location),
      ...(clientId ? { clientId } : {}),
      ...(giftCardCode ? { giftCardCode } : {}),
      ...(usingCombo ? { comboId: matchingCombo.id } : {}),
      ...(referralDiscount > 0 ? { referredByName: referredByName.trim(), referralDiscount } : {}),
      source: referralMode ? "recomendacion" : (trafficSource || howFound || ""),
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
    if (typeof window.fbq === "function") window.fbq("track", "Schedule");
    const paymentLink = bookingPaymentLink(appt, svc);
    let whatsappUrl = null;
    if (businessInfo?.whatsapp) {
      const msg = `Hola! Reservé un turno de ${svc.name} para el ${formatDateLong(selectedDate)} a las ${slot.start}${multiLoc && location ? ` en ${location.name}` : ""}. Mi nombre es ${clientName.trim()}.`;
      whatsappUrl = `https://wa.me/${formatPhoneForWhatsapp(businessInfo.whatsapp)}?text=${encodeURIComponent(msg)}`;
      // Abrir WhatsApp sacaría al cliente de la pantalla donde está el botón de pago.
      if (!paymentLink) window.open(whatsappUrl, "_blank");
    }
    setSelectedSlot(null);
    setConfirmed({ ...confirmedAppt, whatsappUrl, paymentLink });
    setBooking(false);
  }

  if (confirmed) {
    const cSvc = services.find(s => s.id === confirmed.serviceId);
    const payLink = confirmed.paymentLink;
    return (
      <div style={styles.viewWrap}>
        <div style={styles.confirmCard}>
          <div style={styles.confirmCheck}><Check size={28} color="#EFE9DF" /></div>
          <h2 style={styles.confirmTitle}>Turno pendiente de confirmación</h2>
          {giftCardCode
            ? <p style={{ ...styles.confirmDetail, color: "#4A5A40", fontWeight: 600, marginBottom: 4 }}>🎁 Pago con gift card · te confirmamos el turno pronto por WhatsApp.</p>
            : confirmed.comboId
            ? <p style={{ ...styles.confirmDetail, color: "#4A5A40", fontWeight: 600, marginBottom: 4 }}>📦 Pagado con tu combo</p>
            : <p style={{ ...styles.confirmDetail, color: "#8A8275", marginBottom: 4 }}>Te confirmamos el turno pronto por WhatsApp.</p>
          }
          <p style={styles.confirmDetail}>{cSvc?.name} · {confirmed.start} a {confirmed.end}</p>
          {confirmed.price > 0 && !preselectedServiceId && !confirmed.comboId && (
            <p style={styles.confirmPrice}>
              {confirmed.discount > 0
                ? <><span style={{ textDecoration: "line-through", opacity: 0.6, marginRight: 6, fontSize: "0.8em" }}>{formatPrice(confirmed.price)}</span>{formatPrice(Math.max(0, confirmed.price - confirmed.discount))}</>
                : formatPrice(confirmed.price)}
            </p>
          )}
          <p style={styles.confirmDetail}>{formatDateLong(confirmed.dateKey)}</p>
          {multiLoc && confirmed.locationName && <p style={{ ...styles.confirmDetail, marginTop: 10, fontWeight: 700 }}>{confirmed.locationName}</p>}
          <p style={{ ...styles.confirmDetail, marginTop: multiLoc ? 2 : 10 }}>{confirmed.locationAddress || businessInfo?.address}</p>
          {payLink && <PayButton href={payLink} style={{ marginTop: 14 }} />}
          {businessInfo?.whatsapp && (
            <a
              href={payLink ? confirmed.whatsappUrl : `https://wa.me/${formatPhoneForWhatsapp(businessInfo.whatsapp)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...styles.businessWaBtn, marginTop: 14 }}
            >
              <MessageCircle size={14} /> {payLink ? "Avisar por WhatsApp" : "Cualquier duda, escribime por WhatsApp"}
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
      {!giftCardCode && onGoCombo && (
        <div style={styles.comboBanner} onClick={onGoCombo} role="button">
          <div style={styles.comboBannerIcon}>📦</div>
          <div style={styles.comboBannerText}>
            <p style={styles.comboBannerTitle}>Combos de sesiones</p>
            <p style={styles.comboBannerSub}>Pagá por adelantado y ahorrá · válidos 60 días</p>
          </div>
          <div style={styles.comboBannerArrow}>›</div>
        </div>
      )}
      {referralMode && referralAmount > 0 && (
        <div style={{ background: "#F7EDE6", border: "1.5px solid #B5654A", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 13.5, color: "#2A2622" }}>
          <strong>Venís recomendado 🙌</strong> Tenés {formatPrice(referralAmount)} de descuento en tu primera sesión. Completá quién te recomendó más abajo.
        </div>
      )}
      <h2 style={styles.sectionTitle}>Reservá tu sesión</h2>
      <div style={styles.businessInfoCard}>
        <div style={styles.businessInfoRow}>
          <Clock size={14} color="#8A8275" />
          <span>{businessInfo?.hoursLabel}</span>
        </div>
        {(!multiLoc || location) && (
          <div style={styles.businessInfoRow}>
            <Calendar size={14} color="#8A8275" />
            <span>{address}{addressDetail ? <span style={{ color: "#8A8275" }}> · {addressDetail}</span> : null}</span>
          </div>
        )}
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

      {multiLoc && (
        <>
          <label style={styles.fieldLabel}>¿Dónde querés atenderte?</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
            {pickableLocations.map(loc => {
              const active = loc.id === locationId;
              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => { setLocationId(loc.id); setSelectedSlot(null); }}
                  style={{
                    ...styles.serviceChip, width: "100%", textAlign: "left",
                    ...(active ? { background: "#2A2622", color: "#EFE9DF", borderColor: "#2A2622" } : {}),
                  }}
                >
                  <span style={{ display: "block", fontWeight: 700 }}>{loc.name}</span>
                  <span style={{ opacity: 0.8, fontSize: 12, fontWeight: 500 }}>
                    {[loc.address, loc.addressDetail].filter(Boolean).join(" · ")}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {(!multiLoc || location) && <>
      <label style={styles.fieldLabel}>Tu nombre</label>
      <input id="client-name-input" style={styles.input} value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nombre y apellido" />
      <label style={styles.fieldLabel}>Teléfono (WhatsApp)</label>
      <input
        id="client-phone-input"
        style={styles.input}
        value={clientPhone}
        onChange={e => { setClientPhone(e.target.value); if (phoneError) setPhoneError(""); }}
        onBlur={async () => {
          if (!clientPhone.trim()) { setClientDiscount(null); setMyCombos([]); setIsExistingClient(false); setReferralCredit(0); return; }
          setClientDiscount(await getClientDiscountPublic(clientPhone));
          setReferralCredit(await getReferralCreditPublic(clientPhone));
          if (referralMode) setIsExistingClient(await isExistingClientPublic(clientPhone));
          try {
            const combos = await getCombosByPhone(clientPhone);
            setMyCombos(combos);
            const usable = combos.find(c => c.status === "active" && c.sessionsRemaining > 0);
            if (usable) { setServiceId(usable.serviceId); setUseCombo(true); }
          } catch { setMyCombos([]); }
        }}
        placeholder="11 1234 5678"
      />
      {phoneError && <p style={{ color: "#c0392b", fontSize: 13, marginTop: 4, marginBottom: 0 }}>{phoneError}</p>}

      {referralCredit > 0 && (
        <div style={{ background: "#EBF3E6", border: "1.5px solid #6E7F5C", borderRadius: 10, padding: "10px 14px", margin: "10px 0 4px", fontSize: 13, color: "#3D5430" }}>
          <strong>Tenés {formatPrice(referralCredit)} de crédito por recomendar.</strong> Se descuentan {formatPrice(referralAmount > 0 ? Math.min(referralAmount, referralCredit) : referralCredit)} de tu próximo turno al momento de pagar.
        </div>
      )}

      {referralMode && referralAmount > 0 && (
        <>
          <label style={styles.fieldLabel}>¿Quién te recomendó?</label>
          <input
            style={styles.input}
            value={referredByName}
            onChange={e => setReferredByName(e.target.value)}
            placeholder="Nombre de quien te pasó el link"
          />
          {isExistingClient && (
            <p style={{ color: "#8A8275", fontSize: 12.5, marginTop: 4, marginBottom: 0 }}>
              El descuento por recomendación es para la primera sesión. ¡Gracias por volver!
            </p>
          )}
        </>
      )}

      {!trafficSource && !referralMode && (
        <>
          <label style={styles.fieldLabel}>¿Cómo nos conociste?</label>
          <select style={styles.input} value={howFound} onChange={e => setHowFound(e.target.value)}>
            <option value="">Preferí no decir</option>
            {HOW_FOUND_OPTIONS.map(o => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </>
      )}

      <label style={styles.fieldLabel}>Servicio</label>
      {preselectedServiceId ? (
        <div style={styles.serviceChips}>
          {services.filter(s => s.id === preselectedServiceId).map(s => (
            <div
              key={s.id}
              style={{ ...styles.serviceChip, background: s.color, color: "#EFE9DF", borderColor: s.color, cursor: "default" }}
            >
              <span style={{ display: "block", fontWeight: 700 }}>{s.name}</span>
              <span style={{ opacity: 0.85, fontSize: 12, fontWeight: 500 }}>
                {s.duration} min · incluido en gift card
              </span>
            </div>
          ))}
        </div>
      ) : (
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
                {s.duration} min{servicePrice(s, locationId) ? ` · ${formatPrice(priceWithDiscounts(servicePrice(s, locationId), s.id).finalPrice)}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}

      {matchingCombo && !preselectedServiceId && (
        <div style={{ background: "#EBF3E6", border: "1.5px solid #6E7F5C", borderRadius: 10, padding: "10px 14px", margin: "4px 0 16px" }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#3D5430", marginBottom: 4 }}>
            📦 Tenés un combo de {matchingCombo.serviceName}
          </div>
          <div style={{ fontSize: 12.5, color: "#4A5A40", marginBottom: 8 }}>
            Te quedan {matchingCombo.sessionsRemaining} sesión{matchingCombo.sessionsRemaining !== 1 ? "es" : ""}.
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#2A2622", cursor: "pointer" }}>
            <input type="checkbox" checked={useCombo} onChange={e => setUseCombo(e.target.checked)} />
            Usar una sesión de este combo — turno gratis
          </label>
        </div>
      )}

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
              {multiLoc && location && <div style={{ fontSize: 13, color: "#5A5046" }}>{location.name}{location.address ? ` · ${location.address}` : ""}</div>}
              <div style={{ fontSize: 13, color: "#5A5046" }}>
                {formatDateLong(selectedDate)} · {selectedSlot.start} a {minutesToTime(timeToMinutes(selectedSlot.start) + (svc?.duration || 0))}
              </div>
              {svcPrice > 0 && !preselectedServiceId && (
                <div style={{ fontSize: 13, color: "#5A5046" }}>
                  {svcDiscountAmount > 0
                    ? <><span style={{ textDecoration: "line-through", opacity: 0.6, marginRight: 6 }}>{formatPrice(svcPrice)}</span>{formatPrice(svcFinalPrice)}</>
                    : formatPrice(svcPrice)}
                </div>
              )}
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
      </>}
    </div>
  );
}
