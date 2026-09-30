# Sistema de referidos (link general ?ref + crédito para quien recomienda)

## Plan
- [x] `shared/helpers.js`: constante `REFERRAL_AMOUNT = 5000`
- [x] `shared/firestoreApi.js`: `isExistingClientPublic`, `getReferralCreditPublic`, `setReferralCredit`
- [x] `shared/firestoreApi.js`: `updateClient` migra `referralCredits` al cambiar teléfono
- [x] `shared/firestoreApi.js`: `rescheduleAppointmentPublic` conserva `price`, `discount`, `referredByName`
- [x] `reservas-app/src/App.jsx`: leer `?ref` y pasar `referralMode` a ReservarView principal
- [x] `reservas-app/src/ReservarView.jsx`: banner, campo "¿Quién te recomendó?", descuento solo a clientes nuevos, aviso de crédito
- [x] `agenda-app/src/AgendaComponents.jsx`: aplicar/revertir crédito al completar; "Recomendado por" + acreditar a un cliente
- [x] `agenda-app/src/ClientesServiciosViews.jsx`: mostrar crédito en ficha
- [x] `firestore.rules`: `referralCredits` (publicar a mano en Console)
- [x] Build de ambas apps
- [ ] Prueba end-to-end (reservar con ?ref, completar, acreditar, consumir crédito) — escribe en la base real

## Review
- El crédito se consume en la agenda al marcar "completado" (y se devuelve si se des-completa); reservas nunca escribe créditos.
- Reprogramar conserva precio/descuento si el servicio no cambia; si cambia, conserva solo el descuento de referido (`referralDiscount`). Esto también corrige que el descuento VIP se perdía al reprogramar.
- Verificado: build de ambas apps OK; en dev, `?ref=amigo` muestra el banner y el campo "¿Quién te recomendó?".
- Pendiente: publicar `firestore.rules` en Console y probar el flujo completo.

---

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
