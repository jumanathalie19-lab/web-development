const textInput = document.getElementById("note-input");
const charCount = document.getElementById("charCount");
const wordCount = document.getElementById("wordCount");
const warning = document.getElementById("warning");
const form = document.getElementById("note-form");
const list = document.getElementById("notes-list");
const noteCount = document.getElementById("note-count");
const clearBtn = document.getElementById("clearBtn");
const themeBtn = document.getElementById("themeBtn");
const msg = document.getElementById("char-limit-msg");

const DRAFT_KEY = "draft";
const THEME_KEY = "theme";
const NOTES_KEY = "quicknotes";

// Requirement 3: updateCounts() function
function updateCounts() {
  const text = textInput.value;
  charCount.textContent = text.length;
  
  const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  wordCount.textContent = words;

  if (text.length > 200) {
    warning.textContent = "Warning: Over 200 characters!";
  } else {
    warning.textContent = "";
  }
}

// Save draft + notes
function saveDraft() {
  localStorage.setItem(DRAFT_KEY, textInput.value);
}

function loadAndRenderNotes() {
  const saved = localStorage.getItem(NOTES_KEY);
  const notes = saved ? JSON.parse(saved) : [];
  list.innerHTML = "";
  notes.forEach((t, i) => {
    const li = document.createElement("li");
    li.innerHTML = `${t} <button onclick="deleteNote(${i})">Delete</button>`;
    list.appendChild(li);
  });
  noteCount.textContent = `You have ${notes.length} notes`;
  return notes;
}

let notes = loadAndRenderNotes();

window.deleteNote = (index) => {
  notes.splice(index, 1);
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  notes = loadAndRenderNotes();
}

// Requirement 4: input event -> updateCounts + save
textInput.addEventListener("input", () => {
  updateCounts();
  saveDraft();
});

// Requirement 6: Clear button
clearBtn.addEventListener("click", () => {
  textInput.value = "";
  localStorage.removeItem(DRAFT_KEY);
  updateCounts();
  msg.textContent = "Draft cleared.";
  setTimeout(() => msg.textContent = "", 2000);
});

// Escape key clears too
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") clearBtn.click();
});

// Requirement 7: Theme toggle
themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  themeBtn.textContent = isDark ? "Light Mode" : "Dark Mode";
});

// Add note (your old QuickNotes logic)
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const val = textInput.value.trim();
  if (!val) return;
  notes.push(val);
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  textInput.value = "";
  localStorage.removeItem(DRAFT_KEY);
  updateCounts();
  notes = loadAndRenderNotes();
});

// Requirement 5: On load restore draft + theme
window.addEventListener("DOMContentLoaded", () => {
  const draft = localStorage.getItem(DRAFT_KEY);
  if (draft) textInput.value = draft;

  const theme = localStorage.getItem(THEME_KEY);
  if (theme === "dark") {
    document.body.classList.add("dark");
    themeBtn.textContent = "Light Mode";
  }
  updateCounts();
});