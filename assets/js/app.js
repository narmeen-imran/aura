// --- UTILITIES ---
const $ = id => document.getElementById(id);
const on = (id, evt, fn) => {
  const el = $(id);
  if (el) el.addEventListener(evt, fn);
};

// --- STATE MANAGEMENT ---
let userName = localStorage.getItem("aura-username") || "";
let userAge = localStorage.getItem("aura-age") || "";
let userPurposes = JSON.parse(localStorage.getItem("aura-purposes") || "[]");
let todos = JSON.parse(localStorage.getItem("aura-todos") || "[]");
let decks = JSON.parse(localStorage.getItem("aura-decks") || "{}");
let notes = JSON.parse(localStorage.getItem("aura-notes") || "[]");
let pomodoroStats = JSON.parse(localStorage.getItem("aura-pomodoro-stats") || '{"sessions":0,"seconds":0}');

let currentDeck = null;
let currentCardIndex = 0;
let currentNoteId = null;
let currentAction = null; // Track Global Modal purpose

// --- SPLASH SCREEN ---
window.addEventListener('load', () => {
  setTimeout(() => {
    const splash = $('splash-screen');
    if (splash) {
      splash.classList.add('fade-out');
      setTimeout(() => splash.style.display = 'none', 500);
    }
    initApp();
  }, 1500);
});

// --- NAVIGATION ---
function showScreen(name) {
  document.querySelectorAll(".aura-screen").forEach(s => s.classList.remove("is-active"));
  const target = document.querySelector(`[data-screen="${name}"]`);
  if (target) target.classList.add("is-active");

  document.querySelectorAll(".bottom-nav-item").forEach(btn => {
    btn.classList.toggle("is-active", btn.dataset.screenTarget === name);
  });
}

document.querySelectorAll(".bottom-nav-item").forEach(btn => {
  btn.addEventListener("click", () => showScreen(btn.dataset.screenTarget));
});

// --- GLOBAL INPUT MODAL (Replaces Prompts) ---
function openGlobalModal(title, placeholder, actionType) {
  $("global-modal-title").textContent = title;
  $("global-modal-input").placeholder = placeholder;
  $("global-modal-input").value = "";
  currentAction = actionType;
  $("global-modal").classList.add("is-visible");
  $("global-modal-input").focus();
}

on("global-modal-save", "click", () => {
  const val = $("global-modal-input").value.trim();
  if (!val) return;

  if (currentAction === "task") {
    todos.push(val);
    saveAndRenderTodos();
  } else if (currentAction === "name") {
    userName = val;
    localStorage.setItem("aura-username", val);
    $("home-greeting").textContent = `hello, ${val}`;
  } else if (currentAction === "deck") {
    if (decks[val]) return alert("exists");
    decks[val] = [];
    saveDecks(); renderDecks();
  } else if (currentAction === "rename-deck") {
    decks[val] = decks[currentDeck];
    delete decks[currentDeck];
    currentDeck = val;
    saveDecks(); renderDecks();
    $("deck-viewer-title").textContent = val;
  }
  $("global-modal").classList.remove("is-visible");
});

on("global-modal-cancel", "click", () => $("global-modal").classList.remove("is-visible"));

// --- TODOS ---
on("todo-add-button", "click", () => openGlobalModal("new task", "what's the goal?", "task"));

function saveAndRenderTodos() {
  localStorage.setItem("aura-todos", JSON.stringify(todos));
  const list = $("todo-list");
  list.innerHTML = "";
  todos.forEach((t, i) => {
    const li = document.createElement("li");
    li.className = "todo-item";
    li.innerHTML = `<span>${t}</span><button onclick="deleteTodo(${i})">×</button>`;
    list.appendChild(li);
  });
}
window.deleteTodo = i => { todos.splice(i, 1); saveAndRenderTodos(); };

// --- FLASHCARDS ---
on("add-deck-button", "click", () => openGlobalModal("new deck", "deck name", "deck"));
on("rename-deck-button", "click", () => openGlobalModal("rename deck", "new name", "rename-deck"));

function saveDecks() { localStorage.setItem("aura-decks", JSON.stringify(decks)); }

function renderDecks() {
  const grid = $("deck-grid");
  grid.innerHTML = "";
  Object.keys(decks).forEach(d => {
    const card = document.createElement("div");
    card.className = "deck-card";
    card.textContent = d;
    card.onclick = () => {
      currentDeck = d;
      currentCardIndex = 0;
      $("deck-viewer-title").textContent = d;
      renderFlashcard();
      showScreen("flashcard-viewer");
    };
    grid.appendChild(card);
  });
}

function renderFlashcard() {
  const deck = decks[currentDeck];
  const card = $("flashcard");
  card.classList.remove("is-flipped");
  if (!deck || deck.length === 0) {
    $("flashcard-front").textContent = "no cards yet";
    $("flashcard-back").textContent = "add one below";
    $("flashcard-progress").textContent = "0 / 0";
    return;
  }
  $("flashcard-front").textContent = deck[currentCardIndex].f;
  $("flashcard-back").textContent = deck[currentCardIndex].b;
  $("flashcard-progress").textContent = `${currentCardIndex + 1} / ${deck.length}`;
}

