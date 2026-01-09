// ==============================
// CONFIG
// ==============================
const API_BASE_URL = "https://apiscore-vv2y.onrender.com";
const CLUB_NAME = "Bidart";

// Labels internes normalisés
const TEAM_PREMIERE = "premiere";
const TEAM_RESERVE = "reserve";

// ==============================
// INIT
// ==============================
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
  } else {
    alert(message);
  }
  console.error(message);
}

// ==============================
// HELPERS
// ==============================
function normalizeText(s) {
  if (s == null) return null;
  return String(s)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatMatchDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return String(dateString);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}h${minutes}`;
}

// équipe renvoyée par l'API : "Equipe"
function getTeamLabel(match) {
  const raw =
    match.Equipe ??
    match.equipe ??
    match.team ??
    match.Team ??
    match.TEAM ??
    null;

  const v = normalizeText(raw);
  if (!v) return null;

  if (v.includes("prem")) return TEAM_PREMIERE; // "premiere", "première", etc.
  if (v.includes("res")) return TEAM_RESERVE;   // "reserve", "réserve", etc.

  return v;
}

function getStatus(match) {
  return normalizeText(match.status);
}

function isClub(name) {
  return normalizeText(name) === normalizeText(CLUB_NAME);
}

// "win" / "loss" / "draw" ou null si pas un match joué du point de vue de Bidart
function getClubResult(match) {
  if (getStatus(match) !== "played") return null;
  if (match.home_score == null || match.away_score == null) return null;

  const isHome = isClub(match.home_team);
  const isAway = isClub(match.away_team);
  if (!isHome && !isAway) return null;

  let diff = match.home_score - match.away_score;
  if (isAway) diff = -diff;

  if (diff > 0) return "win";
  if (diff < 0) return "loss";
  return "draw";
}

// ==============================
// FETCH (avec garde-fous)
// ==============================
async function fetchMatches() {
  const url = `${API_BASE_URL}/api/matches`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erreur API (${res.status})`);

  const data = await res.json();

  if (!Array.isArray(data)) {
    const msg = data?.error ? data.error : "Réponse API invalide (pas une liste).";
    throw new Error(msg);
  }

  return data;
}

// ==============================
// RENDER - HOME
// ==============================
function renderTeamForm(matches, teamLabel, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  const teamMatches = matches.filter(
    (m) => getTeamLabel(m) === teamLabel && getClubResult(m) !== null
  );

  if (teamMatches.length === 0) {
    container.textContent = "Pas encore de résultats.";
    return;
  }

  teamMatches.sort((a, b) => new Date(b.match_date) - new Date(a.match_date));
  const lastFive = teamMatches.slice(0, 5);

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

  div.innerHTML = "";

  if (!match) {
    const p = document.createElement("p");
    p.textContent = emptyText;
    div.appendChild(p);
    return;
  }

  const pTeams = document.createElement("p");
  const strongHome = document.createElement("strong");
  strongHome.textContent = match.home_team ?? "—";
  const strongAway = document.createElement("strong");
  strongAway.textContent = match.away_team ?? "—";
  pTeams.append(strongHome, " vs ", strongAway);

  const pDate = document.createElement("p");
  pDate.textContent = `Date : ${formatMatchDate(match.match_date)}`;

  div.append(pTeams, pDate);

  if (match.home_score != null && match.away_score != null) {
    const pScore = document.createElement("p");
    pScore.textContent = `Score : ${match.home_score} - ${match.away_score}`;
    div.appendChild(pScore);
  }

  const pStatus = document.createElement("p");
  const span = document.createElement("span");
  const st = getStatus(match) || "unknown";
  span.textContent = String(match.status ?? "—");
  span.classList.add(`status-${st}`);
  pStatus.append("Statut : ", span);
  div.appendChild(pStatus);

  if (match.notes) {
    const pNotes = document.createElement("p");
    pNotes.classList.add("match-notes");
    pNotes.textContent = String(match.notes);
    div.appendChild(pNotes);
  }
}

function getNextAndLastForTeam(allMatches, teamLabel) {
  const teamMatches = allMatches.filter((m) => getTeamLabel(m) === teamLabel);

  const played = teamMatches
    .filter((m) => getStatus(m) === "played")
    .sort((a, b) => new Date(b.match_date) - new Date(a.match_date));

  const scheduled = teamMatches
    .filter((m) => getStatus(m) === "scheduled")
    .sort((a, b) => new Date(a.match_date) - new Date(b.match_date));

  return {
    lastMatch: played.length ? played[0] : null,
    nextMatch: scheduled.length ? scheduled[0] : null,
  };
}

async function initHomePage() {
  try {
    const matches = await fetchMatches();

    renderTeamForm(matches, TEAM_PREMIERE, "form-dots-premiere");
    renderTeamForm(matches, TEAM_RESERVE, "form-dots-reserve");

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

// ==============================
// RENDER - RESULTS
// ==============================
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
    td.colSpan = 6; // +1 pour notes
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

    // 🔥 NOUVELLE COLONNE NOTES
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

