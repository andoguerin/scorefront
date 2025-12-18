// URL de base de ton API Node/Render
const API_BASE_URL = "https://apiscore-vv2y.onrender.com";

// Nom du club tel qu'il apparaît dans la base de données
const CLUB_NAME = "Bidart";

// Valeurs attendues dans la colonne "Equipe" (attention accents)
const TEAM_PREMIERE = "Première";
const TEAM_RESERVE = "Réserve";

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;

  if (page === "home") {
    initHomePage();
  } else if (page === "results") {
    initResultsPage();
  }
});

// Affiche une erreur dans un élément <div id="error-message">
function showError(message) {
  const errorDiv = document.getElementById("error-message");
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.classList.add("error");
  } else {
    alert(message);
  }
}

// Récupère le label d'équipe depuis l'API (clé exacte : "Equipe")
function getTeamLabel(match) {
  // On gère aussi des variantes au cas où
  return match.Equipe ?? match.equipe ?? match.team ?? null;
}

// Formatage de la date au format JJ/MM/AAAA HH:MM
function formatMatchDate(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}h${minutes}`;
}

// Renvoie "win", "loss", "draw" ou null pour un match donné du point de vue du BUC
function getClubResult(match) {
  if (match.status !== "played") return null;
  if (match.home_score == null || match.away_score == null) return null;

  const isHome = match.home_team === CLUB_NAME;
  const isAway = match.away_team === CLUB_NAME;

  // Match qui ne concerne pas le club
  if (!isHome && !isAway) return null;

  let diff = match.home_score - match.away_score;

  // Si Bidart joue à l'extérieur, on inverse la perspective
  if (isAway) diff = -diff;

  if (diff > 0) return "win";
  if (diff < 0) return "loss";
  return "draw";
}

// Affiche les 5 derniers résultats de l'équipe Première sous forme de pastilles
function renderClubForm(matches) {
  const container = document.getElementById("form-dots");
  if (!container) return;

  // On garde uniquement les matchs de la Première où Bidart a un résultat exploitable
  const clubMatches = matches.filter(
    (m) => getTeamLabel(m) === TEAM_PREMIERE && getClubResult(m) !== null
  );

  if (clubMatches.length === 0) {
    container.textContent =
      "Pas encore de résultats pour l'équipe Première du Bidart Union Club.";
    return;
  }

  // Tri par date décroissante
  clubMatches.sort((a, b) => new Date(b.match_date) - new Date(a.match_date));

  // 5 derniers
  const lastFive = clubMatches.slice(0, 5);

  container.innerHTML = "";

  lastFive.forEach((match) => {
    const result = getClubResult(match); // win / loss / draw

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

// Calculer prochain + dernier match pour une équipe donnée
function getNextAndLastForTeam(allMatches, teamLabel) {
  const now = new Date();

  const teamMatches = allMatches.filter((m) => getTeamLabel(m) === teamLabel);

  const played = teamMatches.filter(
    (m) => m.status === "played" && new Date(m.match_date) <= now
  );

  const scheduled = teamMatches.filter(
    (m) => m.status === "scheduled" && new Date(m.match_date) >= now
  );

  let lastMatch = null;
  if (played.length > 0) {
    played.sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
    lastMatch = played[played.length - 1];
  }

  let nextMatch = null;
  if (scheduled.length > 0) {
    scheduled.sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
    nextMatch = scheduled[0];
  }

  return { nextMatch, lastMatch };
}

// Afficher un bloc match dans une div (prochain / dernier)
function renderMatchBlock(containerId, match, kindLabel) {
  const div = document.getElementById(containerId);
  if (!div) return;

  if (!match) {
    div.innerHTML = `<p>Aucun match ${kindLabel} trouvé.</p>`;
    return;
  }

  let scoreLine = "";
  if (match.home_score != null && match.away_score != null) {
    scoreLine = `<p>Score : ${match.home_score} - ${match.away_score}</p>`;
  }

  div.innerHTML =
    `<p><strong>${match.home_team}</strong> vs <strong>${match.away_team}</strong></p>` +
    `<p>Date : ${formatMatchDate(match.match_date)}</p>` +
    scoreLine +
    `<p>Statut : <span class="status-${match.status}">${match.status}</span></p>`;
}

// Initialisation de la page d'accueil
async function initHomePage() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/matches`);

    if (!response.ok) {
      throw new Error(`Erreur API (${response.status})`);
    }

    const matches = await response.json();

    // Première
    const premiere = getNextAndLastForTeam(matches, TEAM_PREMIERE);
    renderMatchBlock("next-premiere", premiere.nextMatch, "à venir");
    renderMatchBlock("last-premiere", premiere.lastMatch, "joué");

    // Réserve
    const reserve = getNextAndLastForTeam(matches, TEAM_RESERVE);
    renderMatchBlock("next-reserve", reserve.nextMatch, "à venir");
    renderMatchBlock("last-reserve", reserve.lastMatch, "joué");

    // Forme (5 derniers matchs Première)
    renderClubForm(matches);
  } catch (error) {
    console.error(error);
    showError("Impossible de charger les données (API ou réseau indisponible).");
  }
}

// Initialisation de la page des résultats
async function initResultsPage() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/matches`);

    if (!response.ok) {
      throw new Error(`Erreur API (${response.status})`);
    }

    const matches = await response.json();
    renderMatchesTables(matches);
  } catch (error) {
    console.error(error);
    showError("Impossible de charger la liste des matchs.");
  }
}

// Remplit les 2 tableaux séparés (Première / Réserve)
function renderMatchesTables(matches) {
  const tbodyPrem = document.getElementById("matches-premiere");
  const tbodyRes = document.getElementById("matches-reserve");
  if (!tbodyPrem || !tbodyRes) return;

  const premMatches = matches.filter((m) => getTeamLabel(m) === TEAM_PREMIERE);
  const resMatches = matches.filter((m) => getTeamLabel(m) === TEAM_RESERVE);

  fillMatchesTable(tbodyPrem, premMatches);
  fillMatchesTable(tbodyRes, resMatches);
}

// Remplit un tableau
function fillMatchesTable(tbody, matches) {
  tbody.innerHTML = "";

  if (!matches || matches.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = "Aucun match trouvé dans la base.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  // Tri par date croissante
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
    if (match.home_score != null && match.away_score != null) {
      scoreTd.textContent = `${match.home_score} - ${match.away_score}`;
    } else {
      scoreTd.textContent = "—";
    }

    const statusTd = document.createElement("td");
    statusTd.textContent = match.status;
    statusTd.classList.add(`status-${match.status}`);

    tr.appendChild(dateTd);
    tr.appendChild(homeTd);
    tr.appendChild(awayTd);
    tr.appendChild(scoreTd);
    tr.appendChild(statusTd);

    tbody.appendChild(tr);
  });
}
