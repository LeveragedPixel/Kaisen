const icons = { Dashboard: "⌂", Chat: "◇", Jobs: "◎", Markets: "⌁", Inbox: "✉", Projects: "▱", Automations: "ϟ", Settings: "⚙" };
const routes = Object.keys(icons);
const nav = document.querySelector("#nav");
const page = document.querySelector("#page");
const pageName = document.querySelector("#pageName");
let activeConversationId = null;
let conversationCache = [];
const defaultDisplay = { style: "hud", fontSize: "comfortable" };

function loadDisplay() {
  try { return { ...defaultDisplay, ...JSON.parse(localStorage.getItem("kaisen-display")) }; } catch { return defaultDisplay; }
}

function applyDisplay(display = loadDisplay()) {
  document.body.dataset.style = display.style;
  document.body.dataset.fontSize = display.fontSize;
  localStorage.setItem("kaisen-display", JSON.stringify(display));
}

applyDisplay();

nav.innerHTML = `<span class="nav-label">COMMAND MODULES</span>${routes.map((name, index) => `<button data-route="${name}" class="${index === 0 ? "active" : ""}"><i>${icons[name]}</i><span>${name}</span>${name === "Inbox" ? "<b>2</b>" : ""}</button>`).join("")}<span class="nav-label nav-label-two">CONTROL</span>`;

function dashboard() {
  page.innerHTML = "";
  page.append(document.querySelector("#dashboard-template").content.cloneNode(true));
  const input = document.querySelector("#commandInput");
  document.querySelector("#sendCommand").addEventListener("click", async () => {
    if (!input.value.trim()) return input.focus();
    const original = input.value.trim();
    input.value = "";
    await sendMessage(original);
    selectRoute("Chat");
  });
  input.addEventListener("keydown", event => { if (event.key === "Enter") document.querySelector("#sendCommand").click(); });
}

const moduleCopy = {
  Jobs: ["OPPORTUNITY ENGINE", "Remote opportunity scan", "Rank roles by fit, timing, compensation, and your priorities.", ["7 NEW SIGNALS", "3 HIGH MATCHES", "94% TOP SCORE"]],
  Markets: ["MARKET INTELLIGENCE", "Trading session overview", "Overnight structure, economic events, levels, and news synthesis.", ["NQ +0.42%", "ES +0.21%", "GC −0.18%"]],
  Inbox: ["COMMUNICATION LINK", "Priority inbox", "Important conversations surfaced. Noise suppressed.", ["2 NEED ACTION", "1 RECRUITER", "12 MIN AGO"]],
  Projects: ["BUILD SYSTEM", "Project command center", "Repositories, active work, build health, and deployment state.", ["GIT CONNECTED", "MAIN BRANCH", "BUILD READY"]],
  Automations: ["AUTOMATION ENGINE", "Scheduled intelligence", "Your recurring scans and briefings, monitored in one place.", ["6 ACTIVE", "0 FAILURES", "NEXT 08:00"]],
  Settings: ["SYSTEM CONTROL", "Kaisen preferences", "Tune intelligence routing, privacy, notifications, and visual intensity.", ["FULL HUD", "LOCAL FIRST", "SECURE MODE"]]
};

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

async function api(path, options) {
  const response = await fetch(path, { headers: { "content-type": "application/json" }, ...options });
  if (!response.ok) throw new Error((await response.json()).error || "Kaisen Core request failed");
  return response.json();
}

async function loadConversations() {
  const data = await api("/api/chat/conversations");
  conversationCache = data.conversations;
  if (!activeConversationId && conversationCache.length) activeConversationId = conversationCache[0].id;
}

async function sendMessage(message) {
  const data = await api("/api/chat/message", { method: "POST", body: JSON.stringify({ message, conversationId: activeConversationId }) });
  activeConversationId = data.conversation.id;
  await loadConversations();
}

