const icons = { Dashboard: "⌂", Chat: "◇", Jobs: "◎", Markets: "⌁", Inbox: "✉", Projects: "▱", Automations: "ϟ", Settings: "⚙" };
const routes = Object.keys(icons);
const nav = document.querySelector("#nav");
const page = document.querySelector("#page");
const pageName = document.querySelector("#pageName");
let activeConversationId = null;
let conversationCache = [];
let currentRoute = "Dashboard";
let renderToken = 0;
let toastTimer;
let providerConfig = { preference: "auto", providers: { openai: { configured: false, model: "gpt-5.6" }, claude: { configured: false, model: "claude-sonnet-4-6" } } };
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
  document.querySelector(".briefing .text-button").addEventListener("click", () => selectRoute("Chat"));
  document.querySelector(".market-card .corner-button").addEventListener("click", () => selectRoute("Markets"));
  document.querySelector(".opportunity-card .text-button").addEventListener("click", () => selectRoute("Jobs"));
  document.querySelector(".inbox-card .wide-button").addEventListener("click", () => selectRoute("Inbox"));
}

function notify(message) {
  const toast = document.querySelector("#toast");
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
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

async function loadProviders() {
  providerConfig = await api("/api/providers");
  return providerConfig;
}

async function setProvider(provider) {
  providerConfig = await api("/api/settings/provider", { method: "POST", body: JSON.stringify({ provider }) });
  notify(`Intelligence routing set to ${provider.toUpperCase()}.`);
}

async function sendMessage(message) {
  const data = await api("/api/chat/message", { method: "POST", body: JSON.stringify({ message, conversationId: activeConversationId, provider: providerConfig.preference }) });
  activeConversationId = data.conversation.id;
  await loadConversations();
}

function renderMessages(conversation) {
  if (!conversation) return `<div class="chat-empty"><div class="chat-core"><i></i><span>◈</span></div><span class="panel-kicker">KAISEN CONVERSATION CORE</span><h2>What are we working on?</h2><p>Your conversations are stored locally. Live AI providers will connect through the secure Kaisen Core.</p><div class="prompt-grid"><button>Show me today’s priorities</button><button>What is the market plan?</button><button>Review my active projects</button><button>Find remote job opportunities</button></div></div>`;
  return conversation.messages.map(message => `<article class="chat-message ${message.role}"><div class="message-avatar">${message.role === "assistant" ? "◈" : "LP"}</div><div><header><strong>${message.role === "assistant" ? "KAISEN" : "YOU"}</strong><span>${new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>${message.provider ? `<b>${message.provider.toUpperCase()} CORE</b>` : ""}</header><p>${escapeHtml(message.content)}</p></div></article>`).join("");
}

async function chatPage(token = renderToken) {
  page.innerHTML = `<div class="chat-loading">INITIALIZING CONVERSATION CORE...</div>`;
  try { await Promise.all([loadConversations(), loadProviders()]); } catch {}
  if (token !== renderToken || currentRoute !== "Chat") return;
  const current = conversationCache.find(item => item.id === activeConversationId);
  page.innerHTML = `<div class="chat-layout reveal">
    <aside class="conversation-rail panel"><div class="conversation-head"><div><span class="panel-kicker">CONVERSATIONS</span><h2>Command history</h2></div><button id="newChat" aria-label="New conversation">＋</button></div><div class="conversation-list">${conversationCache.length ? conversationCache.map(item => `<button data-conversation="${item.id}" class="${item.id === activeConversationId ? "active" : ""}"><i>◇</i><span><strong>${escapeHtml(item.title)}</strong><small>${item.messages.length} SIGNALS · ${new Date(item.updatedAt).toLocaleDateString()}</small></span></button>`).join("") : `<p>NO SAVED CONVERSATIONS</p>`}</div><div class="provider-stack"><span class="panel-kicker">INTELLIGENCE ROUTER</span><div><i class="online"></i><span>AUTO</span><b>${providerConfig.providers.openai.configured || providerConfig.providers.claude.configured ? "LIVE ROUTING" : "PREVIEW FALLBACK"}</b></div><div><i class="${providerConfig.providers.openai.configured ? "online" : ""}"></i><span>OPENAI</span><b>${providerConfig.providers.openai.configured ? "CONNECTED" : "NOT CONNECTED"}</b></div><div><i class="${providerConfig.providers.claude.configured ? "online" : ""}"></i><span>CLAUDE</span><b>${providerConfig.providers.claude.configured ? "CONNECTED" : "NOT CONNECTED"}</b></div></div></aside>
    <section class="chat-main panel"><header class="chat-top"><div><span class="panel-kicker">06 / CONVERSATION CORE</span><h2>${current ? escapeHtml(current.title) : "New intelligence channel"}</h2></div><label class="router-select"><span>ROUTE</span><select id="chatProvider" aria-label="Intelligence provider"><option value="auto">AUTO</option><option value="openai" ${providerConfig.providers.openai.configured ? "" : "disabled"}>OPENAI</option><option value="claude" ${providerConfig.providers.claude.configured ? "" : "disabled"}>CLAUDE</option></select></label></header><div class="message-stream" id="messageStream">${renderMessages(current)}</div><div class="chat-composer"><div class="composer-tools"><button aria-label="Attach file">＋</button><button aria-label="Voice input">⌁</button></div><textarea id="chatInput" rows="1" placeholder="Message Kaisen..." aria-label="Message Kaisen"></textarea><span>${providerConfig.providers.openai.configured || providerConfig.providers.claude.configured ? "LIVE CORE" : "PREVIEW CORE"} · LOCAL HISTORY</span><button id="chatSend">EXECUTE →</button></div></section>
  </div>`;
  const input = document.querySelector("#chatInput");
  const submit = async () => {
    const message = input.value.trim(); if (!message) return input.focus();
    input.disabled = true; document.querySelector("#chatSend").textContent = "PROCESSING";
    try { await sendMessage(message); if (currentRoute === "Chat") await chatPage(renderToken); } catch (error) { input.disabled = false; document.querySelector("#chatSend").textContent = "RETRY →"; }
  };
  document.querySelector("#chatSend").addEventListener("click", submit);
  input.addEventListener("keydown", event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } });
  document.querySelector("#newChat").addEventListener("click", () => { activeConversationId = null; chatPage(renderToken); });
  document.querySelectorAll("[data-conversation]").forEach(button => button.addEventListener("click", () => { activeConversationId = button.dataset.conversation; chatPage(renderToken); }));
  document.querySelectorAll(".prompt-grid button").forEach(button => button.addEventListener("click", () => { input.value = button.textContent; submit(); }));
  const providerSelect = document.querySelector("#chatProvider"); providerSelect.value = providerConfig.preference; providerSelect.addEventListener("change", async () => { await setProvider(providerSelect.value); });
  const stream = document.querySelector("#messageStream"); stream.scrollTop = stream.scrollHeight;
}

