const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

exports.notifyNewAppointment = onDocumentCreated(
  { document: "appointments/{apptId}", region: "us-central1" },
  async (event) => {
    const appt = event.data.data();
    if (appt.status !== "pendiente") return;

    const db = getFirestore();
    const bizSnap = await db.doc("businessInfo/main").get();
    const fcmToken = bizSnap.data()?.fcmToken;
    if (!fcmToken) return;

    const clientName = appt.clientName || "Cliente";
    const dateStr = appt.dateKey || "";
    const start = appt.start || "";

    await getMessaging().send({
      token: fcmToken,
      notification: {
        title: "Nuevo turno solicitado",
        body: `${clientName} · ${dateStr} ${start}`,
      },
      webpush: {
        fcmOptions: {
          link: "https://angelmeier10-fit.github.io/mano-a-mano-turnos/mano-a-mano-agenda/",
        },
      },
    });
  }
);
