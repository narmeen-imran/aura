/* =========================================================
   AURA — FULLY MATCHED TO YOUR HTML
   SECTION 1 — CORE SETUP + SAFE HELPERS + ONBOARDING
   ========================================================= */

/* -------------------------
   SAFE EVENT LISTENER
   Prevents crashes if an ID is missing
------------------------- */
function on(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

/* -------------------------
   STATE
------------------------- */
let userName = "";
let userAge = "";
let userPurpose = [];

let decks = JSON.parse(localStorage.getItem("aura-decks") || "{}");
let notes = JSON.parse(localStorage.getItem("aura-notes") || "[]");
let todos = JSON.parse(localStorage.getItem("aura-todos") || "[]");

let currentDeck = null;
let currentCardIndex = 0;

let timerInterval = null;
let totalSeconds = 1500;
let remainingSeconds = totalSeconds;

let pomodoroStats = JSON.parse(
  localStorage.getItem("aura-pomodoro-stats") || '{"sessions":0,"seconds":0}'
);

let noteSearchQuery = "";

/* -------------------------
   ELEMENTS
------------------------- */
const onboardingScreen = document.getElementById("onboarding-screen");
const onboardingStepsContainer = document.querySelector(".onboarding-steps");
const appRoot = document.getElementById("app-root");
const screens = document.querySelectorAll(".aura-screen");
const navButtons = document.querySelectorAll(".bottom-nav-item");

/* Flashcards */
const deckGrid = document.getElementById("deck-grid");
const flashcard = document.getElementById("flashcard");
const flashcardFront = document.getElementById("flashcard-front");
const flashcardBack = document.getElementById("flashcard-back");
const flashcardProgress = document.getElementById("flashcard-progress");
const flashcardModal = document.getElementById("flashcard-modal");
const flashcardFrontInput = document.getElementById("flashcard-front-input");
const flashcardBackInput = document.getElementById("flashcard-back-input");

/* Notes */
const notesList = document.getElementById("notes-list");
const notesSearchInput = document.getElementById("notes-search-input");
const noteEditorOverlay = document.getElementById("note-editor-overlay");
const noteEditorContent = document.getElementById("note-editor-content");
const noteEditorTitle = document.getElementById("note-editor-title-input");
const noteTagsInput = document.getElementById("note-tags-input");
const pinNoteButton = document.getElementById("pin-note-button");

/* Timer */
const timerDisplay = document.getElementById("pomodoro-time");
const hourInput = document.getElementById("timer-hours");
const minuteInput = document.getElementById("timer-minutes");
const pomodoroStatsSessions = document.getElementById("pomodoro-stats-sessions");
const pomodoroStatsTime = document.getElementById("pomodoro-stats-time");

/* -------------------------
   HAPTICS
------------------------- */
function haptic(ms = 20) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

/* -------------------------
   ONBOARDING
------------------------- */
let onboardingStep = 1;

function goToOnboardingStep(step) {
  onboardingStep = step;
  onboardingStepsContainer.style.transform =
    `translateX(${(step - 1) * -100}vw)`;
}

function finishOnboarding() {
  onboardingScreen.style.display = "none";
  appRoot.style.display = "flex";

  const greet = document.getElementById("home-greeting");
  if (greet && userName) greet.textContent = `hello, ${userName}`;

  renderTodos();
  renderDecks();
  renderNotes();
  renderPomodoroStats();
}

/* Step 1 → Step 2 */
on("onboarding-next-1", "click", () => {
  const name = document.getElementById("onboarding-name-input").value.trim();
  if (!name) return;
  userName = name;
  goToOnboardingStep(2);
});

/* Step 2 → Step 3 */
on("onboarding-next-2", "click", () => {
  const age = document.getElementById("onboarding-age-input").value.trim();
  if (!age) return;
  userAge = age;
  goToOnboardingStep(3);
});

/* Finish onboarding */
on("onboarding-finish", "click", () => {
  const checks = document.querySelectorAll('input[name="purpose"]:checked');
  userPurpose = Array.from(checks).map(c => c.value);
  if (!userPurpose.length) return;
  finishOnboarding();
});
/* =========================================================
   SECTION 2 — NAVIGATION + TODOS
   ========================================================= */

/* -------------------------
   NAVIGATION BETWEEN SCREENS
------------------------- */

/**
 * Shows a screen by its data-screen="name"
 */
function showScreen(name) {
  screens.forEach(s => s.classList.remove("is-active"));
  const target = document.querySelector(`[data-screen="${name}"]`);
  if (target) target.classList.add("is-active");
}

/* Bottom navigation buttons */
navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    navButtons.forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    showScreen(btn.dataset.screenTarget.trim());
  });
});