function renderMessages(conversation) {
  if (!conversation) return `<div class="chat-empty"><div class="chat-core"><i></i><span>◈</span></div><span class="panel-kicker">KAISEN CONVERSATION CORE</span><h2>What are we working on?</h2><p>Your conversations are stored locally. Live AI providers will connect through the secure Kaisen Core.</p><div class="prompt-grid"><button>Show me today’s priorities</button><button>What is the market plan?</button><button>Review my active projects</button><button>Find remote job opportunities</button></div></div>`;
  return conversation.messages.map(message => `<article class="chat-message ${message.role}"><div class="message-avatar">${message.role === "assistant" ? "◈" : "LP"}</div><div><header><strong>${message.role === "assistant" ? "KAISEN" : "YOU"}</strong><span>${new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>${message.provider ? `<b>${message.provider.toUpperCase()} CORE</b>` : ""}</header><p>${escapeHtml(message.content)}</p></div></article>`).join("");
}

async function chatPage() {
  page.innerHTML = `<div class="chat-loading">INITIALIZING CONVERSATION CORE...</div>`;
  try { await loadConversations(); } catch {}
  const current = conversationCache.find(item => item.id === activeConversationId);
  page.innerHTML = `<div class="chat-layout reveal">
    <aside class="conversation-rail panel"><div class="conversation-head"><div><span class="panel-kicker">CONVERSATIONS</span><h2>Command history</h2></div><button id="newChat" aria-label="New conversation">＋</button></div><div class="conversation-list">${conversationCache.length ? conversationCache.map(item => `<button data-conversation="${item.id}" class="${item.id === activeConversationId ? "active" : ""}"><i>◇</i><span><strong>${escapeHtml(item.title)}</strong><small>${item.messages.length} SIGNALS · ${new Date(item.updatedAt).toLocaleDateString()}</small></span></button>`).join("") : `<p>NO SAVED CONVERSATIONS</p>`}</div><div class="provider-stack"><span class="panel-kicker">INTELLIGENCE ROUTER</span><div><i class="online"></i><span>AUTO</span><b>PREVIEW CORE</b></div><div><i></i><span>LOCAL</span><b>NOT CONNECTED</b></div><div><i></i><span>GPT</span><b>NOT CONNECTED</b></div><div><i></i><span>CLAUDE</span><b>NOT CONNECTED</b></div></div></aside>
    <section class="chat-main panel"><header class="chat-top"><div><span class="panel-kicker">06 / CONVERSATION CORE</span><h2>${current ? escapeHtml(current.title) : "New intelligence channel"}</h2></div><div class="router-select"><span>ROUTE</span><button>AUTO⌄</button></div></header><div class="message-stream" id="messageStream">${renderMessages(current)}</div><div class="chat-composer"><div class="composer-tools"><button aria-label="Attach file">＋</button><button aria-label="Voice input">⌁</button></div><textarea id="chatInput" rows="1" placeholder="Message Kaisen..." aria-label="Message Kaisen"></textarea><span>PREVIEW CORE · LOCAL HISTORY</span><button id="chatSend">EXECUTE →</button></div></section>
  </div>`;
  const input = document.querySelector("#chatInput");
  const submit = async () => {
    const message = input.value.trim(); if (!message) return input.focus();
    input.disabled = true; document.querySelector("#chatSend").textContent = "PROCESSING";
    try { await sendMessage(message); await chatPage(); } catch (error) { input.disabled = false; document.querySelector("#chatSend").textContent = "RETRY →"; }
  };
  document.querySelector("#chatSend").addEventListener("click", submit);
  input.addEventListener("keydown", event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } });
  document.querySelector("#newChat").addEventListener("click", () => { activeConversationId = null; chatPage(); });
  document.querySelectorAll("[data-conversation]").forEach(button => button.addEventListener("click", () => { activeConversationId = button.dataset.conversation; chatPage(); }));
  document.querySelectorAll(".prompt-grid button").forEach(button => button.addEventListener("click", () => { input.value = button.textContent; submit(); }));
  const stream = document.querySelector("#messageStream"); stream.scrollTop = stream.scrollHeight;
}

