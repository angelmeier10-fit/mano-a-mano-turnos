import test from "node:test";
import assert from "node:assert/strict";
import { groupServicesByCategory } from "../shared/helpers.js";

const s = (id, category) => ({ id, ...(category !== undefined ? { category } : {}) });
const shape = (groups) => groups.map(g => [g.title, g.services.map(x => x.id)]);

test("sin títulos queda un solo grupo sin encabezado", () => {
  assert.deepEqual(shape(groupServicesByCategory([s("a"), s("b", "  ")])), [["", ["a", "b"]]]);
});

test("agrupa por título en el orden en que aparecen y deja los sin título al final como Otros", () => {
  const list = [s("a", "Masajes"), s("b"), s("c", "Faciales"), s("d", "masajes "), s("e", "Masajes")];
  assert.deepEqual(shape(groupServicesByCategory(list)), [
    ["Masajes", ["a", "d", "e"]],
    ["Faciales", ["c"]],
    ["Otros", ["b"]],
  ]);
});

test("lista vacía devuelve cero grupos", () => {
  assert.deepEqual(groupServicesByCategory([]), []);
});
