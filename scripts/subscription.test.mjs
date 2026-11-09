import test from "node:test";
import assert from "node:assert/strict";
import { subscriptionStatus, addOneMonth, subscriptionPlan, isValidSlug, slugFromName } from "../shared/helpers.js";

const NOW = new Date(2026, 5, 15, 12).getTime();
const DAY = 86400000;
const ts = (ms) => ({ toMillis: () => ms });

test("sin datos de suscripción o marcado como exento: exento", () => {
  assert.equal(subscriptionStatus({}, NOW).state, "exempt");
  assert.equal(subscriptionStatus({ exempt: true, activeUntil: NOW - 90 * DAY }, NOW).state, "exempt");
});

test("prueba de 30 días desde el alta, después gracia y bloqueo", () => {
  assert.equal(subscriptionStatus({ createdAt: ts(NOW - 29 * DAY) }, NOW).state, "trial");
  assert.equal(subscriptionStatus({ createdAt: ts(NOW - 31 * DAY) }, NOW).state, "grace");
  assert.equal(subscriptionStatus({ createdAt: ts(NOW - 36 * DAY) }, NOW).state, "grace");
  assert.equal(subscriptionStatus({ createdAt: ts(NOW - 38 * DAY) }, NOW).state, "blocked");
});

test("un pago manda sobre la prueba y vence con gracia de 7 días", () => {
  assert.equal(subscriptionStatus({ createdAt: ts(NOW - DAY), activeUntil: NOW + 40 * DAY }, NOW).state, "active");
  assert.equal(subscriptionStatus({ createdAt: ts(NOW - 90 * DAY), activeUntil: NOW + DAY }, NOW).state, "active");
  assert.equal(subscriptionStatus({ activeUntil: NOW - 6 * DAY }, NOW).state, "grace");
  assert.equal(subscriptionStatus({ activeUntil: NOW - 8 * DAY }, NOW).state, "blocked");
});

test("informa hasta cuándo dura y cuándo se bloquea", () => {
  const s = subscriptionStatus({ activeUntil: NOW + DAY }, NOW);
  assert.equal(s.until, NOW + DAY);
  assert.equal(s.blocksAt, NOW + 8 * DAY);
  assert.equal(subscriptionStatus({ createdAt: ts(NOW) }, NOW).until, NOW + 30 * DAY);
});

test("el alta recién creada, con la hora del servidor pendiente, no aparece bloqueada", () => {
  assert.equal(subscriptionStatus({ createdAt: null, activeUntil: null }, NOW).state, "exempt");
});

test("sumar un mes respeta los meses cortos", () => {
  const add = (y, m, d) => { const r = new Date(addOneMonth(new Date(y, m, d, 10).getTime())); return [r.getFullYear(), r.getMonth(), r.getDate()]; };
  assert.deepEqual(add(2026, 0, 15), [2026, 1, 15]);
  assert.deepEqual(add(2026, 0, 31), [2026, 1, 28]);
  assert.deepEqual(add(2026, 11, 31), [2027, 0, 31]);
});

test("el plan de fundador dura hasta su fecha y después vuelve al precio normal", () => {
  const config = { priceRegular: 14900, priceFounder: 9900, linkRegular: "https://r", linkFounder: "https://f" };
  assert.deepEqual(subscriptionPlan({ plan: "regular" }, config, NOW), { plan: "regular", price: 14900, link: "https://r" });
  assert.deepEqual(subscriptionPlan({ plan: "founder", founderUntil: NOW + DAY }, config, NOW), { plan: "founder", price: 9900, link: "https://f" });
  assert.equal(subscriptionPlan({ plan: "founder", founderUntil: NOW - DAY }, config, NOW).plan, "regular");
  assert.equal(subscriptionPlan(null, config, NOW).plan, "regular");
});

test("el link de reservas se arma del nombre y se valida", () => {
  assert.equal(slugFromName("  Uñas de María  & Co. "), "unas-de-maria-co");
  assert.ok(isValidSlug("mi-negocio2"));
  for (const bad of ["ab", "Con Mayus", "-guion", "guion-", "doble--guion", "admin", "a".repeat(41)]) {
    assert.equal(isValidSlug(bad), false, bad);
  }
});
