// URL de base de ton API Node/Render
const API_BASE_URL = "https://apiscore-vv2y.onrender.com";

// Nom du club tel qu'il apparaît dans la base de données
const CLUB_NAME = "Bidart";

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
  if (isAway) {
    diff = -diff;
  }

  if (diff > 0) return "win";
  if (diff < 0) return "loss";
  return "draw";
}

// Affiche les 5 derniers résultats du club sous forme de pastilles
function renderClubForm(matches) {
  const container = document.getElementById("form-dots");
  if (!container) return;

  // On garde uniquement les matchs du club avec un résultat connu
  const clubMatches = matches.filter((m) => getClubResult(m) !== null);

  if (clubMatches.length === 0) {
    container.textContent = "Pas encore de résultats pour le Bidart Union Club.";
    return;
  }

  // Tri par date décroissante (du plus récent au plus ancien)
  clubMatches.sort(
    (a, b) => new Date(b.match_date) - new Date(a.match_date)
  );

  // On conserve les 5 derniers
  const lastFive = clubMatches.slice(0, 5);

  container.innerHTML = "";

  lastFive.forEach((match) => {
    const result = getClubResult(match); // "win" / "loss" / "draw"

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

// Met à jour la partie "Prochain match" et "Dernier résultat"
function updateHomePage(nextMatch, lastMatch) {
  const nextDiv = document.getElementById("next-match");
  const lastDiv = document.getElementById("last-match");

  // Prochain match
  if (nextMatch && nextDiv) {
    nextDiv.innerHTML =
      `<p><strong>${nextMatch.home_team}</strong> vs <strong>${nextMatch.away_team}</strong></p>` +
      `<p>Date : ${formatMatchDate(nextMatch.match_date)}</p>` +
      `<p>Statut : <span class="status-${nextMatch.status}">${nextMatch.status}</span></p>`;
  } else if (nextDiv) {
    nextDiv.innerHTML = "<p>Aucun match à venir trouvé.</p>";
  }

  // Dernier match
  if (lastMatch && lastDiv) {
    let score = "Score non renseigné";
    if (lastMatch.home_score != null && lastMatch.away_score != null) {
      score = `${lastMatch.home_score} - ${lastMatch.away_score}`;
    }

    lastDiv.innerHTML =
      `<p><strong>${lastMatch.home_team}</strong> vs <strong>${lastMatch.away_team}</strong></p>` +
      `<p>Date : ${formatMatchDate(lastMatch.match_date)}</p>` +
      `<p>Score : ${score}</p>` +
      `<p>Statut : <span class="status-${lastMatch.status}">${lastMatch.status}</span></p>`;
  } else if (lastDiv) {
    lastDiv.innerHTML = "<p>Aucun match joué trouvé.</p>";
  }
}

// Initialisation de la page d'accueil
async function initHomePage() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/matches`);

    if (!response.ok) {
      throw new Error(`Erreur API (${response.status})`);
    }

    const matches = await response.json();
    const now = new Date();

    // Matchs joués et à venir
    const played = matches.filter(
      (m) => m.status === "played" && new Date(m.match_date) <= now
    );

    const scheduled = matches.filter(
      (m) => m.status === "scheduled" && new Date(m.match_date) >= now
    );

    // Dernier match joué = le plus récent dans le passé
    let lastMatch = null;
    if (played.length > 0) {
      played.sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
      lastMatch = played[played.length - 1];
    }

    // Prochain match = le plus proche dans le futur
    let nextMatch = null;
    if (scheduled.length > 0) {
      scheduled.sort(
        (a, b) => new Date(a.match_date) - new Date(b.match_date)
      );
      nextMatch = scheduled[0];
    }

    // Mise à jour de la page
    updateHomePage(nextMatch, lastMatch);

    // Forme du BUC sur les 5 derniers matchs
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
    renderMatchesTable(matches);
  } catch (error) {
    console.error(error);
    showError("Impossible de charger la liste des matchs.");
  }
}

// Remplit le tableau des résultats
function renderMatchesTable(matches) {
  const tbody = document.getElementById("matches-body");
  if (!tbody) return;

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
