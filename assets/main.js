const API_BASE_URL = "https://apiscore-vv2y.onrender.com";
const CLUB_NAME = "Bidart";

const TEAM_PREMIERE = "Première";
const TEAM_RESERVE = "Réserve";

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;

  if (page === "home") initHomePage();
  if (page === "results") initResultsPage();
});

function showError(message) {
  const errorDiv = document.getElementById("error-message");
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.classList.add("error");
  }
  console.error(message);
}

// clé renvoyée par ton API: "Equipe"
function getTeamLabel(match) {
  return match.Equipe ?? match.equipe ?? match.team ?? null;
}

function formatMatchDate(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}h${minutes}`;
}

function getClubResult(match) {
  if (match.status !== "played") return null;
  if (match.home_score == null || match.away_score == null) return null;

  const isHome = match.home_team === CLUB_NAME;
  const isAway = match.away_team === CLUB_NAME;
  if (!isHome && !isAway) return null;

  let diff = match.home_score - match.away_score;
  if (isAway) diff = -diff;

  if (diff > 0) return "win";
  if (diff < 0) return "loss";
  return "draw";
}

async function fetchMatches() {
  const url = `${API_BASE_URL}/api/matches`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erreur API (${res.status})`);
  return await res.json();
}

function renderTeamForm(matches, teamLabel, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const teamMatches = matches.filter(
    (m) => getTeamLabel(m) === teamLabel && getClubResult(m) !== null
  );

  if (teamMatches.length === 0) {
    container.textContent = "Pas encore de résultats.";
    return;
  }

  teamMatches.sort((a, b) => new Date(b.match_date) - new Date(a.match_date));
  const lastFive = teamMatches.slice(0, 5);

  container.innerHTML = "";

  lastFive.forEach((match) => {
    const result = getClubResult(match);
    const dot = document.createElement("span");
    dot.classList.add("form-dot", result);

    const scoreText =
      match.home_score != null && match.away_score != null
        ? `${match.home_score} - ${match.away_score}`
        : "score inconnu";

    dot.title = `${formatMatchDate(match.match_date)} : ${match.home_team} ${scoreText} ${match.away_team}`;
    container.appendChild(dot);
  });
}

function renderMatchBlock(containerId, match, emptyText) {
  const div = document.getElementById(containerId);
  if (!div) return;

  if (!match) {
    div.innerHTML = `<p>${emptyText}</p>`;
    return;
  }

  let scoreLine = "";
  if (match.home_score != null && match.away_score != null) {
    scoreLine = `<p>Score : ${match.home_score} - ${match.away_score}</p>`;
  }

  const notesLine = match.notes ? `<p class="match-notes">${match.notes}</p>` : "";

  div.innerHTML =
    `<p><strong>${match.home_team}</strong> vs <strong>${match.away_team}</strong></p>` +
    `<p>Date : ${formatMatchDate(match.match_date)}</p>` +
    scoreLine +
    `<p>Statut : <span class="status-${match.status}">${match.status}</span></p>` +
    notesLine;
}

function getNextAndLastForTeam(allMatches, teamLabel) {
  const teamMatches = allMatches.filter((m) => getTeamLabel(m) === teamLabel);

  const played = teamMatches
    .filter((m) => m.status === "played")
    .sort((a, b) => new Date(b.match_date) - new Date(a.match_date));

  const scheduled = teamMatches
    .filter((m) => m.status === "scheduled")
    .sort((a, b) => new Date(a.match_date) - new Date(b.match_date));

  return {
    lastMatch: played.length ? played[0] : null,
    nextMatch: scheduled.length ? scheduled[0] : null,
  };
}

async function initHomePage() {
  try {
    const matches = await fetchMatches();

    // Forme (2 équipes)
    renderTeamForm(matches, TEAM_PREMIERE, "form-dots-premiere");
    renderTeamForm(matches, TEAM_RESERVE, "form-dots-reserve");

    // Prochains / derniers (2 équipes)
    const prem = getNextAndLastForTeam(matches, TEAM_PREMIERE);
    renderMatchBlock("next-premiere", prem.nextMatch, "Aucun match à venir trouvé.");
    renderMatchBlock("last-premiere", prem.lastMatch, "Aucun match joué trouvé.");

    const res = getNextAndLastForTeam(matches, TEAM_RESERVE);
    renderMatchBlock("next-reserve", res.nextMatch, "Aucun match à venir trouvé.");
    renderMatchBlock("last-reserve", res.lastMatch, "Aucun match joué trouvé.");
  } catch (e) {
    showError("Impossible de charger les données (API ou réseau indisponible).");
    console.error(e);
  }
}

async function initResultsPage() {
  try {
    const matches = await fetchMatches();
    renderMatchesTables(matches);
  } catch (e) {
    showError("Impossible de charger la liste des matchs.");
    console.error(e);
  }
}

function renderMatchesTables(matches) {
  const tbodyPrem = document.getElementById("matches-premiere");
  const tbodyRes = document.getElementById("matches-reserve");
  if (!tbodyPrem || !tbodyRes) return;

  const premMatches = matches.filter((m) => getTeamLabel(m) === TEAM_PREMIERE);
  const resMatches = matches.filter((m) => getTeamLabel(m) === TEAM_RESERVE);

  fillMatchesTable(tbodyPrem, premMatches);
  fillMatchesTable(tbodyRes, resMatches);
}

function fillMatchesTable(tbody, matches) {
  tbody.innerHTML = "";

  if (!matches || matches.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6; // 👈 maintenant 6 colonnes avec Notes
    td.textContent = "Aucun match trouvé dans la base.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  matches.sort((a, b) => new Date(a.match_date) - new Date(b.match_date));

  matches.forEach((match) => {
    const tr = document.createElement("tr");

    const dateTd = document.createElement("td");
    dateTd.textContent = formatMatchDate(match.match_date);

    const homeTd = document.createElement("td");
    homeTd.textContent = match.home_team;

    const awayTd = document.createElement("td");
    awayTd.textContent = match.away_team;

    const scoreTd = document.createElement("td");
    scoreTd.textContent =
      match.home_score != null && match.away_score != null
        ? `${match.home_score} - ${match.away_score}`
        : "—";

    const statusTd = document.createElement("td");
    statusTd.textContent = match.status;
    statusTd.classList.add(`status-${match.status}`);

    const notesTd = document.createElement("td");
    notesTd.textContent = match.notes ? match.notes : "—";
    notesTd.classList.add("notes-cell");

    tr.appendChild(dateTd);
    tr.appendChild(homeTd);
    tr.appendChild(awayTd);
    tr.appendChild(scoreTd);
    tr.appendChild(statusTd);
    tr.appendChild(notesTd);

    tbody.appendChild(tr);
  });
}
