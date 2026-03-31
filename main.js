import L from "leaflet";
import "leaflet/dist/leaflet.css";

const stageEl = document.querySelector("#globe-stage");
const cardEl = document.querySelector("#countryCard");
const searchInputEl = document.querySelector("#searchCountry");
const searchBtnEl = document.querySelector("#searchBtn");
const quizCardEl = document.querySelector("#quizCard");
const navExploreEl = document.querySelector("#navExplore");
const navQuizEl = document.querySelector("#navQuiz");
const playerOneNameEl = document.querySelector("#playerOneName");
const playerTwoNameEl = document.querySelector("#playerTwoName");
const roundTimeInputEl = document.querySelector("#roundTimeInput");
const maxRoundsInputEl = document.querySelector("#maxRoundsInput");
const startGameBtnEl = document.querySelector("#startGameBtn");
const stopGameBtnEl = document.querySelector("#stopGameBtn");
const gameBoardEl = document.querySelector("#gameBoard");
const activePlayerLabelEl = document.querySelector("#activePlayerLabel");
const targetCountryLabelEl = document.querySelector("#targetCountryLabel");
const timerLabelEl = document.querySelector("#timerLabel");
const roundLabelEl = document.querySelector("#roundLabel");
const scorePlayerOneNameEl = document.querySelector("#scorePlayerOneName");
const scorePlayerTwoNameEl = document.querySelector("#scorePlayerTwoName");
const scorePlayerOneEl = document.querySelector("#scorePlayerOne");
const scorePlayerTwoEl = document.querySelector("#scorePlayerTwo");
const gameMessageEl = document.querySelector("#gameMessage");

const map = L.map(stageEl, {
  zoomControl: false,
  minZoom: 2,
  maxZoom: 8,
  preferCanvas: true,
  zoomSnap: 0.25,
  zoomDelta: 0.5,
  wheelPxPerZoomLevel: 100,
  worldCopyJump: false,
  maxBounds: [[-85, -180], [85, 180]],
  maxBoundsViscosity: 0.85,
  bounceAtZoomLimits: false,
  attributionControl: true,
}).setView([20, 0], 2);

L.control.zoom({ position: 'bottomleft' }).addTo(map);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 8,
  minZoom: 2,
  noWrap: true,
  bounds: [[-85, -180], [85, 180]],
  keepBuffer: 4,
  updateWhenZooming: false,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

const refreshMapSize = () => {
  // Avoid tile overlap artifacts after layout/viewport changes.
  map.invalidateSize({ pan: false, debounceMoveend: true });
};

window.addEventListener("resize", refreshMapSize);

let countries = [];
let selectedFeature = null;
let selectedLayer = null;
let countriesLayer = null;
let lastCountryDetails = null;
let activeTab = "explore";
const wikiSummaryCache = new Map();
const gameState = {
  active: false,
  players: ["Player 1", "Player 2"],
  scores: [0, 0],
  currentPlayer: 0,
  round: 1,
  maxRounds: 10,
  turnSeconds: 12,
  timerLeft: 12,
  targetFeature: null,
  timerId: null,
};

const formatNumber = (value) => {
  if (!Number.isFinite(value)) {
    return "N/A";
  }
  return new Intl.NumberFormat("en-US").format(value);
};

const getFeatureName = (feature) =>
  feature?.properties?.ADMIN || feature?.properties?.name || "Unknown";

const getFeatureIso = (feature) => {
  const props = feature?.properties || {};
  return (
    props.ISO_A3 || props.iso_a3 || props.ADM0_A3 || props.WB_A3 || props.SU_A3 || ""
  );
};

const baseStyle = {
  color: "#0a3f49",
  weight: 1,
  fillColor: "#1f8c96",
  fillOpacity: 0.52,
};

const selectedStyle = {
  color: "#8f5a0b",
  weight: 2,
  fillColor: "#f0a63a",
  fillOpacity: 0.88,
};

const hoverStyle = {
  color: "#0e5865",
  weight: 2,
  fillColor: "#47b8b0",
  fillOpacity: 0.76,
};

const resetStyles = () => {
  if (countriesLayer) {
    countriesLayer.eachLayer((layer) => {
      layer.setStyle(baseStyle);
    });
  }
};