function modulePage(route) {
  const [kicker, title, description, stats] = moduleCopy[route];
  page.innerHTML = `<div class="module-page operational reveal"><div class="module-hero module-heading"><div><span class="panel-kicker">${kicker}</span><h1>${title}</h1><p>${description}</p></div><span class="local-badge"><i></i> LOCAL PREVIEW DATA</span></div><div class="module-stats">${stats.map((stat, i) => `<div><span>0${i + 1}</span><strong>${stat}</strong></div>`).join("")}</div>${moduleContent(route)}</div>`;
  bindModuleActions(route);
}

const moduleData = {
  Jobs: [
    ["94", "Technical Support Specialist", "Northstar Systems", "$31/HR", "2H AGO", "Remote · Full time"],
    ["89", "Customer Success Engineer", "Meridian Labs", "$78K–$92K", "5H AGO", "Remote · Mountain time"],
    ["84", "Implementation Specialist", "Apex Cloud", "$72K–$86K", "1D AGO", "Remote · US"]
  ],
  Markets: [
    ["NQ", "24,775.25", "+0.42%", "24,690", "24,840", "Cautiously bullish"],
    ["ES", "6,512.75", "+0.21%", "6,488", "6,528", "Balanced / bullish"],
    ["GC", "3,418.60", "−0.18%", "3,402", "3,436", "Range compression"]
  ],
  Inbox: [
    ["Sarah Chen", "Apex Recruiting", "Interview availability", "Can you share two windows that work this week?", "12 MIN", "urgent"],
    ["Marcus Reed", "Meridian Labs", "Application follow-up", "The team would like to move you to the next stage.", "1 HOUR", "priority"],
    ["GitHub", "Kaisen", "Repository connected", "Your command center is now publishing successfully.", "TODAY", "system"]
  ],
  Projects: [
    ["Kaisen", "Personal intelligence command center", "MAIN", "PASSING", "3 MILESTONES", "82"],
    ["Leveraged Pixel Studios", "Studio website and deployment", "PLANNING", "READY", "DOMAIN CONNECTED", "35"],
    ["Trading Systems", "Indicators, research, and automation", "ACTIVE", "LOCAL", "2 MODULES", "56"]
  ],
  Automations: [
    ["Morning intelligence brief", "Every weekday · 07:30", "NEXT 07:30", true],
    ["Remote opportunity scan", "Every 4 hours", "NEXT 12:00", true],
    ["Market opening prep", "Weekdays · 07:00", "NEXT MON", true],
    ["Priority inbox sweep", "Every 2 hours", "NEXT 10:00", true],
    ["Repository health check", "On every push", "EVENT DRIVEN", true],
    ["Weekly system review", "Sunday · 18:00", "NEXT SUN", true]
  ]
};

