// shared/firestoreApi.js
//
// Funciones compartidas para leer/escribir en Firestore.
// Ambas apps (agenda-app y reservas-app) importan este archivo.

import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  setDoc,
  getDocs,
  writeBatch,
  runTransaction,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import { firebaseConfig } from "./firebaseConfig";
import { timeToMinutes, publicApptFields, apptSlotIds, slotsCoveringRange, fitsInFranja, busyEntry, releaseFranja } from "./helpers";

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
if (import.meta.env?.VITE_USE_EMULATOR) connectFirestoreEmulator(db, "127.0.0.1", 8080);

// ---------- Negocio activo ----------
// Todos los datos viven en businesses/{businessId}/... Cada app fija el negocio una
// sola vez (agenda: el del dueño logueado; reservas: el del link ?b=) antes de leer.
export const DEFAULT_BUSINESS_ID = "mano-a-mano";
let businessId = null;

export function setBusinessId(id) {
  businessId = id;
}
function currentBusinessId() {
  if (!businessId) throw new Error("No hay un negocio seleccionado.");
  return businessId;
}
function bcol(...path) {
  return collection(db, "businesses", currentBusinessId(), ...path);
}
function bdoc(...path) {
  return doc(db, "businesses", currentBusinessId(), ...path);
}

// Link público de reservas del negocio activo. Mano a Mano no lleva ?b= para que
// los links que ya circulan sigan siendo iguales.
const RESERVAS_URL = "https://angelmeier10-fit.github.io/mano-a-mano-turnos/mano-a-mano-reservas/";
export function reservasUrl(params = {}) {
  const q = new URLSearchParams();
  if (currentBusinessId() !== DEFAULT_BUSINESS_ID) q.set("b", currentBusinessId());
  for (const [k, v] of Object.entries(params)) q.set(k, v);
  const s = q.toString();
  return s ? `${RESERVAS_URL}?${s}` : RESERVAS_URL;
}

export async function getBusinessForOwner(uid) {
  const snap = await getDocs(query(collection(db, "businesses"), where("ownerUid", "==", uid)));
  return snap.empty ? null : snap.docs[0].id;
}
export async function businessExists(id) {
  const snap = await getDoc(doc(db, "businesses", id));
  return snap.exists();
}

// ---------- Alta y suscripción ----------
export async function createOwnBusiness({ slug, name, uid, email }) {
  const batch = writeBatch(db);
  batch.set(doc(db, "businesses", slug), { name: name.trim(), ownerUid: uid, createdAt: serverTimestamp(), showQuiz: false, whatsapp: "" });
  batch.set(doc(db, "billing", slug), { ownerEmail: email, plan: "regular", termsAcceptedAt: serverTimestamp() });
  batch.set(doc(db, "businessOwners", uid), { bizId: slug });
  await batch.commit();
}
export async function getBillingConfig() {
  const snap = await getDoc(doc(db, "appConfig", "billing"));
  return snap.exists() ? snap.data() : {};
}
export async function saveBillingConfig(data) {
  return setDoc(doc(db, "appConfig", "billing"), data, { merge: true });
}
export async function getOwnBilling() {
  const snap = await getDoc(doc(db, "billing", currentBusinessId()));
  return snap.exists() ? snap.data() : null;
}
// Solo el admin: combina cada negocio con sus datos de cobro.
export async function listSubscriptions() {
  const [businesses, billing] = await Promise.all([
    getDocs(collection(db, "businesses")),
    getDocs(collection(db, "billing")),
  ]);
  const billingById = Object.fromEntries(billing.docs.map(d => [d.id, d.data()]));
  return businesses.docs.map(d => ({ id: d.id, business: d.data(), billing: billingById[d.id] || null }));
}
export async function registerSubscriptionPayment(id, { activeUntil, amount, plan }) {
  const batch = writeBatch(db);
  batch.update(doc(db, "businesses", id), { activeUntil });
  batch.set(doc(db, "billing", id), { payments: arrayUnion({ at: Date.now(), amount, plan, activeUntil }) }, { merge: true });
  await batch.commit();
}
export async function updateSubscription(id, data) {
  return updateDoc(doc(db, "businesses", id), data);
}
export async function updateBilling(id, data) {
  return setDoc(doc(db, "billing", id), data, { merge: true });
}

// Lugar del turno que se copia a phoneIndex/bookings para mostrarlo en "Mi turno".
function bookingLocationFields(appt) {
  if (!appt.locationId) return {};
  return { locationId: appt.locationId, locationName: appt.locationName || "", locationAddress: appt.locationAddress || "" };
}

// El público no puede leer turnos: cancelar/reprogramar usa los datos copiados en phoneIndex/bookings.
async function readApptForPublic(apptId, phone, phoneVariant) {
  for (const v of [...new Set([phoneVariant, ...phoneVariants(phone)].filter(Boolean))]) {
    const snap = await getDoc(bdoc("phoneIndex", v, "bookings", apptId));
    if (snap.exists()) return snap.data();
  }
  return {};
}

// Dos rangos horarios se superponen si empiezan antes de que termine el otro.
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(bStart) < timeToMinutes(aEnd);
}

// ---------- Servicios ----------
export function listenServices(callback) {
  return onSnapshot(bcol("services"), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, (err) => console.error("[listenServices] snapshot error:", err));
}
export async function addService(service) {
  return addDoc(bcol("services"), service);
}
// Usa un id fijo (en vez de uno autogenerado) para que sembrar los servicios
// por defecto sea idempotente: si dos pestañas/dispositivos lo disparan a la
// vez, ambos escriben el mismo documento en lugar de crear duplicados.
export async function setServiceWithId(id, service) {
  return setDoc(bdoc("services", id), service, { merge: true });
}
export async function updateService(id, data) {
  return updateDoc(bdoc("services", id), data);
}
export async function deleteService(id) {
  return deleteDoc(bdoc("services", id));
}

// ---------- Lugares de atención ----------
export function listenLocations(callback) {
  return onSnapshot(bcol("locations"), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, (err) => console.error("[listenLocations] snapshot error:", err));
}
export async function addLocation(location) {
  return addDoc(bcol("locations"), { ...location, createdAt: Date.now() });
}
export async function updateLocation(id, data) {
  return updateDoc(bdoc("locations", id), data);
}
export async function deleteLocation(id) {
  return deleteDoc(bdoc("locations", id));
}

