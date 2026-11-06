import test from "node:test";
import assert from "node:assert/strict";
import { isHttpsUrl, servicePaymentLink } from "../shared/helpers.js";

const service = {
  price: 30000, paymentLink: "https://mpago.la/uno",
  price2: 50000, paymentLink2: "https://mpago.la/dos",
  price3: 70000, paymentLink3: "https://mpago.la/tres",
};

test("devuelve el link que corresponde a cada cantidad de sesiones", () => {
  assert.equal(servicePaymentLink(service, 30000), "https://mpago.la/uno");
  assert.equal(servicePaymentLink(service, 50000, 2), "https://mpago.la/dos");
  assert.equal(servicePaymentLink(service, 70000, 3), "https://mpago.la/tres");
});

test("no devuelve link si el monto no coincide con el precio del link", () => {
  assert.equal(servicePaymentLink(service, 25000), "");
  assert.equal(servicePaymentLink(service, 0), "");
});

test("no devuelve link si está vacío o el servicio no existe", () => {
  assert.equal(servicePaymentLink({ price: 30000, paymentLink: "  " }, 30000), "");
  assert.equal(servicePaymentLink({ price: 30000 }, 30000), "");
  assert.equal(servicePaymentLink(undefined, 30000), "");
});

test("no devuelve link de un combo sin precio", () => {
  assert.equal(servicePaymentLink({ ...service, price2: 0 }, 0, 2), "");
});

test("solo acepta links https", () => {
  assert.equal(isHttpsUrl("https://mpago.la/uno"), true);
  assert.equal(isHttpsUrl("http://mpago.la/uno"), false);
  assert.equal(isHttpsUrl("javascript:alert(1)"), false);
  assert.equal(isHttpsUrl("mpago.la/uno"), false);
  assert.equal(servicePaymentLink({ price: 30000, paymentLink: "javascript:alert(1)" }, 30000), "");
});
