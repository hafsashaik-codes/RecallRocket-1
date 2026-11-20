// ==========================================
// 1. DATE & STORAGE UTILITIES (UTC NORMALIZED)
// ==========================================
function getTodayISO() {
  return new Date().toISOString().split("T")[0];
}

function addDaysISO(isoDate, days) {
  const date = new Date(isoDate + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split("T")[0];
}

// ==========================================
// 2. SUPERMEMO-2 (SM-2) ALGORITHM ENGINE
// ==========================================
function calculateSM2(card, grade) {
  let { repetitions, interval, easeFactor } = card;

  if (grade >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }

  // Update Ease Factor with standard 1.3 minimum floor
  easeFactor = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  return {
    repetitions,
    interval,
    easeFactor: Number(easeFactor.toFixed(2)),
    nextReviewDate: addDaysISO(getTodayISO(), interval),
  };
}

// ==========================================
// 3. INITIAL SEED DATA & STATE MANAGEMENT
// ==========================================
const STORAGE_KEY = "recallrocket_data_v1";

function getDefaultState() {
  const today = getTodayISO();
  return {
    theme: "light",
    userStats: {
      name: "You (Campus Scholar)",
      streak: 6, // Ready to unlock 7-day badge on today's session!
      lastStudyDate: addDaysISO(today, -1),
      cardsReviewed: 42,
      retentionPoints: 615,
    },
    decks: [
      {
        id: "deck-algo",
        title: "Algorithms",
        description: "Sorting, graph traversal, dynamic programming & Big-O.",
      },
      {
        id: "deck-ds",
        title: "Data Structures",
        description: "Trees, hash tables, heaps, and amortized complexity.",
      },
      {
        id: "deck-sys",
        title: "System Design",
        description: "Caching, load balancing, sharding & CAP theorem.",
      },
    ],
    cards: [
      {
        id: "c1",
        deckId: "deck-algo",
        question: "What is the time complexity of QuickSort?",
        answer: "Average: O(n log n) | Worst-case: O(n²) when pivot selection is unbalanced.",
        repetitions: 1,
        interval: 1,
        easeFactor: 2.5,
        nextReviewDate: today,
      },
      {
        id: "c2",
        deckId: "deck-algo",
        question: "Which algorithm finds the shortest path in a weighted graph with non-negative edges?",
        answer: "Dijkstra's Algorithm — O((V + E) log V) using a min-priority queue.",
        repetitions: 0,
        interval: 0,
        easeFactor: 2.5,
        nextReviewDate: today,
      },
      {
        id: "c3",
        deckId: "deck-algo",
        question: "What two properties must a problem have for Dynamic Programming to apply?",
        answer: "1. Optimal Substructure\n2. Overlapping Subproblems",
        repetitions: 2,
        interval: 6,
        easeFactor: 2.6,
        nextReviewDate: today,
      },
      {
        id: "c4",
        deckId: "deck-ds",
        question: "What is the worst-case lookup time for a Hash Table using separate chaining?",
        answer: "O(n) when all keys hash to the same bucket; O(1) average.",
        repetitions: 0,
        interval: 0,
        easeFactor: 2.5,
        nextReviewDate: today,
      },
      {
        id: "c5",
        deckId: "deck-ds",
        question: "How does a Min-Heap maintain its structure after popping the root?",
        answer: "Moves the last element to the root and performs 'heapify-down' (sift-down) in O(log n).",
        repetitions: 0,
        interval: 0,
        easeFactor: 2.5,
        nextReviewDate: today,
      },
      {
        id: "c6",
        deckId: "deck-sys",
        question: "What does the CAP Theorem state?",
        answer: "A distributed data store can only provide two of three guarantees simultaneously: Consistency, Availability, and Partition Tolerance.",
        repetitions: 0,
        interval: 0,
        easeFactor: 2.5,
        nextReviewDate: today,
      },
    ],
    cohortPeers: [
      { name: "Aarav Sharma", streak: 12, cardsReviewed: 95, retentionPoints: 1120 },
      { name: "Priya Nair", streak: 5, cardsReviewed: 40, retentionPoints: 620 },
      { name: "Rohan Verma", streak: 4, cardsReviewed: 31, retentionPoints: 480 },
      { name: "Ananya Iyer", streak: 2, cardsReviewed: 19, retentionPoints: 290 },
    ],
  };
}

let state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || getDefaultState();
let reviewQueue = [];
let initialQueueCount = 0;
let activeDeckFilter = null;
let isFlipped = false;

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ==========================================
// 4. STREAK & GAMIFICATION LOGIC
// ==========================================
function validateStreakOnLoad() {
  const today = getTodayISO();
  const yesterday = addDaysISO(today, -1);
  const { lastStudyDate } = state.userStats;

  if (lastStudyDate !== today && lastStudyDate !== yesterday) {
    state.userStats.streak = 0;
    saveState();
  }
}

function recordStudyActivity(grade) {
  const today = getTodayISO();
  const yesterday = addDaysISO(today, -1);

  if (state.userStats.lastStudyDate === yesterday) {
    state.userStats.streak += 1;
    if (state.userStats.streak === 7) {
      showToast("🔥 Achievement Unlocked: 7-Day Study Streak Badge!");
    }
  } else if (state.userStats.lastStudyDate !== today) {
    state.userStats.streak = 1;
  }

  state.userStats.lastStudyDate = today;
  state.userStats.cardsReviewed += 1;

  // Award retention points based on recall grade
  const pointsEarned = grade >= 3 ? 10 + grade * 2 : 3;
  state.userStats.retentionPoints += pointsEarned;
  saveState();
}

// ==========================================
// 5. UI RENDERING FUNCTIONS
// ==========================================
function renderHeader() {
  document.getElementById("streak-count").textContent = state.userStats.streak;
  const dueCount = getDueCards(null).length;
  document.getElementById("due-badge").textContent = dueCount;
  document.documentElement.setAttribute("data-theme", state.theme);
}

function getDueCards(deckId = null) {
  const today = getTodayISO();
  return state.cards.filter(
    (c) => c.nextReviewDate <= today && (!deckId || c.deckId === deckId)
  );
}

function renderDecks() {
  const grid = document.getElementById("decks-grid");
  grid.innerHTML = "";

  state.decks.forEach((deck) => {
    const deckCards = state.cards.filter((c) => c.deckId === deck.id);
    const dueCards = getDueCards(deck.id);

    const cardEl = document.createElement("div");
    cardEl.className = "deck-card";
    cardEl.innerHTML = `
      <div>
        <h3>${deck.title}</h3>
        <p>${deck.description}</p>
      </div>
      <div>
        <div class="deck-stats">
          <span>Total Cards: <strong>${deckCards.length}</strong></span>
          <span class="due-highlight">Due Today: ${dueCards.length}</span>
        </div>
        <button class="btn btn-primary full-width study-deck-btn" data-id="${deck.id}">
          ${dueCards.length > 0 ? `Study Now (${dueCards.length} Due)` : "Practice Deck"}
        </button>
      </div>
    `;
    grid.appendChild(cardEl);
  });

  document.querySelectorAll(".study-deck-btn").forEach((btn) => {
    btn.addEventListener("click", () => startReviewSession(btn.dataset.id));
  });

  populateDeckSelects();
}

function populateDeckSelects() {
  const selects = [
    document.getElementById("card-deck-select"),
    document.getElementById("csv-deck-select"),
  ];
  selects.forEach((sel) => {
    sel.innerHTML = state.decks
      .map((d) => `<option value="${d.id}">${d.title}</option>`)
      .join("");
  });
}

function renderLeaderboard() {
  const tbody = document.getElementById("leaderboard-body");
  document.getElementById("user-points-display").textContent =
    state.userStats.retentionPoints;

  const combined = [
    ...state.cohortPeers.map((p) => ({ ...p, isUser: false })),
    {
      name: state.userStats.name,
      streak: state.userStats.streak,
      cardsReviewed: state.userStats.cardsReviewed,
      retentionPoints: state.userStats.retentionPoints,
      isUser: true,
    },
  ];

  combined.sort((a, b) => b.retentionPoints - a.retentionPoints);

  tbody.innerHTML = combined
    .map((student, idx) => {
      const rank = idx + 1;
      const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
      return `
        <tr class="${student.isUser ? "current-user-row" : ""}">
          <td>${medal}</td>
          <td>${student.name}</td>
          <td>🔥 ${student.streak}d</td>
          <td>${student.cardsReviewed}</td>
          <td><strong>${student.retentionPoints} pts</strong></td>
        </tr>
      `;
    })
    .join("");
}

// ==========================================
// 6. REVIEW SESSION & 3D CARD INTERACTION
// ==========================================
function startReviewSession(deckId = null) {
  activeDeckFilter = deckId;
  const due = getDueCards(deckId);
  // Fallback to all cards in deck if user clicks "Practice Deck" when 0 are due
  reviewQueue =
    due.length > 0
      ? [...due]
      : deckId
      ? state.cards.filter((c) => c.deckId === deckId)
      : [];

  initialQueueCount = reviewQueue.length;
  switchView("review-view");

  const deckObj = state.decks.find((d) => d.id === deckId);
  document.getElementById("active-deck-title").textContent = deckObj
    ? `${deckObj.title} Review`
    : "Daily Due Queue";

  loadCurrentCard();
}

function loadCurrentCard() {
  const stage = document.getElementById("flashcard-stage");
  const ratingPanel = document.getElementById("rating-panel");
  const emptyState = document.getElementById("review-empty-state");
  const flashcard = document.getElementById("flashcard");

  isFlipped = false;
  flashcard.classList.remove("flipped");
  ratingPanel.classList.add("hidden");

  const completed = initialQueueCount - reviewQueue.length;
  const pct = initialQueueCount > 0 ? (completed / initialQueueCount) * 100 : 100;
  document.getElementById("review-progress-bar").style.width = `${pct}%`;
  document.getElementById(
    "review-progress-text"
  ).textContent = `${reviewQueue.length} cards remaining`;

  if (reviewQueue.length === 0) {
    stage.classList.add("hidden");
    emptyState.classList.remove("hidden");
    return;
  }

  stage.classList.remove("hidden");
  emptyState.classList.add("hidden");

  const current = reviewQueue[0];
  const deckObj = state.decks.find((d) => d.id === current.deckId);

  document.getElementById("card-deck-tag").textContent = deckObj ? deckObj.title : "General";
  document.getElementById("card-stats-tag").textContent = `EF: ${current.easeFactor.toFixed(
    2
  )} | Interval: ${current.interval}d`;
  document.getElementById("card-question").textContent = current.question;
  document.getElementById("card-answer").textContent = current.answer;

  // Preview next interval for each grade (0-5)
  for (let g = 0; g <= 5; g++) {
    const preview = calculateSM2(current, g);
    document.getElementById(`next-${g}`).textContent = `${preview.interval}d`;
  }
}

function flipCard() {
  if (reviewQueue.length === 0) return;
  isFlipped = !isFlipped;
  document.getElementById("flashcard").classList.toggle("flipped", isFlipped);
  if (isFlipped) {
    document.getElementById("rating-panel").classList.remove("hidden");
  }
}

function handleGrade(grade) {
  if (reviewQueue.length === 0) return;
  const currentCard = reviewQueue.shift();
  const updated = calculateSM2(currentCard, grade);

  // Update card in global state
  const idx = state.cards.findIndex((c) => c.id === currentCard.id);
  if (idx !== -1) {
    state.cards[idx] = { ...state.cards[idx], ...updated };
  }

  recordStudyActivity(grade);
  renderHeader();
  renderDecks();
  renderLeaderboard();

  showToast(`Next review scheduled in ${updated.interval} day(s)`);
  loadCurrentCard();
}

// ==========================================
// 7. EVENT LISTENERS & INITIALIZATION
// ==========================================
function switchView(viewId) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById(viewId).classList.add("active");

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === viewId);
  });

  if (viewId === "leaderboard-view") renderLeaderboard();
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add("hidden"), 3000);
}

