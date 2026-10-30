# PROJECT.md — SpectrumCare Developer Reference

1. Project documentation for SpectrumCare – Child Development Monitoring Platform.

---

## 1. Big Picture — What This Project Actually Does

SpectrumCare is a web app that helps parents screen their young children (toddlers aged 16-30 months) for signs of autism spectrum disorder (ASD). It does three things:

1. **Screening.** A parent answers 20 yes/no questions from a real clinical tool called the M-CHAT-R (Modified Checklist for Autism in Toddlers, Revised). The backend scores those answers using the clinical rules, then optionally sends them to a Python AI service for a second opinion.

2. **Therapy games.** After the screening, the parent can play three simple cognitive games with their child — emoji face matching, "odd one out" pattern recognition, and color identification. The app records accuracy and response time for each game session.

3. **Progress tracking and reporting.** The app aggregates game session history into a dashboard (weekly accuracy trends, streaks, strongest/weakest game type) and lets the parent download a PDF report to bring to a pediatrician.

That is the entire product. There is no real-time communication, no video, no doctor portal on the other end. It is a screening and logging tool.

**Who uses it:** A parent, not a doctor. The app explicitly puts a disclaimer on results saying it is not a clinical diagnosis.

---

## 2. Tech Glossary — Every Technical Term in This Project

### Languages

**TypeScript**
A superset of JavaScript. It is JavaScript with type annotations added on top. When you write `const user: User = ...`, the `: User` part is TypeScript. The types only exist while you are writing code — when the code actually runs, it is compiled down to regular JavaScript. It exists to catch mistakes before they become bugs.

**Python**
A programming language used here for the AI service only. Python is the standard choice for machine learning because its ecosystem (scikit-learn, numpy, etc.) is far more mature than JavaScript's equivalents.

**JavaScript**
The language that browsers natively run. The entire frontend (`index.html`) is vanilla JavaScript, which means no framework — just plain JS inside `<script>` tags.

### Backend

**Node.js**
A runtime environment that lets you run JavaScript on the server (outside the browser). Normally JavaScript only runs in browsers. Node.js changed that. The backend here is Node.js running TypeScript.

**Express**
A minimal web framework for Node.js. It handles HTTP requests. You define routes like `router.post('/register', ...)` and Express takes care of listening for incoming requests and calling the right handler function.

**tsx**
A command-line tool that lets you run TypeScript files directly during development without manually compiling them first. In `package.json`, `npm run dev` runs `tsx watch src/index.ts`.

**Middleware**
Code that runs between an incoming HTTP request and your actual route handler. In this project, `authMiddleware` in `backend/src/middleware/auth.ts` runs before any protected route. It checks the JWT token and either lets the request through or rejects it with a 401 error.

**Router**
An Express concept. Instead of defining all routes in one file, you create a `Router` for each feature (auth, child, screening, etc.) and mount it at a URL prefix in `index.ts`. For example, `app.use('/api/auth', authRoutes)` means all routes defined in `auth.ts` live under `/api/auth`.

### Database and ORM

**SQLite**
A database that is stored in a single file on disk (`backend/prisma/dev.db`). Unlike databases such as PostgreSQL or MySQL, SQLite does not need a separate server process running — it is just a file. This makes it very simple to set up, which is why it was chosen for this project. The tradeoff is that it does not scale well for many concurrent users.

**ORM (Object-Relational Mapper)**
A library that lets you interact with a database using code (objects and functions) instead of writing raw SQL. Instead of `SELECT * FROM User WHERE email = 'x@y.com'`, you write `prisma.user.findUnique({ where: { email } })`. The ORM translates your code into SQL behind the scenes.

**Prisma**
The specific ORM used here. Prisma has two parts: a schema file (`backend/prisma/schema.prisma`) where you define your tables in a readable format, and a generated TypeScript client you import with `import { PrismaClient } from '@prisma/client'`. Running `npx prisma db push` reads the schema and creates or updates the actual tables in `dev.db`.

**Prisma Studio**
A visual browser-based interface Prisma provides. Running `npm run db:studio` opens it at `http://localhost:5555`. You can view, add, edit, and delete database records through a UI instead of writing queries.

**Schema**
The definition of your database's structure — what tables exist, what columns each table has, and what types those columns are. In `schema.prisma`, the `model User { ... }` block defines the User table.

