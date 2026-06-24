let MAX_BAR_HEIGHT = 200;

function getMaxBarHeight() {
  return window.innerWidth >= 1024 ? 260 : 200;
}

async function init() {
  MAX_BAR_HEIGHT = getMaxBarHeight();
  showLoading(true);
  try {
    const response = await fetch("/api/dashboard/fallback-analysis");
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    renderSummary(data.summary);
    renderTopTable(data.topUnanswered);
    renderBarChart(data.dailyTrend);
    renderRecentTable(data.recentFallbacks);
    showLoading(false);
  } catch {
    showLoading(false);
    showError(true);
  }
}

function renderSummary(summary) {
  document.getElementById("stat-total").textContent = summary.totalConversations.toLocaleString();
  document.getElementById("stat-fallbacks").textContent = summary.totalFallbacks.toLocaleString();
  document.getElementById("stat-rate").textContent = summary.fallbackRate + "%";
  document.getElementById("stat-unique").textContent = summary.uniqueQuestions.toLocaleString();
}

function renderTopTable(items) {
  const tbody = document.getElementById("top-body");
  const empty = document.getElementById("top-empty");

  if (items.length === 0) {
    tbody.innerHTML = "";
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";
  tbody.innerHTML = items
    .map(
      (item, i) =>
        `<tr>
          <td>${i + 1}</td>
          <td class="td-question">${escapeHtml(item.question)}</td>
          <td class="td-count">${item.count}</td>
          <td class="td-time">${formatTime(item.lastAsked)}</td>
        </tr>`
    )
    .join("");
}

function renderBarChart(dailyTrend) {
  const container = document.getElementById("bar-chart");
  const empty = document.getElementById("trend-empty");

  if (!dailyTrend || dailyTrend.length === 0) {
    container.innerHTML = "";
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  const maxCount = Math.max(...dailyTrend.map((d) => d.count), 1);

  container.innerHTML = dailyTrend
    .map(
      (d) =>
        `<div class="bar-item" title="${d.date}: ${d.count} fallback(s)">
          <span class="bar-value">${d.count > 0 ? d.count : ""}</span>
          <div class="bar" style="height: ${Math.max(Math.round((d.count / maxCount) * MAX_BAR_HEIGHT), 2)}px"></div>
          <span class="bar-label">${d.date.slice(5)}</span>
        </div>`
    )
    .join("");
}

function renderRecentTable(items) {
  const tbody = document.getElementById("recent-body");
  const empty = document.getElementById("recent-empty");

  if (items.length === 0) {
    tbody.innerHTML = "";
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";
  tbody.innerHTML = items
    .map(
      (item) =>
        `<tr>
          <td class="td-time">${formatTime(item.timestamp)}</td>
          <td class="td-session">${escapeHtml(item.sessionId)}</td>
          <td class="td-question">${escapeHtml(item.question)}</td>
          <td class="td-confidence">${item.confidenceScore}</td>
        </tr>`
    )
    .join("");
}

function formatTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showLoading(visible) {
  document.getElementById("loading").style.display = visible ? "flex" : "none";
}

function showError(visible) {
  document.getElementById("error").style.display = visible ? "flex" : "none";
}

init();
