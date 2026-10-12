// DOM SELECTION: connect JavaScript to the HTML elements.
const form = document.querySelector("#task-form");
const input = document.querySelector("#task-input");
const list = document.querySelector("#task-list");
const template = document.querySelector("#task-template");
const counter = document.querySelector("#counter");
const emptyState = document.querySelector("#empty-state");
const message = document.querySelector("#message");
const saveButton = document.querySelector("#save-button");
const cancelButton = document.querySelector("#cancel-button");
const exampleButton = document.querySelector("#example-button");

// ARRAY of OBJECTS: each task has an id, title and completed property.
let tasks = [];
let editingId = null; // null means we are adding, not editing.
let busy = false;
let loaded = false; // Do not change an incomplete list if the first GET fails.

// Display feedback on the page instead of using alert() pop-ups.
function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}

// Prevent double submissions while waiting for the server.
function setBusy(value) {
  busy = value;
  document.querySelectorAll("button, input").forEach(element => {
    element.disabled = value;
  });
}

// Custom function: return one HTML row representing a task OBJECT.
function createTaskElement(task) {
  const row = template.content.firstElementChild.cloneNode(true);
  row.dataset.id = task.id;
  // textContent displays user input as text, never as executable HTML.
  row.querySelector(".task-title").textContent = task.title;
  row.querySelector("input").checked = task.completed;
  row.classList.toggle("done", task.completed);
  row.querySelector("[data-action='edit']").setAttribute("aria-label", `Edit ${task.title}`);
  row.querySelector("[data-action='delete']").setAttribute("aria-label", `Delete ${task.title}`);
  return row;
}

// READ + LOOP: display every task and update the completed-task counter.
function renderList() {
  list.replaceChildren();
  tasks.forEach(task => {
    // CRITERION: one function's return value is another function's argument.
    list.appendChild(createTaskElement(task));
  });
  counter.textContent = `${tasks.filter(task => task.completed).length} of ${tasks.length} completed`;
  emptyState.hidden = tasks.length !== 0;
}

// ASYNC/AJAX: one reusable function handles all four REST API operations.
async function syncTasks(method = "GET", id = "", data) {
  if (busy) return false;
  if (method !== "GET" && !loaded) {
    showMessage("Refresh the page to load your tasks before making changes.", true);
    return false;
  }
  setBusy(true);
  showMessage("Working...");
  try {
    const response = await fetch(`/api/tasks${id ? "/" + id : ""}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data) // undefined means GET/DELETE have no body.
    });
    // DELETE returns 204 (no body); other responses contain JSON.
    const result = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new Error(result?.error || "The request failed.");

    // BRANCHING: update the array only after the API confirms success.
    if (method === "GET") { tasks = result; loaded = true; }
    if (method === "POST") tasks.push(result);
    if (method === "PATCH") tasks = tasks.map(task => task.id === id ? result : task);
    if (method === "DELETE") tasks = tasks.filter(task => task.id !== id);
    renderList();
    showMessage(method === "GET" ? "" : "Changes saved.");
    return true;
  } catch (error) {
    // Restore checkboxes after a failed update; do not pretend it was saved.
    if (method !== "GET") renderList();
    else counter.textContent = "Not loaded";
    showMessage(`Could not ${method === "GET" ? "load" : "save"} tasks. ${error.message} Check the server and try again.`, true);
    return false;
  } finally {
    setBusy(false); // Re-enable controls whether the request passes or fails.
  }
}

// Leave edit mode and prepare the same form to create another task.
function resetForm() {
  editingId = null;
  form.reset();
  saveButton.textContent = "Add task";
  cancelButton.hidden = true;
  exampleButton.hidden = false;
  input.focus();
}

// EVENT 1 - submit: CREATE with POST, or UPDATE the title with PATCH.
form.addEventListener("submit", async event => {
  event.preventDefault(); // Stop the browser refreshing the whole page.
  const title = input.value.trim();
  if (!title || title.length > 120) {
    showMessage("Enter a task between 1 and 120 characters.", true);
    return;
  }
  const method = editingId === null ? "POST" : "PATCH";
  if (await syncTasks(method, editingId || "", { title })) resetForm();
});

// EVENT 2 - click: handle Edit and Delete buttons through their parent list.
list.addEventListener("click", async event => {
  const button = event.target.closest("button");
  if (!button || busy) return;
  const id = button.closest("li").dataset.id;
  const task = tasks.find(task => task.id === id);
  if (button.dataset.action === "edit") {
    editingId = id;
    input.value = task.title;
    saveButton.textContent = "Save task";
    cancelButton.hidden = false;
    exampleButton.hidden = true;
    showMessage("Editing task. Change the text above and save.");
    input.focus();
  } else {
    // DELETE: remove a task on the server, then from the displayed array.
    if (await syncTasks("DELETE", id)) {
      if (editingId === id) resetForm();
      input.focus();
    }
  }
});

// EVENT 3 - change: UPDATE completion when a checkbox is ticked/unticked.
list.addEventListener("change", async event => {
  if (!event.target.matches("input[type='checkbox']")) return;
  const id = event.target.closest("li").dataset.id;
  await syncTasks("PATCH", id, { completed: event.target.checked });
  list.querySelector(`[data-id="${id}"] input`)?.focus();
});

cancelButton.addEventListener("click", () => {
  resetForm();
  showMessage("Edit cancelled.");
});

// External REST API / JSON example. Only sample data is fetched from DummyJSON.
// The user's real tasks are NOT sent there; our own server persists their CRUD.
exampleButton.addEventListener("click", async () => {
  if (input.value.trim()) return showMessage("Clear the task box first to load an example.", true);
  setBusy(true);
  showMessage("Loading an example...");
  try {
    const response = await fetch("https://dummyjson.com/todos/random", {
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error("Example unavailable.");
    const example = await response.json();
    if (typeof example.todo !== "string") throw new Error("Invalid example.");
    input.value = example.todo.slice(0, 120);
    showMessage("Example loaded. You can edit it before adding.");
  } catch {
    showMessage("Example unavailable. You can still type your own task.", true);
  } finally {
    setBusy(false);
    input.focus();
  }
});

// Initial GET: fetch the saved JSON array when the page opens.
syncTasks();