const selectFeature = (feature, layer) => {
  selectedFeature = feature;
  selectedLayer = layer || null;
  resetStyles();
  if (selectedLayer) {
    selectedLayer.setStyle(selectedStyle);
    selectedLayer.bringToFront();
  }
};

const countrySizeBand = (population) => {
  if (!Number.isFinite(population)) {
    return "with a population profile that varies significantly across regions";
  }
  if (population > 150000000) {
    return "with a very large population that drives both market scale and infrastructure demand";
  }
  if (population > 30000000) {
    return "with a mid-to-large population and growing urban influence";
  }
  return "with a relatively smaller population and a distinct national identity";
};

const buildAiSummary = (country) => {
  if (!country) {
    return "Select a country to generate AI insight.";
  }

  const name = country.name?.common || "This country";
  const capital = country.capital?.[0] || "an important capital city";
  const region = country.region || "its wider region";
  const subregion = country.subregion || "a diverse subregion";
  const population = country.population;
  const languageCount = Object.keys(country.languages || {}).length;

  const languageText =
    languageCount > 1
      ? "Its multilingual culture supports diverse traditions and communication styles."
      : "Its language profile contributes strongly to cultural continuity and education.";

  return `${name} is a country in ${subregion}, part of ${region}, ${countrySizeBand(population)}. ${capital} acts as a political and administrative hub, while the national economy is shaped by geography, trade routes, and regional partnerships. ${languageText}`;
};

const fetchWikipediaSummary = async (title) => {
  if (!title) {
    return null;
  }

  const key = title.trim().toLowerCase();
  if (wikiSummaryCache.has(key)) {
    return wikiSummaryCache.get(key);
  }

  try {
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    );
    if (!response.ok) {
      wikiSummaryCache.set(key, null);
      return null;
    }
    const payload = await response.json();
    const extract = payload?.extract ? String(payload.extract).trim() : null;
    wikiSummaryCache.set(key, extract || null);
    return extract || null;
  } catch {
    wikiSummaryCache.set(key, null);
    return null;
  }
};

const setActiveTab = (tab) => {
  activeTab = tab;
  navExploreEl.classList.toggle("active", tab === "explore");
  navQuizEl.classList.toggle("active", tab === "quiz");

  const showQuiz = tab === "quiz";

  quizCardEl.classList.toggle("hidden", !showQuiz);
  cardEl.classList.toggle("hidden", showQuiz);

  requestAnimationFrame(refreshMapSize);
};

const getPlayableCountries = () =>
  countries.filter((feature) => {
    const name = getFeatureName(feature);
    return name && name !== "Antarctica";
  });

const clearGameTimer = () => {
  if (gameState.timerId) {
    clearInterval(gameState.timerId);
    gameState.timerId = null;
  }
};

const updateGameBoard = () => {
  const currentPlayerName = gameState.players[gameState.currentPlayer];
  const targetName = gameState.targetFeature ? getFeatureName(gameState.targetFeature) : "-";

  gameBoardEl.classList.toggle("hidden", !gameState.active);
  activePlayerLabelEl.textContent = currentPlayerName;
  targetCountryLabelEl.textContent = targetName;
  timerLabelEl.textContent = `${gameState.timerLeft}s`;
  roundLabelEl.textContent = `${gameState.round} / ${gameState.maxRounds}`;
  scorePlayerOneNameEl.textContent = gameState.players[0];
  scorePlayerTwoNameEl.textContent = gameState.players[1];
  scorePlayerOneEl.textContent = String(gameState.scores[0]);
  scorePlayerTwoEl.textContent = String(gameState.scores[1]);
};

const setGameMessage = (message) => {
  gameMessageEl.textContent = message;
};

const endGame = () => {
  if (!gameState.active) {
    return;
  }

  clearGameTimer();
  gameState.active = false;

  const [scoreOne, scoreTwo] = gameState.scores;
  if (scoreOne === scoreTwo) {
    setGameMessage(`Game over. It's a draw at ${scoreOne}-${scoreTwo}.`);
  } else {
    const winnerIndex = scoreOne > scoreTwo ? 0 : 1;
    setGameMessage(`Game over. ${gameState.players[winnerIndex]} wins ${Math.max(scoreOne, scoreTwo)}-${Math.min(scoreOne, scoreTwo)}.`);
  }

  updateGameBoard();
};