// ---------- Disponibilidad (cupos abiertos por el profesional) ----------
// fromDateKey (opcional): solo cupos desde esa fecha, para no leer los pasados.
export function listenAvailability(callback, fromDateKey) {
  const ref = fromDateKey ? query(bcol("availability"), where("dateKey", ">=", fromDateKey)) : bcol("availability");
  return onSnapshot(ref, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, (err) => console.error("[listenAvailability] snapshot error:", err));
}
// Lo que ocupan los turnos ya cargados (con el descanso de su servicio), para marcarlos
// dentro de una franja nueva que se abre encima.
async function busyOfAppts(appts) {
  if (!appts.length) return [];
  const svcSnap = await getDocs(bcol("services"));
  const services = new Map(svcSnap.docs.map(d => [d.id, { id: d.id, ...d.data() }]));
  return appts.map(a => busyEntry(a.id, a.start, a.end, services.get(a.serviceId)));
}
const busyInside = (busy, slot) => busy.filter(b => rangesOverlap(slot.start, slot.end, b.start, b.end));

export async function addAvailabilitySlot(slot) {
  // slot: { dateKey, start, end, locationId?, serviceIds? }
  const slotSnap = await getDocs(query(bcol("availability"), where("dateKey", "==", slot.dateKey)));
  const overlapsSlot = slotSnap.docs.some(d => rangesOverlap(slot.start, slot.end, d.data().start, d.data().end));
  if (overlapsSlot) {
    throw new Error(`Ya existe un horario abierto que se superpone con ese el ${slot.dateKey}.`);
  }
  // Los turnos que ya están en ese horario quedan ocupados dentro de la franja,
  // y la franja queda anotada en el turno para liberarla si se cancela.
  const apptSnap = await getDocs(query(bcol("appointments"), where("dateKey", "==", slot.dateKey)));
  const appts = apptSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(a => a.status !== "cancelado");
  const busy = busyInside(await busyOfAppts(appts), slot);
  const ref = await addDoc(bcol("availability"), { ...slot, ...(busy.length ? { busy } : {}) });
  await Promise.all(busy.map(b => updateDoc(bdoc("appointments", b.apptId), { extraAvailabilityIds: arrayUnion(ref.id) })));
  return ref;
}
export async function removeAvailabilitySlot(id) {
  return deleteDoc(bdoc("availability", id));
}
// Saca un turno de las franjas que ocupa (y destraba cupos viejos reservados enteros).
// Cada franja va en su transacción para no pisar otra reserva que entre al mismo tiempo.
export async function releaseAppointmentFranjas(apptId, slotIds) {
  for (const id of slotIds) {
    try {
      const ref = bdoc("availability", id);
      await runTransaction(db, async (t) => {
        const snap = await t.get(ref);
        const update = snap.exists() ? releaseFranja(snap.data(), apptId) : null;
        if (update) t.update(ref, update);
      });
    } catch (e) {
      console.error("[availability] No se pudo liberar la franja:", e);
    }
  }
}
// El servicio del turno (duración y descanso). Si no se encuentra, se usa la duración del turno.
async function apptService(appt) {
  if (appt.serviceId) {
    const snap = await getDoc(bdoc("services", appt.serviceId));
    if (snap.exists()) return { id: snap.id, ...snap.data() };
  }
  return { id: appt.serviceId || null, duration: timeToMinutes(appt.end) - timeToMinutes(appt.start), restMinutes: 0 };
}
// Permite que el cupo se vea en reservas aunque falte menos de 1 hora.
export async function setAvailabilitySlotLastMinute(id, allowLastMinute) {
  return updateDoc(bdoc("availability", id), { allowLastMinute });
}
// Marca como cancelado el registro en phoneIndex/bookings del cliente (best-effort).
// Se usa cuando el profesional cancela un turno desde la Agenda.
export async function markBookingRefCancelled(clientPhone, apptId) {
  const phoneDigits = normalizePhone(clientPhone);
  if (!phoneDigits || !apptId) return;
  try {
    await updateDoc(bdoc("phoneIndex", phoneDigits, "bookings", apptId), { status: "cancelado" });
  } catch {
    // Si el cliente no tiene registro en phoneIndex/bookings, se ignora silenciosamente.
  }
}
// Borra la entrada en phoneIndex/bookings cuando el profesional elimina el turno desde la Agenda.
export async function deleteBookingRef(clientPhone, apptId) {
  const phoneDigits = normalizePhone(clientPhone);
  if (!phoneDigits || !apptId) {
    console.error("[phoneIndex/bookings] deleteBookingRef: clientPhone o apptId faltante", { clientPhone, apptId });
    return;
  }
  try {
    await deleteDoc(bdoc("phoneIndex", phoneDigits, "bookings", apptId));
  } catch (e) {
    console.error("[phoneIndex/bookings] No se pudo borrar la referencia:", e, { phoneDigits, apptId });
  }
}
// Marca como confirmado el registro en phoneIndex/bookings del cliente (best-effort).
// Se usa cuando el profesional confirma un turno pendiente desde la Agenda.
// Usa setDoc con merge:true para que funcione aunque el documento no exista todavía.
export async function markBookingRefConfirmed(clientPhone, apptId) {
  const phoneDigits = normalizePhone(clientPhone);
  if (!phoneDigits || !apptId) {
    console.error("[phoneIndex/bookings] markBookingRefConfirmed: clientPhone o apptId faltante", { clientPhone, apptId });
    return;
  }
  try {
    await setDoc(bdoc("phoneIndex", phoneDigits, "bookings", apptId), { status: "confirmado" }, { merge: true });
  } catch (e) {
    console.error("[phoneIndex/bookings] No se pudo marcar como confirmado:", e, { phoneDigits, apptId });
  }
}
// Actualiza dateKey, start, end y serviceName en phoneIndex/bookings cuando el profesional
// edita un turno desde la Agenda. Usa setDoc merge:true para cubrir el caso de que no exista.
export async function updateBookingRef(clientPhone, apptId, { dateKey, start, end, serviceName, ...rest }) {
  const phoneDigits = normalizePhone(clientPhone);
  if (!phoneDigits || !apptId) return;
  try {
    await setDoc(
      bdoc("phoneIndex", phoneDigits, "bookings", apptId),
      { dateKey, start, end, serviceName: serviceName || "", ...bookingLocationFields(rest) },
      { merge: true }
    );
  } catch (e) {
    console.error("[phoneIndex/bookings] No se pudo actualizar la referencia:", e, { phoneDigits, apptId });
  }
}
// Crea muchas franjas de una sola vez (ej: "todos los lunes de 10 a 14, por 8 semanas")
// Firestore permite hasta 500 escrituras por batch; si hay más, las dividimos.
// Descarta duplicados: no inserta cupos que ya existan con el mismo dateKey+start+end.
// Devuelve la cantidad de cupos efectivamente creados.
export async function addAvailabilitySlotsBatch(slots) {
  if (slots.length === 0) return 0;

  // Obtener todas las dateKeys únicas involucradas
  const dateKeys = [...new Set(slots.map(s => s.dateKey))];

  // Consultar cupos y turnos existentes para esas fechas (en lotes de 30 por límite de 'in')
  const existingSlots = [];
  const existingAppts = [];
  for (let i = 0; i < dateKeys.length; i += 30) {
    const chunk = dateKeys.slice(i, i + 30);
    const snap = await getDocs(query(bcol("availability"), where("dateKey", "in", chunk)));
    snap.forEach(d => existingSlots.push(d.data()));
    const apptSnap = await getDocs(query(bcol("appointments"), where("dateKey", "in", chunk)));
    apptSnap.forEach(d => {
      const data = d.data();
      if (data.status !== "cancelado") existingAppts.push({ id: d.id, ...data });
    });
  }

  // Se descartan las franjas que se superpondrían con una ya existente o con otra nueva del
  // mismo lote. Los turnos ya cargados quedan ocupados dentro de la franja nueva.
  const accepted = [];
  const newSlots = slots.filter(s => {
    if (existingSlots.some(e => e.dateKey === s.dateKey && rangesOverlap(s.start, s.end, e.start, e.end))) return false;
    if (accepted.some(a => a.dateKey === s.dateKey && rangesOverlap(s.start, s.end, a.start, a.end))) return false;
    accepted.push(s);
    return true;
  });
  if (newSlots.length === 0) return 0;

  const allBusy = await busyOfAppts(existingAppts);
  const apptDateKey = new Map(existingAppts.map(a => [a.id, a.dateKey]));
  const chunks = [];
  for (let i = 0; i < newSlots.length; i += 200) chunks.push(newSlots.slice(i, i + 200));
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach(slot => {
      const ref = doc(bcol("availability"));
      const busy = busyInside(allBusy.filter(b => apptDateKey.get(b.apptId) === slot.dateKey), slot);
      batch.set(ref, { ...slot, ...(busy.length ? { busy } : {}) });
      busy.forEach(b => batch.update(bdoc("appointments", b.apptId), { extraAvailabilityIds: arrayUnion(ref.id) }));
    });
    await batch.commit();
  }
  return newSlots.length;
}
// Borra todos los cupos (sin reservar) de un día puntual
export async function removeAvailabilitySlotsByIds(ids) {
  if (ids.length === 0) return;
  const chunks = [];
  for (let i = 0; i < ids.length; i += 450) chunks.push(ids.slice(i, i + 450));
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach(id => batch.delete(bdoc("availability", id)));
    await batch.commit();
  }
}

