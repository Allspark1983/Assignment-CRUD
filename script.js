"use strict";

/*
 * STUDY TASK TRACKER - FRONTEND ASSESSMENT COMMENTS
 * Based on the marking areas in Agile assignments.pdf.
 * Follow the app in this order: user event -> API request -> tasks array -> HTML.
 * The REQUIREMENT comments identify evidence to explain, not guaranteed marks.
 * HTML and CSS provide the interface; this file uses vanilla JavaScript only.
 */

// 1. REQUIREMENT: DOM selection and manipulation.
// querySelector finds an HTML element. # selects its unique ID.
// These variables let later functions read inputs and change the page.
const taskForm = document.querySelector("#task-form");
const titleInput = document.querySelector("#task-title");
const saveButton = document.querySelector("#save-button");
const cancelButton = document.querySelector("#cancel-button");
const refreshButton = document.querySelector("#refresh-button");
const formHeading = document.querySelector("#form-heading");
const taskList = document.querySelector("#task-list");
const message = document.querySelector("#message");
const apiStatus = document.querySelector("#api-status");
const emptyState = document.querySelector("#empty-state");
const deleteDialog = document.querySelector("#delete-dialog");
const deleteTaskTitle = document.querySelector("#delete-task-title");

// REQUIREMENT: at least one ARRAY and one OBJECT.
// tasks is an array. Each saved task is an object with id, title and completed.
// Example only: { id: "example-id", title: "Revise HTML", completed: false }.
// This array is the browser's working copy; the server saves the records.
// API_URL names the task collection. Adding /id selects one task.
const API_URL = "/api/tasks";
let tasks = [];
// null means we are adding; a saved task ID means we are editing.
let editingId = null;
// These boolean flags track a request in progress and the first successful load.
let busy = false;
let hasLoaded = false;

// 2. REQUIREMENT: custom functions and structured programming.
// Each function has one clear job and is called when needed.
// DOM evidence: textContent changes a message; className changes its styling.
function showMessage(text, type = "info") {
  message.textContent = text;
  message.className = `message ${type}`;
}
// DOM evidence: disabled changes whether the form button can be used.
// Along with textContent and titleInput.value in startEditing(), this shows
// three different properties across at least two DOM elements.
// || means OR; ! means NOT. Block input while loading or before the first load.
function setBusy(value) {
  busy = value;
  titleInput.disabled = value || !hasLoaded;
  saveButton.disabled = value || !hasLoaded;
  cancelButton.disabled = value;
  refreshButton.disabled = value;
  taskList.setAttribute("aria-busy", String(value));
  for (const button of taskList.querySelectorAll("button")) button.disabled = value;
}

// 3. REQUIREMENT: asynchronous calls, JSON, and AJAX GET plus a write request.
// fetch sends a real HTTP request to server.js without reloading the webpage.
// async/await waits for the response in this function without freezing the page.
// One helper is reused for GET, POST, PATCH and DELETE.
async function requestTasks(path = "", method = "GET", data) {
  // Stop waiting after 10 seconds so a failed connection does not leave controls busy forever.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const options = { method, headers: { Accept: "application/json" }, signal: controller.signal };
  if (data !== undefined) {
    options.headers["Content-Type"] = "application/json";
    // Convert a JavaScript object into JSON text for POST or PATCH.
    options.body = JSON.stringify(data);
  }
  try {
    const response = await fetch(API_URL + path, options);
    if (response.status !== 204 && !response.headers.get("content-type")?.includes("application/json")) {
      throw new Error("API not found. Run npm start and open port 3000, not Live Server or GitHub Pages.");
    }
    // response.json() reads JSON response text into JavaScript data.
    // Our DELETE returns 204 No Content, so there is no JSON body to read.
    const body = response.status === 204 ? null : await response.json();
    // fetch can receive an HTTP error response; check ok before treating it as success.
    if (!response.ok) throw new Error(body?.error || `Request failed (${response.status}).`);
    apiStatus.textContent = "API connected";
    apiStatus.className = "connection online";
    return body;
  } catch (error) {
    apiStatus.textContent = "Request failed";
    apiStatus.className = "connection offline";
    if (error.name === "AbortError" || error instanceof TypeError) {
      throw new Error("Could not reach the API. Check that npm start is running. Reload tasks to check whether your last change was saved before retrying.");
    }
    throw error;
  } finally {
    // finally runs on success or failure: always clear the timer.
    clearTimeout(timeout);
  }
}
// CRUD - CREATE: POST /api/tasks sends a new task object to the server.
function createTask(task) { return requestTasks("", "POST", task); }
// CRUD - UPDATE: PATCH /api/tasks/:id changes only the supplied fields.
function updateTask(id, changes) { return requestTasks(`/${encodeURIComponent(id)}`, "PATCH", changes); }
// CRUD - DELETE: DELETE /api/tasks/:id removes one saved record.
function deleteTask(id) { return requestTasks(`/${encodeURIComponent(id)}`, "DELETE"); }
// CRUD - READ: GET /api/tasks fetches every saved task as a JSON array.
async function loadTasks() {
  const data = await requestTasks(); // GET /api/tasks
  if (!Array.isArray(data)) throw new Error("The API did not return a task array.");
  tasks = data;
  hasLoaded = true;
  renderTasks();
}

