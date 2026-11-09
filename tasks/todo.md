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
- [x] Script de alta `scripts/create-business.mjs` (usuario Auth + businesses/{slug}; el resto lo carga ella). Test 11/11
- [x] Título de la pestaña de reservas con el nombre del negocio (antes fijo "Meier Angel · Turnos")
- [x] Alta de la colega: businesses/momento-relax, usuario 3zvq2I8zn0Nh9xrmuK7sj2yP9KE3 (2026-11-03)
- [x] Agenda: encabezado y pestaña con el nombre de cada negocio (antes fijo "Mano a Mano")
- [x] Meta Pixel solo en mano-a-mano
- [x] Por negocio en Negocio: monto de referidos (0 = sin referidos) y datos de transferencia (antes fijos de Angel)
- [x] Fixes: combo vence 60 días desde que se confirma el pago; gift card vuelve al cancelar/borrar desde la agenda;
      aviso de reserva con gift card dice "pendiente" (coincide con el estado real). Probados en emulador
- [x] Guía de uso con capturas (genérica): https://claude.ai/artifact/ME15WHxfTtquZ4MmytbCfm
- [ ] Que la colega cargue sus datos; probar su link de reservas de punta a punta

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

---

# Mejoras para vender a colegas: contraseña, Google y link de pago

Fuera de esta etapa: mails al profesional, alta de negocios sin script, cobro de la suscripción.

## Plan
- [x] Login: "Olvidé mi contraseña" con mail en español y mensaje neutro
- [x] Login: "Entrar con Google" (solo agenda; una cuenta sin negocio ve el aviso que ya existe)
- [x] Servicios: links opcionales para el servicio, combo x2 y combo x3; se pueden editar y borrar; solo `https://`
- [x] Reservas: botón "Pagar" al confirmar el turno y junto a los datos de transferencia en combos y gift cards
- [x] El botón no aparece si el precio final no coincide con el del link (descuento, crédito, precio por lugar, turno pago con combo o gift card)
- [x] Prueba de la regla del botón, builds y prueba en el emulador
- [ ] Activar Google en la consola de Firebase (lo hace Angel) y probar en producción, en computadora y celular

## Review
- `npm run test:unit` pasa y las dos apps compilan. Probado en el emulador, en tamaño celular: recuperación, Google, crear/editar/borrar links, botón en turno, combo y gift card, y sin botón con descuento o crédito.
- Sin probar en navegador: precio por lugar y canje de combo o gift card (solo cubierto por la regla o la condición en el código), el envío real del mail y el mensaje de cuenta existente con otro proveedor.
- Google con el mismo mail conserva la cuenta y el negocio. Si el mail no estaba verificado, se borra la contraseña (visto en el emulador); se recupera con "Olvidé mi contraseña".

---

# Varios profesionales en un negocio (diseño, sin construir)

Estado: diseño aprobado por Angel el 2026-11-06 para guardar. No hay interesados todavía; se construye después del alta y la suscripción.

## Objetivo
Que un lugar con varios profesionales, de cualquier rubro, use una sola cuenta de negocio y un solo link de reservas. El lugar cobra todo y arregla por su cuenta con sus empleados.

## Cliente
- Elige el servicio y después con quién atenderse, o "cualquiera".
- Ve los horarios de los profesionales que hacen ese servicio.
- Un turno con "cualquiera" queda sin asignar hasta que el dueño lo reparte.
- Los links y datos de pago siguen siendo del negocio.

## Dueño
- Suma y quita empleados, e indica qué servicios hace cada uno.
- Ve todas las agendas y, si quiere, también atiende con la suya.
- Reparte turnos, y confirma, cancela y mueve turnos.
- Edita servicios, precios, pagos, datos del negocio y equipo.
- Ve clientes, ingresos y estadísticas, también por profesional.
- La comunicación por WhatsApp con los clientes queda a su cargo.

