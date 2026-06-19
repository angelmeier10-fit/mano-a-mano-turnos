# Mano a Mano — Sistema de turnos

App de gestión de turnos para masajes, dividida en dos partes:

- **`agenda-app/`** → tu app privada (pide login). Acá ves la agenda semanal, abrís
  cupos de horario, gestionás clientes y servicios, y ves tus ingresos del mes.
- **`reservas-app/`** → la app pública que le mandás a tus clientes. Sin login,
  solo pueden reservar en los horarios que vos abriste desde tu Agenda.

Ambas comparten la misma base de datos (Firestore), así que un turno reservado
en la app pública aparece al instante en tu Agenda.

---

## Paso 1 — Crear el proyecto en Firebase

1. Entrá a [console.firebase.google.com](https://console.firebase.google.com)
2. Click en **"Agregar proyecto"** (o "Add project")
3. Ponele un nombre, por ejemplo `mano-a-mano-turnos`
4. Podés desactivar Google Analytics si te lo pregunta (no lo necesitamos)
5. Esperá a que se cree el proyecto

### 1a. Activar Firestore (la base de datos)

1. En el menú izquierdo, andá a **Build → Firestore Database**
2. Click en **"Crear base de datos"**
3. Elegí **modo de producción** (ya tenemos las reglas de seguridad escritas)
4. Elegí la ubicación más cercana (por ejemplo `southamerica-east1` para Argentina)

### 1b. Activar Authentication (para tu login)

1. En el menú izquierdo, andá a **Build → Authentication**
2. Click en **"Comenzar"** (Get started)
3. En la lista de proveedores, elegí **"Correo electrónico/contraseña"** (Email/Password)
4. Activalo y guardá
5. Andá a la pestaña **"Users"** y click en **"Agregar usuario"**
6. Cargá tu email y una contraseña — ese va a ser tu login para entrar a la Agenda

### 1c. Activar Hosting

1. En el menú izquierdo, andá a **Build → Hosting**
2. Click en **"Comenzar"** y seguí los pasos (no hace falta instalar nada todavía,
   eso lo hacemos en la Parte 2 de este instructivo)

### 1d. Copiar las credenciales del proyecto

1. Click en el ⚙️ (ícono de tuerca, arriba a la izquierda) → **"Configuración del proyecto"**
2. Bajá hasta **"Tus apps"** y click en el ícono `</>` (Web)
3. Ponele un nombre (ej: "Mano a Mano Web") y registrá la app
4. Vas a ver un bloque de código con `firebaseConfig = { apiKey: "...", ... }`
5. **Copiá todo ese objeto** — lo vamos a pegar en el archivo `shared/firebaseConfig.js`

---

## Paso 2 — Pegar tus credenciales en el código

Abrí el archivo `shared/firebaseConfig.js` y reemplazá el contenido por el que copiaste
de Firebase. Va a quedar algo así (con tus datos reales, no estos de ejemplo):

```js
export const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "mano-a-mano-turnos.firebaseapp.com",
  projectId: "mano-a-mano-turnos",
  storageBucket: "mano-a-mano-turnos.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890",
};
```

---

## Paso 3 — Subir el código a GitHub

1. Entrá a [github.com/new](https://github.com/new) y creá un repositorio nuevo,
   por ejemplo `mano-a-mano-turnos` (puede ser privado)
2. En tu computadora, dentro de esta carpeta del proyecto, corré:

```bash
git init
git add .
git commit -m "Primera versión: agenda + reservas con Firebase"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/mano-a-mano-turnos.git
git push -u origin main
```

(Reemplazá `TU_USUARIO` por tu usuario de GitHub)

---

## Paso 4 — Instalar herramientas en tu computadora

Necesitás tener instalado **Node.js** (si no lo tenés, bajalo de [nodejs.org](https://nodejs.org),
versión LTS).

Después, instalá la herramienta de línea de comandos de Firebase:

```bash
npm install -g firebase-tools
```

Iniciá sesión con tu cuenta de Google (la misma que usaste para crear el proyecto):

```bash
firebase login
```

---

## Paso 5 — Conectar el código con tu proyecto Firebase

Dentro de la carpeta del proyecto, corré:

```bash
firebase use --add
```

Te va a preguntar qué proyecto usar — elegí el que creaste (`mano-a-mano-turnos` o como
lo hayas llamado). Cuando te pida un "alias", podés escribir `default`.

### Configurar los dos sitios de Hosting

Esta app usa **dos sitios separados** dentro del mismo proyecto Firebase: uno para
la Agenda (privado) y otro para Reservas (público). Hay que crearlos:

```bash
firebase hosting:sites:create mano-a-mano-agenda
firebase hosting:sites:create mano-a-mano-reservas
```

(Si esos nombres ya están tomados por otra persona en todo Firebase, probá agregando
algo distintivo, ej: `mano-a-mano-agenda-angeltorres`)

Después conectá esos sitios con los "targets" que ya están en `firebase.json`:

```bash
firebase target:apply hosting agenda mano-a-mano-agenda
firebase target:apply hosting reservas mano-a-mano-reservas
```

(Usá los mismos nombres que elegiste arriba)

---

## Paso 6 — Instalar dependencias y compilar

```bash
npm run install:all
npm run build
```

Esto instala todo lo necesario y genera las carpetas `agenda-app/dist` y
`reservas-app/dist`, listas para subir.

---

## Paso 7 — Publicar las reglas de Firestore y el sitio

```bash
firebase deploy --only firestore:rules,firestore:indexes,hosting
```

Al terminar, la terminal te va a mostrar dos URLs, algo como:

- `https://mano-a-mano-agenda.web.app` → **esta es tuya**, privada, con login
- `https://mano-a-mano-reservas.web.app` → **esta es la que le mandás a tus clientes**

---

## Cómo usar la app después de publicada

- **Vos**: entrás a tu URL de agenda, hacés login una vez (con el usuario que
  creaste en el Paso 1b) y desde ahí abrís cupos, ves turnos, clientes e ingresos.
- **Tus clientes**: les pasás la URL de reservas (podés ponerla en tu Instagram,
  WhatsApp, etc.). Ahí ven solo los horarios que vos dejaste abiertos.

### Para volver a publicar cambios más adelante

Cualquier vez que pidamos cambios en el código, después de aplicarlos corré:

```bash
npm run build
firebase deploy --only hosting
```

---

## Estructura del proyecto

```
mano-a-mano/
├── firebase.json          # config de hosting (los 2 sitios)
├── firestore.rules        # reglas de seguridad de la base de datos
├── firestore.indexes.json # índices necesarios para las consultas
├── shared/                 # código y estilos compartidos entre ambas apps
│   ├── firebaseConfig.js   # tus credenciales (Paso 2)
│   ├── firestoreApi.js     # funciones para leer/escribir en la base de datos
│   ├── helpers.js          # funciones de fecha/hora/formato compartidas
│   └── styles.js           # estilos visuales compartidos
├── agenda-app/              # tu app privada
│   └── src/
│       ├── App.jsx
│       ├── auth.js          # login
│       ├── LoginScreen.jsx
│       ├── Header.jsx
│       ├── AgendaComponents.jsx
│       ├── ClientesServiciosViews.jsx
│       └── NegocioView.jsx
└── reservas-app/             # app pública de reservas
    └── src/
        ├── App.jsx
        └── ReservarView.jsx
```

---

## Seguridad de los datos (cómo quedó configurado)

- Cualquiera puede **ver** los servicios y los horarios que abriste (necesario
  para poder reservar) y **crear** una reserva.
- Nadie puede ver el listado completo de turnos, ni los datos de clientes
  (teléfonos, notas), ni editar o borrar turnos existentes, **excepto vos**
  estando logueado.
- Esto está definido en `firestore.rules` — si en algún momento querés cambiar
  estos permisos, ese es el archivo a tocar (y volver a correr
  `firebase deploy --only firestore:rules`).
