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
// Crea muchos cupos de una sola vez (ej: "todos los lunes de 10 a 14, por 8 semanas")
// Firestore permite hasta 500 escrituras por batch; si hay más, las dividimos.
export async function addAvailabilitySlotsBatch(slots) {
  // slots: [{ dateKey, start, end }, ...]
  const chunks = [];
  for (let i = 0; i < slots.length; i += 450) chunks.push(slots.slice(i, i + 450));
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

  if (!slotId) {
    const ref = await addDoc(collection(db, "appointments"), {
      ...appt, cancelToken, cancelProof: null, createdAt: Date.now(),
    });
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
    transaction.set(apptRef, { ...appt, cancelToken, cancelProof: null, createdAt: Date.now() });
  });

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
        status: "confirmado",
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

// Cancela un turno desde la app pública. El cliente debe proveer el cancelToken
// que recibió al reservar (se envía como cancelProof para que Firestore lo valide).
export async function cancelAppointmentPublic(apptId, cancelToken, availabilitySlotId, phone) {
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
}

// Reprograma un turno: cancela el viejo (atómico) y crea uno nuevo.
// Devuelve { apptId, cancelToken } del nuevo turno.
export async function rescheduleAppointmentPublic({ oldApptId, oldCancelToken, oldSlotId, newAppt, phone }) {
  const newCancelToken = generateCancelToken();
  const oldApptRef = doc(db, "appointments", oldApptId);
  const newSlotRef = doc(db, "availability", newAppt.fromAvailabilityId);
  const newApptRef = doc(collection(db, "appointments"));
  const newApptId = newApptRef.id;

  await runTransaction(db, async (t) => {
    const newSlotSnap = await t.get(newSlotRef);
    if (!newSlotSnap.exists() || newSlotSnap.data().booked) {
      throw new Error("Este horario ya fue tomado. Por favor elegí otro.");
    }
    t.update(oldApptRef, { status: "cancelado", cancelProof: oldCancelToken });
    if (oldSlotId) {
      t.update(doc(db, "availability", oldSlotId), { booked: false });
    }
    t.update(newSlotRef, { booked: true });
    t.set(newApptRef, {
      ...newAppt,
      cancelToken: newCancelToken,
      cancelProof: null,
      status: "confirmado",
      createdAt: Date.now(),
    });
  });

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
      });
    } catch {}
  }

  return { apptId: newApptId, cancelToken: newCancelToken };
}

export function listenAppointments(callback) {
  return onSnapshot(collection(db, "appointments"), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}
export async function createAppointment(appt) {
  // appt: { dateKey, start, end, serviceId, clientName, clientPhone, notes, status, fromAvailabilityId? }
  return addDoc(collection(db, "appointments"), { ...appt, createdAt: Date.now() });
}
export async function updateAppointment(id, data) {
  return updateDoc(doc(db, "appointments", id), data);
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