/* -------------------------
   TODO LIST
------------------------- */

function saveTodos() {
  localStorage.setItem("aura-todos", JSON.stringify(todos));
}

/**
 * Renders the todo list on the home screen
 */
function renderTodos() {
  const list = document.getElementById("todo-list");
  if (!list) return;

  list.innerHTML = "";

  todos.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "todo-item";

    li.innerHTML = `
      <span>${item}</span>
      <button class="ghost-button small">x</button>
    `;

    /* Delete todo */
    li.querySelector("button").addEventListener("click", () => {
      todos.splice(index, 1);
      saveTodos();
      renderTodos();
      haptic(30);
    });

    list.appendChild(li);
  });
}

/* Add new todo */
on("todo-add-button", "click", () => {
  const text = prompt("new task:");
  if (!text) return;

  todos.push(text.trim());
  saveTodos();
  renderTodos();
});
/* =========================================================
   SECTION 3 — DECKS + FLASHCARDS + MODAL LOGIC
   ========================================================= */

/* -------------------------
   SAVE / RENDER DECKS
------------------------- */

function saveDecks() {
  localStorage.setItem("aura-decks", JSON.stringify(decks));
}

/**
 * Renders the list of decks on the "decks" screen
 */
function renderDecks() {
  deckGrid.innerHTML = "";

  const names = Object.keys(decks);

  if (!names.length) {
    deckGrid.innerHTML = `
      <p style="font-size:13px;color:#666;">
        no decks yet. create one to get started.
      </p>`;
    return;
  }

  names.forEach(deckName => {
    const card = document.createElement("div");
    card.className = "deck-card";
    card.textContent = deckName;

    card.addEventListener("click", () => openDeck(deckName));
    deckGrid.appendChild(card);
  });
}

/* -------------------------
   ADD NEW DECK
------------------------- */

on("add-deck-button", "click", () => {
  const name = prompt("deck name:");
  if (!name) return;

  const trimmed = name.trim();
  if (!trimmed) return;

  if (decks[trimmed]) {
    alert("a deck with that name already exists.");
    return;
  }

  decks[trimmed] = [];
  saveDecks();
  renderDecks();
});

/* -------------------------
   OPEN DECK VIEWER
------------------------- */

function openDeck(name) {
  currentDeck = name;
  currentCardIndex = 0;

  document.getElementById("deck-viewer-title").textContent = name;

  flashcard.classList.remove("is-flipped");
  renderFlashcard();

  showScreen("flashcard-viewer");
}

/* Back to deck list */
on("back-to-decks", "click", () => {
  showScreen("flashcards");
});

/* -------------------------
   FLASHCARD RENDERING
------------------------- */

function renderFlashcard() {
  const deck = decks[currentDeck];

  if (!deck || !deck.length) {
    flashcardFront.textContent = "no cards yet";
    flashcardBack.textContent = "";
    flashcardProgress.textContent = "";
    return;
  }

  const card = deck[currentCardIndex];

  flashcardFront.textContent = card.front;
  flashcardBack.textContent = card.back;
  flashcardProgress.textContent =
    `${currentCardIndex + 1} / ${deck.length}`;
}

/* Flip card */
on("flashcard-flip", "click", () => {
  flashcard.classList.toggle("is-flipped");
});

/* Next card */
on("flashcard-next", "click", () => {
  const deck = decks[currentDeck];
  if (!deck.length) return;

  currentCardIndex = (currentCardIndex + 1) % deck.length;
  flashcard.classList.remove("is-flipped");
  renderFlashcard();
});

