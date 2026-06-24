// shared/firestoreApi.js
//
// Funciones compartidas para leer/escribir en Firestore.
// Ambas apps (agenda-app y reservas-app) importan este archivo.

import { initializeApp } from "firebase/app";
import {
  getFirestore,
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
} from "firebase/firestore";
import { firebaseConfig } from "./firebaseConfig";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ---------- Servicios ----------
export function listenServices(callback) {
  return onSnapshot(collection(db, "services"), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}
export async function addService(service) {
  return addDoc(collection(db, "services"), service);
}
export async function updateService(id, data) {
  return updateDoc(doc(db, "services", id), data);
}
export async function deleteService(id) {
  return deleteDoc(doc(db, "services", id));
}

// ---------- Disponibilidad (cupos abiertos por el profesional) ----------
export function listenAvailability(callback) {
  return onSnapshot(collection(db, "availability"), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}
export async function addAvailabilitySlot(slot) {
  // slot: { dateKey, start, end }
  return addDoc(collection(db, "availability"), slot);
}
export async function removeAvailabilitySlot(id) {
  return deleteDoc(doc(db, "availability", id));
}
export async function freeAvailabilitySlot(id) {
  return updateDoc(doc(db, "availability", id), { booked: false });
}
// Marca como cancelado el registro en phoneIndex/bookings del cliente (best-effort).
// Se usa cuando el profesional cancela un turno desde la Agenda.
export async function markBookingRefCancelled(clientPhone, apptId) {
  const phoneDigits = normalizePhone(clientPhone);
  if (!phoneDigits || !apptId) return;
  try {
    await updateDoc(doc(db, "phoneIndex", phoneDigits, "bookings", apptId), { status: "cancelado" });
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
    await deleteDoc(doc(db, "phoneIndex", phoneDigits, "bookings", apptId));
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
    await setDoc(doc(db, "phoneIndex", phoneDigits, "bookings", apptId), { status: "confirmado" }, { merge: true });
  } catch (e) {
    console.error("[phoneIndex/bookings] No se pudo marcar como confirmado:", e, { phoneDigits, apptId });
  }
}
// Actualiza dateKey, start, end y serviceName en phoneIndex/bookings cuando el profesional
// edita un turno desde la Agenda. Usa setDoc merge:true para cubrir el caso de que no exista.
export async function updateBookingRef(clientPhone, apptId, { dateKey, start, end, serviceName }) {
  const phoneDigits = normalizePhone(clientPhone);
  if (!phoneDigits || !apptId) return;
  try {
    await setDoc(
      doc(db, "phoneIndex", phoneDigits, "bookings", apptId),
      { dateKey, start, end, serviceName: serviceName || "" },
      { merge: true }
    );
  } catch (e) {
    console.error("[phoneIndex/bookings] No se pudo actualizar la referencia:", e, { phoneDigits, apptId });
  }
}
// Crea muchos cupos de una sola vez (ej: "todos los lunes de 10 a 14, por 8 semanas")
// Firestore permite hasta 500 escrituras por batch; si hay más, las dividimos.
// Descarta duplicados: no inserta cupos que ya existan con el mismo dateKey+start+end.
export async function addAvailabilitySlotsBatch(slots) {
  if (slots.length === 0) return;

  // Obtener todas las dateKeys únicas involucradas
  const dateKeys = [...new Set(slots.map(s => s.dateKey))];

  // Consultar cupos existentes para esas fechas (en lotes de 30 por límite de 'in')
  const existing = new Set();
  for (let i = 0; i < dateKeys.length; i += 30) {
    const chunk = dateKeys.slice(i, i + 30);
    const snap = await getDocs(query(collection(db, "availability"), where("dateKey", "in", chunk)));
    snap.forEach(d => {
      const { dateKey, start, end } = d.data();
      existing.add(`${dateKey}|${start}|${end}`);
    });
  }

  const newSlots = slots.filter(s => !existing.has(`${s.dateKey}|${s.start}|${s.end}`));
  if (newSlots.length === 0) return;

  const chunks = [];
  for (let i = 0; i < newSlots.length; i += 450) chunks.push(newSlots.slice(i, i + 450));
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach(slot => {
      const ref = doc(collection(db, "availability"));
      batch.set(ref, slot);
    });
    await batch.commit();
  }
}
// Borra todos los cupos (sin reservar) de un día puntual
export async function removeAvailabilitySlotsByIds(ids) {
  if (ids.length === 0) return;
  const chunks = [];
  for (let i = 0; i < ids.length; i += 450) chunks.push(ids.slice(i, i + 450));
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach(id => batch.delete(doc(db, "availability", id)));
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

  const apptData = {
    ...appt,
    cancelToken,
    cancelProof: null,
    createdAt: Date.now(),
    ...(giftCardCode ? { paidByGiftCard: true, giftCardCode, status: "confirmado" } : {}),
  };

  if (!slotId) {
    const ref = await addDoc(collection(db, "appointments"), apptData);
    if (giftCardCode) await redeemGiftCard(giftCardCode, ref.id);
    return { apptId: ref.id, cancelToken };
  }

  const slotRef = doc(db, "availability", slotId);
  let apptId;
  await runTransaction(db, async (transaction) => {
    const slotSnap = await transaction.get(slotRef);
    if (!slotSnap.exists() || slotSnap.data().booked) {
      throw new Error("Este horario ya fue reservado. Por favor elegí otro.");
    }
    transaction.update(slotRef, { booked: true });
    const apptRef = doc(collection(db, "appointments"));
    apptId = apptRef.id;
    transaction.set(apptRef, apptData);
  });

  if (giftCardCode) await redeemGiftCard(giftCardCode, apptId);

  // Guardar referencia en phoneIndex/bookings (best-effort, no bloquea la reserva)
  const phoneDigits = normalizePhone(appt.clientPhone);
  if (phoneDigits && apptId) {
    try {
      await setDoc(doc(db, "phoneIndex", phoneDigits, "bookings", apptId), {
        dateKey: appt.dateKey,
        start: appt.start,
        end: appt.end,
        serviceId: appt.serviceId || null,
        fromAvailabilityId: slotId,
        clientName: appt.clientName || "",
        clientId: appt.clientId || null,
        status: apptData.status || "confirmado",
        requiresCancelToken: true,
      });
    } catch (e) {
      console.error("[phoneIndex/bookings] No se pudo guardar la referencia:", e);
    }
  }

  return { apptId, cancelToken };
}

// Devuelve las referencias de reservas del cliente a partir de su teléfono.
// No contiene cancelToken; ese vive solo en localStorage del cliente.
export async function getMyBookingRefs(phone) {
  const phoneDigits = normalizePhone(phone);
  if (!phoneDigits) return [];
  try {
    const snap = await getDocs(collection(db, "phoneIndex", phoneDigits, "bookings"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("[phoneIndex/bookings] No se pudo leer las reservas:", e);
    return [];
  }
}

// Escribe un evento en appointmentHistory (best-effort, nunca bloquea la operación principal).
export async function addAppointmentHistory(event) {
  try {
    await addDoc(collection(db, "appointmentHistory"), event);
  } catch (e) {
    console.error("[appointmentHistory] No se pudo guardar el evento:", e);
  }
}

// Trae el historial de movimientos de un cliente por clientId, ordenado más reciente primero.
export async function getAppointmentHistory(clientId) {
  if (!clientId) return [];
  try {
    const snap = await getDocs(
      query(collection(db, "appointmentHistory"), where("clientId", "==", clientId))
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
export async function cancelAppointmentPublic(apptId, cancelToken, availabilitySlotId, phone, historyData) {
  const apptSnap = await getDoc(doc(db, "appointments", apptId));
  const giftCardCode = apptSnap.exists() ? apptSnap.data().giftCardCode : null;

  await updateDoc(doc(db, "appointments", apptId), {
    status: "cancelado",
    cancelProof: cancelToken,
  });
  if (availabilitySlotId) {
    try {
      await updateDoc(doc(db, "availability", availabilitySlotId), { booked: false });
    } catch (e) {
      console.error("[availability] No se pudo liberar el cupo:", e);
    }
  }
  const phoneDigits = normalizePhone(phone);
  if (phoneDigits) {
    try {
      await updateDoc(doc(db, "phoneIndex", phoneDigits, "bookings", apptId), { status: "cancelado" });
    } catch {}
  }
  if (giftCardCode) {
    try {
      await restoreGiftCard(giftCardCode);
    } catch (e) {
      console.error("[giftCard] No se pudo restaurar la gift card:", e);
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
export async function rescheduleAppointmentPublic({ oldApptId, oldCancelToken, oldSlotId, newAppt, phone, historyData }) {
  const newCancelToken = generateCancelToken();
  const oldApptRef = doc(db, "appointments", oldApptId);

  const oldApptSnap = await getDoc(oldApptRef);
  const giftCardCode = oldApptSnap.exists() ? oldApptSnap.data().giftCardCode : null;
  const newSlotRef = doc(db, "availability", newAppt.fromAvailabilityId);
  const newApptRef = doc(collection(db, "appointments"));
  const newApptId = newApptRef.id;

  await runTransaction(db, async (t) => {
    const newSlotSnap = await t.get(newSlotRef);
    if (!newSlotSnap.exists() || newSlotSnap.data().booked) {
      throw new Error("Este horario ya fue tomado. Por favor elegí otro.");
    }
    // No incluimos el cupo viejo en la transacción: su regla exige booked:true,
    // y si ya estuviera en false (estado inconsistente) haría fallar toda la transacción.
    // Se libera best-effort después de que lo crítico ya se confirmó.
    t.update(oldApptRef, { status: "cancelado", cancelProof: oldCancelToken });
    t.update(newSlotRef, { booked: true });
    t.set(newApptRef, {
      ...newAppt,
      cancelToken: newCancelToken,
      cancelProof: null,
      status: "confirmado",
      createdAt: Date.now(),
    });
  });

  if (giftCardCode) {
    try {
      await updateGiftCardApptId(giftCardCode, newApptId);
    } catch (e) {
      console.error("[giftCard] No se pudo actualizar apptId en gift card:", e);
    }
  }

  // Liberar cupo viejo fuera de la transacción (best-effort)
  if (oldSlotId) {
    try {
      await updateDoc(doc(db, "availability", oldSlotId), { booked: false });
    } catch (e) {
      console.error("[reschedule] No se pudo liberar el cupo anterior:", e);
    }
  }

  const phoneDigits = normalizePhone(phone);
  if (phoneDigits) {
    try {
      await deleteDoc(doc(db, "phoneIndex", phoneDigits, "bookings", oldApptId));
      await setDoc(doc(db, "phoneIndex", phoneDigits, "bookings", newApptId), {
        dateKey: newAppt.dateKey,
        start: newAppt.start,
        end: newAppt.end,
        serviceId: newAppt.serviceId || null,
        fromAvailabilityId: newAppt.fromAvailabilityId,
        clientName: newAppt.clientName || "",
        clientId: newAppt.clientId || null,
        status: "confirmado",
        requiresCancelToken: true,
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
  return onSnapshot(collection(db, "appointments"), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// Llama a onNew solo para turnos creados después de sessionStart (evita falsos positivos por cache/reconexión).
export function listenIncomingPendingAppointments(sessionStart, onNew) {
  return onSnapshot(collection(db, "appointments"), (snap) => {
    snap.docChanges().forEach(change => {
      if (change.type === "added") {
        const a = { id: change.doc.id, ...change.doc.data() };
        if (a.status === "pendiente" && a.createdAt > sessionStart) onNew(a);
      }
    });
  });
}
export async function createAppointment(appt) {
  // appt: { dateKey, start, end, serviceId, clientName, clientPhone, notes, status, fromAvailabilityId? }
  const dupCheck = await getDocs(query(
    collection(db, "appointments"),
    where("dateKey", "==", appt.dateKey),
    where("start", "==", appt.start),
  ));
  const activeCount = dupCheck.docs.filter(d => d.data().status !== "cancelado").length;
  if (activeCount > 0) {
    throw new Error(`Ya existe un turno a las ${appt.start} el ${appt.dateKey}.`);
  }

  let slotId = appt.fromAvailabilityId || null;
  let apptRef;

  if (slotId) {
    // Si viene de un cupo existente, marcar booked:true y crear el turno atómicamente
    // para evitar que un cliente reserve el mismo horario simultáneamente.
    apptRef = doc(collection(db, "appointments"));
    const slotRef = doc(db, "availability", slotId);
    await runTransaction(db, async (t) => {
      const slotSnap = await t.get(slotRef);
      if (!slotSnap.exists() || slotSnap.data().booked) {
        throw new Error("Este cupo ya fue reservado.");
      }
      t.update(slotRef, { booked: true });
      t.set(apptRef, { ...appt, createdAt: Date.now() });
    });
  } else {
    // Sin fromAvailabilityId: buscar si existe un cupo con el mismo día y hora de inicio
    const slotQuery = query(
      collection(db, "availability"),
      where("dateKey", "==", appt.dateKey),
      where("start", "==", appt.start),
    );
    const slotSnap = await getDocs(slotQuery);
    if (slotSnap.size > 1) {
      console.warn(`[createAppointment] Se encontraron ${slotSnap.size} cupos para ${appt.dateKey} ${appt.start}. Se ocupa el primero.`);
    }
    if (slotSnap.size >= 1) {
      const matchedSlot = slotSnap.docs[0];
      apptRef = doc(collection(db, "appointments"));
      const matchedSlotRef = doc(db, "availability", matchedSlot.id);
      slotId = matchedSlot.id;
      await runTransaction(db, async (t) => {
        t.update(matchedSlotRef, { booked: true });
        t.set(apptRef, { ...appt, fromAvailabilityId: slotId, createdAt: Date.now() });
      });
    } else {
      apptRef = await addDoc(collection(db, "appointments"), { ...appt, createdAt: Date.now() });
    }
  }

  const phoneDigits = normalizePhone(appt.clientPhone);
  if (phoneDigits) {
    try {
      await setDoc(doc(db, "phoneIndex", phoneDigits, "bookings", apptRef.id), {
        dateKey: appt.dateKey,
        start: appt.start,
        end: appt.end,
        serviceId: appt.serviceId || null,
        fromAvailabilityId: slotId,
        clientName: appt.clientName || "",
        clientId: appt.clientId || null,
        status: appt.status || "confirmado",
        requiresCancelToken: false,
      });
    } catch (e) {
      console.error("[phoneIndex/bookings] No se pudo crear la referencia desde Agenda:", e);
    }
  }
  return apptRef;
}
export async function updateAppointment(id, data) {
  return updateDoc(doc(db, "appointments", id), data);
}
// Al editar un turno desde la Agenda: libera el cupo anterior (si había uno distinto al nuevo),
// busca un cupo coincidente con el nuevo dateKey+start y lo ocupa, y actualiza el turno — todo atómicamente.
export async function updateAppointmentWithSlotSwap(apptId, oldFromAvailabilityId, newData) {
  // La query no puede ir dentro de la transacción (limitación del SDK web de Firestore)
  const dupCheck = await getDocs(query(
    collection(db, "appointments"),
    where("dateKey", "==", newData.dateKey),
    where("start", "==", newData.start),
  ));
  const activeDup = dupCheck.docs.find(d => d.id !== apptId && d.data().status !== "cancelado");
  if (activeDup) {
    throw new Error(`Ya existe un turno a las ${newData.start} el ${newData.dateKey}.`);
  }

  const slotQuery = query(
    collection(db, "availability"),
    where("dateKey", "==", newData.dateKey),
    where("start", "==", newData.start),
  );
  const slotSnap = await getDocs(slotQuery);
  const newSlotId = slotSnap.empty ? null : slotSnap.docs[0].id;

  const sameSlot = newSlotId !== null && newSlotId === oldFromAvailabilityId;
  const apptRef = doc(db, "appointments", apptId);
  const oldSlotRef = (oldFromAvailabilityId && !sameSlot) ? doc(db, "availability", oldFromAvailabilityId) : null;
  const newSlotRef = (newSlotId && !sameSlot) ? doc(db, "availability", newSlotId) : null;

  await runTransaction(db, async (t) => {
    // Firestore exige todos los reads antes de cualquier write en la transacción
    if (oldSlotRef) await t.get(oldSlotRef);
    if (newSlotRef) await t.get(newSlotRef);

    if (oldSlotRef) t.update(oldSlotRef, { booked: false });
    if (newSlotRef) t.update(newSlotRef, { booked: true });
    t.update(apptRef, { ...newData, fromAvailabilityId: newSlotId });
  });

  return newSlotId;
}
export async function deleteAppointment(id) {
  return deleteDoc(doc(db, "appointments", id));
}

// ---------- Clientes ----------
export function listenClients(callback) {
  return onSnapshot(collection(db, "clients"), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}
function normalizePhone(phone) {
  return (phone || "").replace(/[^\d]/g, "");
}

// Uso desde la Agenda (vos, logueado): deduplica primero por teléfono (dígitos),
// después por nombre. Guarda phoneDigits y mantiene phoneIndex sincronizado.
export async function upsertClientByName(name, phone) {
  const trimmedName = name.trim();
  const phoneDigits = normalizePhone(phone);

  if (phoneDigits) {
    const qPhone = query(collection(db, "clients"), where("phoneDigits", "==", phoneDigits));
    const snapPhone = await getDocs(qPhone);
    if (!snapPhone.empty) {
      const existing = snapPhone.docs[0];
      await updateDoc(doc(db, "clients", existing.id), { phone: phone || existing.data().phone });
      // phoneIndex ya existe para estos dígitos — no hace falta tocarlo
      return existing.id;
    }
  }

  const qName = query(collection(db, "clients"), where("name", "==", trimmedName));
  const snapName = await getDocs(qName);
  if (!snapName.empty) {
    const existing = snapName.docs[0];
    const updates = {};
    if (phone) updates.phone = phone;
    if (phoneDigits) updates.phoneDigits = phoneDigits;
    if (Object.keys(updates).length) await updateDoc(doc(db, "clients", existing.id), updates);
    if (phoneDigits) {
      await setDoc(doc(db, "phoneIndex", phoneDigits), { clientId: existing.id });
    }
    return existing.id;
  }

  const ref = await addDoc(collection(db, "clients"), {
    name: trimmedName,
    phone: phone || "",
    phoneDigits,
    notes: "",
    createdAt: Date.now(),
  });
  if (phoneDigits) {
    await setDoc(doc(db, "phoneIndex", phoneDigits), { clientId: ref.id });
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
      const indexSnap = await getDoc(doc(db, "phoneIndex", phoneDigits));
      if (indexSnap.exists()) return indexSnap.data().clientId;
    } catch (getErr) {
      console.error("[phoneIndex] No se pudo leer la entrada para", phoneDigits, getErr);
    }
  }

  try {
    const ref = await addDoc(collection(db, "clients"), {
      name: name.trim(),
      phone: phone || "",
      phoneDigits,
      notes: "",
      createdAt: Date.now(),
    });
    if (phoneDigits) {
      try {
        await setDoc(doc(db, "phoneIndex", phoneDigits), { clientId: ref.id });
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
export async function updateClient(id, data) {
  return updateDoc(doc(db, "clients", id), data);
}
export async function deleteClient(id) {
  try {
    const snap = await getDoc(doc(db, "clients", id));
    if (snap.exists() && snap.data().phoneDigits) {
      await deleteDoc(doc(db, "phoneIndex", snap.data().phoneDigits));
    }
  } catch {
    // Best-effort: si falla la limpieza del índice, igual borra el cliente
  }
  return deleteDoc(doc(db, "clients", id));
}

// ---------- Info del negocio ----------
export function listenBusinessInfo(callback) {
  return onSnapshot(doc(db, "businessInfo", "main"), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}
export async function setBusinessInfo(data) {
  return setDoc(doc(db, "businessInfo", "main"), data, { merge: true });
}

// ---------- Gift Cards ----------
export async function createGiftCard(data) {
  // data.code es el ID del documento
  return setDoc(doc(db, "giftCards", data.code), data);
}

export function listenGiftCards(callback) {
  return onSnapshot(
    query(collection(db, "giftCards"), orderBy("createdAt", "desc")),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}

export async function getGiftCard(code) {
  const snap = await getDoc(doc(db, "giftCards", code));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getGiftCardsByPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  const snap = await getDocs(query(collection(db, "giftCards"), where("buyerPhone", "==", digits)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function activateGiftCard(code) {
  return updateDoc(doc(db, "giftCards", code), {
    status: "active",
    activatedAt: Date.now(),
  });
}

export async function redeemGiftCard(code, apptId) {
  return updateDoc(doc(db, "giftCards", code), {
    status: "used",
    apptId,
    usedAt: Date.now(),
  });
}

export async function restoreGiftCard(code) {
  return updateDoc(doc(db, "giftCards", code), {
    status: "active",
    apptId: null,
    usedAt: null,
  });
}

export async function updateGiftCardApptId(code, newApptId) {
  return updateDoc(doc(db, "giftCards", code), { apptId: newApptId });
}