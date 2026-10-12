"use strict";

// A real REST API using only Node's built-in modules. No Express/framework.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

function httpError(status, message) { return Object.assign(new Error(message), { status }); }
function sendJson(response, status, data) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data));
}
async function readJson(request) {
  if (request.headers["content-type"]?.split(";")[0].trim() !== "application/json") {
    throw httpError(415, "Send JSON using Content-Type: application/json.");
  }
  const chunks = [];
  let size = 0;
  let tooLarge = false;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 8192) tooLarge = true;
    else chunks.push(chunk);
  }
  if (tooLarge) throw httpError(413, "Request body is too large.");
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw httpError(400, "Request body must be valid JSON."); }
}
function validateTask(data, isNew = false) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw httpError(400, "A task must be a JSON object.");
  const keys = Object.keys(data);
  if (keys.length === 0 || keys.some((key) => !["title", "completed"].includes(key))) {
    throw httpError(400, "Use only title and completed. The server assigns the ID.");
  }
  if (isNew || "title" in data) {
    if (typeof data.title !== "string" || data.title.trim().length < 1 || data.title.trim().length > 100) {
      throw httpError(400, "The title must contain between 1 and 100 characters.");
    }
  }
  if ("completed" in data && typeof data.completed !== "boolean") throw httpError(400, "Completed must be true or false, not text.");
  const clean = {};
  if ("title" in data) clean.title = data.title.trim();
  if ("completed" in data) clean.completed = data.completed;
  return clean;
}
function createApp(options = {}) {
  const dataFile = options.dataFile || path.join(__dirname, "data", "tasks.json");
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, "[]\n", "utf8");
  function loadTasks() {
    const tasks = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    if (!Array.isArray(tasks) || tasks.some((task) => !task || typeof task.id !== "string" ||
        typeof task.title !== "string" || typeof task.completed !== "boolean")) {
      throw new Error("Invalid task data file. Restore a backup; existing data was not overwritten.");
    }
    return tasks;
  }
  function saveTasks(tasks) {
    // Atomic replacement reduces the chance of a partially written file.
    // This synchronous read/modify/write is for a single-process classroom demo.
    fs.writeFileSync(dataFile + ".tmp", JSON.stringify(tasks, null, 2) + "\n", "utf8");
    fs.renameSync(dataFile + ".tmp", dataFile);
  }
  // Serve only the frontend files; never expose .git or server/data files.
  const staticFiles = new Map([
    ["/", ["index.html", "text/html; charset=utf-8"]],
    ["/index.html", ["index.html", "text/html; charset=utf-8"]],
    ["/style.css", ["style.css", "text/css; charset=utf-8"]],
    ["/script.js", ["script.js", "text/javascript; charset=utf-8"]]
  ]);
  return http.createServer(async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "same-origin");
    response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    try {
      const pathname = new URL(request.url, "http://localhost").pathname;
      const method = request.method;
      const match = pathname.match(/^\/api\/tasks(?:\/([a-zA-Z0-9-]+))?\/?$/);
      if (match) {
        const id = match[1];
        const allowed = id ? ["GET", "PATCH", "DELETE"] : ["GET", "POST"];
        if (!allowed.includes(method)) {
          response.setHeader("Allow", allowed.join(", "));
          throw httpError(405, "This HTTP method is not supported for this endpoint.");
        }
        if (method !== "GET" && request.headers["sec-fetch-site"] === "cross-site") throw httpError(403, "Cross-site changes are not allowed.");
        // Complete body reading BEFORE loading and writing shared task data.
        // No awaits occur in the following read/modify/write section.
        const changes = ["POST", "PATCH"].includes(method) ? validateTask(await readJson(request), method === "POST") : null;
        const tasks = loadTasks();
        const index = id ? tasks.findIndex((task) => task.id === id) : -1;
        if (id && index === -1) throw httpError(404, "Task not found. Reload your task list.");
        if (method === "GET") {
          sendJson(response, 200, id ? tasks[index] : tasks);
        } else if (method === "POST") {
          const task = { id: randomUUID(), title: changes.title, completed: changes.completed ?? false };
          tasks.unshift(task);
          saveTasks(tasks);
          response.setHeader("Location", `/api/tasks/${task.id}`);
          sendJson(response, 201, task);
        } else if (method === "PATCH") {
          tasks[index] = { ...tasks[index], ...changes };
          saveTasks(tasks);
          sendJson(response, 200, tasks[index]);
        } else if (method === "DELETE") {
          tasks.splice(index, 1);
          saveTasks(tasks);
          response.writeHead(204);
          response.end();
        }
        return;
      }
      const asset = staticFiles.get(pathname);
      if (!asset) throw httpError(404, "Not found.");
      if (!["GET", "HEAD"].includes(method)) {
        response.setHeader("Allow", "GET, HEAD");
        throw httpError(405, "Use GET to read this file.");
      }
      const content = fs.readFileSync(path.join(__dirname, asset[0]));
      response.writeHead(200, { "Content-Type": asset[1] });
      response.end(method === "HEAD" ? undefined : content);
    } catch (error) {
      const status = error.status || 500;
      if (status === 500) console.error(error);
      sendJson(response, status, status === 500
        ? { error: "Could not read or save tasks. Check the server terminal. Existing data was not intentionally replaced." }
        : { error: error.message });
    }
  });
}
if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || "127.0.0.1";
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error("PORT must be a whole number between 1 and 65535.");
    process.exit(1);
  }
  const server = createApp();
  server.on("error", (error) => {
    console.error(error.code === "EADDRINUSE" ? `Port ${port} is already in use. Stop the other server or set PORT.` : error.message);
    process.exitCode = 1;
  });
  server.listen(port, host, () => {
    console.log(`Study Task Tracker: http://localhost:${port}`);
    console.log("Codespaces: open this port in your browser. Keep its visibility PRIVATE.");
    console.log("Tasks persist in data/tasks.json. Press Ctrl+C to stop.");
  });
}
module.exports = { createApp };