**Migration**
The process of updating a database schema after you change it. This project uses `prisma db push` which is a simpler method — it just pushes the schema directly without tracking migration history files.

**UUID**
Universally Unique Identifier. A randomly generated ID string (like `93e99ee5-e8a0-4e88-b354-38a2d438135e`). All database records in this project use UUIDs as primary keys instead of auto-incrementing integers. The schema sets this with `@default(uuid())`.

**JSON stored as String**
A pattern used in this project to store complex data in SQLite. SQLite does not have a native JSON column type. So fields like `answers`, `shapData`, and `rounds` are stored as serialized JSON strings (using `JSON.stringify()` before saving, `JSON.parse()` after reading). This is a known tradeoff of using SQLite.

### Authentication

**Authentication vs. Authorization**
Authentication is "who are you?" Authorization is "are you allowed to do this?" This project implements authentication (login/register) but only basic authorization — it checks that the child you are accessing belongs to the logged-in user.

**bcrypt**
A password hashing library. You never store a raw password in a database. You store a "hash" — a one-way scrambled version. When a user logs in, bcrypt hashes the entered password again and compares the hashes. `bcrypt.hash(password, 10)` creates the hash; `bcrypt.compare(enteredPassword, storedHash)` checks it. The `10` is the "salt rounds" — how many times the hashing runs. More rounds = slower to crack, slower to compute.

**JWT (JSON Web Token)**
A way to represent authentication state without storing sessions on the server. After a successful login or registration, the server creates a signed string (the token) that contains the user's ID and email. This token is sent back to the browser. The browser stores it in `localStorage` and sends it with every future request in the `Authorization: Bearer <token>` header. The server can verify the token's signature with its secret key to confirm it is genuine, without looking anything up in the database.

**`JWT_SECRET`**
The secret key used to sign and verify JWTs. It is stored in `.env` and should be a long random string in production. Anyone who knows this secret can forge tokens for any user.

**`localStorage`**
A browser API that stores key-value pairs that persist across page refreshes. In `index.html`, after login, `saveAuth()` stores the token, userId, and email in `localStorage` so the user stays logged in when they reload the page.

**Bearer Token**
The format for sending a JWT in an HTTP header: `Authorization: Bearer eyJhbGciOi...`. The `authMiddleware` in this project reads that header, strips `'Bearer '` off the front, and verifies the remaining string as a JWT.

### AI Service

**Microservice**
A separate, independently running service that does one specific job. The Python Flask app in `ai-service/` is a microservice — it only handles the `/predict` and `/health` endpoints. The Node.js backend calls it over HTTP, like calling any external API.

**Flask**
A lightweight Python web framework. The Python equivalent of Express. Used here to create the AI service with just two endpoints.

**Logistic Regression**
A machine learning algorithm for classification tasks (assigning something to a category). Despite the name, it is used for classification not regression. Here it classifies M-CHAT-R answers into three risk categories: LOW, MEDIUM, HIGH.

**scikit-learn**
Python's main machine learning library. Used here to implement the `LogisticRegression` model and `StandardScaler`.

**StandardScaler**
A preprocessing step that scales all numeric features to have a mean of 0 and standard deviation of 1. Machine learning models perform better when all input features are on a similar numeric scale. Without scaling, the "age in months" value (e.g., 24) would dominate the binary answer values (0 or 1).

**Synthetic data**
The training data for the model was not collected from real patients — it was generated programmatically in `train_model.py`. The script generates 2000 random sets of M-CHAT-R answers, computes what the clinical score would be, and uses those as labeled training examples. This means the model is learning to replicate the clinical scoring rules, not learning from real medical data.

**SHAP (SHapley Additive exPlanations)**
A method for explaining machine learning model predictions. For any given prediction, SHAP assigns each input feature an "importance value" — how much did this particular feature push the prediction toward a higher or lower risk score. Positive SHAP values indicate a feature contributed to a higher risk prediction; negative values indicate it pushed toward lower risk.

**`LinearExplainer`**
The specific SHAP explainer class used here, appropriate for linear models like logistic regression.

**joblib**
A Python library for saving and loading Python objects (like trained ML models) to/from files. `joblib.dump(model, 'model.pkl')` saves the model; `joblib.load('model.pkl')` loads it. The `.pkl` extension stands for "pickle" — Python's object serialization format.

