const defaultRepository = process.env.GITHUB_REPOSITORY || "LeveragedPixel/Kaisen";
let cache = { key: "", expiresAt: 0, value: null };

function headers() {
  return {
    accept: "application/vnd.github+json",
    "user-agent": "Kaisen-Intelligence-Core",
    "x-github-api-version": "2022-11-28",
    ...(process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {})
  };
}

async function github(path, fetcher) {
  const response = await fetcher(`https://api.github.com${path}`, { headers: headers(), signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
  return response.json();
}

export function githubStatus() {
  return { configured: true, authenticated: Boolean(process.env.GITHUB_TOKEN), repository: defaultRepository, mode: "read-only" };
}

export async function getGitHubSnapshot({ repository = defaultRepository, fetcher = fetch, bypassCache = false } = {}) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error("Invalid GitHub repository");
  const now = Date.now();
  if (!bypassCache && cache.key === repository && cache.expiresAt > now) return cache.value;
  const encoded = repository.split("/").map(encodeURIComponent).join("/");
  const [repo, commits, issues, runs] = await Promise.all([
    github(`/repos/${encoded}`, fetcher),
    github(`/repos/${encoded}/commits?per_page=5`, fetcher),
    github(`/repos/${encoded}/issues?state=open&per_page=10`, fetcher),
    github(`/repos/${encoded}/actions/runs?per_page=1`, fetcher).catch(() => ({ workflow_runs: [] }))
  ]);
  const snapshot = {
    repository: repo.full_name,
    description: repo.description,
    url: repo.html_url,
    branch: repo.default_branch,
    visibility: repo.visibility || (repo.private ? "private" : "public"),
    openIssues: issues.filter(issue => !issue.pull_request).length,
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
    commits: commits.map(item => ({ sha: item.sha.slice(0, 7), message: item.commit.message.split("\n")[0], author: item.author?.login || item.commit.author?.name || "Unknown", date: item.commit.author?.date, url: item.html_url })),
    workflow: runs.workflow_runs?.[0] ? { name: runs.workflow_runs[0].name, status: runs.workflow_runs[0].status, conclusion: runs.workflow_runs[0].conclusion, url: runs.workflow_runs[0].html_url, updatedAt: runs.workflow_runs[0].updated_at } : null,
    source: "github",
    fetchedAt: new Date().toISOString()
  };
  cache = { key: repository, expiresAt: now + 60_000, value: snapshot };
  return snapshot;
}
