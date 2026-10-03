let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

// 2. searchNotes using filter, toLowerCase and includes
function searchNotes(word) {
  return notes.filter(note => note.text.toLowerCase().includes(word.toLowerCase().trim()));
}

// 3. longestNote. Handle empty array first, then compare lengths
function longestNote() {
  if (notes.length === 0) return null;
  let longest = notes[0];
  for (let note of notes) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }
  return longest;
}

// 4. countByCategory by looping and increasing counter in an object
function countByCategory() {
  const counts = {};
  for (let note of notes) {
    counts[note.category] = (counts[note.category] || 0) + 1;
  }
  return counts;
}

// 5. getSummary using countByCategory and template literal. Use "note" for exactly one note and "notes" otherwise.
function getSummary() {
  const counts = countByCategory();
  const total = notes.length;
  if (total === 0) return "0 notes";
  const parts = Object.entries(counts).map(([cat, num]) => `${num} ${cat}`);
  const label = total === 1? "note" : "notes";
  return `${total} ${label}: ${parts.join(", ")}.`;
}

// 6. isDuplicate using some, comparing trimmed lower-case text
function isDuplicate(text) {
  const cleaned = text.trim().toLowerCase();
  return notes.some(note => note.text.trim().toLowerCase() === cleaned);
}

// 7. addNote, calling isDuplicate and checking length and category before adding
function addNote(text, category) {
  const validCategories = ["personal", "work", "study"];
  const cleaned = text.trim();

  if (cleaned.length < 1 || cleaned.length > 200) {
    console.log("Note rejected: must be 1-200 characters");
    return false;
  }
  if (!validCategories.includes(category)) {
    console.log("Note rejected: category must be personal, work or study");
    return false;
  }
  if (isDuplicate(text)) {
    console.log("Note rejected: duplicate note");
    return false;
  }

  const newId = notes.length > 0? Math.max(...notes.map(n => n.id)) + 1 : 1;
  notes.push({ id: newId, text: cleaned, category: category });
  return true;
}

// 8. Test every function with at least two console.log calls (one normal case and one edge case, such as a search with no results)

console.log(searchNotes("project")); // Expected: [{ id: 3, text: "Email the project report to Grace", category: "work" }]
console.log(searchNotes("xyz")); // Expected: [] - edge case no results
console.log(searchNotes("MUM")); // Expected: [{ id: 5, text: "Call mum", category: "personal" }] - case insensitive

console.log(longestNote()); // Expected: { id: 3, text: "Email the project report to Grace", category: "work" }
console.log((() => { const backup = notes; notes = []; const result = longestNote(); notes = backup; return result; })()); // Expected: null - edge case empty array

console.log(countByCategory()); // Expected: { personal: 2, study: 2, work: 1 }
console.log(countByCategory().personal); // Expected: 2

console.log(getSummary()); // Expected: "5 notes: 2 personal, 2 study, 1 work."
console.log((() => { const backup = notes; notes = [{ id: 1, text: "Test", category: "personal" }]; const result = getSummary(); notes = backup; return result; })()); // Expected: "1 note: 1 personal." - edge case singular

console.log(isDuplicate("Buy milk and bread")); // Expected: true
console.log(isDuplicate(" BUY milk and BREAD ")); // Expected: true - edge case ignores case and spaces
console.log(isDuplicate("New task")); // Expected: false

console.log(addNote("Learn React", "study")); // Expected: true - normal add, logs added
console.log(addNote("Buy milk and bread", "personal")); // Expected: false - edge case duplicate
console.log(addNote("", "work")); // Expected: false - edge case too short
console.log(addNote("Go hiking", "health")); // Expected: false - edge case invalid category

