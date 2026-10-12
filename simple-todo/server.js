// Node.js runs this JavaScript file. Built-in modules mean no frameworks/packages.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

// Store data beside this file, separate from the existing tracker.
const file = process.env.TASK_FILE || path.join(__dirname, "tasks.json");
const port = Number(process.env.PORT ?? 3001);
if (!fs.existsSync(file)) fs.writeFileSync(file, "[]");

// JSON persistence: changes survive refreshes/restarts while this file exists.
function readTasks() {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function saveTasks(tasks) {
  // Replace the file only after the new JSON has been written successfully.
  fs.writeFileSync(file + ".tmp", JSON.stringify(tasks, null, 2));
  fs.renameSync(file + ".tmp", file);
}

// Give validation errors an HTTP status, e.g. 400 = invalid input.
function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
function cleanTitle(title) {
  if (typeof title !== "string" || !title.trim() || title.trim().length > 120) {
    fail(400, "A task must contain 1 to 120 characters.");
  }
  return title.trim();
}

// ASYNC: read a POST/PATCH JSON body and reject invalid or oversized input.
async function readBody(request) {
  if (request.headers["content-type"]?.split(";")[0].trim().toLowerCase() !== "application/json") {
    fail(415, "Send the request as application/json.");
  }
  let text = "";
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size <= 4096) chunks.push(chunk);
  }
  if (size > 4096) fail(413, "The request is too large.");
  text = Buffer.concat(chunks).toString("utf8");
  let data;
  try { data = JSON.parse(text); } catch { fail(400, "Invalid JSON."); }
  if (!data || typeof data !== "object" || Array.isArray(data)) fail(400, "Send a JSON object.");
  const keys = Object.keys(data);
  if (!keys.length || keys.some(key => !["title", "completed"].includes(key))) {
    fail(400, "Use only title and completed fields.");
  }
  if ("completed" in data && typeof data.completed !== "boolean") fail(400, "completed must be true or false.");
  return data;
}

// Allowlist: only these frontend files can be opened, never the task-data file.
const pages = { "/": "index.html", "/index.html": "index.html", "/style.css": "style.css", "/script.js": "script.js" };
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" };

const server = http.createServer(async (request, response) => {
  // One response helper keeps all API replies in the same JSON format.
  function send(status, data) {
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    response.end(status === 204 ? undefined : JSON.stringify(data));
  }
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  try {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const method = request.method;
    if (method === "GET" && Object.hasOwn(pages, pathname)) {
      const name = pages[pathname];
      response.setHeader("Content-Type", types[path.extname(name)] + "; charset=utf-8");
      return response.end(fs.readFileSync(path.join(__dirname, name)));
    }

    // REST routes: /api/tasks is the collection; /api/tasks/:id is one task.
    const route = pathname.match(/^\/api\/tasks(?:\/([\w-]+))?$/);
    if (!route) return send(404, { error: "Not found." });
    if (["cross-site", "same-site"].includes(request.headers["sec-fetch-site"])) {
      return send(403, { error: "Use this app's own page to access its API." });
    }
    const id = route[1];
    const allowed = id ? ["GET", "PATCH", "DELETE"] : ["GET", "POST"];
    if (!allowed.includes(method)) {
      response.setHeader("Allow", allowed.join(", "));
      return send(405, { error: "Method not allowed." });
    }
    const data = ["POST", "PATCH"].includes(method) ? await readBody(request) : null;
    // Read AFTER the asynchronous body so simultaneous writes use fresh data.
    const tasks = readTasks();
    const task = tasks.find(item => item.id === id);
    if (id && !task) return send(404, { error: "Task not found. Refresh the page." });

    // READ: return one task object, or the complete array of tasks.
    if (method === "GET") return send(200, id ? task : tasks);

    // CREATE: add a new object and return it with HTTP 201 (Created).
    if (method === "POST") {
      const newTask = { id: randomUUID(), title: cleanTitle(data.title), completed: data.completed ?? false };
      tasks.push(newTask);
      saveTasks(tasks);
      response.setHeader("Location", `/api/tasks/${newTask.id}`);
      return send(201, newTask);
    }

    // UPDATE: change only the supplied fields; keep the task's original ID.
    if (method === "PATCH") {
      if ("title" in data) task.title = cleanTitle(data.title);
      if ("completed" in data) task.completed = data.completed;
      saveTasks(tasks);
      return send(200, task);
    }

    // DELETE: save all tasks EXCEPT the task with the matching ID.
    saveTasks(tasks.filter(item => item.id !== id));
    return send(204);
  } catch (error) {
    // Do not expose server paths or stack traces to the browser.
    if (!error.status) console.error(error);
    send(error.status || 500, { error: error.status ? error.message : "The server could not read or save tasks." });
  }
});

// Port 3001 avoids the existing tracker's default port 3000.
server.listen(port, "0.0.0.0", () => {
  console.log(`Simple To-Do: http://localhost:${server.address().port}`);
});
server.on("error", error => {
  console.error(`Cannot start server: ${error.message}`);
  process.exitCode = 1;
});
