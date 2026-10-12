# Assignment-CRUD — Study Task Tracker

A one-page study organiser for students, built with **HTML, CSS and vanilla JavaScript**. Add a task, view saved tasks, edit its title, mark it completed or pending, and delete it after confirmation.

**This includes a real REST API, not localStorage or simulated writes.** The browser uses `fetch()` to communicate with the small Node.js server. There is no React, Bootstrap, Express, third-party package, API key or MockAPI account to configure.

## Repository

The source, tests and assessor guide are now uploaded to the `main` branch of **Allspark1983/Assignment-CRUD**. The earlier integration permission error was resolved on retry.

## Run in GitHub Codespaces

1. Open your repository on GitHub. Choose **Code → Codespaces** and open or create a Codespace on the branch containing these files.
2. In the terminal, make sure you are in the folder containing `package.json`. Run:

   ```bash
   npm start
   ```

3. Open **port 3000** in your browser from the notification or **Ports** tab. Keep its visibility **Private**.
4. Add your first task. Expand **How it works: REST API activity** to see requests and response statuses.

Requires Node.js 22 or later. There are no dependencies to install. On your own computer with Node installed, run the same command from the project folder and open `http://localhost:3000`. Stop the server with **Ctrl+C**.

**Do not launch this version with Live Server, by double-clicking index.html, or through GitHub Pages.** It needs `server.js` running to provide `/api/tasks`. GitHub Pages is static hosting and cannot run this backend. No public deployment has been configured.

## Files

| File | What it does |
| --- | --- |
| `index.html` | Form, task list, counters, messages and an expandable API activity table. |
| `style.css` | Desktop/mobile layout, buttons and visible keyboard-focus styles. |
| `script.js` | DOM manipulation, events, arrays/objects, validation and asynchronous CRUD requests. |
| `server.js` | JavaScript HTTP server, REST endpoints and JSON-file persistence. |
| `package.json` | Commands to start, test and syntax-check the project. |
| `tests/api.test.js` | Twelve API tests using Node's built-in test runner. |
| `ASSESSOR_GUIDE.md` | Criteria mapping, a suggested demonstration and simple explanations. |
| `.gitignore` | Keeps personal task data, environment files and dependencies out of Git. |

`data/tasks.json` is automatically created when the normal server first starts. It is deliberately **not committed to GitHub**. A fresh checkout starts with an empty task list.

## REST API

| Method | Endpoint | Action | Success |
| --- | --- | --- | --- |
| GET | `/api/tasks` | Read all tasks | 200 and a JSON array |
| GET | `/api/tasks/:id` | Read one task | 200 and a JSON object |
| POST | `/api/tasks` | Create a task | 201, JSON object and Location header |
| PATCH | `/api/tasks/:id` | Change title and/or completion | 200 and the updated object |
| DELETE | `/api/tasks/:id` | Delete one task | 204 with no body |

`:id` means an actual server-generated task ID. POST and PATCH accept `Content-Type: application/json`.

Example POST body:

```json
{
  "title": "Revise JavaScript functions",
  "completed": false
}
```

The server adds a unique string `id`. POST and PATCH return the saved object, which the frontend uses to redraw the list. DELETE removes the visible item only after the server confirms success. Reloading the page performs another GET.

The API validates titles and boolean values. It rejects malformed JSON, oversized request bodies, unsupported methods and unknown fields. The UI disables controls during requests and preserves the entered title after a failed save.

## Data flow

```text
User action → event handler → fetch() HTTP request
                                    ↓
                            server.js REST API
                                    ↓
                             data/tasks.json
                                    ↓
JSON response → task array → renderTasks() → updated HTML
```

The browser and API are served from the same origin. Nothing is sent to an external API provider. This version uses its own REST API instead of the previously proposed MockAPI service so it can run without a separate account.

The frontend remains the assessment focus. Node.js runs the supporting JavaScript API; it is not a frontend framework. **Check with your assessor if they specifically require consumption of a third-party/SaaS API**, rather than a working REST API of your own.

## Tests and verification

```bash
npm run check
npm test
```

Tests use a temporary directory and a separate random port, not your personal task file. They cover CRUD, validation, static assets, server-restart persistence, concurrent creation, and rejection of private-file requests and cross-site changes.

Local verification on this upload: JavaScript syntax checks and **12/12 real HTTP API tests passed** on Node.js 22.16.0. These are server/API tests, not a live browser-to-server end-to-end test. Your own Codespace has not been started or tested by the assistant.

Before presenting, run the demonstration in `ASSESSOR_GUIDE.md` in your own Codespace. Confirm the actual requests in your browser's Network panel.

## Privacy, persistence and limitations

This is a **single-user classroom demonstration, not a production service**. There is no application login or per-user authorisation. Keep the forwarded port private and use harmless example study tasks. Anyone given network access to the app could read or change all tasks.

Records survive refreshes and normal server restarts only while the same `data/tasks.json` file remains available. They are not synced to GitHub or a cloud database. Deleting your Codespace or its data file can remove them. The API uses synchronous, atomic file replacement for simplicity; run only one server process per data file. A production app would need authentication, a database and backups.

## Submission

Submit your repository link and source ZIP through the LMS, following your assessment handout. Practise explaining the code; the assessor decides whether your evidence is sufficient.

## Official references

- Fetch and JSON: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
- Node HTTP server: https://nodejs.org/api/http.html
- Uploading repository files: https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
- Codespaces ports: https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace
- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