## Empleado
- Entra con su propia cuenta (mail y contraseña o Google) y ve solo su agenda.
- Marca turnos como realizados, completa anamnesis y notas, y carga sus horarios.
- Ve nombre, turnos, anamnesis y notas solo de sus clientes.
- No ve teléfonos ni dinero. Sí ve si un turno está pago.
- No edita servicios, precios, pagos, combos ni datos del negocio, y no ve estadísticas.

## Decisiones técnicas
- Los negocios con un solo profesional siguen igual y no notan el cambio.
- Dos profesionales pueden tener turnos a la misma hora, pero uno solo no. Hoy los controles de superposición son por negocio y fecha (`shared/firestoreApi.js`, `agenda-app/src/AgendaComponents.jsx`).
- Si un empleado se va, sus turnos y clientes quedan en el negocio.
- Los permisos quedan preparados para sumar recepción después.
- Teléfonos y dinero se separan de los documentos que lee el empleado y se bloquean en `firestore.rules`, no solo en pantalla. Implica migrar datos reales.

## Fuera de esta etapa
Recepción, liquidación de sueldos o comisiones, y división de pagos.

## Sin definir
Si la suscripción se cobra por lugar o por profesional.

---

# Alta de negocios y suscripción manual

Estado: construido y probado en el emulador. Falta publicar y lo que debe hacer Angel.

## Decisiones comerciales
- Se cobra en pesos: $19.900 por mes (antes se había pensado $14.900; Angel lo cambió el 2026-11-09).
- Primeros 10 colegas: $14.900 durante 12 meses (antes $9.900). Angel asigna ese plan a mano.
- Prueba gratis de 30 días, sin pedir medio de pago.
- Cobro manual con links de Mercado Pago; Angel registra cada pago en el panel.
- Vencido: aviso durante 7 días de gracia. Después no se aceptan reservas, turnos, combos ni gift cards nuevos.
- Sigue permitido ver y exportar datos, y cancelar turnos. Nunca se borra nada.
- Mano a Mano y Momento Relax quedan exentos hasta que Angel decida.

## Decisiones técnicas
- `businesses/{id}` suma `createdAt` y `activeUntil`. Sin ninguno de los dos, el negocio está exento: no hace falta migrar datos.
- Activo = `activeUntil` vigente, o `createdAt` dentro de los 30 días. El bloqueo se aplica desde el fin de esa fecha más 7 días de gracia.
- El bloqueo vive en `firestore.rules`, no solo en pantalla.
- El dueño no puede cambiar `ownerUid`, `createdAt` ni `activeUntil`.
- `billing/{id}` (solo dueño y Angel): mail, plan, precio e historial de pagos.
- `appConfig/billing` (lectura pública, edita Angel): precios, links de Mercado Pago y WhatsApp de Angel, para cambiarlos sin publicar la app.
- Un negocio por cuenta: documento `businessOwners/{uid}` creado en el mismo batch que el negocio.
- Crear un negocio exige mail verificado, `ownerUid` propio y un link libre con formato válido. Se reservan nombres como `admin`.
- Reprogramar desde reservas queda bloqueado si el negocio está bloqueado, con un mensaje claro.

## Plan

### Seguridad y reglas
- [x] Tests de reglas primero en `scripts/rules.test.mjs`: alta válida e inválidas, segundo negocio, campos protegidos, activo, gracia, bloqueado y exento
- [x] Separar lectura de un negocio y listado: `allow read: if true` permitía listar todos los negocios. Listar queda solo para el dueño (su propia búsqueda) y Angel
- [x] Reglas de alta, campos protegidos, `billing`, `appConfig`, rol de Angel y bloqueo de creación de turnos, combos y gift cards

### Alta
- [x] `agenda-app/src/LoginScreen.jsx`: "Crear cuenta" con mail y contraseña, y verificación de mail
- [x] `agenda-app/src/App.jsx`: distinguir "la cuenta no tiene negocio" de "falló la búsqueda"
- [x] Pantalla de alta en lugar del aviso actual: nombre, link de reservas con disponibilidad, aceptación de términos
- [x] `shared/firestoreApi.js`: crear negocio, `billing` y `businessOwners` en un batch
- [x] Guía inicial en la agenda vacía: datos del negocio, servicios, horarios y compartir el link

