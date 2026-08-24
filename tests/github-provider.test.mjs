import test from "node:test";
import assert from "node:assert/strict";
import { getGitHubSnapshot } from "../github-provider.mjs";

const fixtures = {
  "": { full_name: "LeveragedPixel/Kaisen", description: "Kaisen", html_url: "https://github.com/LeveragedPixel/Kaisen", default_branch: "main", visibility: "public", updated_at: "2026-08-24T00:00:00Z", pushed_at: "2026-08-24T00:00:00Z" },
  "/commits": [{ sha: "abcdef123456", html_url: "https://github.com/LeveragedPixel/Kaisen/commit/abcdef1", commit: { message: "Improve Kaisen", author: { name: "Pixel", date: "2026-08-24T00:00:00Z" } }, author: { login: "LeveragedPixel" } }],
  "/issues": [{ number: 1, title: "Plan next milestone" }],
  "/actions/runs": { workflow_runs: [{ name: "Build", status: "completed", conclusion: "success", html_url: "https://github.com/LeveragedPixel/Kaisen/actions", updated_at: "2026-08-24T00:00:00Z" }] }
};

async function fixtureFetch(url) {
  const path = new URL(url).pathname.replace("/repos/LeveragedPixel/Kaisen", "");
  const key = Object.keys(fixtures).find(candidate => candidate && path.startsWith(candidate)) ?? "";
  return { ok: true, json: async () => fixtures[key] };
}

test("GitHub snapshot normalizes live repository intelligence", async () => {
  const result = await getGitHubSnapshot({ repository: "LeveragedPixel/Kaisen", fetcher: fixtureFetch, bypassCache: true });
  assert.equal(result.repository, "LeveragedPixel/Kaisen");
  assert.equal(result.branch, "main");
  assert.equal(result.commits[0].sha, "abcdef1");
  assert.equal(result.workflow.conclusion, "success");
  assert.equal(result.source, "github");
});
