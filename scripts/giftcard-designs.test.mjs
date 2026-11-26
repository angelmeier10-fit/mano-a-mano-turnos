import test from "node:test";
import assert from "node:assert/strict";
import { GIFT_CARD_DESIGNS, enabledGiftCardDesigns, giftCardDesignId } from "../shared/helpers.js";

const ids = (list) => list.map(d => d.id);

test("hay 7 diseños y el primero es el clásico", () => {
  assert.deepEqual(ids(GIFT_CARD_DESIGNS), ["classic", "hearts", "gifts", "holidays", "flowers", "birthday", "relax"]);
});

test("sin configuración: todos menos Fiestas", () => {
  assert.deepEqual(ids(enabledGiftCardDesigns({})), ["classic", "hearts", "gifts", "flowers", "birthday", "relax"]);
  assert.deepEqual(ids(enabledGiftCardDesigns(null)), ["classic", "hearts", "gifts", "flowers", "birthday", "relax"]);
});

test("respeta los prendidos, en el orden del catálogo, y el clásico siempre está", () => {
  assert.deepEqual(ids(enabledGiftCardDesigns({ giftCardDesigns: ["holidays", "hearts"] })), ["classic", "hearts", "holidays"]);
  assert.deepEqual(ids(enabledGiftCardDesigns({ giftCardDesigns: [] })), ["classic"]);
  assert.deepEqual(ids(enabledGiftCardDesigns({ giftCardDesigns: ["inventado"] })), ["classic"]);
});

test("un id desconocido o vacío se muestra como clásico", () => {
  assert.equal(giftCardDesignId(undefined), "classic");
  assert.equal(giftCardDesignId("inventado"), "classic");
  assert.equal(giftCardDesignId("holidays"), "holidays");
});
