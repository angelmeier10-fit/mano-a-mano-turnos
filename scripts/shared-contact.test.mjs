import test from "node:test";
import assert from "node:assert/strict";
import { parseSharedContact } from "../shared/helpers.js";

test("texto simple: nombre en una línea y teléfono en otra", () => {
  assert.deepEqual(parseSharedContact("", "Graciela Maluhia\n+54 9 11 2844-9934"), { name: "Graciela Maluhia", phone: "+54 9 11 2844-9934" });
});

test("teléfono con etiqueta y varios números: toma el primero", () => {
  assert.deepEqual(
    parseSharedContact("", "Graciela Maluhia\nMóvil: +54 9 11 2844-9934\nCasa: 4555-1234"),
    { name: "Graciela Maluhia", phone: "+54 9 11 2844-9934" },
  );
});

test("el nombre puede venir en el título", () => {
  assert.deepEqual(parseSharedContact("Juan Pérez", "1123456789"), { name: "Juan Pérez", phone: "1123456789" });
});

test("vCard como texto", () => {
  const vcf = "BEGIN:VCARD\nVERSION:2.1\nN:Maluhia;Graciela;;;\nFN:Graciela Maluhia\nTEL;CELL:+5491128449934\nEND:VCARD";
  assert.deepEqual(parseSharedContact("", vcf), { name: "Graciela Maluhia", phone: "+5491128449934" });
});

test("sin nada útil devuelve null", () => {
  assert.equal(parseSharedContact("", ""), null);
  assert.equal(parseSharedContact(null, null), null);
});