on("flashcard-flip", "click", () => $("flashcard").classList.toggle("is-flipped"));
on("flashcard-next", "click", () => {
  if (currentCardIndex < decks[currentDeck].length - 1) {
    currentCardIndex++; renderFlashcard();
  }
});
on("flashcard-prev", "click", () => {
  if (currentCardIndex > 0) {
    currentCardIndex--; renderFlashcard();
  }
});

on("add-card-button", "click", () => {
  $("flashcard-modal-title").textContent = "new card";
  $("flashcard-front-input").value = "";
  $("flashcard-back-input").value = "";
  $("flashcard-modal").classList.add("is-visible");
});

on("flashcard-modal-save", "click", () => {
  const f = $("flashcard-front-input").value;
  const b = $("flashcard-back-input").value;
  if (!f || !b) return;
  decks[currentDeck].push({f, b});
  saveDecks(); renderFlashcard();
  $("flashcard-modal").classList.remove("is-visible");
});

on("flashcard-modal-cancel", "click", () => $("flashcard-modal").classList.remove("is-visible"));

// --- NOTES ---
on("add-note-button", "click", () => {
  currentNoteId = Date.now();
  $("note-editor-title-input").value = "";
  $("note-editor-content").innerHTML = "";
  $("note-editor-overlay").classList.add("is-active");
});

on("save-note-button", "click", () => {
  const title = $("note-editor-title-input").value || "untitled";
  const content = $("note-editor-content").innerHTML;
  const existingIndex = notes.findIndex(n => n.id === currentNoteId);
  const noteObj = { id: currentNoteId, title, content, updated: Date.now() };
  
  if (existingIndex > -1) notes[existingIndex] = noteObj;
  else notes.push(noteObj);
  
  localStorage.setItem("aura-notes", JSON.stringify(notes));
  renderNotes();
  $("note-editor-overlay").classList.remove("is-active");
});

on("close-note-editor", "click", () => $("note-editor-overlay").classList.remove("is-active"));

function renderNotes() {
  const list = $("notes-list");
  list.innerHTML = "";
  notes.forEach(n => {
    const el = document.createElement("div");
    el.className = "note-card";
    el.textContent = n.title;
    el.onclick = () => {
      currentNoteId = n.id;
      $("note-editor-title-input").value = n.title;
      $("note-editor-content").innerHTML = n.content;
      $("note-editor-overlay").classList.add("is-active");
    };
    list.appendChild(el);
  });
}

// --- TIMER ---
let timerInterval = null;
let secondsLeft = 1500;

on("pomodoro-toggle", "click", () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    $("pomodoro-toggle").textContent = "start";
  } else {
    timerInterval = setInterval(() => {
      secondsLeft--;
      updateTimerDisplay();
      if (secondsLeft <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        alert("time's up!");
      }
    }, 1000);
    $("pomodoro-toggle").textContent = "pause";
  }
});

on("pomodoro-reset", "click", () => {
  secondsLeft = ($("timer-minutes").value * 60) + ($("timer-hours").value * 3600);
  updateTimerDisplay();
});

function updateTimerDisplay() {
  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = secondsLeft % 60;
  $("pomodoro-time").textContent = `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// --- SETTINGS ---
on("settings-change-name", "click", () => openGlobalModal("change name", "new name", "name"));

on("settings-theme-toggle", "click", () => {
  const theme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("aura-theme", theme);
});

on("settings-reset-app", "click", () => {
  if (confirm("reset everything? this cannot be undone.")) {
    localStorage.clear();
    window.location.reload();
  }
});

// --- INITIALIZATION ---
function initApp() {
  if (localStorage.getItem("aura-theme")) {
    document.documentElement.setAttribute("data-theme", localStorage.getItem("aura-theme"));
  }
  
  if (!userName) {
    $("onboarding-screen").style.display = "flex";
    $("app-root").style.display = "none";
  } else {
    $("onboarding-screen").style.display = "none";
    $("app-root").style.display = "flex";
    $("home-greeting").textContent = `hello, ${userName}`;
    saveAndRenderTodos();
    renderDecks();
    renderNotes();
  }
}

// Onboarding Logic
on("onboarding-next-1", "click", () => {
  userName = $("onboarding-name-input").value;
  if (userName) {
    document.querySelector('[data-step="1"]').style.display = "none";
    document.querySelector('[data-step="2"]').style.display = "block";
  }
});

on("onboarding-next-2", "click", () => {
  userAge = $("onboarding-age-input").value;
  document.querySelector('[data-step="2"]').style.display = "none";
  document.querySelector('[data-step="3"]').style.display = "block";
});

on("onboarding-finish", "click", () => {
  localStorage.setItem("aura-username", userName);
  localStorage.setItem("aura-age", userAge);
  initApp();
});