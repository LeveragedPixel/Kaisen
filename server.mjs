import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { randomUUID } from "node:crypto";
import { generateReply, providerStatus } from "./providers.mjs";
import { publicBrainProfile } from "./brain.mjs";

const root = new URL(".", import.meta.url).pathname.replace(/^\/(.:)/, "$1");
const dataDir = join(root, "data");
const dataFile = join(dataDir, "kaisen.json");
const port = Number(process.env.PORT || 4173);
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const defaultState = { conversations: [], settings: { provider: "auto", visualIntensity: "full", localFirst: true } };

async function saveState(state) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, JSON.stringify(state, null, 2));
}

async function loadState() {
  try { return JSON.parse(await readFile(dataFile, "utf8")); }
  catch { await saveState(defaultState); return structuredClone(defaultState); }
}

function json(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(payload));
}

async function body(request) {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 100_000) throw new Error("Request too large");
  }
  return raw ? JSON.parse(raw) : {};
}

function previewReply(message) {
  const text = message.toLowerCase();
  if (text.includes("who are you") || text.includes("are you claude") || text.includes("are you openai") || text.includes("are you chatgpt")) return "I'm Kaisen, your personal intelligence command center. This response is currently routed through Preview Core.";
  if (text.includes("job")) return "Opportunity Scan is staged. The next connection will score remote roles against your experience, compensation targets, and preferred schedule.";
  if (text.includes("market") || text.includes("nq") || text.includes("gold")) return "Market Core is staged for NQ, ES, and Gold. Live prices and economic-calendar intelligence will be connected in the Markets milestone.";
  if (text.includes("email") || text.includes("inbox")) return "Comm Link will begin read-only: prioritize messages, summarize threads, and draft replies while keeping sending behind your approval.";
  if (text.includes("project") || text.includes("code")) return "Project Core will connect to authorized local repositories, surface build health, and keep commits and pushes visible and controlled.";
  return "Kaisen Core received your command. This foundation now preserves conversation history locally. Connect a Local, GPT, or Claude provider in Settings to replace Preview Core with live intelligence.";
}

async function api(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/health") return json(response, 200, { status: "online", core: "local", persistence: "ready", providers: providerStatus(), time: new Date().toISOString() });
  if (request.method === "GET" && url.pathname === "/api/brain") return json(response, 200, { brain: publicBrainProfile(), status: "active" });
  if (request.method === "GET" && url.pathname === "/api/providers") {
    const state = await loadState();
    return json(response, 200, { providers: providerStatus(), preference: state.settings?.provider || "auto" });
  }
  if (request.method === "POST" && url.pathname === "/api/settings/provider") {
    const payload = await body(request);
    if (!["auto", "openai", "claude"].includes(payload.provider)) return json(response, 400, { error: "Invalid provider" });
    const state = await loadState();
    state.settings = { ...defaultState.settings, ...state.settings, provider: payload.provider };
    await saveState(state);
    return json(response, 200, { preference: payload.provider, providers: providerStatus() });
  }
  if (request.method === "GET" && url.pathname === "/api/chat/conversations") {
    const state = await loadState();
    return json(response, 200, { conversations: state.conversations });
  }
  if (request.method === "POST" && url.pathname === "/api/chat/message") {
    const payload = await body(request);
    const content = String(payload.message || "").trim().slice(0, 8000);
    if (!content) return json(response, 400, { error: "Message is required" });
    const state = await loadState();
    let conversation = state.conversations.find(item => item.id === payload.conversationId);
    if (!conversation) {
      conversation = { id: randomUUID(), title: content.slice(0, 46), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messages: [] };
      state.conversations.unshift(conversation);
    }
    conversation.messages.push({ id: randomUUID(), role: "user", content, createdAt: new Date().toISOString() });
    const preference = ["auto", "openai", "claude"].includes(payload.provider) ? payload.provider : state.settings?.provider || "auto";
    let generated;
    let providerError;
    try { generated = await generateReply(conversation.messages.map(({ role, content: messageContent }) => ({ role, content: messageContent })), preference); }
    catch (error) { providerError = error.message; }
    const reply = generated || { content: previewReply(content), provider: "preview", model: "local-preview" };
    conversation.messages.push({ id: randomUUID(), role: "assistant", identity: "Kaisen", content: reply.content, provider: reply.provider, model: reply.model, createdAt: new Date().toISOString() });
    conversation.updatedAt = new Date().toISOString();
    state.conversations.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    await saveState(state);
    return json(response, 201, { conversation, identity: "Kaisen", engine: reply.provider, mode: reply.provider, providerError });
  }
  if (request.method === "DELETE" && url.pathname.startsWith("/api/chat/conversations/")) {
    const id = url.pathname.split("/").pop();
    const state = await loadState();
    state.conversations = state.conversations.filter(item => item.id !== id);
    await saveState(state);
    return json(response, 200, { success: true });
  }
  return json(response, 404, { error: "Not found" });
}

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname.startsWith("/api/")) return await api(request, response, url);
    const requested = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
    const file = await readFile(join(root, safePath));
    response.writeHead(200, { "content-type": `${types[extname(safePath)] || "application/octet-stream"}; charset=utf-8`, "cache-control": "no-store" });
    response.end(file);
  } catch (error) {
    if (request.url.startsWith("/api/")) return json(response, 500, { error: error.message || "Kaisen Core error" });
    const file = await readFile(join(root, "index.html"));
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(file);
  }
}).listen(port, "127.0.0.1", () => console.log(`Kaisen Core online at http://127.0.0.1:${port}`));
