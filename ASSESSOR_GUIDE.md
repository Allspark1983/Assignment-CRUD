# Study Task Tracker — Assessor and Revision Guide

Practise using and explaining the app rather than memorising this guide. This mapping refers to the supplied **Agile Front End Development with JavaScript** handout. Your assessor decides whether the evidence is sufficient.

## 1. Explain the purpose

> My application helps students organise their study tasks in one place. A student can add a task, view all saved tasks, edit a task, mark it completed and delete it. I chose one page and one type of record so it is easy to use.

**Target users:** students managing revision and coursework.

**Pain point:** tasks are easy to forget when scattered across notes, and it can be unclear which ones are finished.

**Design response:** one labelled input, clear task actions, completion statuses and three counters. The same form handles adding and editing. Deletion requires confirmation. On mobile, the form and task list stack vertically.

## 2. Suggested 15-minute demonstration

| Approximate time | What to show |
| --- | --- |
| 0–2 minutes | Target user, problem and purpose. Show the form and task list. |
| 2–5 minutes | Create “Revise JavaScript”; reload; edit the title; mark completed; delete. |
| 5–8 minutes | Open the browser's Network panel. Explain GET, POST, PATCH and DELETE; show the real requests. |
| 8–12 minutes | Explain the task array, readTaskForm(), createTask(), renderTasks() and event handlers. |
| 12–15 minutes | Show validation and mobile layout; explain persistence; answer questions. |

These are practice timings, not an official agenda.

Open browser developer tools, choose **Network**, select **Fetch/XHR**, and enable **Preserve log** before refreshing. The on-page API explanation and activity table have been removed to keep the interface simple. The Network panel lets you inspect the actual method, body, response and status; the REST API functionality is unchanged.

Demonstrate all four CRUD actions. Marking a task completed is an update, not a deletion. Cancelling deletion should leave the record unchanged.

## 3. CRUD and REST in simple words

| User action | CRUD | Request |
| --- | --- | --- |
| Add a task | Create | `POST /api/tasks` |
| Load the list | Read | `GET /api/tasks` |
| Change title or status | Update | `PATCH /api/tasks/:id` |
| Remove a task | Delete | `DELETE /api/tasks/:id` |

> A task is the resource. The collection address is /api/tasks. Adding an ID identifies one particular task. The browser sends a request. The server saves or retrieves the data and sends a response. JavaScript then updates the page.

This small resource-oriented REST API uses resource URLs, HTTP methods, JSON representations and meaningful statuses. Each request includes the method, resource path and needed data; it does not rely on a server-side login session. It is not a claim to implement every optional or advanced REST feature.

## 4. Assignment criteria mapping

| Requirement | Evidence |
| --- | --- |
| Vanilla HTML, CSS and JavaScript; no frameworks | Frontend files use no Bootstrap/React. The API uses only built-in Node modules. |
| UI addressing a target-user pain point | Students organise revision tasks and see what remains unfinished. |
| Mobile-responsive layout | Media queries at 760px and 420px; demonstrate at 390px. |
| Create, view all, edit and delete one resource | Task form, full list, Edit/Save changes and confirmed Delete. |
| Three properties across two DOM elements | `message.textContent`, `titleInput.value`, `saveButton.disabled`; also `hidden` and `className`. |
| At least two event handlers | Form `submit` and task list `click`; cancel/reload clicks too. |
| Operators, function calls, branching or loops | Comparisons, logical operators, `if`, `for...of` and custom functions. The brief requires at least one of its listed fundamentals; several are shown. |
| At least one array and one object | `tasks` is an array; each task is an object. |
| Returned value used as another function's argument | `createTask(readTaskForm())`. |
| Asynchronous call | `await fetch(...)` in an `async` function. |
| Fetch JSON | GET `/api/tasks` followed by `response.json()`. |
| AJAX GET plus POST/PATCH/PUT | GET, POST and PATCH are implemented, as is DELETE. |
| GitHub link and ZIP | Source files are in the repository; submit its link and a source ZIP through the LMS. |

This uses your own API, not an external SaaS service. Confirm separately if your assessor specifically requires a third-party provider. Do not assume the implementation guarantees an assessment outcome.

## 5. Explain the JavaScript

### Selecting an element

```js
const titleInput = document.querySelector("#task-title");
```

> querySelector finds an HTML element. The # means I am selecting by ID. This lets JavaScript read and change the input.

### Objects and arrays

```js
const exampleTask = { id: "example", title: "Revise HTML", completed: false };
const exampleTasks = [exampleTask];
```

> One object stores one task's information. An array stores several task objects.

These are explanation examples. The actual server generates task IDs.

### Function return values

```js
const saved = await createTask(readTaskForm());
```

> readTaskForm reads the input and returns an object. createTask receives that object as its argument and sends it to the API. await waits for the result before the next step in this function.

### Rendering and DOM manipulation

> renderTasks displays the current array. It clears the old displayed list, loops over the tasks, creates one list item for each task and updates the counters. It displays records; it does not save them.

`document.createElement()` creates an HTML element. `appendChild()` attaches it. `textContent` inserts the task title as text, not as HTML. DOM manipulation means changing the elements and their properties after the page has loaded.

### Event handlers

> A handler runs after an event. The submit handler adds or updates a task. The task-list click handler checks which action was selected.

`event.preventDefault()` stops the form's normal full-page submission. Each button has a `data-action`. One parent click listener handles the generated buttons; this is called event delegation.

### Fetch, async, await and JSON

> fetch sends an HTTP request. async and await let the function wait for a result without freezing the page. JSON is the text format used to exchange task data.

`JSON.stringify()` turns an object into JSON request text. `response.json()` reads the response into JavaScript data. AJAX-style updates send asynchronous requests without a full page reload; they do not require an AJAX library or XML.

### Errors

> I check response.ok because an HTTP error does not automatically make fetch reject. I display an error, re-enable controls and preserve the entered title when saving fails.

Controls are disabled during requests to reduce duplicate actions. Requests have a timeout. After a network failure, reload the list before retrying: a server could save a change even if the browser never received its response.

## 6. Questions to practise

**Where is the data saved?** On the server in `data/tasks.json`, not in localStorage or GitHub commits.

**Does it survive refresh?** Yes, while the same data file remains available. A refresh fetches saved data again. Deleting the Codespace/file can remove it.

**Why PATCH?** It changes selected fields, such as completion status. This API does not implement PUT replacement. POST and PATCH cover the required write-request demonstration.

**What do the statuses mean?** GET and PATCH return 200 here; POST returns 201 for creation; DELETE returns 204 with no body. We therefore do not parse a DELETE response as JSON.

**Why Node?** It runs the supporting API outside the browser. The frontend remains HTML, CSS and vanilla JavaScript. No framework packages are installed.

**Is an API key needed?** Not for this local demo. It has no application authentication. Keep the forwarded port private and use harmless example tasks.

**Why not only localStorage?** That would not demonstrate real GET and POST/PATCH requests. This app sends requests to a server and waits for responses.

**Is it production-ready?** No. A multi-user production app would need authentication, per-user permissions, a database and backups.

## 7. Before submitting

Run `npm run check` and `npm test`. Then open the app in your own Codespace and test add, reload, edit, complete and delete. Show blank-title validation and mobile layout. Identify the functions involved and inspect the actual API requests. Submit the repository link and source ZIP through your LMS.
