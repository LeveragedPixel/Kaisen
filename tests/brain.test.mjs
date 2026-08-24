import test from "node:test";
import assert from "node:assert/strict";
import { KAISEN_BRAIN, buildBrainPrompt, publicBrainProfile } from "../brain.mjs";

test("Kaisen remains the identity across reasoning engines", () => {
  for (const engine of ["openai", "claude", "preview"]) {
    const prompt = buildBrainPrompt(engine);
    assert.match(prompt, /Your identity is Kaisen/);
    assert.match(prompt, /reasoning engine/);
    assert.match(prompt, /not your identity/);
  }
});

test("the public brain profile contains stable operating principles", () => {
  const profile = publicBrainProfile();
  assert.equal(profile.name, "Kaisen");
  assert.equal(profile.owner, "Leveraged Pixel");
  assert.equal(profile.philosophy, "Continuous improvement");
  assert.ok(profile.principles.length >= 5);
  assert.deepEqual(profile.modules, KAISEN_BRAIN.modules);
});