// 4. REQUIREMENT: display all created records using DOM manipulation.
// Rendering means drawing the current task array on the page, not saving it.
// makeButton returns a new HTML button for renderTasks() to attach.
function makeButton(label, action, className) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.className = `button small ${className}`;
  button.dataset.action = action;
  button.disabled = busy;
  return button;
}
function renderTasks() {
  // Clear only the displayed list before rebuilding it; saved tasks are not deleted.
  taskList.replaceChildren();
  let completed = 0;
  // REQUIREMENT: loop and branching. Visit each task and count completed ones.
  for (const task of tasks) {
    if (task.completed) completed++;
    const item = document.createElement("li");
    item.className = task.completed ? "task-card is-completed" : "task-card";
    // Keep the record ID on the list item so clicks can find the correct task.
    item.dataset.id = task.id;
    const top = document.createElement("div");
    top.className = "task-top";
    const title = document.createElement("h3");
    title.className = "task-title";
    title.textContent = task.title; // Display user text safely, not as HTML.
    const status = document.createElement("span");
    status.className = "task-status";
    status.textContent = task.completed ? "Completed" : "Pending";
    top.append(title, status);
    const actions = document.createElement("div");
    actions.className = "task-actions";
    actions.append(
      makeButton(task.completed ? "Mark pending" : "Mark completed", "toggle", "toggle-button"),
      makeButton("Edit", "edit", "secondary"),
      makeButton("Delete", "delete", "danger")
    );
    item.append(top, actions);
    // appendChild attaches the finished task card to the visible list.
    taskList.appendChild(item);
  }
  // UI/UX: update all three counters so students can see their progress.
  document.querySelector("#total-count").textContent = tasks.length;
  document.querySelector("#completed-count").textContent = completed;
  document.querySelector("#pending-count").textContent = tasks.length - completed;
  emptyState.hidden = tasks.length > 0;
  document.querySelector("#empty-heading").textContent = "A fresh start.";
  document.querySelector("#empty-description").textContent = "Add your first study task using the form.";
}

// 5. REQUIREMENT: structured functions and creating/updating a resource.
// readTaskForm returns an OBJECT, rather than saving anything itself.
// trim removes spaces at the start/end; a new task starts as incomplete.
function readTaskForm() {
  return { title: titleInput.value.trim(), completed: false };
}
// Return the form to Add mode after saving or cancelling an edit.
function resetForm() {
  editingId = null;
  taskForm.reset();
  formHeading.textContent = "Add a study task";
  saveButton.textContent = "Add task";
  cancelButton.hidden = true;
}
// CRUD - UPDATE preparation: copy the selected task title into the same form.
// DOM evidence: assigning value changes the input; no API write happens yet.
function startEditing(task) {
  editingId = task.id;
  titleInput.value = task.title;
  formHeading.textContent = "Edit your task";
  saveButton.textContent = "Save changes";
  cancelButton.hidden = false;
  showMessage("Edit the task name, then choose Save changes.");
  titleInput.focus();
}