// ---------- Turnos ----------

function generateCancelToken() {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const arr = new Uint8Array(18);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, "0")).join("");
  }
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Reserva atómica: lee el cupo, verifica que no esté ocupado, lo marca booked:true
// y crea el turno en una sola transacción. Previene que dos personas reserven el
// mismo horario simultáneamente.
// Devuelve { apptId, cancelToken } para que la app pública lo guarde en localStorage.
export async function bookSlotAtomic(appt) {
  const cancelToken = generateCancelToken();
  const slotId = appt.fromAvailabilityId;
  const giftCardCode = appt.giftCardCode || null;
  const comboId = appt.comboId || null;

  const apptData = {
    ...appt,
    cancelToken,
    cancelProof: null,
    createdAt: Date.now(),
    ...(giftCardCode ? { paidByGiftCard: true, giftCardCode } : {}),
    ...(comboId ? { paidByCombo: true, comboId } : {}),
  };

  if (!slotId) {
    const apptSnap = await getDocs(query(bcol("appointments"), where("dateKey", "==", appt.dateKey)));
    const overlapping = apptSnap.docs.some(d => {
      const data = d.data();
      return data.status !== "cancelado" && rangesOverlap(appt.start, appt.end, data.start, data.end);
    });
    if (overlapping) {
      throw new Error("Este horario ya fue reservado. Por favor elegí otro.");
    }
    const ref = await addDoc(bcol("appointments"), apptData);
    if (giftCardCode) await redeemGiftCard(giftCardCode, ref.id);
    if (comboId) await redeemComboSession(comboId, ref.id);
    return { apptId: ref.id, cancelToken };
  }

  const service = await apptService(appt);
  const slotRef = bdoc("availability", slotId);
  let apptId;
  await runTransaction(db, async (transaction) => {
    const slotSnap = await transaction.get(slotRef);
    if (!slotSnap.exists() || !fitsInFranja(slotSnap.data(), appt.start, service)) {
      throw new Error("Este horario ya fue reservado. Por favor elegí otro.");
    }
    const apptRef = doc(bcol("appointments"));
    apptId = apptRef.id;
    transaction.update(slotRef, { busy: [...(slotSnap.data().busy || []), busyEntry(apptId, appt.start, appt.end, service)] });
    transaction.set(apptRef, apptData);
  });

  if (giftCardCode) await redeemGiftCard(giftCardCode, apptId);
  if (comboId) await redeemComboSession(comboId, apptId);

  // Guardar referencia en phoneIndex/bookings (best-effort, no bloquea la reserva)
  const phoneDigits = normalizePhone(appt.clientPhone);
  if (phoneDigits && apptId) {
    try {
      await setDoc(bdoc("phoneIndex", phoneDigits, "bookings", apptId), {
        dateKey: appt.dateKey,
        start: appt.start,
        end: appt.end,
        serviceId: appt.serviceId || null,
        fromAvailabilityId: slotId,
        ...(appt.extraAvailabilityIds ? { extraAvailabilityIds: appt.extraAvailabilityIds } : {}),
        clientName: appt.clientName || "",
        clientId: appt.clientId || null,
        status: apptData.status || "confirmado",
        requiresCancelToken: true,
        cancelToken,
        ...bookingLocationFields(appt),
        ...publicApptFields(apptData),
      });
    } catch (e) {
      console.error("[phoneIndex/bookings] No se pudo guardar la referencia:", e);
    }
  }

  return { apptId, cancelToken };
}

