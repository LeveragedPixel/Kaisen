const systemPrompt = "You are Kaisen, a concise personal intelligence command center. Be practical, accurate, and explicit when information is preview data or unavailable.";

export function providerStatus() {
  return {
    openai: { configured: Boolean(process.env.OPENAI_API_KEY), model: process.env.OPENAI_MODEL || "gpt-5.6" },
    claude: { configured: Boolean(process.env.ANTHROPIC_API_KEY), model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6" }
  };
}

async function request(url, options) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(60_000) });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(String(payload.error?.message || `Provider returned ${response.status}`).slice(0, 300));
  }
  return response.json();
}

async function openai(messages) {
  const payload = await request("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5.6", instructions: systemPrompt, input: messages, reasoning: { effort: process.env.OPENAI_REASONING || "medium" }, max_output_tokens: 1600 })
  });
  const content = payload.output?.flatMap(item => item.content || []).find(item => item.type === "output_text");
  if (!content?.text) throw new Error("OpenAI returned no text response");
  return { content: content.text, provider: "openai", model: payload.model || process.env.OPENAI_MODEL || "gpt-5.6" };
}

async function claude(messages) {
  const payload = await request("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6", system: systemPrompt, messages, max_tokens: 1600 })
  });
  const content = payload.content?.find(item => item.type === "text")?.text;
  if (!content) throw new Error("Claude returned no text response");
  return { content, provider: "claude", model: payload.model || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6" };
}

export async function generateReply(messages, preference = "auto") {
  const status = providerStatus();
  const order = preference === "auto" ? ["openai", "claude"] : [preference];
  const available = order.filter(name => status[name]?.configured);
  if (!available.length) return null;
  const failures = [];
  for (const name of available) {
    try { return await (name === "openai" ? openai(messages) : claude(messages)); }
    catch (error) { failures.push(`${name}: ${error.message}`); }
  }
  throw new Error(failures.join(" | "));
}
