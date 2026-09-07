(() => {
  const USERNAME = "Yangbadger222";
  const SITE_REPO = `${USERNAME}.github.io`;

  function hydratePhotos() {
    if (!window.FIELD_NOTES_PHOTOS) return;

    document.querySelectorAll("img[data-photo]").forEach((img) => {
      const key = img.dataset.photo;
      const src = window.FIELD_NOTES_PHOTOS[key];
      if (src) img.src = src;
    });
  }

  function formatAge(dateString) {
    const then = new Date(dateString);
    const now = new Date();
    const diff = Math.max(0, now - then);
    const days = Math.floor(diff / 86400000);

    if (days === 0) return "updated today";
    if (days === 1) return "updated yesterday";
    if (days < 30) return `updated ${days}d ago`;

    const months = Math.floor(days / 30);
    if (months < 12) return `updated ${months}mo ago`;

    const years = Math.floor(months / 12);
    return `updated ${years}y ago`;
  }

  function pickRepos(repos) {
    const clean = repos
      .filter((repo) => !repo.fork && !repo.archived && repo.name !== SITE_REPO)
      .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));

    const pinned = clean.filter((repo) =>
      Array.isArray(repo.topics) && repo.topics.includes("portfolio")
    );

    const rest = clean.filter((repo) => !pinned.includes(repo));
    return [...pinned, ...rest].slice(0, 7);
  }

  function repoRow(repo, index) {
    const a = document.createElement("a");
    a.className = "repo-row";
    a.href = repo.html_url;
    a.target = "_blank";
    a.rel = "noreferrer";

    const description = repo.description || "Open the repository to see what changed.";
    const topics = Array.isArray(repo.topics) ? repo.topics.slice(0, 3) : [];
    const metaBits = [
      repo.language || "code",
      ...topics,
      formatAge(repo.pushed_at || repo.updated_at),
    ].filter(Boolean);

    a.innerHTML = `
      <span class="repo-index">${String(index + 1).padStart(2, "0")}</span>
      <span>
        <span class="repo-name">${escapeHtml(repo.name)}</span>
        <span class="repo-desc">${escapeHtml(description)}</span>
      </span>
      <span class="repo-meta">${metaBits.map(escapeHtml).join("<br>")}</span>
      <span class="repo-arrow">↗</span>
    `;

    return a;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function loadRepos() {
    const container = document.getElementById("repo-list");
    if (!container) return;

    try {
      const response = await fetch(
        `https://api.github.com/users/${USERNAME}/repos?per_page=100&sort=updated&type=owner`,
        {
          headers: {
            Accept: "application/vnd.github+json"
          }
        }
      );

      if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);

      const repos = await response.json();
      const selected = pickRepos(repos);

      if (!selected.length) {
        throw new Error("No public repositories found.");
      }

      container.replaceChildren(...selected.map(repoRow));
    } catch (error) {
      console.warn(error);
      container.innerHTML = `
        <div class="repo-error">
          GitHub's public API is taking a break.
          <a href="https://github.com/${USERNAME}?tab=repositories" target="_blank" rel="noreferrer">
            Open repositories directly ↗
          </a>
        </div>
      `;
    }
  }

  hydratePhotos();
  loadRepos();
})();
