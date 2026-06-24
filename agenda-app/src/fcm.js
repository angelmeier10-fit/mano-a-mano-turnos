import { getMessaging, getToken } from "firebase/messaging";
import { getApp } from "firebase/app";
import { saveFcmToken } from "../../shared/firestoreApi";

const VAPID_KEY = "BNQXqh4XA4xdPO0J47LkjjZGxEfo9e5dhISimBwudjqSsV2Wm03hxGJW0lnfxFs7zG_kvM2JvgsAR1efiUol4-o";
const SW_PATH = "/mano-a-mano-turnos/mano-a-mano-agenda/firebase-messaging-sw.js";

export async function initFcm() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return;

  try {
    const registration = await navigator.serviceWorker.register(SW_PATH);
    const messaging = getMessaging(getApp());
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    if (token) await saveFcmToken(token);
  } catch (err) {
    console.error("FCM init error:", err);
  }
}