function modulePage(route) {
  const [kicker, title, description, stats] = moduleCopy[route];
  page.innerHTML = `<div class="module-page reveal"><div class="module-hero"><span class="panel-kicker">${kicker}</span><h1>${title}</h1><p>${description}</p></div><div class="module-stats">${stats.map((stat, i) => `<div><span>0${i + 1}</span><strong>${stat}</strong></div>`).join("")}</div><div class="panel module-stage"><div class="stage-orbit"><i></i><b>${icons[route]}</b></div><span>${route.toUpperCase()} MODULE</span><h2>Interface channel established</h2><p>This module is staged for the next Kaisen milestone. The application shell and navigation are operational.</p><button class="wide-button" data-dashboard>RETURN TO COMMAND CENTER →</button></div></div>`;
  document.querySelector("[data-dashboard]").addEventListener("click", () => selectRoute("Dashboard"));
}

function settingsPage() {
  const current = loadDisplay();
  page.innerHTML = `<div class="settings-page reveal"><div class="module-hero"><span class="panel-kicker">SYSTEM CONTROL / DISPLAY</span><h1>Make Kaisen <em>yours.</em></h1><p>Choose a visual system and reading size that feels comfortable on this monitor. Changes apply instantly and stay on this device.</p></div>
    <section class="settings-section panel"><div class="settings-title"><div><span class="panel-kicker">01 / VISUAL SYSTEM</span><h2>Interface style</h2></div><p>Change the mood without changing how Kaisen works.</p></div><div class="style-options">
      <button data-style="hud" class="${current.style === "hud" ? "selected" : ""}"><div class="style-preview preview-hud"><i></i><i></i><i></i></div><strong>Full HUD</strong><span>Electric cyan · technical glow</span><b>ORIGINAL</b></button>
      <button data-style="command" class="${current.style === "command" ? "selected" : ""}"><div class="style-preview preview-command"><i></i><i></i><i></i></div><strong>Clean Command</strong><span>Graphite · quieter contrast</span><b>FOCUSED</b></button>
      <button data-style="midnight" class="${current.style === "midnight" ? "selected" : ""}"><div class="style-preview preview-midnight"><i></i><i></i><i></i></div><strong>Midnight</strong><span>Violet blue · cinematic depth</span><b>ALT</b></button>
    </div></section>
    <section class="settings-section panel"><div class="settings-title"><div><span class="panel-kicker">02 / READABILITY</span><h2>Text size</h2></div><p>Comfortable is now the recommended default for smaller monitors.</p></div><div class="font-options">
      <button data-font="compact" class="${current.fontSize === "compact" ? "selected" : ""}"><span class="font-sample small">Aa</span><strong>Compact</strong><small>More information on screen</small></button>
      <button data-font="comfortable" class="${current.fontSize === "comfortable" ? "selected" : ""}"><span class="font-sample medium">Aa</span><strong>Comfortable</strong><small>Balanced and readable</small></button>
      <button data-font="large" class="${current.fontSize === "large" ? "selected" : ""}"><span class="font-sample large">Aa</span><strong>Large</strong><small>Maximum readability</small></button>
    </div><div class="readability-preview"><span>LIVE PREVIEW</span><h3>Intelligence Network</h3><p>Kaisen is online and ready. This sample updates with your selected text size.</p></div></section>
  </div>`;
  document.querySelectorAll("[data-style]").forEach(button => button.addEventListener("click", () => { const display = loadDisplay(); display.style = button.dataset.style; applyDisplay(display); settingsPage(); }));
  document.querySelectorAll("[data-font]").forEach(button => button.addEventListener("click", () => { const display = loadDisplay(); display.fontSize = button.dataset.font; applyDisplay(display); settingsPage(); }));
}

function selectRoute(route) {
  pageName.textContent = route.toUpperCase();
  document.querySelectorAll("#nav button").forEach(button => button.classList.toggle("active", button.dataset.route === route));
  route === "Dashboard" ? dashboard() : route === "Chat" ? chatPage() : route === "Settings" ? settingsPage() : modulePage(route);
  document.querySelector("#sidebar").classList.remove("open");
}

nav.addEventListener("click", event => { const button = event.target.closest("button[data-route]"); if (button) selectRoute(button.dataset.route); });
document.querySelector("#menuButton").addEventListener("click", () => document.querySelector("#sidebar").classList.toggle("open"));
function tick() { document.querySelector("#clock").textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
tick(); setInterval(tick, 1000); dashboard();

