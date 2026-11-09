// Siembra el EMULADOR con datos de prueba: estructura vieja → migración, más un segundo negocio.
// Uso (con el emulador corriendo): node scripts/seed-emulator.mjs
// Cuentas: angel@test.com / colega@test.com, contraseña test1234.

import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { migrateToBusiness } from "./migrate-to-businesses.mjs";

process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
initializeApp({ projectId: "mano-a-mano-turnos" });
const db = getFirestore();
const auth = getAuth();

async function createUser(email, uid) {
  try { await auth.deleteUser(uid); } catch {}
  await auth.createUser({ uid, email, password: "test1234" });
}
await createUser("angel@test.com", "uidAngel");
await createUser("colega@test.com", "uidColega");

const d = new Date(Date.now() + 86400000);
const tomorrow = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

await db.doc("businessInfo/main").set({ name: "Angel Meier — Masoterapia", address: "Arata 1967", whatsapp: "1150000000" });
await db.doc("services/medio-torso").set({ name: "Medio torso", duration: 40, color: "#B5654A", price: 30000 });
await db.doc("availability/slotA1").set({ dateKey: tomorrow, start: "10:00", end: "10:40", booked: false });
await db.doc("availability/slotA2").set({ dateKey: tomorrow, start: "11:00", end: "11:40", booked: true });
await db.doc("appointments/apptA").set({ dateKey: tomorrow, start: "11:00", end: "11:40", serviceId: "medio-torso", clientName: "Cliente de Angel", clientPhone: "1155554444", status: "confirmado", fromAvailabilityId: "slotA2", createdAt: Date.now() });
await db.doc("clients/cliA").set({ name: "Cliente de Angel", phone: "1155554444", phoneDigits: "1155554444" });
console.log(await migrateToBusiness(db, { ownerUid: "uidAngel" }));

await db.doc("businesses/colega").set({ name: "Colega Masajes", address: "Otra calle 123", whatsapp: "1160000000", ownerUid: "uidColega" });
await db.doc("businesses/colega/services/s1").set({ name: "Descontracturante", duration: 60, color: "#6E7F5C", price: 25000 });
await db.doc("businesses/colega/availability/slotC1").set({ dateKey: tomorrow, start: "15:00", end: "16:00", booked: false });
await db.doc("businesses/colega/appointments/apptC").set({ dateKey: tomorrow, start: "17:00", end: "18:00", serviceId: "s1", clientName: "Cliente de Colega", status: "confirmado", createdAt: Date.now() });
// Negocio con 3 lugares: "Solo Centro" se ofrece solo en Centro; Descontracturante cuesta distinto en Norte.
await createUser("tres@test.com", "uidTres");
await db.doc("businesses/tres-lugares").set({ name: "Tres Lugares", address: "Dirección general", whatsapp: "1170000000", ownerUid: "uidTres" });
await db.doc("businesses/tres-lugares/locations/centro").set({ name: "Centro", address: "Calle Centro 1", addressDetail: "Piso 2", createdAt: 1 });
await db.doc("businesses/tres-lugares/locations/norte").set({ name: "Norte", address: "Calle Norte 2", addressDetail: "", createdAt: 2 });
await db.doc("businesses/tres-lugares/locations/sur").set({ name: "Sur", address: "Calle Sur 3", addressDetail: "", createdAt: 3 });
await db.doc("businesses/tres-lugares/services/desc").set({ name: "Descontracturante", duration: 60, color: "#6E7F5C", price: 20000, locationIds: [], priceByLocation: { norte: 26000 } });
await db.doc("businesses/tres-lugares/services/solo-centro").set({ name: "Solo Centro", duration: 30, color: "#B5654A", price: 10000, locationIds: ["centro"], priceByLocation: {} });
await db.doc("businesses/tres-lugares/availability/c1").set({ dateKey: tomorrow, start: "10:00", end: "11:00", booked: false, locationId: "centro" });
await db.doc("businesses/tres-lugares/availability/c2").set({ dateKey: tomorrow, start: "12:00", end: "13:00", booked: false });
await db.doc("businesses/tres-lugares/availability/n1").set({ dateKey: tomorrow, start: "15:00", end: "16:00", booked: false, locationId: "norte" });
await db.doc("businesses/tres-lugares/availability/n2").set({ dateKey: tomorrow, start: "17:00", end: "18:00", booked: false, locationId: "norte" });
await db.doc("businesses/tres-lugares/availability/s1").set({ dateKey: tomorrow, start: "19:00", end: "20:00", booked: false, locationId: "sur" });
await db.doc("businesses/tres-lugares/availability/s2").set({ dateKey: tomorrow, start: "21:00", end: "22:00", booked: false, locationId: "sur" });
await db.doc("businesses/tres-lugares/giftCards/GIFT-0001").set({ code: "GIFT-0001", status: "active", serviceId: "desc", fromName: "Ana", buyerPhone: "1100000000", toName: "Beto" });

// Suscripción: un negocio en cada estado. Cuentas: vencido@test.com, gracia@test.com.
const DAY = 86400000;
await db.doc("appConfig/billing").set({ signupOpen: true, priceRegular: 14900, priceFounder: 9900, linkRegular: "https://mpago.la/normal", linkFounder: "https://mpago.la/fundador", whatsapp: "1190000000" });
for (const [id, activeUntil] of [["vencido", Date.now() - 20 * DAY], ["gracia", Date.now() - 2 * DAY]]) {
  await createUser(`${id}@test.com`, `uid-${id}`);
  await db.doc(`businesses/${id}`).set({ name: `Negocio ${id}`, whatsapp: "1180000000", ownerUid: `uid-${id}`, createdAt: Timestamp.fromMillis(Date.now() - 90 * DAY), activeUntil });
  await db.doc(`billing/${id}`).set({ ownerEmail: `${id}@test.com`, plan: "regular" });
  await db.doc(`businessOwners/uid-${id}`).set({ bizId: id });
  await db.doc(`businesses/${id}/services/s1`).set({ name: "Manicura", duration: 60, color: "#6E7F5C", price: 15000 });
  await db.doc(`businesses/${id}/availability/slot1`).set({ dateKey: tomorrow, start: "09:00", end: "10:00", booked: false });
}
console.log("Listo. Turnos de prueba para", tomorrow);
