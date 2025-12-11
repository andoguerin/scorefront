// À adapter avec VOTRE URL Render

const API_BASE_URL = "https://apiscore-vv2y.onrender.com";

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
async function initHomePage() {

    try {
  
      const response = await fetch(`${API_BASE_URL}/api/matches`);
  
      if (!response.ok) {
  
        throw new Error(`Erreur API (${response.status})`);
  
      }
  
      const matches = await response.json();
  
      const now = new Date();
  
      // Séparation des matchs joués et à venir
  
      const played = matches.filter((m) =>
  
        m.status === "played" && new Date(m.match_date) <= now
  
      );
  
      const scheduled = matches.filter((m) =>
  
        m.status === "scheduled" && new Date(m.match_date) >= now
  
      );
  
      // Dernier match joué = le plus récent dans le passé
  
      let lastMatch = null;
  
      if (played.length > 0) {
  
        played.sort(
  
          (a, b) => new Date(a.match_date) - new Date(b.match_date)
  
        );
  
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
  
      updateHomePage(nextMatch, lastMatch);
  
    } catch (error) {
  
      console.error(error);
  
      showError("Impossible de charger les données (API ou réseau indisponible).");
  
    }
  
  }
  
  function formatMatchDate(dateString) {
  
    const date = new Date(dateString);
  
    // Affichage simple : JJ/MM/AAAA HH:MM
  
    const day = String(date.getDate()).padStart(2, "0");
  
    const month = String(date.getMonth() + 1).padStart(2, "0");
  
    const year = date.getFullYear();
  
    const hours = String(date.getHours()).padStart(2, "0");
  
    const minutes = String(date.getMinutes()).padStart(2, "0");
  
    return `${day}/${month}/${year} ${hours}h${minutes}`;
  
  }
  
  function updateHomePage(nextMatch, lastMatch) {
  
    const nextDiv = document.getElementById("next-match");
  
    const lastDiv = document.getElementById("last-match");
  
    // Prochain match
  
    if (nextMatch) {
  
      nextDiv.innerHTML = `
  
        <p><strong>${nextMatch.home_team}</strong> vs <strong>${nextMatch.away_team}</strong></p>
  
        <p>Date : ${formatMatchDate(nextMatch.match_date)}</p>
        <p>Statut : <span class="status-${nextMatch.status}">${nextMatch.status}</span></p>
      `;
  
    } else {
      nextDiv.innerHTML = "<p>Aucun match à venir trouvé.</p>";
    }
  
    // Dernier match
  
    if (lastMatch) {
  
      let score = "Score non renseigné";
      if (lastMatch.home_score != null && lastMatch.away_score != null) {
        score = `${lastMatch.home_score} - ${lastMatch.away_score}`;
      }
  
      lastDiv.innerHTML = `
        <p><strong>${lastMatch.home_team}</strong> vs <strong>${lastMatch.away_team}</strong></p>
  
        <p>Date : ${formatMatchDate(lastMatch.match_date)}</p>
        <p>Score : ${score}</p>
        <p>Statut : <span class="status-${lastMatch.status}">${lastMatch.status}</span></p>
      `;
  
    } else {
      lastDiv.innerHTML = "<p>Aucun match joué trouvé.</p>";
    }
  }
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
  
  function renderMatchesTable(matches) {
  
    const tbody = document.getElementById("matches-body");
    tbody.innerHTML = ""; // on vide d'abord
  
    if (!matches || matches.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 5;
      td.textContent = "Aucun match trouvé dans la base.";
      tr.appendChild(td);
      tbody.appendChild(tr);
  
      return;
    }
  
    // Option : trier par date croissante
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
  
  
