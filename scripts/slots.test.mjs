import test from "node:test";
import assert from "node:assert/strict";
import { startTimes, fitsInFranja, freeRanges, busyEntry, releaseFranja, apptSlotIds } from "../shared/helpers.js";

const franja = (id, start, end, extra = {}) => ({ id, dateKey: "2026-11-20", start, end, ...extra });
const svc = (id, duration, restMinutes = 0) => ({ id, duration, restMinutes });
const times = (list) => list.map(s => `${s.start}-${s.end}`);

test("una franja ofrece los horarios uno detrás del otro según la duración", () => {
  const day = [franja("f", "09:00", "11:00")];
  assert.deepEqual(times(startTimes(day, svc("corte", 30))), ["09:00-09:30", "09:30-10:00", "10:00-10:30", "10:30-11:00"]);
  assert.deepEqual(times(startTimes(day, svc("m45", 45))), ["09:00-09:45", "09:45-10:30"]);
  assert.deepEqual(times(startTimes(day, svc("m90", 90))), ["09:00-10:30"]);
  assert.deepEqual(startTimes(day, svc("largo", 150)), []);
});

test("el horario devuelto conserva los datos de la franja", () => {
  const [first] = startTimes([franja("f", "09:00", "10:00", { locationId: "l1", allowLastMinute: true })], svc("s", 60));
  assert.equal(first.id, "f");
  assert.equal(first.locationId, "l1");
  assert.equal(first.allowLastMinute, true);
});

test("el descanso del servicio separa los horarios ofrecidos", () => {
  const day = [franja("f", "09:00", "12:00")];
  assert.deepEqual(times(startTimes(day, svc("m60", 60, 10))), ["09:00-10:00", "10:10-11:10"]);
});

test("el descanso no hace falta al final de la franja", () => {
  assert.deepEqual(times(startTimes([franja("f", "09:00", "10:00")], svc("m60", 60, 15))), ["09:00-10:00"]);
});

test("un turno tomado parte la franja y los horarios se pegan a él", () => {
  const day = [franja("f", "09:00", "12:00", { busy: [{ start: "09:00", end: "09:45", apptId: "a" }] })];
  assert.deepEqual(times(startTimes(day, svc("corte", 30))), [
    "09:45-10:15", "10:15-10:45", "10:45-11:15", "11:15-11:45",
  ]);
});

test("antes de un turno tomado tiene que entrar el descanso", () => {
  const day = [franja("f", "09:00", "12:00", { busy: [{ start: "10:00", end: "11:00", apptId: "a" }] })];
  assert.deepEqual(times(startTimes(day, svc("m60", 60))), ["09:00-10:00", "11:00-12:00"]);
  assert.deepEqual(times(startTimes(day, svc("m60d", 60, 10))), ["11:00-12:00"]);
});

test("una franja \"solo para\" ofrece horarios solo a esos servicios", () => {
  const day = [franja("f", "09:00", "10:00", { serviceIds: ["corte"] })];
  assert.equal(startTimes(day, svc("corte", 30)).length, 2);
  assert.deepEqual(startTimes(day, svc("tintura", 30)), []);
  assert.equal(startTimes([franja("g", "09:00", "10:00", { serviceIds: [] })], svc("tintura", 30)).length, 2);
});

test("un cupo viejo reservado no ofrece horarios", () => {
  assert.deepEqual(startTimes([franja("f", "09:00", "10:00", { booked: true })], svc("s", 30)), []);
});

test("varias franjas se ordenan por horario y los turnos superpuestos se juntan", () => {
  const day = [
    franja("tarde", "15:00", "16:00"),
    franja("man", "09:00", "11:00", { busy: [{ start: "09:30", end: "10:15" }, { start: "09:00", end: "09:45" }] }),
  ];
  assert.deepEqual(freeRanges(day[1]), [{ start: 615, end: 660, closed: false }]);
  assert.deepEqual(times(startTimes(day, svc("corte", 30))), ["10:15-10:45", "15:00-15:30", "15:30-16:00"]);
});

test("fitsInFranja valida el horario elegido antes de reservar", () => {
  const f = franja("f", "09:00", "12:00", { busy: [{ start: "10:00", end: "11:00" }] });
  assert.equal(fitsInFranja(f, "09:00", svc("m60", 60)), true);
  assert.equal(fitsInFranja(f, "09:30", svc("m60", 60)), false);
  assert.equal(fitsInFranja(f, "09:00", svc("m60d", 60, 10)), false);
  assert.equal(fitsInFranja(f, "11:00", svc("m60d", 60, 10)), true);
  assert.equal(fitsInFranja(f, "08:30", svc("corte", 30)), false);
  assert.equal(fitsInFranja({ ...f, serviceIds: ["otro"] }, "09:00", svc("m60", 60)), false);
});

test("busyEntry guarda el turno con el descanso del servicio", () => {
  assert.deepEqual(busyEntry("a", "09:00", "10:00", svc("m60", 60, 10)), { start: "09:00", end: "10:10", apptId: "a" });
  assert.deepEqual(busyEntry("b", "09:00", "09:30", null), { start: "09:00", end: "09:30", apptId: "b" });
});

test("apptSlotIds junta el cupo principal con los extra (turnos viejos)", () => {
  assert.deepEqual(apptSlotIds({ fromAvailabilityId: "a", extraAvailabilityIds: ["b"] }), ["a", "b"]);
  assert.deepEqual(apptSlotIds({ fromAvailabilityId: "a" }), ["a"]);
  assert.deepEqual(apptSlotIds({}), []);
});

test("releaseFranja saca el turno de la franja, o libera el cupo viejo", () => {
  const f = franja("f", "09:00", "12:00", { busy: [{ start: "09:00", end: "10:00", apptId: "a" }, { start: "10:00", end: "11:00", apptId: "b" }] });
  assert.deepEqual(releaseFranja(f, "a"), { busy: [{ start: "10:00", end: "11:00", apptId: "b" }] });
  assert.equal(releaseFranja(f, "z"), null);
  assert.deepEqual(releaseFranja(franja("v", "09:00", "10:00", { booked: true }), "a"), { booked: false });
  assert.equal(releaseFranja(franja("v", "09:00", "10:00"), "a"), null);
});