// Navigation tabs
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.view === "review-view") {
      startReviewSession(null);
    } else {
      switchView(btn.dataset.view);
    }
  });
});

// Flashcard click & keyboard shortcuts (Space to flip, 0-5 to rate)
document.getElementById("flashcard").addEventListener("click", flipCard);

document.addEventListener("keydown", (e) => {
  const reviewActive = document.getElementById("review-view").classList.contains("active");
  const modalOpen = !document.querySelector(".modal:not(.hidden)");
  if (!reviewActive || !modalOpen) return;

  if (e.code === "Space") {
    e.preventDefault();
    flipCard();
  } else if (isFlipped && ["0", "1", "2", "3", "4", "5"].includes(e.key)) {
    handleGrade(Number(e.key));
  }
});

// Rating buttons
document.querySelectorAll(".rate-btn").forEach((btn) => {
  btn.addEventListener("click", () => handleGrade(Number(btn.dataset.grade)));
});

// Audio Pronunciation (Web Speech API)
document.getElementById("tts-btn").addEventListener("click", () => {
  if (reviewQueue.length === 0 || !("speechSynthesis" in window)) return;
  const text = isFlipped ? reviewQueue[0].answer : reviewQueue[0].question;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
});

// Dark mode toggle
document.getElementById("theme-toggle").addEventListener("click", () => {
  state.theme = state.theme === "light" ? "dark" : "light";
  saveState();
  renderHeader();
});