// Devuelve las referencias de reservas del cliente a partir de su teléfono.
// Incluye cancelToken (si la reserva lo tiene) para poder cancelar/reprogramar
// desde cualquier dispositivo con solo conocer el teléfono.
export async function getMyBookingRefs(phone) {
  const phoneDigits = normalizePhone(phone);
  if (!phoneDigits) return [];
  try {
    const variants = phoneVariants(phone);
    const snaps = await Promise.all(
      variants.map(v => getDocs(bcol("phoneIndex", v, "bookings")))
    );
    const seen = new Set();
    const results = [];
    snaps.forEach((snap, i) => {
      for (const d of snap.docs) {
        if (!seen.has(d.id)) { seen.add(d.id); results.push({ id: d.id, ...d.data(), _phoneVariant: variants[i] }); }
      }
    });
    return results;
  } catch (e) {
    console.error("[phoneIndex/bookings] No se pudo leer las reservas:", e);
    return [];
  }
}

// Escribe un evento en appointmentHistory (best-effort, nunca bloquea la operación principal).
export async function addAppointmentHistory(event) {
  try {
    await addDoc(bcol("appointmentHistory"), event);
  } catch (e) {
    console.error("[appointmentHistory] No se pudo guardar el evento:", e);
  }
}

// Trae el historial de movimientos de un cliente por clientId, ordenado más reciente primero.
export async function getAppointmentHistory(clientId) {
  if (!clientId) return [];
  try {
    const snap = await getDocs(
      query(bcol("appointmentHistory"), where("clientId", "==", clientId))
    );
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => b.happenedAt - a.happenedAt);
  } catch (e) {
    console.error("[appointmentHistory] No se pudo leer el historial:", e);
    return [];
  }
}

// Cancela un turno desde la app pública. El cliente debe proveer el cancelToken
// que recibió al reservar (se envía como cancelProof para que Firestore lo valide).
// historyData es opcional: { clientId, clientPhone, clientName, originalDateKey,
//   originalStart, originalEnd, serviceId, serviceName }
export async function cancelAppointmentPublic(apptId, cancelToken, availabilitySlotId, phone, historyData, phoneVariant) {
  const appt = await readApptForPublic(apptId, phone, phoneVariant);
  const giftCardCode = appt.giftCardCode || null;
  const comboId = appt.comboId || null;

  // Priorizamos el teléfono con el que el cliente encontró el turno como prueba
  // (Firestore valida que phoneIndex/{proof}/bookings/{apptId} exista): es más
  // confiable que el cancelToken, que puede desincronizarse entre colecciones.
  const cancelProof = phoneVariant || normalizePhone(phone) || cancelToken || null;

  await updateDoc(bdoc("appointments", apptId), {
    status: "cancelado",
    cancelProof,
  });
  await releaseAppointmentFranjas(apptId, apptSlotIds({ fromAvailabilityId: availabilitySlotId, extraAvailabilityIds: appt.extraAvailabilityIds }));
  if (normalizePhone(phone)) {
    try {
      await Promise.allSettled(
        phoneVariants(phone).map(v =>
          updateDoc(bdoc("phoneIndex", v, "bookings", apptId), { status: "cancelado" })
        )
      );
    } catch {}
  }
  if (giftCardCode) {
    try {
      await restoreGiftCard(giftCardCode);
    } catch (e) {
      console.error("[giftCard] No se pudo restaurar la gift card:", e);
    }
  }
  if (comboId) {
    try {
      await restoreComboSession(comboId, apptId);
    } catch (e) {
      console.error("[combo] No se pudo restaurar la sesión del combo:", e);
    }
  }

  if (historyData) {
    addAppointmentHistory({
      ...historyData,
      apptId,
      eventType: "cancelado_cliente",
      happenedAt: Date.now(),
    });
  }
}

// Reprograma un turno: cancela el viejo (atómico) y crea uno nuevo.
// Devuelve { apptId, cancelToken } del nuevo turno.
// historyData es opcional: { clientId, clientPhone, clientName, originalDateKey,
//   originalStart, originalEnd, serviceId, serviceName }
export async function rescheduleAppointmentPublic({ oldApptId, oldCancelToken, oldSlotId, newAppt, phone, historyData, oldPhoneVariant }) {
  const newCancelToken = generateCancelToken();
  const oldApptRef = bdoc("appointments", oldApptId);
  // Igual que en cancelAppointmentPublic: priorizamos el teléfono como prueba,
  // más confiable que el cancelToken.
  const oldCancelProof = oldPhoneVariant || normalizePhone(phone) || oldCancelToken || null;

  const oldAppt = await readApptForPublic(oldApptId, phone, oldPhoneVariant);
  const giftCardCode = oldAppt.giftCardCode || null;
  const comboId = oldAppt.comboId || null;
  // El turno nuevo mantiene precio y descuentos del original. Si cambió el servicio,
  // el precio y el descuento VIP (que es por servicio) no aplican, pero el de referido sí.
  const carriedFields = {};
  for (const key of ["referredByName", "referralDiscount", "source", "giftCardCode", "paidByGiftCard", "comboId", "paidByCombo"]) {
    if (oldAppt[key] !== undefined) carriedFields[key] = oldAppt[key];
  }
  if (oldAppt.serviceId === newAppt.serviceId) {
    if (oldAppt.price !== undefined) carriedFields.price = oldAppt.price;
    if (oldAppt.discount !== undefined) carriedFields.discount = oldAppt.discount;
  } else if (oldAppt.referralDiscount) {
    carriedFields.discount = oldAppt.referralDiscount;
  }
  const newApptData = {
    ...carriedFields,
    ...newAppt,
    cancelToken: newCancelToken,
    cancelProof: null,
    status: "confirmado",
    createdAt: Date.now(),
  };
  const service = await apptService(newAppt);
  const newSlotRef = bdoc("availability", newAppt.fromAvailabilityId);
  const newApptRef = doc(bcol("appointments"));
  const newApptId = newApptRef.id;

  await runTransaction(db, async (t) => {
    const newSlotSnap = await t.get(newSlotRef);
    const franja = newSlotSnap.exists() ? newSlotSnap.data() : null;
    // El turno viejo no le quita lugar al nuevo si están en la misma franja.
    const withoutOld = franja && { ...franja, busy: (franja.busy || []).filter(b => b.apptId !== oldApptId) };
    if (!franja || !fitsInFranja(withoutOld, newAppt.start, service)) {
      throw new Error("Este horario ya fue tomado. Por favor elegí otro.");
    }
    // La franja vieja se libera después, aparte: las reglas dejan agregar o sacar
    // un turno por escritura, y puede ser la misma franja que la nueva.
    t.update(oldApptRef, { status: "cancelado", cancelProof: oldCancelProof });
    t.update(newSlotRef, { busy: [...(franja.busy || []), busyEntry(newApptId, newAppt.start, newAppt.end, service)] });
    t.set(newApptRef, newApptData);
  });

  if (giftCardCode) {
    try {
      await updateGiftCardApptId(giftCardCode, newApptId);
    } catch (e) {
      console.error("[giftCard] No se pudo actualizar apptId en gift card:", e);
    }
  }
  if (comboId) {
    try {
      await updateComboApptId(comboId, oldApptId, newApptId);
    } catch (e) {
      console.error("[combo] No se pudo actualizar apptId en el combo:", e);
    }
  }

  await releaseAppointmentFranjas(oldApptId, apptSlotIds({ fromAvailabilityId: oldSlotId, extraAvailabilityIds: oldAppt.extraAvailabilityIds }));

  const phoneDigits = normalizePhone(phone);
  if (phoneDigits) {
    try {
      await Promise.allSettled(
        phoneVariants(phone).map(v => deleteDoc(bdoc("phoneIndex", v, "bookings", oldApptId)))
      );
      await setDoc(bdoc("phoneIndex", phoneDigits, "bookings", newApptId), {
        dateKey: newAppt.dateKey,
        start: newAppt.start,
        end: newAppt.end,
        serviceId: newAppt.serviceId || null,
        fromAvailabilityId: newAppt.fromAvailabilityId,
        ...(newAppt.extraAvailabilityIds ? { extraAvailabilityIds: newAppt.extraAvailabilityIds } : {}),
        clientName: newAppt.clientName || "",
        clientId: newAppt.clientId || null,
        status: "confirmado",
        requiresCancelToken: true,
        cancelToken: newCancelToken,
        ...bookingLocationFields(newAppt),
        ...publicApptFields(newApptData),
      });
    } catch {}
  }

  if (historyData) {
    addAppointmentHistory({
      ...historyData,
      apptId: oldApptId,
      eventType: "reprogramado_cliente",
      happenedAt: Date.now(),
      newApptId,
      newDateKey: newAppt.dateKey,
      newStart: newAppt.start,
      newEnd: newAppt.end,
    });
  }

  return { apptId: newApptId, cancelToken: newCancelToken };
}