// 6. REQUIREMENT: event handler 1 - the form's submit event.
// This runs when the user clicks Add task / Save changes or presses Enter.
taskForm.addEventListener("submit", async (event) => {
  // Prevent normal form navigation; our asynchronous JavaScript handles the save.
  event.preventDefault();
  if (busy) return;
  // REQUIREMENT: comparison (===) and branching (if). Reject spaces-only titles.
  if (titleInput.value.trim().length === 0) {
    showMessage("Please enter a task name, not just spaces.", "error");
    titleInput.focus();
    return;
  }
  setBusy(true);
  const isEditing = editingId !== null;
  try {
    if (isEditing) {
      const saved = await updateTask(editingId, { title: titleInput.value.trim() });
      // map replaces the matching object with the server response; other tasks stay the same.
      tasks = tasks.map((task) => task.id === saved.id ? saved : task);
    } else {
      // REQUIREMENT: one function's return value becomes another function's argument.
      // readTaskForm() returns the object; createTask(...) receives and sends it.
      const saved = await createTask(readTaskForm());
      // Add the saved object to the front of the array only after POST succeeds.
      tasks.unshift(saved);
    }
    resetForm();
    renderTasks();
    showMessage(isEditing ? "Task updated." : "Task added. You have a plan!", "success");
  } catch (error) {
    showMessage(error.message, "error"); // Preserve the user's text for a retry.
  } finally {
    setBusy(false);
    titleInput.focus();
  }
});

// 7. UI/UX: confirm destructive actions in the app's own dialog.
// This Promise resolves to true only when the dialog returns "delete".
// Opening the dialog is not an API call and does not remove the task.
function confirmTaskDeletion(task) {
  return new Promise((resolve) => {
    deleteTaskTitle.textContent = task.title;
    deleteDialog.returnValue = "cancel"; // Escape must never reuse an earlier approval.
    deleteDialog.addEventListener("close", () => {
      resolve(deleteDialog.returnValue === "delete");
    }, { once: true });
    deleteDialog.showModal(); // Keeps focus inside the dialog; Cancel is focused first.
  });
}

// 8. REQUIREMENT: event handler 2 - clicks on the task list.
// Event delegation: the parent list handles clicks from buttons created later.
// data-action says which action to take; data-id identifies the saved record.
taskList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button || busy) return;
  const id = button.closest("li").dataset.id;
  const task = tasks.find((item) => item.id === id);
  if (!task) return;
  const action = button.dataset.action;
  if (action === "edit") { startEditing(task); return; }
  setBusy(true);
  try {
    if (action === "toggle") {
      // PATCH toggles the boolean: marking completed is an UPDATE, not a DELETE.
      const saved = await updateTask(id, { completed: !task.completed });
      tasks = tasks.map((item) => item.id === id ? saved : item);
      showMessage(saved.completed ? "Task completed. Nice work!" : "Task marked as pending.", "success");
    } else if (action === "delete") {
      const confirmed = await confirmTaskDeletion(task);
      if (!confirmed) return; // Cancel or Escape: do not send a DELETE request.
      await deleteTask(id);
      // After server success, filter creates an array without the deleted task.
      tasks = tasks.filter((item) => item.id !== id);
      if (editingId === id) resetForm();
      showMessage("Task deleted.", "success");
    }
    renderTasks();
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    setBusy(false);
    const row = [...taskList.children].find((item) => item.dataset.id === id);
    if (row) row.querySelector(`button[data-action="${action}"]`).focus();
    else titleInput.focus();
  }
});
// Extra event handler: cancel editing locally without changing the saved record.
cancelButton.addEventListener("click", () => {
  resetForm();
  showMessage("Edit cancelled. Your saved task was not changed.");
  titleInput.focus();
});
// 9. READ again on page load or Reload tasks.
// Fetch the saved records, redraw the list, and show success or an error.
// This demonstrates persistence by reading the server again, not localStorage.
async function refreshTasks() {
  if (busy) return;
  setBusy(true);
  showMessage("Loading your tasks…");
  try {
    await loadTasks();
    if (editingId !== null && !tasks.some((task) => task.id === editingId)) resetForm();
    showMessage("Tasks loaded from the REST API.", "success");
  } catch (error) {
    showMessage(error.message, "error");
    if (!hasLoaded) {
      document.querySelector("#empty-heading").textContent = "The API is not available yet.";
      document.querySelector("#empty-description").textContent = "Run npm start, open port 3000, then choose Reload tasks.";
    }
  } finally { setBusy(false); }
}
// Pass the function to the click listener; do not call it until the button is clicked.
refreshButton.addEventListener("click", refreshTasks);
refreshTasks(); // Initial asynchronous GET when the page opens.
