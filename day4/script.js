const noteText = document.getElementById("noteText");
const charCount = document.getElementById("charCount");
const wordCount = document.getElementById("wordCount");
const clearBtn = document.getElementById("clearBtn");
const themeBtn = document.getElementById("themeBtn");
const form = document.getElementById("note-form");
const list = document.getElementById("notes-list");
const noteCountEl = document.getElementById("note-count");

const DRAFT_KEY = "draft";
const THEME_KEY = "theme";
const NOTES_KEY = "quicknotes";

function updateCounts() {
  const text = noteText.value;
  const len = text.length;

  // REQUIRED FORMAT
  charCount.textContent = `${len} / 200 characters`;
  const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  wordCount.textContent = `${words} words`;

  // REQUIRED: add warning/over classes to charCount itself
  charCount.classList.remove("warning", "over");
  if (len >= 200) {
    charCount.classList.add("over");
  } else if (len >= 160) {
    charCount.classList.add("warning");
  }

  localStorage.setItem(DRAFT_KEY, text);
}

function loadNotes() {
  const saved = localStorage.getItem(NOTES_KEY);
  return saved ? JSON.parse(saved) : [];
}
function saveNotes(notes) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}
function renderNotes() {
  const notes = loadNotes();
  list.innerHTML = "";
  notes.forEach((t, i) => {
    const li = document.createElement("li");
    li.innerHTML = `${t} <button onclick="deleteNote(${i})">Delete</button>`;
    list.appendChild(li);
  });
  noteCountEl.textContent = `You have ${notes.length} notes`;
}
window.deleteNote = (i) => {
  const notes = loadNotes();
  notes.splice(i, 1);
  saveNotes(notes);
  renderNotes();
};

noteText.addEventListener("input", updateCounts);

clearBtn.addEventListener("click", () => {
  noteText.value = "";
  localStorage.removeItem(DRAFT_KEY);
  updateCounts();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") clearBtn.click();
});

themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  themeBtn.textContent = isDark ? "Light Mode" : "Dark Mode";
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const val = noteText.value.trim();
  if (!val) return;
  const notes = loadNotes();
  notes.push(val);
  saveNotes(notes);
  noteText.value = "";
  localStorage.removeItem(DRAFT_KEY);
  updateCounts();
  renderNotes();
});

// On load restore draft + theme
window.addEventListener("DOMContentLoaded", () => {
  const draft = localStorage.getItem(DRAFT_KEY);
  if (draft) noteText.value = draft;
  const theme = localStorage.getItem(THEME_KEY);
  if (theme === "dark") {
    document.body.classList.add("dark");
    themeBtn.textContent = "Light Mode";
  }
  updateCounts();
  renderNotes();
});