export function listenAppointments(callback) {
  return onSnapshot(bcol("appointments"), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, (err) => console.error("[listenAppointments] snapshot error:", err));
}

// Llama a onNew solo para turnos creados después de sessionStart (evita falsos positivos por cache/reconexión).
// Solo trae lo creado después de sessionStart, así no vuelve a leer toda la colección.
export function listenIncomingPendingAppointments(sessionStart, onNew) {
  return onSnapshot(query(bcol("appointments"), where("createdAt", ">", sessionStart)), (snap) => {
    snap.docChanges().forEach(change => {
      if (change.type === "added") {
        const a = { id: change.doc.id, ...change.doc.data() };
        if (a.status === "pendiente" && a.createdAt > sessionStart) onNew(a);
      }
    });
  }, (err) => console.error("[listenIncomingPendingAppointments] snapshot error:", err));
}
export function listenIncomingPendingGiftCards(sessionStart, onNew) {
  return onSnapshot(query(bcol("giftCards"), where("createdAt", ">", sessionStart)), (snap) => {
    snap.docChanges().forEach(change => {
      if (change.type === "added") {
        const gc = { id: change.doc.id, ...change.doc.data() };
        if (gc.status === "pending" && gc.createdAt > sessionStart) onNew(gc);
      }
    });
  }, (err) => console.error("[listenIncomingPendingGiftCards] snapshot error:", err));
}
export function listenIncomingPendingCombos(sessionStart, onNew) {
  return onSnapshot(query(bcol("combos"), where("createdAt", ">", sessionStart)), (snap) => {
    snap.docChanges().forEach(change => {
      if (change.type === "added") {
        const c = { id: change.doc.id, ...change.doc.data() };
        if (c.status === "pending" && c.createdAt > sessionStart) onNew(c);
      }
    });
  }, (err) => console.error("[listenIncomingPendingCombos] snapshot error:", err));
}
export async function createAppointment(appt) {
  // appt: { dateKey, start, end, serviceId, clientName, clientPhone, notes, status, fromAvailabilityId? }
  const dupCheck = await getDocs(query(
    bcol("appointments"),
    where("dateKey", "==", appt.dateKey),
  ));
  const overlapping = dupCheck.docs.some(d => {
    const data = d.data();
    return data.status !== "cancelado" && rangesOverlap(appt.start, appt.end, data.start, data.end);
  });
  if (overlapping) {
    throw new Error(`Ya existe un turno que se superpone con ${appt.start}-${appt.end} el ${appt.dateKey}.`);
  }

  // El turno (con el descanso de su servicio) ocupa las franjas que se pisan con su horario.
  // Si se cargó desde una franja, esa queda como principal. Todo en una transacción para que
  // un cliente no reserve el mismo horario a la vez.
  const apptRef = doc(bcol("appointments"));
  const entry = busyEntry(apptRef.id, appt.start, appt.end, await apptService(appt));
  const { fromAvailabilityId: _from, ...apptFields } = appt;
  const covering = slotsCoveringRange(await getDaySlots(appt.dateKey), entry.start, entry.end).map(s => s.id);
  const slotId = covering.includes(appt.fromAvailabilityId) ? appt.fromAvailabilityId : covering[0] || null;
  const slotIds = slotId ? [slotId, ...covering.filter(id => id !== slotId)] : [];
  const extraIds = slotIds.slice(1);
  const apptData = {
    ...apptFields,
    ...(slotId ? { fromAvailabilityId: slotId } : {}),
    ...(extraIds.length ? { extraAvailabilityIds: extraIds } : {}),
    createdAt: Date.now(),
  };
  if (slotIds.length) {
    const slotRefs = slotIds.map(id => bdoc("availability", id));
    await runTransaction(db, async (t) => {
      const slotSnaps = await Promise.all(slotRefs.map(ref => t.get(ref)));
      if (slotSnaps.some(snap => !snap.exists() || snap.data().booked)) {
        throw new Error("Este horario ya fue reservado.");
      }
      slotSnaps.forEach((snap, i) => t.update(slotRefs[i], { busy: [...(snap.data().busy || []), entry] }));
      t.set(apptRef, apptData);
    });
  } else {
    await setDoc(apptRef, apptData);
  }

  const phoneDigits = normalizePhone(appt.clientPhone);
  if (phoneDigits) {
    try {
      await setDoc(bdoc("phoneIndex", phoneDigits, "bookings", apptRef.id), {
        dateKey: appt.dateKey,
        start: appt.start,
        end: appt.end,
        serviceId: appt.serviceId || null,
        fromAvailabilityId: slotId,
        ...(extraIds.length ? { extraAvailabilityIds: extraIds } : {}),
        clientName: appt.clientName || "",
        clientId: appt.clientId || null,
        status: appt.status || "confirmado",
        requiresCancelToken: false,
        ...bookingLocationFields(appt),
        ...publicApptFields(appt),
      });
    } catch (e) {
      console.error("[phoneIndex/bookings] No se pudo crear la referencia desde Agenda:", e);
    }
  }
  return apptRef;
}
export async function updateAppointment(id, data) {
  return updateDoc(bdoc("appointments", id), data);
}
async function getDaySlots(dKey) {
  const snap = await getDocs(query(bcol("availability"), where("dateKey", "==", dKey)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Al editar un turno desde la Agenda: libera los cupos anteriores que ya no usa, ocupa los
// cupos libres que se pisan con el nuevo horario y actualiza el turno, todo atómicamente.
// Devuelve los cupos que quedó ocupando.
export async function updateAppointmentWithSlotSwap(apptId, oldSlotIds, newData) {
  // La query no puede ir dentro de la transacción (limitación del SDK web de Firestore)
  const dupCheck = await getDocs(query(
    bcol("appointments"),
    where("dateKey", "==", newData.dateKey),
  ));
  const activeDup = dupCheck.docs.find(d => {
    if (d.id === apptId) return false;
    const data = d.data();
    return data.status !== "cancelado" && rangesOverlap(newData.start, newData.end, data.start, data.end);
  });
  if (activeDup) {
    throw new Error(`Ya existe un turno que se superpone con ${newData.start}-${newData.end} el ${newData.dateKey}.`);
  }

  // Las franjas que ya ocupa este turno cuentan como libres para el nuevo horario.
  const entry = busyEntry(apptId, newData.start, newData.end, await apptService(newData));
  const daySlots = (await getDaySlots(newData.dateKey)).map(s => oldSlotIds.includes(s.id) ? { ...s, booked: false } : s);
  const newSlotIds = slotsCoveringRange(daySlots, entry.start, entry.end).map(s => s.id);
  const allIds = [...new Set([...oldSlotIds, ...newSlotIds])];
  const apptRef = bdoc("appointments", apptId);

  await runTransaction(db, async (t) => {
    // Firestore exige todos los reads antes de cualquier write en la transacción
    const snaps = await Promise.all(allIds.map(id => t.get(bdoc("availability", id))));
    const writes = [];
    snaps.forEach((snap, i) => {
      const id = allIds[i];
      const isNew = newSlotIds.includes(id);
      if (!snap.exists()) {
        if (isNew) throw new Error("Uno de los horarios ya no existe.");
        return;
      }
      const data = snap.data();
      const wasOldBooked = oldSlotIds.includes(id) && data.booked;
      if (isNew && data.booked && !wasOldBooked) throw new Error("Ese horario ya fue reservado.");
      const busy = (data.busy || []).filter(b => b.apptId !== apptId);
      if (isNew) busy.push(entry);
      writes.push([snap.ref, { busy, ...(wasOldBooked ? { booked: false } : {}) }]);
    });
    writes.forEach(([ref, data]) => t.update(ref, data));
    t.update(apptRef, { ...newData, fromAvailabilityId: newSlotIds[0] || null, extraAvailabilityIds: newSlotIds.slice(1) });
  });

  return { fromAvailabilityId: newSlotIds[0] || null, extraAvailabilityIds: newSlotIds.slice(1) };
}
export async function deleteAppointment(id) {
  return deleteDoc(bdoc("appointments", id));
}

// ---------- Clientes ----------
export function listenClients(callback) {
  return onSnapshot(bcol("clients"), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, (err) => console.error("[listenClients] snapshot error:", err));
}
function normalizePhone(phone) {
  return (phone || "").replace(/[^\d]/g, "");
}

// Genera todas las variantes del número para buscar sin importar el formato guardado.
// Formatos argentinos: 10d local, 11d con 0, 12d con 54, 13d con 549 (WhatsApp móvil).
function phoneVariants(phone) {
  const digits = normalizePhone(phone);
  if (!digits) return [];
  // Extraer los 10 dígitos significativos quitando prefijos conocidos
  let core = digits;
  if (digits.length === 13 && digits.startsWith("549")) core = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith("54")) core = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) core = digits.slice(1);
  if (core.length !== 10) return [digits]; // formato desconocido, usar tal cual
  return [...new Set([core, "0" + core, "54" + core, "549" + core, digits])];
}

// Uso desde la Agenda (vos, logueado): deduplica primero por teléfono (dígitos),
// después por nombre. Guarda phoneDigits y mantiene phoneIndex sincronizado.
export async function upsertClientByName(name, phone) {
  const trimmedName = name.trim();
  const phoneDigits = normalizePhone(phone);

  if (phoneDigits) {
    const variants = phoneVariants(phone);
    const snaps = await Promise.all(
      variants.map(v => getDocs(query(bcol("clients"), where("phoneDigits", "==", v))))
    );
    const existing = snaps.flatMap(s => s.docs)[0];
    if (existing) {
      await updateDoc(bdoc("clients", existing.id), { phone: phone || existing.data().phone });
      return existing.id;
    }
  }

  const qName = query(bcol("clients"), where("name", "==", trimmedName));
  const snapName = await getDocs(qName);
  if (!snapName.empty) {
    const existing = snapName.docs[0];
    const updates = {};
    if (phone) updates.phone = phone;
    if (phoneDigits) updates.phoneDigits = phoneDigits;
    if (Object.keys(updates).length) await updateDoc(bdoc("clients", existing.id), updates);
    if (phoneDigits) {
      await setDoc(bdoc("phoneIndex", phoneDigits), { clientId: existing.id });
    }
    return existing.id;
  }

  const ref = await addDoc(bcol("clients"), {
    name: trimmedName,
    phone: phone || "",
    phoneDigits,
    notes: "",
    createdAt: Date.now(),
  });
  if (phoneDigits) {
    await setDoc(bdoc("phoneIndex", phoneDigits), { clientId: ref.id });
  }
  return ref.id;
}

// Uso desde la app pública de Reservas (sin login): deduplica por teléfono usando
// la colección phoneIndex (accesible públicamente, sin datos sensibles).
// La creación de cliente nunca tumba la reserva — todos los errores son silenciosos.
export async function createClientPublic(name, phone) {
  const phoneDigits = normalizePhone(phone);

  if (phoneDigits) {
    try {
      const indexSnap = await getDoc(bdoc("phoneIndex", phoneDigits));
      if (indexSnap.exists()) return indexSnap.data().clientId;
    } catch (getErr) {
      console.error("[phoneIndex] No se pudo leer la entrada para", phoneDigits, getErr);
    }
  }

  try {
    const ref = await addDoc(bcol("clients"), {
      name: name.trim(),
      phone: phone || "",
      phoneDigits,
      notes: "",
      createdAt: Date.now(),
    });
    if (phoneDigits) {
      try {
        await setDoc(bdoc("phoneIndex", phoneDigits), { clientId: ref.id });
      } catch (indexErr) {
        console.error("[phoneIndex] No se pudo crear la entrada para", phoneDigits, indexErr);
      }
    }
    return ref.id;
  } catch (err) {
    console.error("No se pudo crear/actualizar la ficha del cliente:", err);
    return null;
  }
}
// Al editar nombre/teléfono de un cliente, propaga el cambio a todo lo que lo referencia
// (turnos y combos desnormalizados, descuento VIP y phoneIndex indexados por teléfono).
export async function updateClient(id, data) {
  const snap = await getDoc(bdoc("clients", id));
  const current = snap.data() || {};
  const oldPhoneDigits = current.phoneDigits || "";

  const updates = { ...data };
  const phoneChanged = "phone" in data && normalizePhone(data.phone) !== oldPhoneDigits;
  const newPhoneDigits = phoneChanged ? normalizePhone(data.phone) : oldPhoneDigits;
  if (phoneChanged) updates.phoneDigits = newPhoneDigits;

  if ("discounts" in data) {
    const phoneDigits = updates.phoneDigits ?? oldPhoneDigits;
    if (phoneDigits) {
      if (data.discounts && Object.keys(data.discounts).length) {
        await setDoc(bdoc("clientDiscounts", phoneDigits), data.discounts);
      } else {
        await deleteDoc(bdoc("clientDiscounts", phoneDigits)).catch(() => {});
      }
    }
  }

  if (phoneChanged && oldPhoneDigits && newPhoneDigits) {
    try {
      const oldDiscountSnap = await getDoc(bdoc("clientDiscounts", oldPhoneDigits));
      if (oldDiscountSnap.exists() && !("discounts" in data)) {
        await setDoc(bdoc("clientDiscounts", newPhoneDigits), oldDiscountSnap.data());
      }
      if (oldDiscountSnap.exists()) {
        await deleteDoc(bdoc("clientDiscounts", oldPhoneDigits));
      }
    } catch (err) {
      console.error("[updateClient] No se pudo migrar clientDiscounts:", err);
    }
    try {
      const oldCreditSnap = await getDoc(bdoc("referralCredits", oldPhoneDigits));
      if (oldCreditSnap.exists()) {
        await setDoc(bdoc("referralCredits", newPhoneDigits), oldCreditSnap.data());
        await deleteDoc(bdoc("referralCredits", oldPhoneDigits));
      }
    } catch (err) {
      console.error("[updateClient] No se pudo migrar referralCredits:", err);
    }
    try {
      await setDoc(bdoc("phoneIndex", newPhoneDigits), { clientId: id });
      await deleteDoc(bdoc("phoneIndex", oldPhoneDigits));
    } catch (err) {
      console.error("[updateClient] No se pudo migrar phoneIndex:", err);
    }
  } else if (phoneChanged && newPhoneDigits) {
    try {
      await setDoc(bdoc("phoneIndex", newPhoneDigits), { clientId: id });
    } catch (err) {
      console.error("[updateClient] No se pudo crear phoneIndex:", err);
    }
  }

  await updateDoc(bdoc("clients", id), updates);

  const nameChanged = "name" in data && data.name !== current.name;
  if (nameChanged || phoneChanged) {
    const denormalized = {};
    if (nameChanged) denormalized.clientName = data.name;
    if (phoneChanged) denormalized.clientPhone = data.phone;

    for (const collectionName of ["appointments", "combos"]) {
      try {
        const relatedSnap = await getDocs(
          query(collection(db, collectionName), where("clientId", "==", id))
        );
        if (relatedSnap.empty) continue;
        const batch = writeBatch(db);
        relatedSnap.docs.forEach(d => batch.update(d.ref, denormalized));
        await batch.commit();
      } catch (err) {
        console.error(`[updateClient] No se pudo propagar a ${collectionName}:`, err);
      }
    }
  }
}

// Lectura pública de solo consulta (sin crear nada): usada por reservas-app para
// mostrar el descuento VIP del cliente apenas completa el teléfono.
export async function getClientDiscountPublic(phone) {
  const phoneDigits = normalizePhone(phone);
  if (!phoneDigits) return null;
  try {
    const snap = await getDoc(bdoc("clientDiscounts", phoneDigits));
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}
// Para el link de referidos: el descuento de bienvenida es solo para teléfonos que no son clientes.
export async function isExistingClientPublic(phone) {
  const variants = phoneVariants(phone);
  if (!variants.length) return false;
  try {
    const snaps = await Promise.all(variants.map(v => getDoc(bdoc("phoneIndex", v))));
    return snaps.some(s => s.exists());
  } catch {
    return false;
  }
}

export async function getReferralCreditPublic(phone) {
  const variants = phoneVariants(phone);
  if (!variants.length) return 0;
  try {
    const snaps = await Promise.all(variants.map(v => getDoc(bdoc("referralCredits", v))));
    const found = snaps.find(s => s.exists());
    return found ? (found.data().amount || 0) : 0;
  } catch {
    return 0;
  }
}

// La fuente de verdad es clients/{id}.referralCredit; referralCredits/{phone} es la copia
// pública que lee reservas-app (mismo patrón que discounts / clientDiscounts).
export async function setReferralCredit(clientId, amount) {
  const snap = await getDoc(bdoc("clients", clientId));
  if (!snap.exists()) return;
  const safeAmount = Math.max(0, amount || 0);
  await updateDoc(bdoc("clients", clientId), { referralCredit: safeAmount });
  const phoneDigits = snap.data().phoneDigits || normalizePhone(snap.data().phone);
  if (!phoneDigits) return;
  if (safeAmount > 0) {
    await setDoc(bdoc("referralCredits", phoneDigits), { amount: safeAmount });
  } else {
    await deleteDoc(bdoc("referralCredits", phoneDigits)).catch(() => {});
  }
}

export async function deleteClient(id) {
  try {
    const snap = await getDoc(bdoc("clients", id));
    if (snap.exists() && snap.data().phoneDigits) {
      await deleteDoc(bdoc("phoneIndex", snap.data().phoneDigits));
    }
  } catch {
    // Best-effort: si falla la limpieza del índice, igual borra el cliente
  }
  return deleteDoc(bdoc("clients", id));
}

export function subscribeClientSessions(clientId, callback) {
  const q = query(
    bcol("clients", clientId, "sessions"),
    orderBy("date", "desc")
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, (err) => console.error("[subscribeClientSessions] snapshot error:", err));
}

export async function addClientSession(clientId, data) {
  const ref = await addDoc(bcol("clients", clientId, "sessions"), {
    ...data,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function updateClientSession(clientId, sessionId, data) {
  return updateDoc(bdoc("clients", clientId, "sessions", sessionId), data);
}

export async function deleteClientSession(clientId, sessionId) {
  return deleteDoc(bdoc("clients", clientId, "sessions", sessionId));
}

// ---------- Info del negocio ----------
// La info vive en el propio doc businesses/{id}, junto con ownerUid (que las reglas no dejan cambiar).
export function listenBusinessInfo(callback) {
  return onSnapshot(doc(db, "businesses", currentBusinessId()), (snap) => {
    if (!snap.exists()) return callback(null);
    const { ownerUid, ...info } = snap.data();
    callback(info);
  }, (err) => console.error("[listenBusinessInfo] snapshot error:", err));
}
export async function setBusinessInfo(data) {
  // Las reglas no dejan cambiarlos; además, reenviar un valor viejo pisaría un pago recién registrado.
  const { ownerUid, createdAt, activeUntil, exempt, ...info } = data;
  return setDoc(doc(db, "businesses", currentBusinessId()), info, { merge: true });
}

// ---------- Gift Cards ----------
export async function createGiftCard(data) {
  // data.code es el ID del documento
  return setDoc(bdoc("giftCards", data.code), data);
}

export function listenGiftCards(callback) {
  return onSnapshot(
    query(bcol("giftCards"), orderBy("createdAt", "desc")),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    (err) => console.error("[listenGiftCards] snapshot error:", err)
  );
}

export async function getGiftCard(code) {
  const snap = await getDoc(bdoc("giftCards", code));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getGiftCardsByPhone(phone) {
  const variants = phoneVariants(phone);
  const snaps = await Promise.all(
    variants.map(v => getDocs(query(bcol("giftCards"), where("buyerPhone", "==", v))))
  );
  const seen = new Set();
  const results = [];
  for (const snap of snaps) {
    for (const d of snap.docs) {
      if (!seen.has(d.id)) { seen.add(d.id); results.push({ id: d.id, ...d.data() }); }
    }
  }
  return results;
}

export async function activateGiftCard(code) {
  return updateDoc(bdoc("giftCards", code), {
    status: "active",
    activatedAt: Date.now(),
  });
}

export async function deactivateGiftCard(code) {
  return updateDoc(bdoc("giftCards", code), {
    status: "pending",
    activatedAt: null,
  });
}

export async function deleteGiftCard(code) {
  return deleteDoc(bdoc("giftCards", code));
}

export async function redeemGiftCard(code, apptId) {
  return updateDoc(bdoc("giftCards", code), {
    status: "used",
    apptId,
    usedAt: Date.now(),
  });
}

export async function restoreGiftCard(code) {
  return updateDoc(bdoc("giftCards", code), {
    status: "active",
    apptId: null,
    usedAt: null,
  });
}

export async function updateGiftCardApptId(code, newApptId) {
  return updateDoc(bdoc("giftCards", code), { apptId: newApptId });
}

// ---------- Combos de sesiones prepagas ----------
const COMBO_VALID_DAYS = 60;

export async function createCombo(data) {
  const now = Date.now();
  return addDoc(bcol("combos"), {
    ...data,
    sessionsRemaining: data.totalSessions,
    usedApptIds: [],
    status: data.status || "active",
    createdAt: now,
    expiresAt: now + COMBO_VALID_DAYS * 24 * 60 * 60 * 1000,
  });
}

export async function activateCombo(comboId) {
  const now = Date.now();
  return updateDoc(bdoc("combos", comboId), {
    status: "active",
    activatedAt: now,
    expiresAt: now + COMBO_VALID_DAYS * 24 * 60 * 60 * 1000,
  });
}

export async function updateCombo(comboId, data) {
  return updateDoc(bdoc("combos", comboId), data);
}

export function listenCombos(callback) {
  return onSnapshot(
    query(bcol("combos"), orderBy("createdAt", "desc")),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    (err) => console.error("[listenCombos] snapshot error:", err)
  );
}

export async function getCombo(comboId) {
  const snap = await getDoc(bdoc("combos", comboId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getCombosByPhone(phone) {
  const variants = phoneVariants(phone);
  const snaps = await Promise.all(
    variants.map(v => getDocs(query(bcol("combos"), where("clientPhone", "==", v))))
  );
  const seen = new Set();
  const results = [];
  for (const snap of snaps) {
    for (const d of snap.docs) {
      if (!seen.has(d.id)) { seen.add(d.id); results.push({ id: d.id, ...d.data() }); }
    }
  }
  return results;
}

export async function updateComboApptId(comboId, oldApptId, newApptId) {
  const comboRef = bdoc("combos", comboId);
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(comboRef);
    if (!snap.exists()) return;
    const combo = snap.data();
    transaction.update(comboRef, {
      usedApptIds: (combo.usedApptIds || []).map(id => id === oldApptId ? newApptId : id),
    });
  });
}

export async function redeemComboSession(comboId, apptId) {
  const comboRef = bdoc("combos", comboId);
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(comboRef);
    if (!snap.exists()) throw new Error("El combo ya no existe.");
    const combo = snap.data();
    if (combo.sessionsRemaining <= 0) throw new Error("El combo no tiene sesiones disponibles.");
    const sessionsRemaining = combo.sessionsRemaining - 1;
    transaction.update(comboRef, {
      sessionsRemaining,
      usedApptIds: [...(combo.usedApptIds || []), apptId],
      status: sessionsRemaining === 0 ? "completed" : "active",
    });
  });
}

export async function restoreComboSession(comboId, apptId) {
  const comboRef = bdoc("combos", comboId);
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(comboRef);
    if (!snap.exists()) return;
    const combo = snap.data();
    transaction.update(comboRef, {
      sessionsRemaining: Math.min(combo.totalSessions, combo.sessionsRemaining + 1),
      usedApptIds: (combo.usedApptIds || []).filter(id => id !== apptId),
      status: "active",
    });
  });
}

export async function deleteCombo(comboId) {
  return deleteDoc(bdoc("combos", comboId));
}