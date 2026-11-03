# Multi-negocio + varios lugares de atención (prueba con una colega)

## Objetivo
Que la app sirva para más de un profesional, cada uno con sus datos aislados, y que un
profesional pueda atender en varios lugares (con servicios/precios por lugar). Primer
usuario externo: una colega que atiende en 2–3 lugares. Cuenta creada a mano, sin registro abierto.

## Decisiones
- **Estructura:** todo pasa a `businesses/{bizId}/...` (services, availability, appointments,
  clients(+sessions), appointmentHistory, giftCards, combos, phoneIndex(+bookings),
  clientDiscounts, referralCredits, locations). El doc `businesses/{bizId}` reemplaza a
  `businessInfo/main` y suma `ownerUid`.
- **bizId = slug legible** (`mano-a-mano`, `<colega>`), así el link es `.../mano-a-mano-reservas/?b=<slug>`.
- **Sin `?b`, reservas usa `mano-a-mano`** → tus links, QR y referidos actuales siguen andando.
- **API:** `firestoreApi.js` recibe el negocio una sola vez (`setBusinessId`) y cada función usa
  helpers `bcol()/bdoc()`; las firmas de las ~60 funciones no cambian, así las vistas casi no se tocan.
- **Agenda:** al loguearse busca el negocio con `ownerUid == uid`.
- **Lugares:** `locations/{locId}` con nombre, dirección, detalle. Cupos y turnos guardan `locationId`
  (el turno además guarda nombre+dirección del lugar al momento de reservar).
  Servicio: `locationIds` (vacío = todos) y `priceByLocation` opcional (sin precio = precio base).
  Si el negocio tiene 0 o 1 lugar, todo se ve igual que hoy.
- **Reservas con varios lugares:** paso 1 elegir lugar → servicios/precios y cupos de ese lugar →
  confirmación y "Mi turno" muestran lugar y dirección. Reprogramar: solo dentro del mismo lugar.
- **Combos y gift cards:** por ahora usan el precio base del servicio (no por lugar).
- **Textos fijos de Mano a Mano** ("Masoterapia", "Angel Meier Turnos", quiz de masajes, servicios
  por defecto) pasan a salir del doc del negocio; el quiz se muestra solo si el negocio lo activa.
- **landing-app** no se toca (es la web de Mano a Mano).
- **Migración:** script Node con `firebase-admin` que copia con los mismos IDs (idempotente, se puede
  correr dos veces). Las colecciones viejas quedan como backup y se cierran en las reglas; se borran más adelante.

## Plan

### Fase 1 — Estructura multi-negocio (sin cambios visibles para vos)
- [x] Emulador de Firestore + tests de reglas (`@firebase/rules-unit-testing`): dueño A no puede
      leer/escribir nada de B; público solo puede lo que hoy permite, pero dentro de cada negocio
- [x] `firestore.rules`: reescribir todo bajo `businesses/{bizId}`, `isOwner(bizId)` vía `ownerUid`;
      colecciones viejas en solo lectura para el dueño
- [x] `shared/firestoreApi.js`: `setBusinessId`, `bcol/bdoc`, migrar todas las funciones;
      `getBusinessForOwner(uid)`, `listenBusiness`, `setBusiness` (reemplazan businessInfo)
- [x] `agenda-app`: tras el login resolver el negocio y llamar `setBusinessId`; pantalla de
      "esta cuenta no tiene negocio" si no hay
- [x] `reservas-app`: leer `?b` (default `mano-a-mano`), `setBusinessId`, pantalla de "negocio no
      encontrado"; propagar `b` en todos los links que se generan (gift card, combo, referidos, Mi turno)
- [x] Reemplazar textos fijos por campos del negocio (`tagline`, nombre, `showQuiz`)
- [x] `scripts/migrate-to-businesses.mjs`: copia todo a `businesses/mano-a-mano` con `ownerUid` tuyo
- [x] Build de las 3 apps
- [x] Probar en el emulador con una copia de tus datos: agenda y reservas funcionan igual que hoy
      (smoke test con las funciones reales de `firestoreApi` contra el emulador, 16/16 OK; falta mirarlo en pantalla)

### Fase 2 — Lugares de atención
- [x] `firestoreApi.js`: CRUD de `locations` (+ regla y test de reglas)
- [x] Agenda / Mi negocio: sección "Lugares" (alta, edición, baja)
- [x] Agenda / Servicios: en qué lugares se ofrece cada uno y precio por lugar
- [x] Agenda / carga de cupos (grilla, recurrente, copiar semana): elegir lugar si hay más de uno
- [x] Agenda / calendario y turnos: mostrar el lugar; turno manual pide lugar;
      `{direccion}` de los mensajes de WhatsApp usa la del lugar del turno; export de disponibilidad por lugar
- [x] Reservas: paso "elegí el lugar", filtrar servicios/precios/cupos, mostrarlo en confirmación y Mi turno;
      reprogramar solo en el mismo lugar
- [x] Build + prueba en emulador con un negocio de 3 lugares (smoke 18/18, reglas 8/8). Falta mirarlo en pantalla.
- [x] BUG PREVIO: cancelar/reprogramar desde reservas sin login fallaba con permission-denied (`getDoc` del
      turno, que el público no puede leer; desde fdf9b7b). Arreglo: gift card, combo, precio, descuento, referido
      y origen se copian a phoneIndex/bookings y se leen de ahí. Reprogramar ahora también conserva gift card/combo
      en el turno nuevo. Probado sin login en emulador (smoke-public).
- [x] Turnos reservados antes del fix: la migración completa sus refs de phoneIndex/bookings con los datos del turno
      (sin pisar lo que ya tengan; idempotente). Test en rules.test.mjs.

#### Review fase 2
- Cupos sin `locationId` cuentan como del primer lugar (orden por `createdAt`); con 0–1 lugar no se ve ningún selector.
- El turno guarda `locationId/locationName/locationAddress/locationAddressDetail`, y también se copian a phoneIndex/bookings.
- Gift card / combo: solo se ofrecen los lugares donde está ese servicio; precio sigue siendo el base.

### Fase 3 — Puesta en producción
- [ ] Confirmar con vos antes de cada paso que toca la base real
- [x] `firebase deploy --only firestore:rules` (nuevo + legacy) → migración (2047 docs, 423 refs completadas)
      → push (deploy de las apps OK) → migración otra vez (0 nuevos, 2047 iguales)
- [x] Verificar en producción: tu agenda, tus reservas, un link viejo sin `?b` (todo igual)
- [x] BORRAR bloque legacy de las reglas y deployarlas (test 10/10, deploy OK 2026-11-03)
- [ ] Crear usuario de la colega en Firebase Auth + script de alta de su negocio (lugares, servicios)
- [ ] Probar su link de reservas de punta a punta y pasárselo

## Datos que necesito de la colega (para la Fase 3)
- Nombre del negocio, slug para el link, WhatsApp, email para la cuenta
- Cada lugar: nombre, dirección, referencia
- Servicios: nombre, duración, precio (y en qué lugares / precio distinto por lugar)

## Fuera de alcance (para cuando se venda)
Registro abierto, cobro de suscripción, dominio propio, estadísticas por lugar, combos con precio por lugar.

---

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
