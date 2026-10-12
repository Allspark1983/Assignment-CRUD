"use strict";

// 1. SELECT the HTML elements we want to work with.
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

// One ARRAY holds our task OBJECTS. The server is the saved source of truth.
const API_URL = "/api/tasks";
let tasks = [];
let editingId = null;
let busy = false;
let hasLoaded = false;

// 2. Small, reusable functions for messages and loading.
function showMessage(text, type = "info") {
  message.textContent = text;
  message.className = `message ${type}`;
}
function setBusy(value) {
  busy = value;
  titleInput.disabled = value || !hasLoaded;
  saveButton.disabled = value || !hasLoaded;
  cancelButton.disabled = value;
  refreshButton.disabled = value;
  taskList.setAttribute("aria-busy", String(value));
  for (const button of taskList.querySelectorAll("button")) button.disabled = value;
}

// 3. REST API: fetch sends a real HTTP request without reloading the page.
async function requestTasks(path = "", method = "GET", data) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const options = { method, headers: { Accept: "application/json" }, signal: controller.signal };
  if (data !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(data);
  }
  try {
    const response = await fetch(API_URL + path, options);
    if (response.status !== 204 && !response.headers.get("content-type")?.includes("application/json")) {
      throw new Error("API not found. Run npm start and open port 3000, not Live Server or GitHub Pages.");
    }
    // DELETE returns 204 No Content, so there is no JSON body to read.
    const body = response.status === 204 ? null : await response.json();
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
    clearTimeout(timeout);
  }
}
function createTask(task) { return requestTasks("", "POST", task); }
function updateTask(id, changes) { return requestTasks(`/${encodeURIComponent(id)}`, "PATCH", changes); }
function deleteTask(id) { return requestTasks(`/${encodeURIComponent(id)}`, "DELETE"); }
async function loadTasks() {
  const data = await requestTasks(); // GET /api/tasks
  if (!Array.isArray(data)) throw new Error("The API did not return a task array.");
  tasks = data;
  hasLoaded = true;
  renderTasks();
}

// 4. READ and RENDER: turn the array of objects into visible HTML elements.
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
  taskList.replaceChildren();
  let completed = 0;
  for (const task of tasks) {
    if (task.completed) completed++;
    const item = document.createElement("li");
    item.className = task.completed ? "task-card is-completed" : "task-card";
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
    taskList.appendChild(item);
  }
  document.querySelector("#total-count").textContent = tasks.length;
  document.querySelector("#completed-count").textContent = completed;
  document.querySelector("#pending-count").textContent = tasks.length - completed;
  emptyState.hidden = tasks.length > 0;
  document.querySelector("#empty-heading").textContent = "A fresh start.";
  document.querySelector("#empty-description").textContent = "Add your first study task using the form.";
}

// 5. The same form handles both CREATE and UPDATE.
function readTaskForm() {
  return { title: titleInput.value.trim(), completed: false };
}
function resetForm() {
  editingId = null;
  taskForm.reset();
  formHeading.textContent = "Add a study task";
  saveButton.textContent = "Add task";
  cancelButton.hidden = true;
}
function startEditing(task) {
  editingId = task.id;
  titleInput.value = task.title;
  formHeading.textContent = "Edit your task";
  saveButton.textContent = "Save changes";
  cancelButton.hidden = false;
  showMessage("Edit the task name, then choose Save changes.");
  titleInput.focus();
}

// Event handler 1: submitting by clicking Add task or pressing Enter.
taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy) return;
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
      tasks = tasks.map((task) => task.id === saved.id ? saved : task);
    } else {
      // REQUIRED function composition: returned object is passed into createTask.
      const saved = await createTask(readTaskForm());
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

// Event handler 2: one click listener handles every generated task's buttons.
taskList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button || busy) return;
  const id = button.closest("li").dataset.id;
  const task = tasks.find((item) => item.id === id);
  if (!task) return;
  const action = button.dataset.action;
  if (action === "edit") { startEditing(task); return; }
  if (action === "delete" && !window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
  setBusy(true);
  try {
    if (action === "toggle") {
      const saved = await updateTask(id, { completed: !task.completed });
      tasks = tasks.map((item) => item.id === id ? saved : item);
      showMessage(saved.completed ? "Task completed. Nice work!" : "Task marked as pending.", "success");
    } else if (action === "delete") {
      await deleteTask(id);
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
    if (row) row.querySelector("button").focus();
    else titleInput.focus();
  }
});
cancelButton.addEventListener("click", () => {
  resetForm();
  showMessage("Edit cancelled. Your saved task was not changed.");
  titleInput.focus();
});
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
refreshButton.addEventListener("click", refreshTasks);
refreshTasks(); // Initial asynchronous GET when the page opens.
