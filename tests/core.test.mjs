import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port = 4199;
let server;

test.before(async () => {
  server = spawn(process.execPath, ["server.mjs"], { env: { ...process.env, PORT: String(port) }, stdio: "ignore" });
  for (let i = 0; i < 30; i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/api/health`)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("Kaisen Core did not start");
});

test.after(() => server?.kill());

test("health reports an online local core", async () => {
  const health = await (await fetch(`http://127.0.0.1:${port}/api/health`)).json();
  assert.equal(health.status, "online");
  assert.equal(health.persistence, "ready");
  assert.equal(typeof health.providers.openai.configured, "boolean");
  assert.equal(typeof health.providers.claude.configured, "boolean");
  assert.equal(JSON.stringify(health).includes("API_KEY"), false);
});

test("provider routing can be inspected and changed without exposing secrets", async () => {
  const initial = await (await fetch(`http://127.0.0.1:${port}/api/providers`)).json();
  assert.ok(initial.providers.openai.model);
  assert.ok(initial.providers.claude.model);
  assert.equal("key" in initial.providers.openai, false);
  const changed = await (await fetch(`http://127.0.0.1:${port}/api/settings/provider`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider: "auto" }) })).json();
  assert.equal(changed.preference, "auto");
});

test("Kaisen Brain exposes a provider-independent identity", async () => {
  const result = await (await fetch(`http://127.0.0.1:${port}/api/brain`)).json();
  assert.equal(result.status, "active");
  assert.equal(result.brain.name, "Kaisen");
  assert.equal(result.brain.owner, "Leveraged Pixel");
  assert.ok(result.brain.principles.some(principle => principle.includes("interchangeable reasoning engines")));
});

test("chat creates and persists a conversation", async () => {
  const result = await (await fetch(`http://127.0.0.1:${port}/api/chat/message`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: "Show me the market plan" }) })).json();
  assert.equal(result.conversation.messages.length, 2);
  assert.match(result.conversation.messages[1].content, /Market Core/);
  const saved = await (await fetch(`http://127.0.0.1:${port}/api/chat/conversations`)).json();
  assert.ok(saved.conversations.some(item => item.id === result.conversation.id));
});
