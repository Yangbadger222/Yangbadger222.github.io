(() => {
  const USERNAME = "Yangbadger222";
  const SITE_REPO = `${USERNAME}.github.io`;
  const CACHE_KEY = `field-notes-repos-v2:${USERNAME}`;
  const CACHE_TTL = 15 * 60 * 1000;

  const ILLUSTRATIONS = {
    atec: [
      "assets/illustrations/atec-0.b64",
      "assets/illustrations/atec-1.b64",
      "assets/illustrations/atec-2.b64"
    ],
    overhead: [
      "assets/illustrations/overhead-0.b64",
      "assets/illustrations/overhead-1.b64",
      "assets/illustrations/overhead-2.b64",
      "assets/illustrations/overhead-3.b64",
      "assets/illustrations/overhead-4.b64"
    ]
  };

  async function hydrateIllustrations() {
    const targets = [...document.querySelectorAll("img[data-illustration]")];
    await Promise.all(targets.map(async (img) => {
      const key = img.dataset.illustration;
      const parts = ILLUSTRATIONS[key];
      if (!parts) return;
      try {
        const chunks = await Promise.all(parts.map(async (url) => {
          const response = await fetch(url, { cache: "force-cache" });
          if (!response.ok) throw new Error(`Illustration chunk failed: ${response.status}`);
          return (await response.text()).trim();
        }));
        img.src = `data:image/webp;base64,${chunks.join("")}`;
        img.classList.add("is-loaded");
      } catch (error) {
        console.warn(`Could not load ${key} illustration`, error);
        img.closest("figure")?.classList.add("illustration-fallback");
      }
    }));
  }

  function formatAge(dateString) {
    const then = new Date(dateString);
    const diff = Math.max(0, Date.now() - then.getTime());
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "updated today";
    if (days === 1) return "updated yesterday";
    if (days < 30) return `updated ${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `updated ${months}mo ago`;
    return `updated ${Math.floor(months / 12)}y ago`;
  }

  function pickRepos(repos) {
    const clean = repos
      .filter((repo) => !repo.fork && !repo.archived && repo.name !== SITE_REPO)
      .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
    const featured = clean.filter((repo) => Array.isArray(repo.topics) && repo.topics.includes("portfolio"));
    const rest = clean.filter((repo) => !featured.includes(repo));
    return [...featured, ...rest].slice(0, 7);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function repoRow(repo, index) {
    const a = document.createElement("a");
    a.className = "repo-row";
    a.href = repo.html_url;
    a.target = "_blank";
    a.rel = "noreferrer";
    const description = repo.description || "Open the repository to see what changed.";
    const topics = Array.isArray(repo.topics) ? repo.topics.slice(0, 3) : [];
    const metaBits = [repo.language || "code", ...topics, formatAge(repo.pushed_at || repo.updated_at)].filter(Boolean);
    a.innerHTML = `
      <span class="repo-index">${String(index + 1).padStart(2, "0")}</span>
      <span><span class="repo-name">${escapeHtml(repo.name)}</span><span class="repo-desc">${escapeHtml(description)}</span></span>
      <span class="repo-meta">${metaBits.map(escapeHtml).join("<br>")}</span>
      <span class="repo-arrow">↗</span>`;
    return a;
  }

  function renderRepos(repos) {
    const container = document.getElementById("repo-list");
    if (!container) return;
    const selected = pickRepos(repos);
    if (!selected.length) throw new Error("No public repositories found.");
    container.replaceChildren(...selected.map(repoRow));
  }

  function readCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (!cached || Date.now() - cached.savedAt > CACHE_TTL || !Array.isArray(cached.repos)) return null;
      return cached.repos;
    } catch { return null; }
  }

  async function loadRepos() {
    const cached = readCache();
    if (cached) {
      renderRepos(cached);
      return;
    }
    try {
      const response = await fetch(`https://api.github.com/users/${USERNAME}/repos?per_page=100&sort=updated&type=owner`, {
        headers: { Accept: "application/vnd.github+json" }
      });
      if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
      const repos = await response.json();
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), repos })); } catch {}
      renderRepos(repos);
    } catch (error) {
      console.warn(error);
      const container = document.getElementById("repo-list");
      if (container) container.innerHTML = `<div class="repo-error">GitHub's public API is taking a break. <a href="https://github.com/${USERNAME}?tab=repositories" target="_blank" rel="noreferrer">Open repositories directly ↗</a></div>`;
    }
  }

  hydrateIllustrations();
  loadRepos();
})();
