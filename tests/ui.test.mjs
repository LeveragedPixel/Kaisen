import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("every primary route has a render path", () => {
  for (const route of ["Dashboard", "Chat", "Jobs", "Markets", "Inbox", "Projects", "Automations", "Settings"]) {
    assert.match(app, new RegExp(`\\b${route}\\b`));
  }
  assert.match(app, /route === "Dashboard" \? dashboard\(\)/);
  assert.match(app, /route === "Chat" \? chatPage\(\)/);
  assert.match(app, /route === "Settings" \? settingsPage\(\)/);
});

test("settings always exposes an exit and navigation supports history", () => {
  assert.match(app, /id="settingsBack"/);
  assert.match(app, /#settingsBack/);
  assert.match(app, /history\.pushState/);
  assert.match(app, /popstate/);
  assert.match(html, /id="homeButton"/);
});

test("mobile navigation has close controls", () => {
  assert.match(html, /id="navScrim"/);
  assert.match(app, /#navScrim/);
  assert.match(app, /event\.key === "Escape"/);
});

test("dashboard actions lead to functional modules", () => {
  for (const target of ["Chat", "Markets", "Jobs", "Inbox"]) {
    assert.match(app, new RegExp(`selectRoute\\("${target}"\\)`));
  }
});