**`AbortSignal.timeout(5000)`**
A Node.js/browser API that sets a timeout on a `fetch` request. If the AI service does not respond within 5 seconds, the request is aborted. This is used in `screening.ts` so that a slow or unavailable AI service does not freeze the whole screening submission.

### Frontend

**SPA (Single-Page Application)**
A web app that loads one HTML file and then updates the content on the page dynamically using JavaScript, rather than loading a new HTML page for each navigation action. This project is an SPA — there is one `index.html` file and the `navigate()` function in the script handles all page transitions by showing/hiding `<div>` elements with a `.page` class.

**Hash routing**
A way to handle navigation in an SPA using the URL hash (the `#` part). When you click "Games," the URL changes from `/` to `/#games`. On page load, the code reads `window.location.hash` to know which page to show. This is simpler than server-side routing but means the hash is part of your URL.

**Tailwind CSS**
A utility-first CSS framework. Instead of writing custom CSS classes like `.card { background: white; padding: 16px; }`, you apply small utility classes directly in HTML: `class="bg-white p-4"`. Loaded here via CDN in the `<script src="https://cdn.tailwindcss.com">` tag.

**IntersectionObserver**
A browser API that lets you know when an element enters the visible viewport (screen area). Used here for scroll animations — elements with class `.reveal` are observed, and when they scroll into view, the class `.revealed` is added which triggers a CSS fade-in animation.

**`window.event`**
A browser property that references the current DOM event. Used in `answerQuestion()` to get a reference to the button that was clicked in order to add a brief scale animation.

**`URL.createObjectURL(blob)`**
A browser API used in `downloadReport()`. When the PDF bytes arrive from the server as a binary blob, this creates a temporary URL pointing to that data in memory, which is then used to trigger a file download.

### Deployment

**Render**
A cloud hosting platform. Used to deploy both the Node.js backend and the Python AI service. The free tier causes services to "spin down" (go to sleep) after 15 minutes of inactivity, leading to cold start delays of up to 60 seconds on first visit.

**Blueprint (`render.yaml`)**
Render's configuration-as-code format. Instead of manually creating services in the Render dashboard, you define both services in a `render.yaml` file. Render reads it and provisions both services automatically.

**Ephemeral storage**
On Render's free tier, the file system is not permanent. When a service restarts or redeploys, any files written to disk (like `dev.db`) are wiped. This means all database data is lost on each redeploy.

**Private networking**
In `render.yaml`, the Node.js backend references the AI service via `fromService.property: hostport`. This creates a private internal network link between the two services so they can communicate without going through the public internet.

**Environment variable**
A key-value pair injected into a running process that the code can read with `process.env.VARIABLE_NAME` (Node.js) or `os.environ.get('VARIABLE_NAME')` (Python). Used here for `DATABASE_URL`, `JWT_SECRET`, `PORT`, and `AI_SERVICE_URL`. This keeps secrets out of the code.

---

## 3. File-by-File Walkthrough

### `index.html` (3502 lines)

The entire frontend. Every page — home, sign-up, screening, games, results, progress, resources, report — exists as a `<div id="page-X" class="page">` block inside this one file. Pages are shown by adding the `.active` class and hidden by removing it.

The `<script>` block at the bottom (starting around line 2918) contains all the application logic:

- **`state` object**: A global JavaScript object that holds the current application state in memory — which page you are on, whether you are logged in, the current JWT token, the active child's ID, the current screening answers, and the last screening result.
- **`apiCall(endpoint, options)`**: A wrapper around the browser's `fetch()` function. It automatically prepends `API_BASE` (which is `window.location.origin` — the same server that served the page), sets the `Content-Type: application/json` header, and attaches the Bearer token if the user is logged in.
- **`saveAuth / loadAuth / clearAuth`**: Functions that read from and write to `localStorage` to persist the authentication state across page reloads.
- **`navigate(page)`**: The page router. Hides all `.page` elements, shows the requested one, updates `window.location.hash`, updates nav link active states, and triggers page-specific initialization (like `initScreening()` or `loadProgress()`).
- **`handleAuthAndScreen(e)`**: Handles the sign-up form submission. Calls `POST /api/auth/register`, then immediately calls `POST /api/child` to create the child profile, then navigates to screening.
- **`handleLoginAndScreen(e)`**: Handles the login form. Calls `POST /api/auth/login` and restores the first child from the returned data.
- **`answerQuestion / submitScreening`**: Handles the 20-question flow, collects answers into `state.screeningAnswers`, and when complete, calls `POST /api/screening`.
- **`startGame / renderGameRound / endGame`**: The three game engines (MATCH_FACE, ODD_ONE_OUT, TAP_COLOR) render game content into a `<main>` element and track rounds. After 10 rounds, `endGame()` calls `POST /api/game/session`.
- **`loadProgress()`**: Called when navigating to the progress page. Fetches from `GET /api/progress/:childId` and updates the DOM elements with real data.
- **`downloadReport()`**: Fetches `GET /api/report/:childId` as a binary blob and triggers a browser file download.