function moduleContent(route) {
  if (route === "Jobs") return `<section class="module-toolbar"><div class="segmented"><button class="active">BEST MATCH</button><button>NEWEST</button><button>SAVED</button></div><button class="outline-action">SCAN OPPORTUNITIES ↗</button></section><div class="data-stack">${moduleData.Jobs.map((job, index) => `<article class="panel job-row"><div class="fit-score"><strong>${job[0]}</strong><small>% FIT</small></div><div class="data-primary"><span>${index === 0 ? "TOP SIGNAL" : "QUALIFIED MATCH"}</span><h2>${job[1]}</h2><p>${job[2]} · ${job[5]}</p></div><div class="data-meta"><b>${job[3]}</b><small>${job[4]}</small></div><button class="save-signal" aria-label="Save ${job[1]}">◇</button></article>`).join("")}</div>`;
  if (route === "Markets") return `<div class="market-board">${moduleData.Markets.map(market => `<article class="panel market-tile"><header><span>${market[0]} / FUTURES</span><b class="${market[2].startsWith("+") ? "up" : "down"}">${market[2]}</b></header><h2>${market[1]}</h2><div class="market-wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><dl><div><dt>SUPPORT</dt><dd>${market[3]}</dd></div><div><dt>RESISTANCE</dt><dd>${market[4]}</dd></div></dl><footer><i></i>${market[5]}</footer></article>`).join("")}</div><section class="panel intelligence-strip"><span class="panel-kicker">SESSION INTELLIGENCE</span><h2>Opening conditions favor patience above momentum.</h2><p>Preview levels are illustrative until a live market-data provider is connected. Kaisen will keep analysis and execution clearly separated.</p></section>`;
  if (route === "Inbox") return `<div class="inbox-layout"><section class="panel inbox-list"><header><span class="panel-kicker">PRIORITY QUEUE</span><button>MARK ALL REVIEWED</button></header>${moduleData.Inbox.map((message, index) => `<button class="inbox-item ${index === 0 ? "selected" : ""}" data-message="${index}"><span class="sender-mark">${message[0].split(" ").map(n => n[0]).join("").slice(0,2)}</span><span><b>${message[2]}</b><small>${message[0]} · ${message[1]}</small><p>${message[3]}</p></span><time>${message[4]}</time></button>`).join("")}</section><section class="panel message-preview"><span class="panel-kicker">SELECTED TRANSMISSION</span><h2 id="previewSubject">${moduleData.Inbox[0][2]}</h2><p id="previewBody">${moduleData.Inbox[0][3]}</p><textarea aria-label="Draft response" placeholder="Draft a response..."></textarea><button class="outline-action">PREPARE RESPONSE →</button></section></div>`;
  if (route === "Projects") return `<div class="project-grid">${moduleData.Projects.map(project => `<article class="panel project-card"><header><span class="project-icon">▱</span><span>${project[2]}</span></header><h2>${project[0]}</h2><p>${project[1]}</p><div class="progress"><i style="width:${project[5]}%"></i></div><div class="project-status"><span><i></i>${project[3]}</span><b>${project[4]}</b></div></article>`).join("")}</div>`;
  return `<div class="automation-list">${moduleData.Automations.map((automation, index) => `<article class="panel automation-row"><span class="automation-icon">ϟ</span><div><h2>${automation[0]}</h2><p>${automation[1]}</p></div><b>${automation[2]}</b><button class="toggle active" data-automation="${index}" aria-label="Toggle ${automation[0]}" aria-pressed="true"><i></i></button></article>`).join("")}</div>`;
}