const pickRandomTarget = () => {
  const pool = getPlayableCountries();
  if (!pool.length) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
};

const startTurnTimer = () => {
  clearGameTimer();
  gameState.timerLeft = gameState.turnSeconds;
  updateGameBoard();

  gameState.timerId = setInterval(() => {
    gameState.timerLeft -= 1;
    updateGameBoard();

    if (gameState.timerLeft <= 0) {
      clearGameTimer();
      setGameMessage(`Time up! ${gameState.players[gameState.currentPlayer]} missed ${getFeatureName(gameState.targetFeature)}.`);
      nextTurn();
    }
  }, 1000);
};

const startRound = () => {
  gameState.targetFeature = pickRandomTarget();
  if (!gameState.targetFeature) {
    setGameMessage("Could not load countries for game. Please refresh and try again.");
    endGame();
    return;
  }

  setGameMessage(`${gameState.players[gameState.currentPlayer]}, find ${getFeatureName(gameState.targetFeature)} before time runs out.`);
  updateGameBoard();
  startTurnTimer();
};

function nextTurn() {
  if (!gameState.active) {
    return;
  }

  gameState.round += 1;
  if (gameState.round > gameState.maxRounds) {
    endGame();
    return;
  }

  gameState.currentPlayer = gameState.currentPlayer === 0 ? 1 : 0;
  startRound();
}

const handleGameCountryClick = (feature) => {
  if (!gameState.active || activeTab !== "quiz") {
    return;
  }

  const clicked = getFeatureName(feature).toLowerCase();
  const target = getFeatureName(gameState.targetFeature).toLowerCase();

  if (clicked === target) {
    gameState.scores[gameState.currentPlayer] += 1;
    clearGameTimer();
    setGameMessage(`Correct! ${gameState.players[gameState.currentPlayer]} earned 1 point.`);
    updateGameBoard();
    setTimeout(() => {
      nextTurn();
    }, 650);
    return;
  }

  setGameMessage(`Not ${getFeatureName(gameState.targetFeature)}. Keep trying, ${gameState.players[gameState.currentPlayer]}!`);
};

const startGame = () => {
  if (!countries.length) {
    setGameMessage("Map data is still loading. Try again in a moment.");
    return;
  }

  clearGameTimer();

  gameState.active = true;
  gameState.players = [
    playerOneNameEl.value.trim() || "Player 1",
    playerTwoNameEl.value.trim() || "Player 2",
  ];
  gameState.scores = [0, 0];
  gameState.currentPlayer = 0;
  gameState.round = 1;
  gameState.turnSeconds = Math.min(45, Math.max(5, Number(roundTimeInputEl.value) || 12));
  gameState.maxRounds = Math.min(30, Math.max(2, Number(maxRoundsInputEl.value) || 10));
  gameState.timerLeft = gameState.turnSeconds;

  setActiveTab("quiz");
  startRound();
};

const renderCountryCard = (country, featureName) => {
  const name = country?.name?.common || featureName;
  const officialName = country?.name?.official || "N/A";
  const capital = country?.capital?.[0] || "N/A";
  const population = country?.population;
  const area = country?.area;
  const region = country?.region || "N/A";
  const languages = Object.values(country?.languages || {});

  cardEl.innerHTML = `
    <h3>${name}</h3>
    <p class="muted">Official: ${officialName}</p>
    <div class="stat-grid">
      <div class="stat"><strong>Capital</strong><span>${capital}</span></div>
      <div class="stat"><strong>Region</strong><span>${region}</span></div>
      <div class="stat"><strong>Population</strong><span>${formatNumber(population)}</span></div>
      <div class="stat"><strong>Area (km²)</strong><span>${formatNumber(area)}</span></div>
    </div>
    <p><strong>Languages:</strong> ${languages.length ? languages.join(", ") : "N/A"}</p>
    <div class="ai">
      <strong>AI Insight</strong>
      <p>${buildAiSummary(country)}</p>
    </div>
  `;
};

const renderCountryCardWithContext = async (country, featureName) => {
  renderCountryCard(country, featureName);

  const summary = await fetchWikipediaSummary(country?.name?.common || featureName);
  if (!summary) {
    return;
  }

  const aiParagraph = cardEl.querySelector(".ai p");
  if (aiParagraph) {
    aiParagraph.textContent = summary;
  }
};

