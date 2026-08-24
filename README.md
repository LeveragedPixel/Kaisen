# Kaisen

Kaisen is a futuristic personal intelligence command center. The current foundation includes the responsive application shell, persistent local chat, configurable visual styles and text sizing, plus operational preview modules for jobs, markets, inbox, projects, and automations.

External services are intentionally represented by clearly labeled preview data until each provider is connected. This keeps the interface useful while preserving a clean boundary between demonstration data and live intelligence.

## Run locally

```bash
npm run dev
```

Open `http://127.0.0.1:4173`.

## Connect AI providers

Copy `.env.example` to `.env` and add one or both server-side keys:

```text
OPENAI_API_KEY=your-key
ANTHROPIC_API_KEY=your-key
```

Never commit `.env` or place keys in browser code. Restart Kaisen after changing environment values, then choose Auto, OpenAI, or Claude under Settings → AI routing.

## Verify

```bash
npm run check
npm run build
```
