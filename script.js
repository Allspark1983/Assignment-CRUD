"use strict";

/*
 * STUDY TASK TRACKER - HOW THE FRONTEND WORKS
 * User action -> event handler -> REST API -> task array -> updated HTML.
 * This is vanilla JavaScript: no frontend framework is used.
 * Assessment comments refer to Agile assignments.pdf, not guaranteed marks.
 */

// 1. FIND THE HTML ELEMENTS
// querySelector uses # to find an element by its ID so we can read/change it.
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

// 2. KEEP TRACK OF THE CURRENT STATE
const API_URL = "/api/tasks"; // Address of our task collection on server.js.
let tasks = [];             // ARRAY of task OBJECTS: { id, title, completed }.
let editingId = null;       // null = adding; a task ID = editing that task.
let busy = false;           // true while a request or confirmation is in progress.
let hasLoaded = false;      // Becomes true after the first successful GET.

// 3. GIVE FEEDBACK TO THE USER

// Show a message and choose its info/success/error appearance.
// DOM requirement: textContent changes text; className selects CSS styling.
function showMessage(text, type = "info") {
  message.textContent = text;
  message.className = `message ${type}`;
}

// Disable controls while busy to reduce duplicate actions.
// || means OR and ! means NOT: also block entry until tasks have loaded.
// DOM evidence: disabled here, textContent above and value in startEditing()
// demonstrate three different properties across more than one element.
function setBusy(value) {
  busy = value;
  titleInput.disabled = value || !hasLoaded;
  saveButton.disabled = value || !hasLoaded;
  cancelButton.disabled = value;
  refreshButton.disabled = value;
  taskList.setAttribute("aria-busy", String(value));

  for (const button of taskList.querySelectorAll("button")) {
    button.disabled = value;
  }
}

// 4. COMMUNICATE WITH THE REST API

// Send an HTTP request and return the server's data, or throw an error.
// path chooses a task, method chooses an action, data is an optional object.
// Assessment: asynchronous AJAX requests using fetch, async/await and JSON.
async function requestTasks(path = "", method = "GET", data) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const options = {
    method,
    headers: { Accept: "application/json" },
    signal: controller.signal
  };

  // POST and PATCH carry JSON text in the request body.
  if (data !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(data);
  }

  try {
    // await waits here without freezing the whole webpage.
    const response = await fetch(API_URL + path, options);

    if (response.status !== 204 && !response.headers.get("content-type")?.includes("application/json")) {
      throw new Error("API not found. Run npm start and open port 3000, not Live Server or GitHub Pages.");
    }

    // Read JSON into JavaScript data. Our DELETE returns no body (status 204).
    const body = response.status === 204 ? null : await response.json();

    // An HTTP error can still produce a fetch response, so check response.ok.
    if (!response.ok) {
      throw new Error(body?.error || `Request failed (${response.status}).`);
    }

    apiStatus.textContent = "API connected";
    apiStatus.className = "connection online";
    return body;
  } catch (error) {
    apiStatus.textContent = "Request failed";
    apiStatus.className = "connection offline";

    if (error.name === "AbortError" || error instanceof TypeError) {
      throw new Error("Could not reach the API. Check that npm start is running. Reload tasks to check whether your last change was saved before retrying.");
    }

    throw error; // Let the calling handler display the error message.
  } finally {
    clearTimeout(timeout); // Clean up the timer on success or failure.
  }
}

// CREATE: POST a task object and return a Promise for the saved object.
function createTask(task) {
  return requestTasks("", "POST", task);
}

// UPDATE: PATCH only the supplied fields of the task with this ID.
function updateTask(id, changes) {
  return requestTasks(`/${encodeURIComponent(id)}`, "PATCH", changes);
}

// DELETE: remove one saved task. Confirmation is handled separately below.
function deleteTask(id) {
  return requestTasks(`/${encodeURIComponent(id)}`, "DELETE");
}

// READ: GET every saved task, store the array and display it.
// This is a server request, not a read from localStorage.
async function loadTasks() {
  const data = await requestTasks(); // Defaults to GET /api/tasks.

  if (!Array.isArray(data)) {
    throw new Error("The API did not return a task array.");
  }

  tasks = data;
  hasLoaded = true;
  renderTasks();
}

// 5. DISPLAY THE TASKS

// Build and return one button. data-action tells the click handler its job.
function makeButton(label, action, className) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.className = `button small ${className}`;
  button.dataset.action = action;
  button.disabled = busy;
  return button;
}

// Rebuild the visible list and counters from the current array.
// Rendering changes HTML; it does not create or delete server records.
// Assessment: DOM manipulation, a loop, branching and displaying all records.
function renderTasks() {
  taskList.replaceChildren();
  let completed = 0;

  for (const task of tasks) {
    if (task.completed) {
      completed++;
    }

    const item = document.createElement("li");
    item.className = task.completed ? "task-card is-completed" : "task-card";
    item.dataset.id = task.id; // Connect the displayed card to its saved record.

    const top = document.createElement("div");
    top.className = "task-top";

    const title = document.createElement("h3");
    title.className = "task-title";
    title.textContent = task.title; // Display user input as text, never as HTML.

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
    taskList.appendChild(item); // Attach the completed card to the page.
  }

  document.querySelector("#total-count").textContent = tasks.length;
  document.querySelector("#completed-count").textContent = completed;
  document.querySelector("#pending-count").textContent = tasks.length - completed;
  emptyState.hidden = tasks.length > 0;
  document.querySelector("#empty-heading").textContent = "A fresh start.";
  document.querySelector("#empty-description").textContent = "Add your first study task using the form.";
}