const renderLoadingCard = (countryName) => {
  cardEl.innerHTML = `
    <h3>${countryName}</h3>
    <p class="muted">Loading country details and AI insight...</p>
  `;
};

const renderErrorCard = (countryName) => {
  cardEl.innerHTML = `
    <h3>${countryName}</h3>
    <p class="muted">Could not fetch detailed data right now. Map selection is still active.</p>
  `;
};

const fetchCountryByIso = async (iso) => {
  if (!iso || iso === "-99") {
    return null;
  }
  const response = await fetch(`https://restcountries.com/v3.1/alpha/${iso}`);
  if (!response.ok) {
    return null;
  }
  const payload = await response.json();
  return Array.isArray(payload) ? payload[0] : payload;
};

const fetchCountryByName = async (name) => {
  const response = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(name)}?fullText=true`);
  if (!response.ok) {
    return null;
  }
  const payload = await response.json();
  return Array.isArray(payload) ? payload[0] : payload;
};

const loadCountryDetails = async (feature) => {
  const countryName = getFeatureName(feature);
  renderLoadingCard(countryName);
  try {
    const iso = getFeatureIso(feature);
    const fromIso = await fetchCountryByIso(iso);
    const details = fromIso || (await fetchCountryByName(countryName));
    lastCountryDetails = details;
    await renderCountryCardWithContext(details, countryName);
  } catch (error) {
    lastCountryDetails = null;
    renderErrorCard(countryName);
  }
};

const findFeatureByName = (query) => {
  const normalized = query.trim().toLowerCase();
  return countries.find((feature) => getFeatureName(feature).toLowerCase() === normalized)
    || countries.find((feature) => getFeatureName(feature).toLowerCase().includes(normalized));
};

const focusFeature = (feature, layer) => {
  if (!feature || !layer) {
    return;
  }
  map.flyToBounds(layer.getBounds(), {
    padding: [40, 40],
    maxZoom: 5,
    duration: 1.5,
    easeLinearity: 0.25,
  });
};

const findLayerByFeature = (feature) => {
  if (!countriesLayer || !feature) {
    return null;
  }
  let matched = null;
  countriesLayer.eachLayer((layer) => {
    if (layer.feature === feature) {
      matched = layer;
    }
  });
  return matched;
};

searchBtnEl.addEventListener("click", () => {
  const query = searchInputEl.value.trim();
  if (!query) {
    return;
  }
  const feature = findFeatureByName(query);
  if (!feature) {
    cardEl.innerHTML = `<h3>No match</h3><p class="muted">No country matched "${query}".</p>`;
    return;
  }
  const layer = findLayerByFeature(feature);
  selectFeature(feature, layer);
  focusFeature(feature, layer);
  loadCountryDetails(feature);
});

searchInputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    searchBtnEl.click();
  }
});

navExploreEl.addEventListener("click", () => setActiveTab("explore"));
navQuizEl.addEventListener("click", () => setActiveTab("quiz"));
startGameBtnEl.addEventListener("click", startGame);
stopGameBtnEl.addEventListener("click", () => {
  if (!gameState.active) {
    setGameMessage("Game is not running.");
    return;
  }
  endGame();
});

setActiveTab(activeTab);
setTimeout(refreshMapSize, 0);

fetch("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson")
  .then((res) => res.json())
  .then((data) => {
    countries = data.features;

    countriesLayer = L.geoJSON(data, {
      style: baseStyle,
      onEachFeature: (feature, layer) => {
        layer.on({
          mouseover: () => {
            if (feature !== selectedFeature) {
              layer.setStyle(hoverStyle);
            }
          },
          mouseout: () => {
            if (feature === selectedFeature) {
              layer.setStyle(selectedStyle);
            } else {
              layer.setStyle(baseStyle);
            }
          },
          click: () => {
            selectFeature(feature, layer);
            loadCountryDetails(feature);
            handleGameCountryClick(feature);
            focusFeature(feature, layer);
          },
        });
      },
    }).addTo(map);

  })
  .catch(() => {
    cardEl.innerHTML = `<h3>Data source unavailable</h3><p class="muted">Could not load country boundaries. Please retry after refreshing.</p>`;
  });