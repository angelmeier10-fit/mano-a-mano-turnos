// Tests de firestore.rules y de la migración contra el emulador.
// Correr con: npm run test:rules

import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, setDoc, updateDoc, addDoc, collection } from "firebase/firestore";
import { initializeApp as initAdmin } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { migrateToBusiness } from "./migrate-to-businesses.mjs";

const PROJECT_ID = "demo-mano-a-mano";
const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080").split(":");
let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host, port: Number(port), rules: readFileSync("firestore.rules", "utf8") },
  });
});
after(async () => { await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "businesses/a"), { name: "Negocio A", ownerUid: "uidA" });
    await setDoc(doc(db, "businesses/b"), { name: "Negocio B", ownerUid: "uidB" });
    await setDoc(doc(db, "businesses/a/services/s1"), { name: "Masaje", price: 1000 });
    await setDoc(doc(db, "businesses/a/appointments/t1"), { clientName: "Ana", status: "confirmado", cancelToken: "tok" });
    await setDoc(doc(db, "businesses/a/clients/c1"), { name: "Ana" });
    await setDoc(doc(db, "businesses/a/clients/c1/sessions/x1"), { date: "2026-11-02" });
    await setDoc(doc(db, "businesses/a/phoneIndex/1155554444/bookings/t1"), { status: "confirmado" });
  });
});

const ownerA = () => env.authenticatedContext("uidA").firestore();
const ownerB = () => env.authenticatedContext("uidB").firestore();
const anon = () => env.unauthenticatedContext().firestore();

test("el dueño lee sus turnos y clientes", async () => {
  await assertSucceeds(getDocs(collection(ownerA(), "businesses/a/appointments")));
  await assertSucceeds(getDoc(doc(ownerA(), "businesses/a/clients/c1/sessions/x1")));
});

test("otro profesional no puede leer ni escribir nada del negocio ajeno", async () => {
  const db = ownerB();
  await assertFails(getDocs(collection(db, "businesses/a/appointments")));
  await assertFails(getDoc(doc(db, "businesses/a/clients/c1")));
  await assertFails(getDoc(doc(db, "businesses/a/clients/c1/sessions/x1")));
  await assertFails(setDoc(doc(db, "businesses/a/services/s2"), { name: "x" }));
  await assertFails(updateDoc(doc(db, "businesses/a"), { name: "hackeado" }));
  await assertFails(getDocs(collection(db, "businesses/a/appointmentHistory")));
});

test("el dueño no puede cambiar el ownerUid ni crear negocios", async () => {
  await assertSucceeds(updateDoc(doc(ownerA(), "businesses/a"), { name: "Nuevo nombre" }));
  await assertFails(updateDoc(doc(ownerA(), "businesses/a"), { ownerUid: "uidB" }));
  await assertFails(setDoc(doc(ownerA(), "businesses/nuevo"), { ownerUid: "uidA" }));
});

test("el público lee servicios y reserva, pero no lista turnos ni clientes", async () => {
  const db = anon();
  await assertSucceeds(getDoc(doc(db, "businesses/a")));
  await assertSucceeds(getDocs(collection(db, "businesses/a/services")));
  await assertSucceeds(addDoc(collection(db, "businesses/a/appointments"), { clientName: "Beto", status: "pendiente" }));
  await assertSucceeds(addDoc(collection(db, "businesses/a/appointmentHistory"), { eventType: "cancelado_cliente" }));
  await assertFails(getDocs(collection(db, "businesses/a/appointments")));
  await assertFails(getDocs(collection(db, "businesses/a/clients")));
  await assertFails(updateDoc(doc(db, "businesses/a"), { name: "x" }));
});

test("lugares: el público los lee, solo el dueño los edita", async () => {
  await assertSucceeds(setDoc(doc(ownerA(), "businesses/a/locations/l1"), { name: "Centro", address: "Calle 1" }));
  await assertSucceeds(getDocs(collection(anon(), "businesses/a/locations")));
  await assertFails(setDoc(doc(anon(), "businesses/a/locations/l2"), { name: "x" }));
  await assertFails(setDoc(doc(ownerB(), "businesses/a/locations/l2"), { name: "x" }));
  await assertFails(updateDoc(doc(ownerB(), "businesses/a/locations/l1"), { name: "x" }));
});

test("el cliente cancela su turno con el teléfono como prueba, dentro del negocio", async () => {
  const db = anon();
  await assertSucceeds(updateDoc(doc(db, "businesses/a/appointments/t1"), { status: "cancelado", cancelProof: "1155554444" }));
});