### Suscripción
- [x] Regla única de estado en `shared/helpers.js` (exento, prueba, activo, gracia, bloqueado) con tests en `npm run test:unit`
- [x] Agenda: avisos de prueba y vencimiento, y sección "Suscripción" con estado, precio, botón de pago y "Avisar que pagué" por WhatsApp
- [x] Agenda con negocio bloqueado: sin crear turnos, con cancelar y exportar disponibles
- [x] Reservas con negocio bloqueado: mensaje con el WhatsApp del negocio, sin cupos para reservar; "Mis turnos" y cancelar siguen andando
- [x] Panel "Cobros" solo para Angel: negocios, estado, vencimiento, plan, registrar pago (suma un mes), prórroga y exención, precios y links

### Términos
- [x] Borrador de términos y privacidad en `agenda-app/public/terminos.html`, con datos por completar, para que lo revise un profesional

### Prueba y publicación
- [x] Builds y emulador en tamaño celular, recorriendo completos: alta con mail, alta con Google, prueba, vencimiento, gracia, bloqueo, pago y desbloqueo, y negocio exento sin cambios
- [x] Comprobar qué pasa con el cupo si la creación del turno es rechazada: no queda ocupado (test de reglas)
- [x] Confirmar con Angel antes de publicar reglas y apps; publicar reglas, luego apps, y revisar Mano a Mano y Momento Relax (2026-11-09, commit 4fe11b2)
- [ ] Angel: crear los dos links de Mercado Pago, cargar precios y WhatsApp en Cobros y hacer revisar los términos antes de abrir el registro

## Fuera de esta etapa
Cobro automático, facturación, varios profesionales, mails automáticos y página de venta.

## Review
- Pruebas: 13 unitarias y 20 de reglas pasan, las dos apps compilan, y el recorrido en navegador pasa en tamaño celular. La prueba anterior de reservas sigue pasando después del cambio de reglas.
- Agregado al plan: `signupOpen` en `appConfig/billing`. El registro queda cerrado al publicar hasta que Angel lo abra en Cobros, y pide los dos links y su WhatsApp.
- Agregado al plan: Mano a Mano no aparece en Cobros, para que un vencimiento cargado por error no la bloquee.
- Decisión: Mano a Mano y Momento Relax no tienen `businessOwners`. Las reglas permitirían que esas dos cuentas creen otro negocio, pero la app no les ofrece el alta. Se aceptó porque son cuentas de confianza.
- Sin probar en navegador: el mensaje al crear un turno manual con el negocio bloqueado, y que "Cambiar horario" desaparezca en un turno real. Las reglas sí rechazan crear turnos en ese estado.
- Sin probar en producción: el mail real de verificación, Google real y las reglas publicadas.

# Gift card con QR, Instagram y WhatsApp (2026-11-09)

- [x] Arreglar "Reservar turno con esta gift card" (`locations is not defined`)
- [x] QR en lugar del link escrito, con el código a la vista
- [x] Instagram y WhatsApp del negocio en la tarjeta
- [x] Campo "Instagram" en Negocio
- [x] Misma tarjeta en compra y canje

## Review
- Probado en emulador, tamaño celular: el error se reprodujo antes del arreglo; el QR de la imagen descargada se lee y trae el negocio y el código; un turno completo marca la gift card como usada.
- 16 pruebas unitarias pasan y las dos apps compilan.
- Sin probar en navegador: la tarjeta en la pantalla de compra y guardar el campo Instagram en Negocio.
- Pendiente aparte: el moño de la tarjeta no sale en la imagen descargada, aunque en pantalla se ve. Cambiar el centrado (transform → calc) no lo arregló; el problema está en cómo html2canvas dibuja el SVG.
