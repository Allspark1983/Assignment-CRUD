"use strict";
// Node's built-in test runner. Temporary records never touch the user's data.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createApp } = require("../server.js");
let server, base, directory, savedId;
async function start() {
  server = createApp({ dataFile: path.join(directory, "tasks.json") });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
}
function stop() { return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
function call(route, method = "GET", body) {
  return fetch(base + route, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}
before(async () => { directory = fs.mkdtempSync(path.join(os.tmpdir(), "study-crud-")); await start(); });
after(async () => { await stop(); fs.rmSync(directory, { recursive: true, force: true }); });
test("GET serves the page, stylesheet and browser JavaScript", async () => {
  for (const route of ["/", "/style.css", "/script.js"]) assert.equal((await call(route)).status, 200);
});
test("GET initially returns an empty JSON array", async () => {
  const response = await call("/api/tasks");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), []);
});
test("POST creates a task with a generated ID and Location header", async () => {
  const response = await call("/api/tasks", "POST", { title: "  Revise JavaScript  ", completed: false });
  assert.equal(response.status, 201);
  const task = await response.json();
  savedId = task.id;
  assert.equal(task.title, "Revise JavaScript");
  assert.equal(task.completed, false);
  assert.equal(response.headers.get("location"), `/api/tasks/${savedId}`);
});
test("GET retrieves the created task individually and in the full list", async () => {
  const single = await (await call(`/api/tasks/${savedId}`)).json();
  const all = await (await call("/api/tasks")).json();
  assert.equal(single.id, savedId);
  assert.equal(all[0].id, savedId);
});
test("PATCH edits a title and separately updates completion", async () => {
  let response = await call(`/api/tasks/${savedId}`, "PATCH", { title: "Practise REST APIs" });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).completed, false);
  response = await call(`/api/tasks/${savedId}`, "PATCH", { completed: true });
  const task = await response.json();
  assert.equal(task.title, "Practise REST APIs");
  assert.equal(task.completed, true);
});
test("Invalid fields, blank/long titles, arrays and wrong types are rejected", async () => {
  for (const body of [{ title: " " }, { title: 7 }, { title: "x".repeat(101) }, { title: "X", completed: "true" }, [], null, { title: "X", id: "override" }]) {
    assert.equal((await call("/api/tasks", "POST", body)).status, 400);
  }
  assert.equal((await call(`/api/tasks/${savedId}`, "PATCH", {})).status, 400);
});
test("Malformed JSON, wrong content type and oversized bodies are rejected", async () => {
  let response = await fetch(base + "/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal(response.status, 400);
  response = await fetch(base + "/api/tasks", { method: "POST", body: "hello" });
  assert.equal(response.status, 415);
  response = await call("/api/tasks", "POST", { title: "x".repeat(9000) });
  assert.equal(response.status, 413);
});
test("Data persists after stopping and restarting the server", async () => {
  await stop();
  await start();
  const task = await (await call(`/api/tasks/${savedId}`)).json();
  assert.equal(task.title, "Practise REST APIs");
  assert.equal(task.completed, true);
});
test("DELETE removes a task and returns 204 without a body", async () => {
  const response = await call(`/api/tasks/${savedId}`, "DELETE");
  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
  assert.equal((await call(`/api/tasks/${savedId}`)).status, 404);
  assert.deepEqual(await (await call("/api/tasks")).json(), []);
});
test("Concurrent POST requests do not lose records in one server process", async () => {
  const responses = await Promise.all(Array.from({ length: 6 }, (_, i) => call("/api/tasks", "POST", { title: `Task ${i}` })));
  assert.ok(responses.every((response) => response.status === 201));
  const tasks = await (await call("/api/tasks")).json();
  assert.equal(tasks.length, 6);
  assert.equal(new Set(tasks.map((task) => task.id)).size, 6);
});
test("Unknown endpoints, unsupported methods and private files are not served", async () => {
  for (const route of ["/server.js", "/data/tasks.json", "/.git/config", "/api/unknown"]) assert.equal((await call(route)).status, 404);
  const response = await call("/api/tasks", "PUT", { title: "No" });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET, POST");
});
test("Cross-site changes are refused", async () => {
  const response = await fetch(base + "/api/tasks", {
    method: "POST", headers: { "Content-Type": "application/json", "Sec-Fetch-Site": "cross-site" }, body: JSON.stringify({ title: "No" })
  });
  assert.equal(response.status, 403);
});
