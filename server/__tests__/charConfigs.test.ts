import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { loadAllConfigs, getCharConfig, getDefaultConfig, getAllCharIds } from "../charConfigs.ts";

// Load configs once before tests
await loadAllConfigs(new URL("../../server/main.ts", import.meta.url));

Deno.test("loads all 17 character configs", () => {
  const ids = getAllCharIds();
  assertEquals(ids.length, 17);
});

Deno.test("getCharConfig returns config for valid ID", () => {
  const config = getCharConfig("petyaj");
  assertExists(config);
  assertEquals(config.id, "petyaj");
  assertEquals(config.displayName, "Петяй");
});

Deno.test("getCharConfig returns undefined for invalid ID", () => {
  const config = getCharConfig("nonexistent");
  assertEquals(config, undefined);
});

Deno.test("getDefaultConfig returns first character", () => {
  const config = getDefaultConfig();
  assertExists(config);
  assertEquals(typeof config.id, "string");
  assertEquals(typeof config.maxHp, "number");
});