function bindModuleActions(route) {
  document.querySelectorAll(".segmented button").forEach(button => button.addEventListener("click", () => { document.querySelectorAll(".segmented button").forEach(item => item.classList.remove("active")); button.classList.add("active"); }));
  document.querySelectorAll(".save-signal").forEach(button => button.addEventListener("click", () => { button.classList.toggle("saved"); button.textContent = button.classList.contains("saved") ? "◆" : "◇"; }));
  document.querySelectorAll("[data-message]").forEach(button => button.addEventListener("click", () => { const message = moduleData.Inbox[Number(button.dataset.message)]; document.querySelectorAll("[data-message]").forEach(item => item.classList.remove("selected")); button.classList.add("selected"); document.querySelector("#previewSubject").textContent = message[2]; document.querySelector("#previewBody").textContent = message[3]; }));
  document.querySelectorAll("[data-automation]").forEach(button => button.addEventListener("click", () => { button.classList.toggle("active"); button.setAttribute("aria-pressed", String(button.classList.contains("active"))); }));
  document.querySelectorAll(".outline-action").forEach(button => button.addEventListener("click", () => notify(route === "Inbox" ? "Draft saved locally. Sending will require your approval." : "Preview refreshed. Connect a live provider when you are ready.")));
  const reviewAll = document.querySelector(".inbox-list>header button");
  if (reviewAll) reviewAll.addEventListener("click", () => { document.querySelectorAll(".inbox-item").forEach(item => item.classList.add("reviewed")); notify("Priority queue marked reviewed."); });
}

function settingsPage(token = renderToken) {
  if (token !== renderToken || currentRoute !== "Settings") return;
  const current = loadDisplay();
  page.innerHTML = `<div class="settings-page reveal"><button class="page-back" id="settingsBack">← RETURN TO DASHBOARD</button><div class="module-hero"><span class="panel-kicker">SYSTEM CONTROL / DISPLAY</span><h1>Make Kaisen <em>yours.</em></h1><p>Choose a visual system and reading size that feels comfortable on this monitor. Changes apply instantly and stay on this device.</p></div>
    <section class="settings-section panel integration-settings"><div class="settings-title"><div><span class="panel-kicker">01 / INTELLIGENCE CONNECTIONS</span><h2>AI routing</h2></div><p>Keys stay on the Kaisen server and are never sent to the browser.</p></div><div class="connection-grid" id="connectionGrid"><div class="connection-card loading">CHECKING SECURE CONNECTIONS...</div></div></section>
    <section class="settings-section panel"><div class="settings-title"><div><span class="panel-kicker">02 / VISUAL SYSTEM</span><h2>Interface style</h2></div><p>Change the mood without changing how Kaisen works.</p></div><div class="style-options">
      <button data-style="hud" class="${current.style === "hud" ? "selected" : ""}"><div class="style-preview preview-hud"><i></i><i></i><i></i></div><strong>Full HUD</strong><span>Electric cyan · technical glow</span><b>ORIGINAL</b></button>
      <button data-style="command" class="${current.style === "command" ? "selected" : ""}"><div class="style-preview preview-command"><i></i><i></i><i></i></div><strong>Clean Command</strong><span>Graphite · quieter contrast</span><b>FOCUSED</b></button>
      <button data-style="midnight" class="${current.style === "midnight" ? "selected" : ""}"><div class="style-preview preview-midnight"><i></i><i></i><i></i></div><strong>Midnight</strong><span>Violet blue · cinematic depth</span><b>ALT</b></button>
    </div></section>
    <section class="settings-section panel"><div class="settings-title"><div><span class="panel-kicker">03 / READABILITY</span><h2>Text size</h2></div><p>Comfortable is now the recommended default for smaller monitors.</p></div><div class="font-options">
      <button data-font="compact" class="${current.fontSize === "compact" ? "selected" : ""}"><span class="font-sample small">Aa</span><strong>Compact</strong><small>More information on screen</small></button>
      <button data-font="comfortable" class="${current.fontSize === "comfortable" ? "selected" : ""}"><span class="font-sample medium">Aa</span><strong>Comfortable</strong><small>Balanced and readable</small></button>
      <button data-font="large" class="${current.fontSize === "large" ? "selected" : ""}"><span class="font-sample large">Aa</span><strong>Large</strong><small>Maximum readability</small></button>
    </div><div class="readability-preview"><span>LIVE PREVIEW</span><h3>Intelligence Network</h3><p>Kaisen is online and ready. This sample updates with your selected text size.</p></div></section>
  </div>`;
  document.querySelectorAll("[data-style]").forEach(button => button.addEventListener("click", () => { const display = loadDisplay(); display.style = button.dataset.style; applyDisplay(display); if (currentRoute === "Settings") settingsPage(renderToken); }));
  document.querySelectorAll("[data-font]").forEach(button => button.addEventListener("click", () => { const display = loadDisplay(); display.fontSize = button.dataset.font; applyDisplay(display); if (currentRoute === "Settings") settingsPage(renderToken); }));
  document.querySelector("#settingsBack").addEventListener("click", () => selectRoute("Dashboard"));
  loadProviders().then(config => {
    if (token !== renderToken || currentRoute !== "Settings") return;
    const grid = document.querySelector("#connectionGrid");
    grid.innerHTML = [
      ["auto", "Automatic", "Uses OpenAI first, then Claude if available.", config.providers.openai.configured || config.providers.claude.configured, "SMART ROUTER"],
      ["openai", "OpenAI", config.providers.openai.model, config.providers.openai.configured, "RESPONSES API"],
      ["claude", "Claude", config.providers.claude.model, config.providers.claude.configured, "MESSAGES API"]
    ].map(([id, name, detail, connected, label]) => `<button data-provider="${id}" ${id !== "auto" && !connected ? "disabled" : ""} class="connection-card ${config.preference === id ? "selected" : ""}"><span><i class="${connected ? "online" : ""}"></i>${label}</span><strong>${name}</strong><small>${escapeHtml(detail)}</small><b>${connected ? "CONNECTED" : id === "auto" ? "PREVIEW READY" : "ADD SERVER KEY"}</b></button>`).join("");
    grid.querySelectorAll("[data-provider]").forEach(button => button.addEventListener("click", async () => { await setProvider(button.dataset.provider); settingsPage(renderToken); }));
  }).catch(() => { document.querySelector("#connectionGrid").innerHTML = `<div class="connection-card error">CONNECTION STATUS UNAVAILABLE</div>`; });
}

