import test from "node:test";
import assert from "node:assert/strict";
import { bookableStarts, slotsCoveringRange, apptSlotIds } from "../shared/helpers.js";

const slot = (id, start, end, booked = false) => ({ id, dateKey: "2026-11-20", start, end, booked });
const starts = (list) => list.map(s => `${s.start}:${s.slotIds.join("+")}`);

test("cupos de 30 alcanzan para un servicio de 60 si son seguidos", () => {
  const day = [slot("a", "10:00", "10:30"), slot("b", "10:30", "11:00"), slot("c", "11:00", "11:30")];
  assert.deepEqual(starts(bookableStarts(day, 60)), ["10:00:a+b", "10:30:b+c"]);
});

test("un servicio de 40 usa dos cupos de 30", () => {
  const day = [slot("a", "10:00", "10:30"), slot("b", "10:30", "11:00")];
  assert.deepEqual(starts(bookableStarts(day, 40)), ["10:00:a+b"]);
});

test("un cupo que alcanza solo no se junta con el siguiente", () => {
  const day = [slot("a", "10:00", "11:00"), slot("b", "11:00", "12:00")];
  assert.deepEqual(starts(bookableStarts(day, 60)), ["10:00:a", "11:00:b"]);
  assert.deepEqual(starts(bookableStarts(day, 30)), ["10:00:a", "11:00:b"]);
});

test("no junta cupos con un hueco o uno reservado en el medio", () => {
  const gap = [slot("a", "10:00", "10:30"), slot("b", "11:00", "11:30")];
  assert.deepEqual(bookableStarts(gap, 60), []);
  const taken = [slot("a", "10:00", "10:30"), slot("b", "10:30", "11:00", true), slot("c", "11:00", "11:30")];
  assert.deepEqual(bookableStarts(taken, 60), []);
});

test("no importa el orden en que vienen los cupos", () => {
  const day = [slot("b", "10:30", "11:00"), slot("a", "10:00", "10:30")];
  assert.deepEqual(starts(bookableStarts(day, 60)), ["10:00:a+b"]);
});

test("cupos que ocupa un turno cargado a mano: los libres que se pisan con su horario", () => {
  const day = [slot("a", "10:00", "10:30"), slot("b", "10:30", "11:00"), slot("c", "11:00", "11:30", true), slot("d", "12:00", "12:30")];
  assert.deepEqual(slotsCoveringRange(day, "10:00", "11:30").map(s => s.id), ["a", "b"]);
  assert.deepEqual(slotsCoveringRange(day, "10:15", "10:45").map(s => s.id), ["a", "b"]);
});

test("apptSlotIds junta el cupo principal con los extra", () => {
  assert.deepEqual(apptSlotIds({ fromAvailabilityId: "a", extraAvailabilityIds: ["b"] }), ["a", "b"]);
  assert.deepEqual(apptSlotIds({ fromAvailabilityId: "a" }), ["a"]);
  assert.deepEqual(apptSlotIds({}), []);
});
