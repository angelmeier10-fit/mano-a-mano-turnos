import test from "node:test";
import assert from "node:assert/strict";
import { instagramHandle } from "../shared/helpers.js";

test("acepta el usuario con o sin arroba", () => {
  assert.equal(instagramHandle("@angel.meier"), "angel.meier");
  assert.equal(instagramHandle("  angel.meier "), "angel.meier");
});

test("saca el usuario de un link de Instagram", () => {
  assert.equal(instagramHandle("https://www.instagram.com/angel.meier/"), "angel.meier");
  assert.equal(instagramHandle("instagram.com/angel.meier?igsh=abc"), "angel.meier");
});

test("sin dato devuelve vacío", () => {
  assert.equal(instagramHandle(""), "");
  assert.equal(instagramHandle(undefined), "");
});