/* Previous card */
on("flashcard-prev", "click", () => {
  const deck = decks[currentDeck];
  if (!deck.length) return;

  currentCardIndex =
    (currentCardIndex - 1 + deck.length) % deck.length;

  flashcard.classList.remove("is-flipped");
  renderFlashcard();
});

/* -------------------------
   ADD CARD (EMPTY MODAL)
------------------------- */

on("add-card-button", "click", () => {
  document.getElementById("flashcard-modal-title").textContent = "add card";

  flashcardFrontInput.value = "";
  flashcardBackInput.value = "";

  flashcardModal.dataset.mode = "add";
  flashcardModal.classList.add("is-visible");
});

/* -------------------------
   EDIT CARD (EMPTY MODAL, OVERWRITE)
------------------------- */

on("edit-card-button", "click", () => {
  const deck = decks[currentDeck];
  if (!deck.length) return;

  document.getElementById("flashcard-modal-title").textContent = "edit card";

  flashcardFrontInput.value = "";
  flashcardBackInput.value = "";

  flashcardModal.dataset.mode = "edit";
  flashcardModal.classList.add("is-visible");
});

/* -------------------------
   SAVE CARD (ADD OR EDIT)
------------------------- */

on("flashcard-modal-save", "click", () => {
  const front = flashcardFrontInput.value.trim();
  const back = flashcardBackInput.value.trim();

  if (!front || !back) return;

  const deck = decks[currentDeck];

  if (flashcardModal.dataset.mode === "add") {
    deck.push({ front, back });
  } else {
    deck[currentCardIndex] = { front, back };
  }

  saveDecks();
  flashcardModal.classList.remove("is-visible");

  flashcardFrontInput.value = "";
  flashcardBackInput.value = "";

  renderFlashcard();
});

/* Cancel modal */
on("flashcard-modal-cancel", "click", () => {
  flashcardModal.classList.remove("is-visible");
});

/* -------------------------
   DELETE CARD
------------------------- */

on("delete-card-button", "click", () => {
  const deck = decks[currentDeck];
  if (!deck.length) return;

  deck.splice(currentCardIndex, 1);
  currentCardIndex = 0;

  saveDecks();
  renderFlashcard();
});

/* -------------------------
   RENAME DECK (CHANGES KEY)
------------------------- */

on("rename-deck-button", "click", () => {
  const newName = prompt("new deck name:");
  if (!newName) return;

  const trimmed = newName.trim();
  if (!trimmed) return;

  if (decks[trimmed]) {
    alert("a deck with that name already exists.");
    return;
  }

  decks[trimmed] = decks[currentDeck];
  delete decks[currentDeck];

  currentDeck = trimmed;

  saveDecks();
  renderDecks();

  document.getElementById("deck-viewer-title").textContent = trimmed;
});

/* -------------------------
   DELETE DECK (CONFIRMATION)
------------------------- */

on("delete-deck-button", "click", () => {
  if (!confirm("delete this deck?")) return;

  delete decks[currentDeck];
  saveDecks();
  renderDecks();

  showScreen("flashcards");
});
/* =========================================================
   SECTION 4 — NOTES + EDITOR + SEARCH + PINNING
   ========================================================= */

/* -------------------------
   SAVE NOTES
------------------------- */
function saveNotes() {
  localStorage.setItem("aura-notes", JSON.stringify(notes));
}

