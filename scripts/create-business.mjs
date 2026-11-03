// Alta de un profesional nuevo: crea su usuario en Firebase Auth (si no existe) y su negocio
// en businesses/{slug}. El resto (lugares, servicios, WhatsApp, cupos) lo carga ella desde la agenda.
//
// Uso:
//   GOOGLE_APPLICATION_CREDENTIALS=./firebase-key.json node scripts/create-business.mjs --email=X --slug=Y --name="Z"
// Imprime el link de reservas y un link para que la persona elija su contraseña.

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { pathToFileURL } from "node:url";

const RESERVAS_URL = "https://angelmeier10-fit.github.io/mano-a-mano-turnos/mano-a-mano-reservas/";

export async function createBusiness(db, { slug, name, ownerUid }) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug || "")) throw new Error(`slug inválido: "${slug}" (solo minúsculas, números y guiones)`);
  if (!name?.trim()) throw new Error("Falta --name");
  if (!ownerUid) throw new Error("Falta ownerUid");

  const owned = await db.collection("businesses").where("ownerUid", "==", ownerUid).limit(1).get();
  if (!owned.empty) throw new Error(`Ese usuario ya tiene el negocio "${owned.docs[0].id}"`);

  // create() falla si el doc ya existe, así nunca se pisa un negocio.
  try {
    await db.collection("businesses").doc(slug).create({ name: name.trim(), ownerUid, showQuiz: false, whatsapp: "" });
  } catch (err) {
    if (err.code === 6) throw new Error(`El negocio "${slug}" ya existe`);
    throw err;
  }
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map(a => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }));
  if (!args.email) throw new Error("Falta --email");
  if (!getApps().length) initializeApp({ projectId: process.env.GCLOUD_PROJECT || "mano-a-mano-turnos" });
  const auth = getAuth();

  let user;
  try {
    user = await auth.getUserByEmail(args.email);
    console.log(`Usuario ya existente: ${user.uid}`);
  } catch (err) {
    if (err.code !== "auth/user-not-found") throw err;
    user = await auth.createUser({ email: args.email });
    console.log(`Usuario creado: ${user.uid}`);
  }

  await createBusiness(getFirestore(), { slug: args.slug, name: args.name, ownerUid: user.uid });
  console.log(`Negocio creado: businesses/${args.slug}`);
  console.log(`Link de reservas: ${RESERVAS_URL}?b=${args.slug}`);
  console.log(`Link para elegir contraseña: ${await auth.generatePasswordResetLink(args.email)}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => { console.error(err.message || err); process.exit(1); });
}