// 6. READ AND RESET THE FORM

// Return a new task OBJECT. trim removes spaces at the beginning and end.
// A new task starts as pending; this function does not send an API request.
function readTaskForm() {
  return {
    title: titleInput.value.trim(),
    completed: false
  };
}

// Clear the input and return the shared form to Add mode.
function resetForm() {
  editingId = null;
  taskForm.reset();
  formHeading.textContent = "Add a study task";
  saveButton.textContent = "Add task";
  cancelButton.hidden = true;
}

// Fill the form with an existing task. Saving later sends the PATCH request.
function startEditing(task) {
  editingId = task.id;
  titleInput.value = task.title;
  formHeading.textContent = "Edit your task";
  saveButton.textContent = "Save changes";
  cancelButton.hidden = false;
  showMessage("Edit the task name, then choose Save changes.");
  titleInput.focus();
}

// 7. HANDLE FORM SUBMISSION - EVENT HANDLER 1

// Add or edit a task when the form is submitted by button or Enter key.
// preventDefault stops normal form navigation so our AJAX can handle the save.
async function handleTaskSubmit(event) {
  event.preventDefault();

  if (busy) {
    return;
  }

  // Assessment: comparison operator and branching. Reject spaces-only names.
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
      // map replaces the edited object and keeps the other tasks unchanged.
      tasks = tasks.map((task) => task.id === saved.id ? saved : task);
    } else {
      // Assessment: a function's return value is another function's argument.
      // readTaskForm returns the object that createTask receives and POSTs.
      const saved = await createTask(readTaskForm());
      tasks.unshift(saved); // Add to the array only after the server confirms it.
    }

    resetForm();
    renderTasks();
    showMessage(isEditing ? "Task updated." : "Task added. You have a plan!", "success");
  } catch (error) {
    showMessage(error.message, "error"); // Leave the entered text for a retry.
  } finally {
    setBusy(false);
    titleInput.focus();
  }
}

// 8. CONFIRM AND HANDLE TASK ACTIONS - EVENT HANDLER 2

// Open our in-page dialog and return a Promise for true (delete) or false.
// This function only asks permission; it does not delete anything itself.
function confirmTaskDeletion(task) {
  return new Promise((resolve) => {
    deleteTaskTitle.textContent = task.title;
    deleteDialog.returnValue = "cancel"; // Escape cannot reuse a previous approval.
    deleteDialog.addEventListener("close", () => {
      resolve(deleteDialog.returnValue === "delete");
    }, { once: true });
    deleteDialog.showModal(); // Keep focus inside; Cancel is focused first.
  });
}

// Handle Edit, Mark completed/pending and Delete using one parent listener.
// This is event delegation: buttons created by renderTasks need no new listeners.
async function handleTaskClick(event) {
  const button = event.target.closest("button[data-action]");

  if (!button || busy) {
    return;
  }

  const id = button.closest("li").dataset.id;
  const task = tasks.find((item) => item.id === id);

  if (!task) {
    return;
  }

  const action = button.dataset.action;

  if (action === "edit") {
    startEditing(task);
    return;
  }

  setBusy(true);

  try {
    if (action === "toggle") {
      // ! reverses true/false. Completing a task is an UPDATE, not a deletion.
      const saved = await updateTask(id, { completed: !task.completed });
      tasks = tasks.map((item) => item.id === id ? saved : item);
      showMessage(saved.completed ? "Task completed. Nice work!" : "Task marked as pending.", "success");
    } else if (action === "delete") {
      const confirmed = await confirmTaskDeletion(task);

      if (!confirmed) {
        return; // Cancel/Escape sends no DELETE request; finally still runs.
      }

      await deleteTask(id);
      tasks = tasks.filter((item) => item.id !== id); // Remove after server success.

      if (editingId === id) {
        resetForm();
      }

      showMessage("Task deleted.", "success");
    }

    renderTasks();
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    setBusy(false);
    const row = [...taskList.children].find((item) => item.dataset.id === id);

    if (row) {
      row.querySelector(`button[data-action="${action}"]`).focus();
    } else {
      titleInput.focus();
    }
  }
}

// Cancel editing without changing the server's saved record.
function handleCancelEdit() {
  resetForm();
  showMessage("Edit cancelled. Your saved task was not changed.");
  titleInput.focus();
}

// Fetch the list again on page load or Reload tasks; always restore controls.
async function refreshTasks() {
  if (busy) {
    return;
  }

  setBusy(true);
  showMessage("Loading your tasks…");

  try {
    await loadTasks();

    if (editingId !== null && !tasks.some((task) => task.id === editingId)) {
      resetForm();
    }

    showMessage("Tasks loaded from the REST API.", "success");
  } catch (error) {
    showMessage(error.message, "error");

    if (!hasLoaded) {
      document.querySelector("#empty-heading").textContent = "The API is not available yet.";
      document.querySelector("#empty-description").textContent = "Run npm start, open port 3000, then choose Reload tasks.";
    }
  } finally {
    setBusy(false);
  }
}

// 9. CONNECT THE EVENTS AND START THE APP
// Pass function names without () so they run when the event happens.
// Assessment: at least two handlers - submit and click - are connected here.
taskForm.addEventListener("submit", handleTaskSubmit);
taskList.addEventListener("click", handleTaskClick);
cancelButton.addEventListener("click", handleCancelEdit);
refreshButton.addEventListener("click", refreshTasks);

refreshTasks(); // Initial asynchronous GET when the page opens.
