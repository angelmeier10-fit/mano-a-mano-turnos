// shared/helpers.js

export const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export const DEFAULT_SERVICES = [
  { id: "medio-torso", name: "Medio torso", duration: 40, color: "#B5654A", price: 20000 },
  { id: "medio-torso-ventosas", name: "Medio torso + ventosas", duration: 40, color: "#8B4226", price: 30000 },
  { id: "cuerpo-completo", name: "Cuerpo completo", duration: 60, color: "#6E7F5C", price: 30000 },
  { id: "cuerpo-completo-ventosas", name: "Cuerpo completo + ventosas", duration: 60, color: "#4A5A6B", price: 40000 },
];

export const DEFAULT_BUSINESS_INFO = {
  name: "Angel Meier — Masoterapia",
  address: "Arata 1967, Don Torcuato",
  addressDetail: "Entre Brasil y Ecuador",
  hoursLabel: "Lunes a viernes de 10 a 20 hs",
  whatsapp: "",
  msgRecordatorio: "Hola {nombre}! Te recuerdo tu turno de {servicio} {cuando} a las {hora} hs en {direccion}. ¡Te espero!",
  msgConfirmacion: "Hola {nombre}! Te confirmo tu turno de {servicio} el {fecha} a las {hora} hs en {direccion}. ¡Te espero!",
};

export const STATUS = {
  pendiente: { label: "Pendiente", color: "#C9973A" },
  confirmado: { label: "Confirmado", color: "#6E7F5C" },
  completado: { label: "Completado", color: "#2A2622" },
  cancelado: { label: "Cancelado", color: "#A6483A" },
  ausente: { label: "No vino", color: "#B08A3E" },
};

export function pad(n) { return n.toString().padStart(2, "0"); }
export function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
export function timeToMinutes(t) { const [h,m] = t.split(":").map(Number); return h*60+m; }
export function minutesToTime(min) { return `${pad(Math.floor(min/60))}:${pad(min%60)}`; }
export function addDays(d, n) { const nd = new Date(d); nd.setDate(nd.getDate()+n); return nd; }
export function startOfWeek(d) { const nd = new Date(d); const day = nd.getDay(); return addDays(nd, -day); }
export function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
export function formatPrice(n) { return (n || 0).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }); }
export function getAppointmentPrice(appt, service) { return Math.max(0, (service?.price || 0) - (appt?.discount || 0)); }
export function formatDateLong(dKey) {
  return new Date(dKey + "T00:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
}
export function formatDateShort(dKey) {
  const d = new Date(dKey + "T00:00:00");
  const dayName = DAY_NAMES[d.getDay()];
  return `${dayName} ${d.getDate()}/${d.getMonth() + 1}`;
}
export function formatPhoneForWhatsapp(phone) {
  if (!phone) return null;
  let d = phone.replace(/[^\d]/g, "");
  if (!d) return null;
  if (d.startsWith("549") && d.length === 13) return d;
  if (d.startsWith("54") && d.length === 12) return "549" + d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length === 12) {
    if (d.slice(2, 4) === "15")      d = d.slice(0, 2) + d.slice(4);
    else if (d.slice(3, 5) === "15") d = d.slice(0, 3) + d.slice(5);
    else if (d.slice(4, 6) === "15") d = d.slice(0, 4) + d.slice(6);
  }
  if (d.length < 10) return null;
  return "549" + d;
}

export function isPastSlot(dKey, time, marginMinutes = 0) {
  const now = new Date();
  if (dKey > dateKey(now)) return false;
  if (dKey < dateKey(now)) return true;
  return timeToMinutes(time) <= now.getHours()*60 + now.getMinutes() + marginMinutes;
}

export function GoogleFontsHref() {
  return "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap";
}

export function getRecurringDateKeys(weekdays, weeksCount) {
  const result = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < weeksCount * 7; i++) {
    const d = addDays(today, i);
    if (weekdays.includes(d.getDay())) result.push(dateKey(d));
    if (result.length >= weekdays.length * weeksCount) break;
  }
  return result;
}

export function parseDateKeyAsLocal(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function getRecurringDateKeysByRange(weekdays, fromDate, toDate) {
  const result = [];
  const from = parseDateKeyAsLocal(fromDate);
  const to = parseDateKeyAsLocal(toDate);
  let d = from;
  while (d <= to) {
    if (weekdays.includes(d.getDay())) result.push(dateKey(d));
    d = addDays(d, 1);
  }
  return result;
}

export function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
export function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }

export function getMonthGrid(d) {
  const first = startOfMonth(d);
  const gridStart = addDays(first, -first.getDay());
  const weeks = [];
  let cursor = gridStart;
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
    if (week[6].getMonth() !== d.getMonth() && week[6] > first) break;
  }
  return weeks;
}
