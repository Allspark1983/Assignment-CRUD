# Simple To-Do List

A small study-task organiser for students who want to remember, edit and finish their tasks. It uses **plain HTML, CSS and vanilla JavaScript**, with comments explaining each section. The existing tracker in the repository root is unchanged.

## Run in GitHub Codespaces

Open the repository on the **main** branch. In the terminal, starting at the repository root:

```bash
cd simple-todo
npm start
```

Open **port 3001** from the Ports tab and keep its visibility **Private**. This is a separate app from the original tracker on port 3000. An already-open Codespace may need `git pull --ff-only` from the repository root to get the new folder.

Use Node.js 22 or later. There are no dependencies to install. On your own computer, start the server the same way and open `http://localhost:3001`. Stop it with Ctrl+C. Check JavaScript syntax with `npm run check`.

**Do not use Live Server, double-click index.html, or use GitHub Pages for this version.** Run `server.js` through `npm start`: the app needs its backend, not just static files. Uploading the source to GitHub does not start a public website.

## Files

| File | Function |
| --- | --- |
| `index.html` | Form, messages, task list and reusable task-row template. |
| `style.css` | Colours, spacing, desktop/mobile layouts and keyboard focus. |
| `script.js` | Arrays/objects, DOM updates, events and asynchronous API calls. |
| `server.js` | Framework-free REST API and JSON-file storage. |
| `package.json` | Start and syntax-check commands; JSON does not allow comments. |
| `.gitignore` | Keeps personal task data and environment files out of GitHub. |

No separate assessor-guide file is included. The four code files explain their own functionality in comments.

## How it works

Type a task and choose **Add task**. Tick its checkbox to complete it. Choose **Edit** to reuse the same form, then **Save task** or **Cancel**. **Delete** removes a task immediately. Feedback appears on the page, without browser alert/prompt dialogs.

```text
Button or checkbox → JavaScript event → fetch() → REST API → tasks.json
                                  ← JSON reply ←
```

| Action | Request | Successful response |
| --- | --- | --- |
| Read all / one | `GET /api/tasks` or `GET /api/tasks/:id` | 200 with JSON |
| Create | `POST /api/tasks` with `{ "title": "Revise functions" }` | 201 with new task |
| Edit / complete | `PATCH /api/tasks/:id` with `title` or `completed` | 200 with updated task |
| Delete | `DELETE /api/tasks/:id` | 204, no response body |

The server creates each task ID. Titles must contain 1–120 characters. Changes appear as saved only after a successful server response. Invalid requests show an error; a failed save retains the typed text.

**Try an example task** optionally fetches public JSON from `https://dummyjson.com/todos/random`. It fills the input; it does not save automatically. Edit the example and press Add task to save it to our own server. This demonstrates consuming an external REST endpoint without an API key. Your existing task data is not sent to DummyJSON. Examples need internet access; the main app does not depend on that provider. This is one sample-data provider, not a generative-AI integration.

## Assignment checklist

Mapped to the detailed marking criteria in *Agile assignments.pdf*:

| Criterion | Evidence in this version |
| --- | --- |
| Vanilla HTML, CSS and JavaScript | No React, Bootstrap, Express or other frameworks. Node is the supporting JavaScript runtime. |
| Target user and usable interface | Students managing study tasks; one form, labelled controls and clear feedback. |
| Create, read, update and delete | Add, list, edit/complete and delete tasks through the real API. |
| Mobile responsiveness | CSS media query; stacked controls and long-title wrapping. |
| At least 3 DOM properties across 2 elements | `textContent`, `checked`, `hidden`, `value`, `disabled` and class changes in `script.js`. |
| At least 2 event handlers | `submit`, `click` and `change`. |
| JavaScript operators, branches, loops and custom functions | `===`, `!==`, `||`, `if`, `forEach`, `createTaskElement` and `renderList`. |
| Array and object | `tasks` is an array containing task objects. |
| A return value used as another function's argument | `list.appendChild(createTaskElement(task))`. |
| Async call, JSON, AJAX GET and POST/PATCH | `async`/`await`, `fetch`, `response.json`, `JSON.stringify` and real GET/POST/PATCH requests. |
| Repository and ZIP submission | Use this repository's `simple-todo` folder and its source ZIP for the LMS. |

Practise demonstrating and explaining these comments yourself. Assessment acceptance is the assessor's decision; check separately if additional SaaS providers or a generative-AI integration are expected under the wider learning outcomes.

## Verification and limits

Before this upload: JavaScript syntax checks, **50 real HTTP API checks** and **16 browser DOM/interaction checks** passed locally. API checks included CRUD, invalid input, concurrent creation, private-file restrictions and persistence across a server restart. Browser checks covered editing, failure handling, safe text rendering and no horizontal overflow at 390px/320px widths.

**Browser checks used mocked API responses** because this sandbox blocks browser navigation. They are not a live browser-to-server end-to-end test. The optional external example's success/failure responses were also mocked, not live-tested here. Your own Codespace has not been started by the assistant. Verify it there before presenting; inspect Developer Tools → Network → Fetch/XHR while using the app.

The server automatically creates `tasks.json`; this local data file is deliberately excluded from GitHub and the source ZIP. Tasks survive normal refreshes and restarts while the same file remains available. They are not synced to a cloud database or to GitHub. Deleting the Codespace or data file can lose the tasks.

This is a **single-user classroom demo**, without login, per-user access control or backups. Use harmless example tasks, keep the forwarded port private and run only one server process per data file. Anyone with network access to the app can read or change its tasks.

## Official references

- Fetch and JSON: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
- Node HTTP server: https://nodejs.org/api/http.html
- External sample endpoint: https://dummyjson.com/docs/todos
- Codespaces ports: https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace
- Static GitHub Pages hosting: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