test("el cliente no cancela con una prueba falsa", async () => {
  await assertFails(updateDoc(doc(anon(), "businesses/a/appointments/t1"), { status: "cancelado", cancelProof: "0000" }));
});

test("las colecciones viejas de la raíz quedan cerradas para cualquier usuario", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "clients/c1"), { name: "Ana" });
  });
  await assertFails(getDoc(doc(ownerB(), "clients/c1")));
  await assertFails(setDoc(doc(ownerB(), "services/s1"), { name: "X" }));
  await assertFails(getDoc(doc(anon(), "clients/c1")));
});

test("la migración copia todo con los mismos IDs, subcolecciones y docs fantasma, y es idempotente", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "businessInfo/main"), { name: "Mano a Mano", address: "Calle 1" });
    await setDoc(doc(db, "services/s1"), { name: "Masaje", price: 1000 });
    await setDoc(doc(db, "appointments/t9"), { clientName: "Ana", status: "confirmado" });
    await setDoc(doc(db, "clients/c1"), { name: "Ana" });
    await setDoc(doc(db, "clients/c1/sessions/x1"), { date: "2026-11-02" });
    // phoneIndex/555 no existe como doc: solo es padre de bookings (doc "fantasma").
    await setDoc(doc(db, "phoneIndex/555/bookings/t9"), { status: "confirmado" });
  });

  const admin = getAdminFirestore(initAdmin({ projectId: PROJECT_ID }, "migration-test"));
  const first = await migrateToBusiness(admin, { ownerUid: "uidAngel" });
  assert.equal(first.created, 5);
  assert.deepEqual(first.different, []);

  const biz = (await admin.doc("businesses/mano-a-mano").get()).data();
  assert.equal(biz.ownerUid, "uidAngel");
  assert.equal(biz.name, "Mano a Mano");
  assert.equal(biz.showQuiz, true);
  assert.equal((await admin.doc("businesses/mano-a-mano/appointments/t9").get()).data().clientName, "Ana");
  assert.ok((await admin.doc("businesses/mano-a-mano/clients/c1/sessions/x1").get()).exists);
  assert.ok((await admin.doc("businesses/mano-a-mano/phoneIndex/555/bookings/t9").get()).exists);

  // Un cambio hecho en la app nueva no se pisa en la segunda pasada; un doc viejo nuevo sí se copia.
  await admin.doc("businesses/mano-a-mano/appointments/t9").update({ status: "cancelado" });
  await admin.doc("appointments/t10").set({ clientName: "Beto", status: "pendiente" });
  const second = await migrateToBusiness(admin, { ownerUid: "uidAngel" });
  assert.equal(second.created, 1);
  assert.deepEqual(second.different, ["businesses/mano-a-mano/appointments/t9"]);
  assert.equal((await admin.doc("businesses/mano-a-mano/appointments/t9").get()).data().status, "cancelado");
});

test("la migración completa en phoneIndex/bookings los datos del turno que cancelar/reprogramar necesitan", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "appointments/g1"), { clientName: "Ana", status: "confirmado", giftCardCode: "GIFT-1", paidByGiftCard: true, price: 20000, discount: 0 });
    await setDoc(doc(db, "phoneIndex/555/bookings/g1"), { status: "confirmado", cancelToken: "tok" });
    // Ref que ya tiene un dato propio: no se pisa.
    await setDoc(doc(db, "appointments/g2"), { clientName: "Beto", status: "confirmado", comboId: "C1", price: 0 });
    await setDoc(doc(db, "phoneIndex/666/bookings/g2"), { status: "confirmado", comboId: "C1", price: 999 });
  });

  const admin = getAdminFirestore(initAdmin({ projectId: PROJECT_ID }, "backfill-test"));
  const first = await migrateToBusiness(admin, { ownerUid: "uidAngel" });
  const g1 = (await admin.doc("businesses/mano-a-mano/phoneIndex/555/bookings/g1").get()).data();
  assert.equal(g1.giftCardCode, "GIFT-1");
  assert.equal(g1.paidByGiftCard, true);
  assert.equal(g1.price, 20000);
  assert.equal(g1.cancelToken, "tok");
  assert.equal((await admin.doc("businesses/mano-a-mano/phoneIndex/666/bookings/g2").get()).data().price, 999);
  assert.equal(first.backfilled, 1);

  // Segunda pasada: nada para completar y la ref completada no figura como "distinta".
  const second = await migrateToBusiness(admin, { ownerUid: "uidAngel" });
  assert.equal(second.backfilled, 0);
  assert.deepEqual(second.different, []);
});