function selectRoute(route, updateHistory = true) {
  if (!routes.includes(route)) route = "Dashboard";
  currentRoute = route;
  const token = ++renderToken;
  page.replaceChildren();
  page.dataset.route = route;
  pageName.textContent = route.toUpperCase();
  document.querySelectorAll("#nav button").forEach(button => button.classList.toggle("active", button.dataset.route === route));
  route === "Dashboard" ? dashboard() : route === "Chat" ? chatPage(token) : route === "Settings" ? settingsPage(token) : modulePage(route);
  document.querySelector("#sidebar").classList.remove("open");
  document.querySelector("#navScrim").classList.remove("show");
  if (updateHistory && location.hash !== `#${route.toLowerCase()}`) history.pushState({ route }, "", `#${route.toLowerCase()}`);
  window.scrollTo(0, 0);
}

nav.addEventListener("click", event => { const button = event.target.closest("button[data-route]"); if (button) selectRoute(button.dataset.route); });
document.querySelector("#homeButton").addEventListener("click", () => selectRoute("Dashboard"));
document.querySelector("#menuButton").addEventListener("click", () => { document.querySelector("#sidebar").classList.toggle("open"); document.querySelector("#navScrim").classList.toggle("show"); });
document.querySelector("#navScrim").addEventListener("click", () => { document.querySelector("#sidebar").classList.remove("open"); document.querySelector("#navScrim").classList.remove("show"); });
document.querySelector(".top-actions .icon-button:first-of-type").addEventListener("click", () => { selectRoute("Chat"); setTimeout(() => document.querySelector("#chatInput")?.focus(), 0); });
document.querySelector(".notification").addEventListener("click", () => selectRoute("Inbox"));
document.querySelector(".profile button").addEventListener("click", () => notify("Profile controls are planned for the account milestone."));
document.addEventListener("keydown", event => { if (event.key === "Escape") { document.querySelector("#sidebar").classList.remove("open"); document.querySelector("#navScrim").classList.remove("show"); } if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); selectRoute("Chat"); setTimeout(() => document.querySelector("#chatInput")?.focus(), 0); } });
window.addEventListener("popstate", () => selectRoute(routeFromHash(), false));
window.addEventListener("hashchange", () => { if (routeFromHash() !== currentRoute) selectRoute(routeFromHash(), false); });
function routeFromHash() { const value = location.hash.slice(1).toLowerCase(); return routes.find(route => route.toLowerCase() === value) || "Dashboard"; }
function tick() { document.querySelector("#clock").textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
tick(); setInterval(tick, 1000); selectRoute(routeFromHash(), false);