// Modals handling
function openModal(id) {
  document.getElementById(id).classList.remove("hidden");
}
function closeModals() {
  document.querySelectorAll(".modal").forEach((m) => m.classList.add("hidden"));
}

document.getElementById("open-deck-modal").addEventListener("click", () => openModal("deck-modal"));
document.getElementById("open-card-modal").addEventListener("click", () => openModal("card-modal"));
document.getElementById("open-csv-modal").addEventListener("click", () => openModal("csv-modal"));
document.querySelectorAll(".close-modal").forEach((btn) => btn.addEventListener("click", closeModals));

// Live Preview in Add Card Modal
document.getElementById("card-question-input").addEventListener("input", (e) => {
  document.getElementById("preview-q").textContent = e.target.value || "...";
});
document.getElementById("card-answer-input").addEventListener("input", (e) => {
  document.getElementById("preview-a").textContent = e.target.value || "...";
});

// Create Deck Form
document.getElementById("deck-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const title = document.getElementById("deck-title-input").value.trim();
  const description = document.getElementById("deck-desc-input").value.trim();
  state.decks.push({ id: "deck-" + Date.now(), title, description });
  saveState();
  renderDecks();
  e.target.reset();
  closeModals();
  showToast(`Deck "${title}" created!`);
});

// Create Card Form
document.getElementById("card-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const deckId = document.getElementById("card-deck-select").value;
  const question = document.getElementById("card-question-input").value.trim();
  const answer = document.getElementById("card-answer-input").value.trim();

  state.cards.push({
    id: "c-" + Date.now(),
    deckId,
    question,
    answer,
    repetitions: 0,
    interval: 0,
    easeFactor: 2.5,
    nextReviewDate: getTodayISO(),
  });

  saveState();
  renderHeader();
  renderDecks();
  e.target.reset();
  document.getElementById("preview-q").textContent = "...";
  document.getElementById("preview-a").textContent = "...";
  closeModals();
  showToast("Flashcard added to deck!");
});

// CSV Import Form
document.getElementById("csv-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const deckId = document.getElementById("csv-deck-select").value;
  const lines = document.getElementById("csv-input").value.trim().split("\n");
  let imported = 0;

  lines.forEach((line) => {
    const parts = line.split(",");
    if (parts.length >= 2) {
      const question = parts[0].trim();
      const answer = parts.slice(1).join(",").trim();
      if (question && answer) {
        state.cards.push({
          id: "c-" + Date.now() + Math.random(),
          deckId,
          question,
          answer,
          repetitions: 0,
          interval: 0,
          easeFactor: 2.5,
          nextReviewDate: getTodayISO(),
        });
        imported++;
      }
    }
  });

  saveState();
  renderHeader();
  renderDecks();
  e.target.reset();
  closeModals();
  showToast(`Imported ${imported} flashcards!`);
});

document.getElementById("review-all-due-btn").addEventListener("click", () => startReviewSession(null));
document.getElementById("back-to-decks-btn").addEventListener("click", () => switchView("decks-view"));

// Boot App
validateStreakOnLoad();
renderHeader();
renderDecks();
renderLeaderboard();