/* -------------------------
   RENDER NOTES LIST
------------------------- */
function renderNotes() {
  notesList.innerHTML = "";

  const filtered = notes
    .map((note, index) => ({ ...note, index }))
    .filter(n => {
      const q = noteSearchQuery.toLowerCase();
      return (
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned - a.pinned;
      return b.updatedAt - a.updatedAt;
    });

  filtered.forEach(n => {
    const card = document.createElement("div");
    card.className = "glass-card";

    const preview = n.content.replace(/<[^>]*>/g, "").slice(0, 80);

    card.innerHTML = `
      <div class="note-card-header">
        <h3>${n.title || "untitled"}</h3>
        ${n.pinned ? '<span class="note-pin">pinned</span>' : ""}
      </div>
      <p>${preview}${preview.length === 80 ? "..." : ""}</p>
      ${n.tags ? `<p class="hint-text">${n.tags}</p>` : ""}
    `;

    card.addEventListener("click", () => openNoteEditor(n.index));
    notesList.appendChild(card);
  });
}

/* -------------------------
   SEARCH NOTES
------------------------- */
notesSearchInput.addEventListener("input", e => {
  noteSearchQuery = e.target.value;
  renderNotes();
});

/* -------------------------
   OPEN NOTE EDITOR
------------------------- */
function openNoteEditor(index = null) {
  noteEditorOverlay.classList.add("is-visible");
  appRoot.style.display = "none";

  if (index === null) {
    noteEditorTitle.value = "";
    noteEditorContent.innerHTML = "";
    noteTagsInput.value = "";
    noteEditorOverlay.dataset.editing = "new";
    pinNoteButton.dataset.pinned = "false";
    pinNoteButton.textContent = "pin";
  } else {
    const note = notes[index];
    noteEditorTitle.value = note.title;
    noteEditorContent.innerHTML = note.content;
    noteTagsInput.value = note.tags;
    noteEditorOverlay.dataset.editing = index;
    pinNoteButton.dataset.pinned = note.pinned ? "true" : "false";
    pinNoteButton.textContent = note.pinned ? "unpin" : "pin";
  }
}

/* Add new note */
on("add-note-button", "click", () => {
  openNoteEditor(null);
});

/* Close editor */
on("close-note-editor", "click", () => {
  noteEditorOverlay.classList.remove("is-visible");
  appRoot.style.display = "flex";
});

/* -------------------------
   SAVE NOTE
------------------------- */
on("save-note-button", "click", () => {
  const title = noteEditorTitle.value.trim();
  const content = noteEditorContent.innerHTML.trim();
  const tags = noteTagsInput.value.trim();
  const pinned = pinNoteButton.dataset.pinned === "true";

  if (!title && !content) return;

  const now = Date.now();
  const editing = noteEditorOverlay.dataset.editing;

  if (editing === "new") {
    notes.push({ title, content, tags, pinned, updatedAt: now });
  } else {
    notes[editing] = { title, content, tags, pinned, updatedAt: now };
  }

  saveNotes();
  renderNotes();

  noteEditorOverlay.classList.remove("is-visible");
  appRoot.style.display = "flex";
});

/* -------------------------
   DELETE NOTE
------------------------- */
on("delete-note-button", "click", () => {
  const editing = noteEditorOverlay.dataset.editing;
  if (editing !== "new") notes.splice(editing, 1);

  saveNotes();
  renderNotes();

  noteEditorOverlay.classList.remove("is-visible");
  appRoot.style.display = "flex";
});

/* -------------------------
   PIN / UNPIN NOTE
------------------------- */
pinNoteButton.addEventListener("click", () => {
  const next = pinNoteButton.dataset.pinned !== "true";
  pinNoteButton.dataset.pinned = next ? "true" : "false";
  pinNoteButton.textContent = next ? "unpin" : "pin";
});

/* -------------------------
   NOTE TOOLBAR (BOLD, ITALIC, H1, ETC.)
------------------------- */
document.querySelectorAll(".toolbar-button").forEach(btn => {
  btn.addEventListener("click", () => {
    const command = btn.dataset.command;
    const value = btn.dataset.value || null;

    if (btn.dataset.checklist === "true") {
      document.execCommand("insertUnorderedList");
      return;
    }

    document.execCommand(command, false, value);
  });
});
/* =========================================================
   SECTION 5 — TIMER + STATS
   ========================================================= */

/* -------------------------
   GET CUSTOM TIME
------------------------- */
/**
 * Reads hours + minutes inputs and converts to seconds.
 * If user enters 0, defaults to 25 minutes (1500 seconds).
 */
function getCustomTime() {
  const h = parseInt(hourInput.value || "0", 10);
  const m = parseInt(minuteInput.value || "0", 10);

  const seconds = h * 3600 + m * 60;
  return seconds > 0 ? seconds : 1500;
}

/* -------------------------
   UPDATE TIMER DISPLAY
------------------------- */
function updateTimerDisplay() {
  const m = Math.floor(remainingSeconds / 60);
  const s = remainingSeconds % 60;

  timerDisplay.textContent =
    `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* -------------------------
   TIMER RING ANIMATION
------------------------- */
const ring = document.querySelector(".timer-ring-progress");
const radius = 70;
const circumference = 2 * Math.PI * radius;

if (ring) {
  ring.style.strokeDasharray = circumference;
  ring.style.strokeDashoffset = 0;
}

function updateRing() {
  if (!ring) return;
  ring.style.strokeDashoffset =
    circumference * (1 - remainingSeconds / totalSeconds);
}

/* -------------------------
   SAVE + RENDER STATS
------------------------- */
function savePomodoroStats() {
  localStorage.setItem("aura-pomodoro-stats", JSON.stringify(pomodoroStats));
}

function renderPomodoroStats() {
  pomodoroStatsSessions.textContent = `sessions: ${pomodoroStats.sessions}`;
  const minutes = Math.round(pomodoroStats.seconds / 60);
  pomodoroStatsTime.textContent = `focused time: ${minutes} min`;
}

/* -------------------------
   START / PAUSE TIMER
------------------------- */
on("pomodoro-toggle", "click", () => {
  const btn = document.getElementById("pomodoro-toggle");

  /* Pause timer */
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    btn.textContent = "start";
    return;
  }

  /* Start timer */
  totalSeconds = getCustomTime();
  remainingSeconds = totalSeconds;

  updateTimerDisplay();
  updateRing();

  timerInterval = setInterval(() => {
    remainingSeconds--;

    /* Timer finished */
    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      updateTimerDisplay();
      updateRing();

      clearInterval(timerInterval);
      timerInterval = null;
      btn.textContent = "start";

      /* Update stats */
      pomodoroStats.sessions += 1;
      pomodoroStats.seconds += totalSeconds;
      savePomodoroStats();
      renderPomodoroStats();

      return;
    }

    updateTimerDisplay();
    updateRing();
  }, 1000);

  btn.textContent = "pause";
});

/* -------------------------
   RESET TIMER
------------------------- */
on("pomodoro-reset", "click", () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  totalSeconds = getCustomTime();
  remainingSeconds = totalSeconds;

  updateTimerDisplay();
  updateRing();

  document.getElementById("pomodoro-toggle").textContent = "start";
});
/* =========================================================
   SECTION 6 — SETTINGS (CHANGE NAME + THEME TOGGLE)
   ========================================================= */

/* -------------------------
   CHANGE NAME
------------------------- */
on("settings-change-name", "click", () => {
  const newName = prompt("what should i call you?");
  if (!newName) return;

  userName = newName.trim();
  const greet = document.getElementById("home-greeting");
  if (greet) greet.textContent = `hello, ${userName}`;
});

/* -------------------------
   THEME TOGGLE (LIGHT / DARK)
------------------------- */
on("settings-theme-toggle", "click", () => {
  const html = document.documentElement;

  if (html.dataset.theme === "dark") {
    html.dataset.theme = "light";
    localStorage.setItem("aura-theme", "light");
  } else {
    html.dataset.theme = "dark";
    localStorage.setItem("aura-theme", "dark");
  }
});

/* -------------------------
   LOAD SAVED THEME
------------------------- */
(function loadTheme() {
  const saved = localStorage.getItem("aura-theme");
  if (saved) document.documentElement.dataset.theme = saved;
})();
/* =========================================================
   SECTION 7 — INITIALIZATION + FIRST RENDER
   ========================================================= */

/* -------------------------
   INITIAL LOAD
------------------------- */

/**
 * Loads everything when the app starts.
 * If onboarding hasn't been completed, show onboarding.
 */
function initApp() {
  // If onboarding screen exists, show it first
  if (onboardingScreen) {
    onboardingScreen.style.display = "flex";
    appRoot.style.display = "none";
  }

  // Load theme
  const savedTheme = localStorage.getItem("aura-theme");
  if (savedTheme) {
    document.documentElement.dataset.theme = savedTheme;
  }

  // Render all UI components
  renderTodos();
  renderDecks();
  renderNotes();
  renderPomodoroStats();
  updateTimerDisplay();
  updateRing();
}

/* Run app */
initApp();
