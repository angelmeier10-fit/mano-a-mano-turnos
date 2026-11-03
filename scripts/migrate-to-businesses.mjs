// Copia la estructura vieja (colecciones en la raíz) a businesses/{bizId}/...
// conservando los mismos IDs, incluidas subcolecciones (clients/*/sessions,
// phoneIndex/*/bookings) y docs "fantasma" que solo existen como padres.
//
// Es idempotente: por defecto solo crea lo que falta y reporta los docs que
// ya existen con contenido distinto (para no pisar cambios hechos en la app nueva).
//
// Uso:
//   Emulador:   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/migrate-to-businesses.mjs --owner-uid=UID [--dry-run]
//   Producción: GOOGLE_APPLICATION_CREDENTIALS=./firebase-key.json node scripts/migrate-to-businesses.mjs --owner-uid=UID [--dry-run] [--overwrite]

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { pathToFileURL } from "node:url";
import { publicApptFields } from "../shared/helpers.js";

const BUSINESS_ID = "mano-a-mano";
const SKIP_ROOT = new Set(["businesses", "businessInfo"]);

function stableStringify(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (typeof value.toDate === "function") return JSON.stringify(value.toDate().toISOString());
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
  }
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return JSON.stringify(value);
}

// El destino puede tener campos de más (ej. los que completa backfillBookingRefs) sin que eso sea un cambio.
function containsAll(dest, src) {
  return Object.keys(src).every(k => stableStringify(dest[k]) === stableStringify(src[k]));
}

// Las reservas viejas no tienen en phoneIndex/bookings los datos que cancelar/reprogramar sin login
// necesitan (gift card, combo, precio...): se completan desde el turno, sin pisar lo que ya tengan.
async function backfillBookingRefs(bizRef, { dryRun }) {
  let backfilled = 0;
  const writer = bizRef.firestore.bulkWriter();
  for (const phoneRef of await bizRef.collection("phoneIndex").listDocuments()) {
    for (const refSnap of (await phoneRef.collection("bookings").get()).docs) {
      const apptSnap = await bizRef.collection("appointments").doc(refSnap.id).get();
      if (!apptSnap.exists) continue;
      const ref = refSnap.data();
      const missing = Object.fromEntries(Object.entries(publicApptFields(apptSnap.data())).filter(([k]) => ref[k] == null));
      if (Object.keys(missing).length === 0) continue;
      backfilled++;
      if (!dryRun) writer.set(refSnap.ref, missing, { merge: true });
    }
  }
  await writer.close();
  return backfilled;
}

async function copyCollection(srcCol, destCol, opts, stats, writer) {
  for (const srcRef of await srcCol.listDocuments()) {
    const destRef = destCol.doc(srcRef.id);
    const srcSnap = await srcRef.get();
    if (srcSnap.exists) {
      const destSnap = await destRef.get();
      const key = `${destCol.path}/${srcRef.id}`;
      if (!destSnap.exists) {
        stats.created++;
        if (!opts.dryRun) writer.set(destRef, srcSnap.data());
      } else if (containsAll(destSnap.data(), srcSnap.data())) {
        stats.identical++;
      } else if (opts.overwrite) {
        stats.overwritten++;
        if (!opts.dryRun) writer.set(destRef, srcSnap.data());
      } else {
        stats.different.push(key);
      }
    }
    for (const sub of await srcRef.listCollections()) {
      await copyCollection(sub, destRef.collection(sub.id), opts, stats, writer);
    }
  }
}

export async function migrateToBusiness(db, { ownerUid, overwrite = false, dryRun = false }) {
  if (!ownerUid) throw new Error("Falta --owner-uid");
  const opts = { overwrite, dryRun };
  const stats = { created: 0, identical: 0, overwritten: 0, different: [], collections: [] };
  const bizRef = db.collection("businesses").doc(BUSINESS_ID);
  const writer = db.bulkWriter();

  const infoSnap = await db.collection("businessInfo").doc("main").get();
  const bizSnap = await bizRef.get();
  const info = infoSnap.exists ? infoSnap.data() : {};
  // Si el negocio ya existe, la info que se editó en la app nueva manda (salvo --overwrite).
  const bizData = bizSnap.exists && !overwrite
    ? { ...info, ...bizSnap.data(), ownerUid }
    : { showQuiz: true, ...info, ownerUid };
  if (!dryRun) writer.set(bizRef, bizData);

  for (const col of await db.listCollections()) {
    if (SKIP_ROOT.has(col.id)) continue;
    stats.collections.push(col.id);
    await copyCollection(col, bizRef.collection(col.id), opts, stats, writer);
  }
  await writer.close();
  stats.backfilled = await backfillBookingRefs(bizRef, opts);
  return stats;
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }));
  if (!getApps().length) initializeApp({ projectId: process.env.GCLOUD_PROJECT || "mano-a-mano-turnos" });
  const db = getFirestore();
  const target = process.env.FIRESTORE_EMULATOR_HOST ? `emulador ${process.env.FIRESTORE_EMULATOR_HOST}` : "PRODUCCIÓN";
  console.log(`Migrando a businesses/${BUSINESS_ID} en ${target}${args["dry-run"] ? " (dry-run, no escribe)" : ""}...`);

  const stats = await migrateToBusiness(db, {
    ownerUid: args["owner-uid"],
    overwrite: !!args.overwrite,
    dryRun: !!args["dry-run"],
  });
  console.log(`Colecciones: ${stats.collections.join(", ")}`);
  console.log(`Creados: ${stats.created} · Iguales: ${stats.identical} · Pisados: ${stats.overwritten} · Distintos sin tocar: ${stats.different.length}`);
  console.log(`Reservas completadas con datos del turno (gift card, combo, precio...): ${stats.backfilled}${args["dry-run"] ? " (en dry-run solo cuenta reservas ya copiadas)" : ""}`);
  stats.different.forEach(p => console.log(`  distinto: ${p}`));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => { console.error(err); process.exit(1); });
}
