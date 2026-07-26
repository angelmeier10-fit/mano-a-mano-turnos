# Gift cards / combos: notificación, combo con link, wording, cobrado

## Plan
- [x] `shared/firestoreApi.js`: agregar `code` a `createCombo` (solo si `isGift`), generar con la misma función `generateCode` (moverla a `shared/helpers.js` para reusarla) — usamos el id de Firestore como código, no hizo falta campo extra
- [x] `shared/firestoreApi.js`: `getCombo(code)` para buscar combo por código
- [x] `shared/firestoreApi.js`: `listenIncomingPendingGiftCards(sessionStart, onNew)` y `listenIncomingPendingCombos(sessionStart, onNew)`
- [x] `reservas-app/src/ComboView.jsx`: generar link `?combo=CODE` cuando es regalo, botón "Enviar por WhatsApp"
- [x] Tarjeta visual compartida (gift card y combo): agregar el link dentro de la imagen descargable
- [x] Nuevo `reservas-app/src/ComboRedeemView.jsx` (calco de GiftCardRedeemView) con tarjeta visual + link + descarga + estados pending/active/used
- [x] `reservas-app/src/App.jsx`: rutear `?combo=CODE`, pasar código nuevo en flujo "Regalar combo"
- [x] Wording: en vistas de canje (gift card y combo), estado pendiente pasa a "Pendiente de activación" sin mencionar pago, para quien recibe
- [x] `agenda-app/src/App.jsx`: notificación de navegador + banner in-app para gift cards y combos nuevos (mismo patrón que turnos)
- [x] `agenda-app/src/AgendaComponents.jsx`: sumar gift cards activadas este mes a "Cobrado este mes"
- [x] Build de ambas apps (reservas-app y agenda-app) sin errores
- [ ] Probar flujo completo en producción tras el deploy: comprar combo regalo → link → canje → activar desde agenda → notificación → suma a cobrado

## Review
- Combo regalado ahora usa el id de Firestore como código de canje (`?combo=<id>`), en vez de un código corto tipo gift card — más simple, sin riesgo de colisión.
- "Mis combos" (búsqueda por teléfono) se mantuvo y ahora también permite abrir la vista de canje y reenviar por WhatsApp.
- Quedó pendiente probar el flujo end-to-end manualmente en el sitio ya desplegado (no se pudo levantar navegador en esta sesión).