### `backend/src/index.ts`

The entry point for the backend. Imports and mounts all route handlers, enables CORS (so the frontend can call the API), serves the `index.html` file as a static file, and starts the HTTP server on port 3001.

Key line: `app.use(express.static(path.join(__dirname, '../../')))` — this makes Express serve the parent directory's `index.html` when you visit `http://localhost:3001`. The fallback route `app.get('/{*path}', ...)` handles all other URLs and returns `index.html`, enabling SPA routing.

### `backend/src/routes/auth.ts`

Imports: `express`, `bcryptjs`, `jsonwebtoken`, `@prisma/client`.

- **`POST /api/auth/register`**: Validates email/password, checks the email is not already taken, hashes the password with bcrypt, creates a User record, and returns a JWT.
- **`POST /api/auth/login`**: Finds the user by email, verifies the password with bcrypt, returns a JWT along with the user's children and their latest screenings and game sessions (all in one query using Prisma's `include`).

### `backend/src/routes/child.ts`

Imports: `express`, `@prisma/client`, `authMiddleware`.

Both routes require authentication (protected by `authMiddleware`).

- **`POST /api/child`**: Creates a child record linked to `req.user.id` (the logged-in user's ID from the JWT).
- **`GET /api/child`**: Returns all children for the logged-in user, with their screenings and game sessions. Parses the JSON string fields (`answers`, `shapData`, `rounds`) before returning.

### `backend/src/routes/screening.ts`

Imports: `express`, `@prisma/client`, `authMiddleware`, `scoreMCHATR`.

**`POST /api/screening`** (requires auth):
1. Validates the `childId` and `answers` fields are present.
2. Verifies the child belongs to the logged-in user (`findFirst` with both `id` and `userId`).
3. Calls `scoreMCHATR(answers)` to get the clinical score, risk level, and SHAP-like values.
4. Tries to call the Python AI service at `process.env.AI_SERVICE_URL/predict` with a 5-second timeout. If the AI service is available, its results override the clinical scoring's `riskLevel` and `riskScore`.
5. Saves the screening to the database, storing the answers and SHAP data as JSON strings.
6. Returns the scoring result to the frontend.

### `backend/src/routes/game.ts`

Imports: `express`, `@prisma/client`, `authMiddleware`.

**`POST /api/game/session`** (requires auth): Accepts `childId`, `gameType`, and an array of `rounds` objects (`{ correct: boolean, responseTimeMs: number }`). Computes summary statistics (accuracy, avgResponseTimeMs) and saves the session. Validates that `gameType` is one of `MATCH_FACE`, `ODD_ONE_OUT`, or `TAP_COLOR`.

### `backend/src/routes/progress.ts`

Imports: `express`, `@prisma/client`, `authMiddleware`.

**`GET /api/progress/:childId`** (requires auth): Computes and returns a summary of game performance:
- Fetches all game sessions and screenings for the child.
- Calculates 7-day accuracy and previous 7-day accuracy (to show change).
- Builds a daily activity count for the last 7 days.
- Calculates a "streak" — consecutive days with at least one game session (checked up to 30 days back).
- Identifies the strongest and weakest game types by accuracy.

### `backend/src/routes/report.ts`

Imports: `express`, `@prisma/client`, `authMiddleware`, `generatePDFReport`.

**`GET /api/report/:childId`** (requires auth): Fetches the child with their latest screening and all game sessions. Passes this data to `generatePDFReport()`. Sets the response headers to `application/pdf` and `Content-Disposition: attachment` so the browser downloads the file instead of displaying it.

### `backend/src/routes/dashboard.ts`

**`GET /api/dashboard/:childId`** (requires auth): Returns a combined data summary used for the home/dashboard view — child info, the latest screening, game stats for the last 7 days, streak, and a dynamically generated `nextAction` string based on what the user has done so far.

### `backend/src/middleware/auth.ts`

A single exported function `authMiddleware(req, res, next)`. Reads the `Authorization` header, extracts the token, verifies it with `jwt.verify()` and the `JWT_SECRET`, and either attaches `req.user = { id, email }` and calls `next()` to continue, or returns a 401 response.

### `backend/src/utils/mchat-scorer.ts`

Pure logic, no database or network calls. Exports `scoreMCHATR(answers)`.

For each of the 20 questions, it looks up whether "yes" or "no" is the at-risk answer (defined in `AT_RISK_ANSWER`). It counts how many at-risk answers were given and maps that count to a risk level: 0-2 = LOW, 3-7 = MEDIUM, 8-20 = HIGH.

It also generates SHAP-like importance values. This is not real SHAP — it uses a simple formula: critical items get a weight of 0.8, non-critical get 0.4, and a small random jitter is added. These values are only used as fallback when the Python AI service is not available.

### `backend/src/utils/pdf-generator.ts`

Imports: `pdf-lib`.

Exports `generatePDFReport(data)`. Builds a PDF document from scratch using `pdf-lib`'s low-level drawing API — placing rectangles, text, and colored bars at precise coordinates. Returns the PDF as a `Uint8Array` (raw bytes). Contains a helper function `safe(s)` that strips non-Latin1 characters because the Helvetica font (which is embedded) cannot encode them.

### `backend/prisma/schema.prisma`

Defines four database tables:
- **User**: `id`, `name` (optional), `email` (unique), `password`, `children` (relation), `createdAt`.
- **Child**: `id`, `name`, `ageMonths`, `gender` (optional), `userId` (foreign key to User), `screenings` (relation), `gameSessions` (relation), `createdAt`.
- **Screening**: `id`, `childId`, `answers` (JSON string), `mchatScore`, `riskLevel`, `aiProbability` (optional), `shapData` (optional JSON string), `createdAt`.
- **GameSession**: `id`, `childId`, `gameType`, `accuracy`, `avgResponseTimeMs`, `totalRounds`, `correctRounds`, `rounds` (JSON string), `playedAt`.

### `ai-service/train_model.py`

A script you run once to generate and train the model. It does not run during the app's operation. Generates 2000 synthetic M-CHAT-R answer sets with biased probabilities (50% low-risk, 30% medium, 20% high distribution), scores them using the clinical rules, trains a LogisticRegression model on that data, and saves `model.pkl`, `scaler.pkl`, and `feature_names.pkl`.

### `ai-service/app.py`

The running prediction service. On startup, it loads the three `.pkl` files and creates a SHAP LinearExplainer. The `/predict` endpoint accepts a JSON body with 20 binary answers and `ageMonths`, scales the features using the saved scaler, runs the model, gets probabilities, computes SHAP values, and returns the result. The `/health` endpoint just confirms the service is alive.

### `render.yaml`

Defines two Render services:
- `spectrumcare-ai`: Python web service, runs `python app.py`.
- `spectrumcare`: Node.js web service, runs `npx prisma db push && npm start` on startup. References the AI service's internal host via private networking.

---

## 4. Flow-by-Flow Walkthrough

### Flow 1: New User Signs Up and Completes a Screening

**Step 1 — User fills in the sign-up form** in `index.html`, enters email, password, child's name, age, and gender, and clicks submit.

**Step 2 — `handleAuthAndScreen(e)`** runs in the browser. It calls `apiCall('/api/auth/register', { method: 'POST', body: ... })`.

**Step 3 — `POST /api/auth/register`** in `auth.ts` receives the request. It checks the email does not already exist, hashes the password with bcrypt (10 rounds), and calls `prisma.user.create()` to insert a new row in the User table. It generates a JWT signed with `JWT_SECRET` and returns `{ token, user }`.

**Step 4 — Back in the browser**, `saveAuth()` stores the token in `localStorage`. Then `apiCall('/api/child', { method: 'POST', ... })` is called to create a child profile.

**Step 5 — `POST /api/child`** in `child.ts` runs `authMiddleware` first (validates the JWT from the header), then calls `prisma.child.create()` linking the child to `req.user.id`.

**Step 6 — `navigate("screening")`** is called in the browser. `initScreening()` runs, setting `currentQuestion = 0` and rendering Question 1.

**Step 7 — User answers all 20 questions**. Each click calls `answerQuestion(true/false)` which stores the answer in `state.screeningAnswers` and renders the next question.

**Step 8 — After question 20**, `submitScreening()` calls `POST /api/screening` with `{ childId, answers }`.

**Step 9 — `POST /api/screening`** in `screening.ts`:
- Validates the request and verifies the child belongs to the user.
- Calls `scoreMCHATR(answers)` to get the clinical result.
- Tries to call `${AI_SERVICE_URL}/predict` with a 5-second timeout.
  - If the AI service responds, its `riskLevel` and `riskScore` override the clinical values.
  - If not, continues with the clinical result.
- Calls `prisma.screening.create()` to save the record.
- Returns the result to the frontend.

**Step 10 — `renderResults(result)`** updates the gauge SVG, badge color, description text, and SHAP bar chart in the results page. `navigate("results")` shows the page.

---

### Flow 2: Returning User Logs In

**Step 1** — User clicks the Login tab, enters email and password, submits.

**Step 2 — `handleLoginAndScreen(e)`** calls `POST /api/auth/login`.

**Step 3 — `auth.ts`** finds the user by email, runs `bcrypt.compare()`, generates a JWT, and returns `{ token, user, children }`. The children are fetched with their most recent screening and last 5 game sessions included in the same query (`include: { screenings: { take: 1 }, gameSessions: { take: 5 } }`).

**Step 4 — Back in the browser**, `saveAuth()` stores the token. The first child's ID and name are stored in state. If a previous screening exists, it is stored as `state.lastScreeningResult`. `navigate("screening")` runs.

---

### Flow 3: Playing a Therapy Game

**Step 1** — User navigates to Games page and clicks one of the three game buttons. `startGame('MATCH_FACE')` (or another type) runs.

**Step 2 — `navigate('game')`** shows the game page. `renderGameRound()` is called. Because `gameState.type === 'MATCH_FACE'`, it calls `renderMatchFace(main)`.

**Step 3** — `renderMatchFace` picks a random target emotion and three decoys, shuffles them, and injects HTML buttons into the `<main>` element. `gameState.startTime = Date.now()` is recorded.

**Step 4** — User clicks a button. `handleGameAnswer(selected, correct)` runs. It computes `responseTimeMs = Date.now() - gameState.startTime`, records whether the answer was correct, and pushes `{ correct, responseTimeMs }` into `gameState.rounds`. After 10 rounds, `endGame()` is called.

**Step 5 — `endGame()`** shows the results summary in the DOM, then calls `POST /api/game/session` with `{ childId, gameType, rounds }`.

**Step 6 — `game.ts`** validates the request, computes `accuracy` and `avgResponseTimeMs` from the `rounds` array, and calls `prisma.gameSession.create()`.

---

### Flow 4: Viewing Progress

**Step 1** — User taps the Progress tab. `navigate('progress')` runs. Because the page is "progress", `loadProgress()` is called.

**Step 2 — `loadProgress()`** calls `GET /api/progress/:childId`.

**Step 3 — `progress.ts`** queries all game sessions and screenings for the child. Computes:
- 7-day accuracy and week-over-week change.
- Average response time for the last 7 days.
- Daily activity counts (sessions per day for the last 7 days).
- Streak (consecutive days with sessions).
- Strongest and weakest game type.

**Step 4 — Back in the browser**, the response data is used to update DOM elements: the stat card numbers, the bar chart heights, and the insight labels.

---

### Flow 5: Downloading a PDF Report

**Step 1** — User clicks "Download PDF Report." `downloadReport()` runs.

**Step 2** — A `fetch()` call to `GET /api/report/:childId` is made with the Bearer token in the header. The button is temporarily disabled and shows a loading spinner.

**Step 3 — `report.ts`** fetches the child with their latest screening and all game sessions. It calls `generatePDFReport(data)` from `pdf-generator.ts`.

**Step 4 — `pdf-generator.ts`** creates a new PDF document using `pdf-lib`, draws a colored header bar, child info section, risk badge, SHAP bar chart for the top 8 factors, game performance summary, risk-level-specific recommendations, a disclaimer, and a footer. Returns the PDF as bytes.

**Step 5 — `report.ts`** sets `Content-Type: application/pdf` and `Content-Disposition: attachment; filename=...` on the response and sends the bytes.

**Step 6 — Back in the browser**, the bytes arrive as a `Blob`. `URL.createObjectURL(blob)` creates a temporary download URL. A fake `<a>` element is created, clicked programmatically, and immediately removed. The browser starts the file download.

---

## 5. System Architecture Diagrams

### Component Overview

```
+------------------+      HTTP/443      +---------------------------+
|                  |  (same origin)     |                           |
|   Browser        +-------------------->   Node.js / Express       |
|   index.html     |                   |   backend/src/index.ts     |
|   (vanilla JS)   <--------------------+   Port 3001               |
|                  |   JSON response    |                           |
+------------------+                   +------+--------------------+
                                               |                    |
                                               |  Prisma ORM        |
                                               |                    |
                                               v                    |
                                      +--------+---------+          |
                                      |                  |          |
                                      |  SQLite          |          |
                                      |  dev.db          |          |
                                      |                  |          |
                                      +------------------+          |
                                                                    |
                                               +--------------------+
                                               |  fetch() to AI service
                                               |  (5s timeout)
                                               v
                                      +------------------+
                                      |                  |
                                      |  Python / Flask  |
                                      |  ai-service/     |
                                      |  Port 5001       |
                                      |                  |
                                      +------------------+
```

### Authentication Flow

```
Browser                         Express backend                  SQLite
  |                                    |                             |
  |-- POST /api/auth/register -------> |                             |
  |   { email, password, name }        |                             |
  |                                    |-- bcrypt.hash(password) --> |
  |                                    |-- prisma.user.create() ---> |
  |                                    |                   <---------+
  |                                    |-- jwt.sign({ id, email })   |
  |<-- { token, user } --------------- |                             |
  |                                    |                             |
  |  saveAuth() -> localStorage        |                             |
  |                                    |                             |
  |-- POST /api/screening -----------> |                             |
  |   Authorization: Bearer <token>    |                             |
  |                                    |-- jwt.verify(token) ------> verify
  |                                    |   req.user = { id, email }  |
  |                                    |-- prisma.screening.create() |
  |<-- { riskLevel, shapValues } ----- |                             |
```

### Screening Scoring Flow

```
Frontend               screening.ts               mchat-scorer.ts        AI service (optional)
   |                        |                           |                        |
   |-- POST /api/screening ->|                           |                        |
   |   { childId, answers } |                           |                        |
   |                        |-- scoreMCHATR(answers) -->|                        |
   |                        |                           |-- count at-risk answers |
   |                        |                           |-- compute riskLevel    |
   |                        |                           |-- generate SHAP values |
   |                        |<-- { mchatScore,          |                        |
   |                        |     riskLevel, shapValues}|                        |
   |                        |                                                    |
   |                        |-- fetch(AI_SERVICE_URL/predict, timeout:5s) ------>|
   |                        |                                                    |
   |                        |<-- { riskLevel, riskScore, shapValues } -----------|
   |                        |   (overrides clinical result if available)         |
   |                        |                                                    |
   |                        |-- prisma.screening.create()                        |
   |<-- result -------------|                                                    |
```

### Data Flow for a Game Session

```
Browser (game engine)              backend/routes/game.ts           SQLite
      |                                    |                           |
      | User plays 10 rounds               |                           |
      | gameState.rounds = [               |                           |
      |   { correct: true, responseTimeMs: 1200 },                    |
      |   { correct: false, responseTimeMs: 2100 },                   |
      |   ...                              |                           |
      | ]                                  |                           |
      |                                    |                           |
      |-- POST /api/game/session ---------->|                          |
      |   { childId, gameType, rounds }    |                           |
      |                                    |-- compute accuracy        |
      |                                    |-- compute avgResponseTimeMs
      |                                    |-- prisma.gameSession.create()
      |                                    |                   ------->|
      |<-- { id, accuracy, playedAt } -----|                           |
```

---

*End of PROJECT.md*
