importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBv2RIrrnlflANckgWEZVNh3q5CUaTwgFA",
  authDomain: "mano-a-mano-turnos.firebaseapp.com",
  projectId: "mano-a-mano-turnos",
  storageBucket: "mano-a-mano-turnos.firebasestorage.app",
  messagingSenderId: "534377328444",
  appId: "1:534377328444:web:13c2915220b8082c46b839",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Nuevo turno";
  const body = payload.notification?.body || "";
  self.registration.showNotification(title, {
    body,
    icon: "/mano-a-mano-turnos/mano-a-mano-agenda/favicon.ico",
    data: { url: payload.fcmOptions?.link || self.location.origin },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || self.location.origin;
  event.waitUntil(clients.openWindow(url));
});
