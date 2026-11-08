# HustleHub+ Freelance Marketplace

INSY7314 – POE Part 3. A secure MERN-stack marketplace where Clients book services from Freelancers. Part 1 built the secure authentication backend. Part 2 added MongoDB, gigs, bookings, transactions, income tracking, more security middleware, a React frontend and automated tests. Part 3 adds a South African income-tax estimate and income dashboard, structured logging to a cloud platform, Docker, account lockout and an audit trail, a GitHub Actions CI/CD pipeline and static code analysis.

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Users and Roles](#2-users-and-roles)
3. [System Architecture](#3-system-architecture)
4. [Data Flow: Register and Login](#4-data-flow-register-and-login)
5. [Security Design Decisions](#5-security-design-decisions)
6. [Security Risks and Mitigations](#6-security-risks-and-mitigations)
7. [Part 2 Features and API](#7-part-2-features-and-api)
8. [Setup: Running the Application](#8-setup-running-the-application)
9. [Testing](#9-testing)
10. [CI/CD Pipeline](#10-cicd-pipeline)
11. [Static Code Analysis](#11-static-code-analysis)
12. [Tax Estimate and Income Dashboard](#12-tax-estimate-and-income-dashboard)
13. [Logging and Monitoring](#13-logging-and-monitoring)
14. [Docker](#14-docker)
15. [Additional Security Features](#15-additional-security-features)
16. [Demonstration Video](#16-demonstration-video)
17. [Appendix A: Part 1 Feedback Checklist](#appendix-a-part-1-feedback-checklist)
18. [Appendix B: Part 1 Evidence Screenshots](#appendix-b-part-1-evidence-screenshots)

---

## 1. System Overview

The problem. Freelancers and clients often deal through chat apps and DMs, where identities cannot be verified, work is not recorded and payments cannot be traced. A platform that holds credentials and earnings is also an attractive target for attackers.

Our solution. HustleHub+ is a marketplace that treats security as a core requirement. Freelancers publish gigs (title, description, price, category). Clients browse and book them. Each booking creates a **transaction** linking client and freelancer, and the freelancer's income is updated automatically. Payment is simulated: no card data is collected or stored.

| Area | What it provides | Part |
|---|---|---|
| Authentication | Validated registration, bcrypt password hashing, JWT login | 1 |
| Authorisation | Role-based access control plus ownership checks | 1 and 2 |
| Persistence | MongoDB with User, Gig, Booking and Transaction models | 2 |
| Marketplace | Gig CRUD, bookings, transactions, freelancer income | 2 |
| Hardening | Rate limiting, NoSQL and XSS sanitising, Helmet and CSP, HTTPS, CORS allow-list, safe errors | 1 and 2 |
| Frontend | React app: register, login, browse, book, dashboard | 2 |
| Testing | Postman and Newman (API), React Testing Library with Vitest (UI), Node test runner (backend unit tests) | 2 and 3 |
| Tax and dashboard | Estimated South African income tax and a dashboard with summary cards and charts | 3 |
| Logging | Winston logs with secrets redacted, shipped to Better Stack | 3 |
| Containers | Docker images and a Compose stack for the API, frontend and database | 3 |
| Account protection | Per-account lockout and an audit trail of sensitive actions | 3 |
| Pipeline | GitHub Actions: build, test, security scans and Docker build; CodeQL static analysis | 3 |

Stack: MongoDB and Mongoose, Node.js with Express 4 over HTTPS, React 18 (Vite), plus bcrypt, jsonwebtoken, helmet, cors, express-rate-limit, express-mongo-sanitize, express-validator, Winston, Recharts, Docker and GitHub Actions.

---

## 2. Users and Roles

| Action | Public | Client | Freelancer | Admin |
|---|:---:|:---:|:---:|:---:|
| Register / log in | Yes | Yes | Yes | Yes |
| View gigs | Yes | Yes | Yes | Yes |
| Create a gig | 401 | 403 | Yes | 403 |
| Edit / delete a gig | 401 | 403 | Own gigs only | 403 |
| Book a gig | 401 | Yes | 403 | 403 |
| View own bookings | 401 | Yes | Yes (on own gigs) | Yes (all) |
| View income | 401 | 403 | Yes | 403 |
| View tax estimate | 401 | 403 | Yes | 403 |

- **Client:** hires freelancers. This is the default role at registration.
- **Freelancer:** sells gigs, sees bookings made on them and tracks income.
- **Administrator:** exists in the data model and RBAC middleware and can see all bookings. Admins cannot be created through the public form (it only accepts client or freelancer), so admin accounts are created directly in the database. Admin tooling is out of scope for this phase.

---

## 3. System Architecture

This shows the components and where each sits in the MERN stack. The flow diagrams in section 4 show how data moves between them.

<p align="center"><b>Architecture</b><br><img src="docs/diagrams/architecture.png" width="300"></p>


| MERN layer | Components | Responsibility |
|---|---|---|
| React  | client/src pages, components, AuthContext, PrivateRoute, axiosInstance.js | UI, route protection, session state, safe rendering |
| Express | server.js, routes/, middlewares/ | HTTPS server, middleware pipeline, JWT and role checks, validation |
| Node.js | controllers/, services/, utils/, config/env.js, config/logger.js | Business logic (booking, income, tax, ownership), audit trail, configuration, logging |
| MongoDB | models/, Atlas database or the Compose `mongo` container | Persistent storage |
| Docker | docker-compose.yml, Dockerfile, client/dockerfile | Runs the database, API and frontend together (section 14) |

---

## 4. Data Flow: Register and Login

Rectangles are processes, cylinders are data stores, dotted arrows are failure responses.

### 4.1 Registration

<p align="center"><b>Registration</b><br><img src="docs/diagrams/register-dfd.png" width="300"></p>

1. **React form:** react-hook-form checks the fields for usability only. The server never trusts it.
2. **Perimeter:** HTTPS, Helmet headers, CORS origin check, and a 10 KB body limit (413 if exceeded).
3. **Sanitise:** express-mongo-sanitize strips $ and . keys (NoSQL injection). A custom middleware strips HTML tags from all strings (XSS).
4. **Rate limit:** 5 registrations per IP per 15 minutes, then 429.
5. **Validate:** username 3+ alphanumeric, valid email, password 8+ with upper, lower and digit, role client or freelancer. Failures return 400 with per-field errors.
6. **Duplicate check:** an existing email returns 400.
7. **Hash:** bcrypt with a per-user salt. The plain password is never stored or logged.
8. **Save and respond:** 201 with the user minus the password hash. React then logs the user in.

### 4.2 Login

<p align="center"><b>Login</b><br><img src="docs/diagrams/login-dfd.png" width="300"></p>

1. **React form:** checks that email and password are present and well formed.
2. **Perimeter and sanitise:** same protections as registration.
3. **Rate limit:** counts failed attempts only (5 per 15 minutes per IP), so genuine users are never locked out by their own successful logins.
4. **Validate:** valid email, password present.
5. **Look up** the user by email.
6. **Compare** the password with the stored hash. An unknown email and a wrong password return the same 401 Invalid email or password., so attackers cannot tell which accounts exist.
7. **Issue JWT:** payload is only id and role, signed with a secret from the environment, valid 7 days.
8. **Browser:** React stores the token and an Axios interceptor sends `Authorization: Bearer <token>` on every later request. The server then runs verifyToken, then requireRole, then an ownership check in the controller.

---

## 5. Security Design Decisions

### 5.1 JWT instead of server-side sessions

| | JWT in Authorization header  | Server-side sessions |
|---|---|---|
| State | In the signed token | In a server session store |
| Cost per request | Signature check only | Store lookup every request |
| Scaling | Any API instance can verify it | Needs shared store or sticky sessions |
| React SPA on another origin | Simple header | Needs cross-site cookies and CSRF protection |
| Revocation | Hard until expiry | Easy |

We chose JWT because the SPA and API run on different origins and the API is stateless JSON. **Trade-off:** a stolen token cannot be revoked early. We mitigate this with a pinned algorithm (HS256), a strong secret loaded from .env (the server refuses to start without it) and an expiry. A production system would use short-lived tokens plus refresh tokens.

### 5.2 Other decisions

| Area | Chosen | Alternatives rejected | Why |
|---|---|---|---|
| Password storage | bcrypt, 10 rounds, per-user salt | Plain text; MD5 or SHA-256; Argon2id | Fast hashes can be brute-forced on GPUs. bcrypt is slow by design, mature and well supported. Argon2id is also strong but less established in Node |
| Input validation | express-validator on the server | Client-only checks; Joi or Zod; manual if checks | The browser can be bypassed, so the server must validate. It plugs into Express middleware and includes sanitisers |
| NoSQL injection | **express-mongo-sanitize** plus Mongoose type casting | Trusting Mongoose alone | Stops operator payloads such as `{"$gt": ""}` reaching queries |
| XSS | Server tag stripping, React escaping, DOMPurify, CSP | One layer only | Overlapping layers. Output encoding is the primary defence |
| Brute force and abuse | express-rate-limit: login 5 failed per 15 min, register 5 per 15 min, bookings 10 per hour, all other API routes 300 per 15 min | CAPTCHA; WAF | CAPTCHA needs a third party. A WAF suits production. Per-account lockout is added as well (see the next rows) |
| Headers | Helmet (CSP, HSTS, nosniff, frame protection, hides X-Powered-By) | Hand-set headers | Easy to get wrong manually |
| Access control | RBAC (requireRole) plus ownership checks in controllers | Hiding buttons in React; full ABAC | UI hiding is cosmetic. Ownership checks stop one freelancer editing another's gig |
| Transport | HTTPS (self-signed in development) | Plain HTTP | Protects passwords and tokens in transit. Production would use a CA certificate |
| Errors | Global handler with generic messages. One message for unknown email and wrong password | Raw errors | No stack paths, queries or account enumeration |
| Secrets | .env, git-ignored. *.pem also ignored. Fails fast if JWT_SECRET is missing | Hard-coded secrets | Secrets never reach the repository |
| Payments | Simulated transactions only | Real card processing | No card data held, so no PCI-DSS exposure |
| Token storage | localStorage with Axios interceptor | httpOnly cookie | Simple with a separate API origin. XSS could read it, which we offset with DOMPurify, React escaping, tag stripping and CSP. Cookies would need CSRF protection |
| Account lockout | Lock the account for 15 minutes after 5 failed passwords, stored in MongoDB (`failedLoginAttempts`, `lockoutUntil`) | IP rate limiting alone | An IP limiter can be bypassed by rotating IP addresses, and its counters reset on restart. The lock follows the account and survives restarts. **Trade-off:** an attacker can lock a victim out on purpose, so the lock is short and every lock is logged |
| Audit trail | `AuditLog` collection in MongoDB: who, what, when and from which IP | Application log files only | Security-relevant actions are kept as queryable records, separate from the operational logs, so they can be reviewed after an incident |
| Logging | Winston with redaction, local files and Better Stack | console.log; no logging | Structured, levelled, timestamped logs are needed to detect attacks. Redaction keeps passwords, tokens and database credentials out of every log |
| Containers | Multi-stage Docker builds, Alpine base images, non-root user, patched packages, secrets from a git-ignored env file | Running on the host; baking secrets into images | Small images with a limited user reduce the impact of a compromise, and no secret is ever stored in an image layer |
| Tax estimate | Bracket table in `services/taxService.js` (SARS 2026/27) with the primary rebate | A flat rate; a third-party tax API | The brackets are public and change once a year, so a local table is accurate, testable and has no external dependency |

---

## 6. Security Risks and Mitigations

<p align="center"><b>Security</b><br><img src="docs/diagrams/defence-in-depth.png" width="300"></p>

Key:
1. "Transport: HTTPS" as L1 
2. "Headers: Helmet and CSP" as L2
3. "CORS allow-list" as L3
4. "10 KB body limit and rate limiting" as L4
5. "NoSQL and XSS sanitising" as L5
6. "express-validator" as L6
7. "Authentication: JWT" as L7
8. "Authorisation: role and ownership" as L8
9. "Data layer: Mongoose schema, bcrypt" as L9


| Threat | How it could be exploited | Mitigation | Verified by |
|---|---|---|---|
| Broken access control (A01) | Client creates gigs, freelancer edits another's gig, client reads income | requireRole, ownership checks | Newman folders 1 and 3 |
| Cryptographic failures (A02) | Database leak, traffic sniffing | bcrypt, no password in responses, HTTPS, .env | Newman login tests |
| NoSQL injection (A03) | `{"email": {"$gt": ""}}` bypasses login | mongo-sanitize, Mongoose, validator, `$eq` on login and register lookups, typed field whitelist on gig update | Newman folder 4, CodeQL (section 11) |
| XSS (A03) | `<script>` in a gig title runs in other browsers | Tag stripping, React escaping, DOMPurify, CSP | Newman folder 4, frontend test |
| Abuse and brute force (A04, A07) | Password guessing, spam accounts or bookings | Rate limiters, strong password rules, identical login errors | Newman folder 5 (429) |
| Forged tokens (A07) | Tampered or unsigned JWT | Signed HS256 JWT with expiry | Newman folder 4 (401) |
| Misconfiguration (A05) | Missing headers, verbose errors | Helmet, CORS allow-list, generic errors | Newman setup folder |
| Denial of service | Huge bodies, floods | 10 KB limit (413), rate limits | Newman folder 4 |
| Vulnerable components (A06) | Outdated packages | Locked versions. `npm audit`, Gitleaks and a Grype image scan run in the CI pipeline on every push | CI pipeline (section 10) |
| Account takeover by guessing (A07) | Many password guesses against one account, spread across IP addresses | Per-account lockout (5 failures, 15 minutes), IP rate limiter, identical 401 for unknown email and wrong password | Account lockout screenshots (section 15.1), Newman folder 5 |
| Insufficient logging and monitoring (A09) | Attacks go unnoticed and there is no record of who did what | Winston logs shipped to Better Stack, audit trail in MongoDB | Sections 13 and 15.2 |
| Sensitive data in logs (A02, A09) | Passwords, tokens or database credentials end up in log files or the cloud platform | Redaction layer, masked emails, no request bodies or query strings logged | Backend unit tests (section 9.3), Better Stack screenshots |
| Secrets exposure (A02, A05) | Keys or tokens committed to git or baked into images | `.env` and `*.pem` git-ignored, Docker `env_file` and mounted certificates, `.dockerignore` files, Gitleaks scan in CI | Sections 10.4 and 14 |
| Vulnerable container images (A06) | Known flaws in the base image | Node 22 Alpine base, `apk upgrade`, npm removed from the runtime image, non-root user, Grype scan in CI | Section 10.6 |
| Insecure code patterns (A03, A04) | Injection, ReDoS, prototype pollution and missing rate limits in our own code | CodeQL analysis with every finding fixed | Section 11 |

Known limitations and next steps

- JWT lasts 7 days and cannot be revoked. Use short-lived access tokens with refresh tokens.
- Token is in localStorage. An httpOnly cookie plus CSRF token would remove XSS token theft.
- Helmet's default CSP is used. A custom policy should be set on the host that serves the React app.
- Rate-limit counters are in memory. They reset on restart. A Redis store would fix this.
- Gig and booking routes lack express-validator rules. A negative price or malformed ID returns a generic 500 instead of a precise 400.
- Stack traces are returned when NODE_ENV=development. Always run production with NODE_ENV=production.
- The booking and income update are separate writes. A MongoDB transaction would make them atomic.
- The dashboard Edit button points to a route that does not exist yet. The PUT /api/gigs/:id endpoint is ready for it.
- Account lockout can be used to lock a victim out for 15 minutes, and the "temporarily locked" reply confirms that the account exists.
- Docker Compose publishes MongoDB on port 27017 without authentication and uses the unpinned `mongo:latest` image. This is acceptable for local development only. A real deployment would use database authentication, a private network and a pinned version.
- The frontend container serves plain HTTP (nginx). A real deployment would put TLS in front of it.
- The CORS allow-list used when `NODE_ENV=production` contains a placeholder domain, which must be replaced before deployment. The Docker demonstration runs with `NODE_ENV=development` for this reason.
- The audit trail has no read endpoint. Entries are read from MongoDB directly. A temporary route used for screenshots was removed because it was unauthenticated.
- Early commits contained a development `.env` and a self-signed private key. Both are now git-ignored but remain in the git history. They were used for local development only, and a real deployment would use new secrets and certificates.

---

## 7. Part 2 Features and API

- **Gigs:** freelancers create gigs. Anyone can browse. Only the owner can edit or delete.
- **Bookings:** a client books a gig and the price is copied from the gig. Payment is simulated.
- **Transactions:** every booking creates a transaction linking client, freelancer and booking.
- **Income:** the freelancer's income rises by the gig price on each booking. GET /api/users/me/income returns the total and the transaction list.
- **Security additions:** NoSQL and XSS sanitising, rate limiting (login, register, bookings, plus a general limiter on all other routes), Helmet and CSP, RBAC with ownership checks.
- **Part 3 additions:** a tax estimate and income dashboard ([section 12](#12-tax-estimate-and-income-dashboard)), structured logging to Better Stack ([section 13](#13-logging-and-monitoring)), Docker ([section 14](#14-docker)), account lockout and an audit trail ([section 15](#15-additional-security-features)), and the CI/CD pipeline and static analysis ([section 10](#10-cicd-pipeline) and [section 11](#11-static-code-analysis)).

Base URL https://localhost:5000/api. Protected routes need `Authorization: Bearer <token>`. Errors look like { "status": 403, "message": "..." }, and validation errors add "errors": [{ "field", "message" }].

| Endpoint | Access | Notes |
|---|---|---|
| POST /auth/register | Public | username, email, password, optional role. 201, or 400 / 429 |
| POST /auth/login | Public | 200 with token and user. 400, 401, 429 |
| GET /auth/me | Logged in | Current user |
| GET /gigs | Public | { count, gigs } |
| GET /gigs/:id | Public | { gig } or 404 |
| POST /gigs | Freelancer | title, description, price, category. 201, 401, 403 |
| PUT /gigs/:id | Freelancer (owner) | 200, 403 if not owner, 404 |
| DELETE /gigs/:id | Freelancer (owner) | 200, 403, 404 |
| POST /bookings | Client | gigId. Creates booking and transaction, raises income. 201, 403, 404, 429 |
| GET /bookings/me | Logged in | Client: own. Freelancer: on own gigs. Admin: all |
| GET /users/me/income | Freelancer | { totalIncome, transactionCount, transactions }. 403 for clients |
| GET /users/me/tax | Freelancer | { taxYear, grossIncome, estimatedTax, netIncome, effectiveRate, breakdown, ... }. 401, 403 for clients (section 12) |
| GET /health | Public | API status |

---

## 8. Setup: Running the Application

**Prerequisites:** Node.js 18 or newer, Git, OpenSSL, and a MongoDB database (MongoDB Atlas or a local MongoDB Community Server). Install Newman for the API tests with npm install -g newman. Docker Desktop is only needed for the containerised run in [section 14](#14-docker).

**Main dependencies** (all installed by npm install)

| Part | Packages |
|---|---|
| Backend | express, mongoose, bcrypt, jsonwebtoken, express-validator, helmet, cors, express-rate-limit, express-mongo-sanitize, winston, @logtail/node, @logtail/winston, dotenv (nodemon for development) |
| Frontend | react, react-dom, react-router-dom, react-hook-form, axios, dompurify, recharts, vite |
| Testing | vitest, jsdom, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event |

### Backend (Terminal 1, project root)

1. Clone and install:

   ```bash
   git clone https://github.com/ChippsEthan/INSY7314Group.git
   cd INSY7314Group
   npm install
   ```

2. Create `.env` from the template (`cp .env.example .env`, or `copy .env.example .env` in PowerShell) and fill it in:

   ```env
   PORT=5000
   NODE_ENV=development
   JWT_SECRET=a_long_random_string_of_at_least_32_characters
   SALT_ROUNDS=10
   MONGO_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/hustlehub?appName=Cluster0
   LOG_LEVEL=info
   BETTERSTACK_SOURCE_TOKEN=
   BETTERSTACK_INGESTING_HOST=
   ```

   For a local database use `mongodb://localhost:27017/hustlehub`. The last three lines are optional logging settings ([section 13](#13-logging-and-monitoring)). Leave the Better Stack values empty to log to the console and the `logs/` folder only.

3. Generate the HTTPS certificate (press Enter through the prompts):

   ```bash
   openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
   ```

4. Start the API. You should see MongoDB connected successfully and the HTTPS address:

   ```bash
   npm start
   ```

5. Trust the certificate once: open <https://localhost:5000/api/health> in the browser, click **Advanced**, then **Proceed**.

### Frontend (Terminal 2)

```bash
cd client
npm install
cp .env.example .env     # contains VITE_API_URL=https://localhost:5000
npm run dev
```

Open <http://localhost:5173>. Register a freelancer and a client (use a private window for the second), post a gig as the freelancer, book it as the client, then check the freelancer dashboard.

.env, key.pem and cert.pem are git-ignored. Never commit them.

| Problem | Fix |
|---|---|
| JWT_SECRET is not defined | .env is missing or not in the project root |
| key.pem or cert.pem not found | Generate the certificate (step 3) |
| React app shows Network Error | Accept the certificate in the browser (step 5) |
| 429 Too many attempts | Restart the server (the limits are held in memory) |

**Screenshots of the running application**

<table>
  <tr>
    <td align="center"><b>Register</b><br><img src="docs/evidence/screenshots/register.png" width="300"></td>
    <td align="center"><b>Login</b><br><img src="docs/evidence/screenshots/login.png" width="300"></td>
    <td align="center"><b>Post a gig</b><br><img src="docs/evidence/screenshots/createGig.png" width="300"></td>
  </tr>
  <tr>
    <td align="center"><b>Browse gigs</b><br><img src="docs/evidence/screenshots/browse-gigs.png" width="300"></td>
    <td align="center"><b>Gig details</b><br><img src="docs/evidence/screenshots/gig-details.png" width="300"></td>
    <td align="center"><b>Booking confirmed</b><br><img src="docs/evidence/screenshots/booking-confirmed.png" width="300"></td>
  </tr>
  <tr>
    <td align="center"><b>My bookings (client)</b><br><img src="docs/evidence/screenshots/my-bookings.png" width="300"></td>
    <td align="center"><b>Freelancer dashboard</b><br><img src="docs/evidence/screenshots/freelancer-dashboard.png" width="300"></td>
    <td></td>
  </tr>
</table>

---

## 9. Testing

### 9.1 API tests: Postman and Newman

HustleHub_Part2.postman_collection.json has **47 requests and 88 assertions**. It creates fresh users on every run, so no manual setup is needed.

| Folder | What it proves |
|---|---|
| 0. Setup | Security headers present (CSP, nosniff, HSTS, no X-Powered-By). Creates two freelancers and a client |
| 1. Gig CRUD | Owner can create, read, update and delete. No token gives 401. Client gets 403. Freelancer B cannot edit or delete freelancer A's gig (403). Deleted gig gives 404 |
| 2. Bookings | Client booking creates a linked transaction. Freelancer booking gives 403. Missing or unknown gig rejected. Both roles can list bookings |
| 3. Income | Freelancer sees total equal to the booked price. Client gets 403. No token gives 401 |
| 4. Malicious input | XSS stripped. 12 KB payload gives 413. NoSQL injection gets no token. Tampered and alg=none JWTs give 401. Malformed ID leaks nothing |
| 5. Rate limiting | Seven rapid failed logins. The seventh returns **429** |

**To run:**

1. Start the API (npm start). It must be a fresh start, because the rate limiters are held in memory and the last folder fills the login limiter on purpose. Restart the server before every run.
2. In a second terminal, from the project root:

   ```bash
   npm run test:api
   ```

   This runs `newman run HustleHub_Part2.postman_collection.json --insecure` (`--insecure` is needed for the self-signed certificate).

These same Newman tests also run automatically in the CI pipeline against a fresh API and database on every push (see [section 10](#10-cicd-pipeline)).

Result: 47 requests, 88 assertions, 0 failed.

![Newman run, part 1](docs/evidence/newman-run-1.png)

![Newman run, part 2](docs/evidence/newman-run-2.png)

![Newman run, part 3](docs/evidence/newman-run-3.png)

### 9.2 Frontend tests

React Testing Library with **Vitest** (the Vite-native runner, with the same describe / it / expect API as Jest).

```bash
cd client
npm test
```


| File | Covers |
|---|---|
| src/pages/components.test.jsx (10 tests) | LoginPage renders fields and shows "required" errors when empty. GigCard shows title, price and category. Navbar shows Login and Register when logged out, and username, Logout and freelancer links when logged in. **BookingConfirmationPage** shows the confirmation message, gig title and price |
| src/components/taxSummary.test.jsx (6 tests) | The income and tax cards render. One bar is drawn per month. An empty message appears and no charts are drawn when there is no income. Nothing renders when data is missing. Payments are summed by month, and refunds and failed payments are ignored |
| src/components/rbac.test.jsx (5 tests) | PrivateRoute redirects logged-out users to /login, redirects a client away from a freelancer route and renders for the correct role. Navbar hides freelancer links from clients. GigCard removes `<script>` content (XSS) |

Result: 3 files, 21 tests, all passing. The frontend tests also run in the CI pipeline on every push. The yellow React Router "Future Flag Warning" lines are harmless notices.

![Frontend tests passing](docs/evidence/part-a-tax-and-logging/02-frontend-npm-test.png)

### 9.3 Backend unit tests

The backend unit tests use Node's built-in test runner (`npm test` runs `node --test`) and need no database.

| File | Covers |
|---|---|
| test/taxService.test.js (8 tests) | Zero and invalid income give zero tax. Income at the R99,000 threshold is covered by the rebate. The first and second bracket boundaries, a mid-bracket income and the top 45% bracket. Net income plus tax equals gross income. Bracket slices add up to gross income |
| test/logSanitiser.test.js (6 tests) | Passwords and tokens are redacted in nested objects. The Authorization header is redacted. MongoDB connection string credentials are hidden. Error name, message and stack are kept. Emails are masked. Very deep objects stop at a safe depth |

Result: 14 tests, all passing. These also run in the CI pipeline on every push (section 10).

![Backend tests passing](docs/evidence/part-a-tax-and-logging/01-backend-npm-test.png)

---

## 10. CI/CD Pipeline

[![CI Pipeline](https://github.com/ChippsEthan/INSY7314Group/actions/workflows/ci.yml/badge.svg)](https://github.com/ChippsEthan/INSY7314Group/actions/workflows/ci.yml)

The project uses **GitHub Actions**. The workflow files are in `.github/workflows/`:

| File | Purpose |
|---|---|
| `ci.yml` | Install, test, build, API tests, security checks and the Docker stack |
| `codeql.yml` | Static code analysis with CodeQL (section 11) |

### 10.1 When it runs

`ci.yml` runs automatically on every **push** and every **pull request**. A newer push to the same branch cancels the older run. The workflow only has read access to the repository (`permissions: contents: read`).

### 10.2 Jobs

| Job | What it does |
|---|---|
| Backend | `npm ci`, `npm test` (14 tests), then a build check that syntax-checks every backend source file with `node --check` |
| Frontend | `npm ci`, `npm test` (Vitest), `npm run build` |
| Newman API tests | Runs after the backend job. Starts the API against a MongoDB 7 service container with a throw-away HTTPS certificate and JWT secret, installs Newman and runs `HustleHub_Part2.postman_collection.json` |
| Security | `npm audit` on the backend and frontend (production dependencies, fails on high or critical) and a Gitleaks secret scan |
| Docker | Runs after the backend and frontend jobs. Builds both images, starts the whole stack with `docker compose up --build`, smoke-tests the API (`/api/health`) and the frontend, then scans both images with Grype |

### 10.3 The pipeline fails when a check fails

Every step returns an exit code, so a failing test, audit, scan or build turns the job red and marks the whole run as failed. To prove this, a test expectation was broken on purpose and the run failed:

![Failing pipeline run](docs/evidence/failing-run.png)

With the test restored, every job passed:

![Passing pipeline run](docs/evidence/Runningtest.png)

### 10.4 Security checks in the pipeline

| Check | Tool | What it catches | Fails the run when |
|---|---|---|---|
| Dependency audit | `npm audit --omit=dev` (backend and client) | Known vulnerabilities in production npm packages | A high or critical advisory exists |
| Secret scan | Gitleaks | Passwords, keys and tokens committed to the repository | A secret is detected in the commits being pushed |
| Container image scan | Grype | Known vulnerabilities in the operating system packages, Node.js and npm packages inside the Docker images | A critical vulnerability with an available fix exists |
| Full stack build | Docker and Docker Compose | Broken images or a stack that does not start | A build fails or the health checks fail |
| Static analysis | CodeQL | Insecure code patterns (section 11) | Reported as alerts in the Security tab |

### 10.5 Secrets in the pipeline

No real secrets are stored in the repository or in the workflow files. The HTTPS certificate and the `JWT_SECRET` used by the Newman and Docker jobs are generated fresh on every run and are thrown away when the run ends. The database used in the pipeline is a temporary container, never the Atlas database.

### 10.6 What the pipeline found and what was fixed

| Finding | Where | Fix |
|---|---|---|
| Critical and high advisories in `tar`, reached through `bcrypt` 5.x | Backend dependencies | Upgraded `bcrypt` to 6.x |
| Critical `proxy-addr` and moderate `qs` advisories | Backend dependencies (via Express) | Updated with `npm audit fix` |
| Critical `dompurify` and high `follow-redirects` advisories | Frontend dependencies | Updated with `npm audit fix` |
| Critical vulnerabilities in the Node.js 20 base image, OpenSSL (`libssl3`, `libcrypto3`), `zlib` and the `tar` bundled with npm | Backend Docker image | Moved to `node:22-alpine`, patched packages with `apk upgrade`, and removed npm from the runtime image because the running API does not need it |
| Critical `zlib` vulnerability | Frontend (nginx) Docker image | Added `apk upgrade` to the nginx stage |

Reviewed and accepted (moderate severity, below the pipeline's fail threshold):

| Finding | Why it is accepted |
|---|---|
| `uuid` buffer bounds check | The advisory covers `v3`, `v5` and `v6` when a buffer is passed in. The API only calls `v4()` (request IDs in `middlewares/requestLogger.js`), so it is not exploitable |
| `react-router` open redirect and server-side rendering issues | Fixing it needs a breaking major upgrade. The client is a Vite single-page app with no server-side rendering. To be revisited in the next release |

---

## 11. Static Code Analysis

**Tool:** GitHub **CodeQL**, run by `.github/workflows/codeql.yml` on every push and pull request to `main` and weekly (Mondays 03:00 UTC). It uses the `security-and-quality` query suite for JavaScript, covering both the Express API and the React client.

**Why CodeQL:** it follows data from where it enters the application (request bodies, parameters) to where it is used (database queries, regular expressions, property writes), so it finds injection and sanitisation flaws that a style linter would miss. Results appear in the repository's **Security** tab under Code scanning.

### 11.1 Results

The first scan reported **23 alerts**. All of them were reviewed and resolved:

![CodeQL results](docs/evidence/Code%20scanning.png)

| Alert (severity) | Where | What it means | Fix |
|---|---|---|---|
| Missing rate limiting (High) | `server.js`, `routes/authRoutes.js`, `routes/gigRoutes.js`, `routes/userRoutes.js` | Routes that touch the database or check permissions had no limiter, so they could be flooded | Added a general `apiLimiter` (300 requests per 15 minutes per IP) on `/api/auth`, `/api/gigs` and `/api/users`. It is logged as a security event like the other limiters |
| Database query built from user-controlled sources (High) | `controllers/authController.js`, `controllers/gigController.js`, `controllers/bookingController.js` | Request data went straight into MongoDB queries, so an object such as `{"$gt": ""}` could change the query | Login and register lookups use `{ email: { $eq: email } }`. Gig update copies only `title`, `description`, `price` and `category`, each type-checked. Booking rejects a `gigId` that is not a string |
| Incomplete multi-character sanitization (High) | `middlewares/xssSanitize.js` | Removing tags with one regular expression pass can leave a tag behind (`<<script>script>` becomes `<script>`) | Replaced the regular expression with a single pass that tracks tag depth, so nothing is left behind |
| Polynomial regular expression on uncontrolled data (High) | `middlewares/xssSanitize.js` | A crafted string of repeated `<` characters could make the old regular expression run very slowly (ReDoS) | The new sanitiser uses no regular expressions and runs in linear time (200 000 `<` characters in about 13 ms) |
| Remote property injection (High) | `middlewares/xssSanitize.js` | A user-supplied key such as `__proto__` was used as a property name | Objects are rebuilt with `Object.fromEntries`, and `__proto__`, `constructor` and `prototype` keys are dropped |
| Unused variable or import (Note) | `client/src/pages/RegisterPage.jsx`, `client/src/pages/components.test.jsx` | Dead code that hides mistakes | Removed the unused `res` variable and the unused `beforeEach` import |

Two further fixes came out of reviewing these findings:

- **Mass assignment:** the old gig update passed the whole request body to Mongoose, so a freelancer could have overwritten fields such as the gig's owner. The field whitelist closes this.
- **Unprotected test route:** a temporary `/api/audit-logs` route returned every audit log entry to anyone, without logging in. It was removed.

Behaviour note: the sanitiser now removes an unclosed `<` and the text after it. This is the safe choice for a security filter. Output encoding in React remains the primary XSS defence.

### 11.2 Status

After these fixes CodeQL reports **no open alerts** on `main`. The Newman API tests, the frontend tests and the Docker build all still pass.

---

## 12. Tax Estimate and Income Dashboard

Freelancers can see how much they have earned and an estimate of the income tax on it, as South African rand amounts for the **2026/27 tax year** (1 March 2026 to 28 February 2027). The figures come from the SARS *Rates of Tax for Individuals*.

### 12.1 Tax logic

The calculation is in `services/taxService.js`. Income is treated as one year of taxable income, and tax is worked out in three steps:

1. Find the bracket the income falls in.
2. Tax before rebate = the bracket's base amount + the bracket's rate x (income - the bracket's lower limit).
3. Estimated tax = tax before rebate - the primary rebate of **R17,820** (never below zero).

| Taxable income (R) | Rate | Tax before rebate |
|---|---|---|
| 0 to 245,100 | 18% | 18% of income |
| 245,101 to 383,100 | 26% | 44,118 + 26% above 245,100 |
| 383,101 to 530,200 | 31% | 79,998 + 31% above 383,100 |
| 530,201 to 695,800 | 36% | 125,599 + 36% above 530,200 |
| 695,801 to 887,000 | 39% | 185,215 + 39% above 695,800 |
| 887,001 to 1,878,600 | 41% | 259,783 + 41% above 887,000 |
| 1,878,601 and above | 45% | 666,339 + 45% above 1,878,600 |

The primary rebate means a person under 65 pays no tax on the first **R99,000** a year. **Worked example:** an income of R300,000 falls in the 26% bracket. Tax before rebate is 44,118 + 26% x (300,000 - 245,100) = R58,392. Minus the R17,820 rebate, the estimate is **R40,572**, so net income is R259,428 and the effective rate is 13.52%.

**Assumptions:** total income is treated as taxable income for one tax year. There are no deductions, medical credits, provisional tax, UIF or age-based rebates (only the under-65 primary rebate). The result is an estimate and not tax advice, and the API says so in a `disclaimer` field.

### 12.2 API

`GET /api/users/me/tax` is for freelancers only (`verifyToken`, then `requireRole('freelancer')`). It returns **200** with the figures, **401** without a token and **403** for a client.

| Field | Meaning |
|---|---|
| `taxYear` | `2026/27` |
| `grossIncome` | The freelancer's total income |
| `taxBeforeRebate`, `primaryRebate` | Tax from the brackets, and the rebate that is subtracted |
| `estimatedTax` | Tax payable after the rebate |
| `netIncome` | Gross income minus estimated tax |
| `effectiveRate`, `marginalRate` | Estimated tax as a percentage of income, and the rate of the top bracket reached |
| `breakdown` | The slice of income and the tax in each bracket used |
| `disclaimer` | Reminder that this is an estimate |

### 12.3 Dashboard

The Freelancer Dashboard has an **Income and Tax Overview** built with Recharts:

- **Summary cards:** total earned, estimated tax, net income and effective tax rate.
- **Charts:** a bar chart of income per month, and a pie chart of where the income goes (net income against estimated tax).
- **How this was calculated:** an expandable table of income and tax per bracket.
- **Empty and error states:** a freelancer with no bookings sees zeros and the message "No income yet. Charts will appear once you receive bookings". While loading, the page shows "Loading dashboard...", and if the dashboard data cannot be loaded it shows an error message. If only the tax request fails, the rest of the dashboard still loads.

### 12.4 Tests

- **Backend (`test/taxService.test.js`):** zero and invalid income, the R99,000 threshold, the first and second bracket boundaries, a mid-bracket income, the top 45% bracket, net income plus tax equal to gross income, and bracket slices adding up to gross income.
- **Frontend (`taxSummary.test.jsx`, 6 tests):** the cards render, one bar is drawn per month, the empty message appears without income, nothing renders when data is missing, payments are summed by month, and refunds and failed payments are ignored.

### 12.5 Evidence

Dashboard for a freelancer with income (R152,000 earned: 18% = R27,360, less the R17,820 rebate = R9,540 tax):

![Freelancer dashboard with tax overview](docs/evidence/part-a-tax-and-logging/06-freelancer-dashboard-tax.png)

The expandable calculation table:

![How the tax was calculated](docs/evidence/part-a-tax-and-logging/07-tax-how-calculated.png)

A new freelancer with no income (empty state):

![Empty freelancer dashboard](docs/evidence/part-a-tax-and-logging/08-new-freelancer-empty-dashboard.png)

A client's confirmed booking, which produces the freelancer's income:

![Client My Bookings](docs/evidence/part-a-tax-and-logging/05-client-my-bookings.png)

Postman checks of `GET /api/users/me/tax`: logging in as a freelancer, no token gives 401, and a freelancer token gives 200:

![Postman login](docs/evidence/part-a-tax-and-logging/09-postman-login.png)

![Tax route without a token returns 401](docs/evidence/part-a-tax-and-logging/10-postman-tax-no-token-401.png)

![Tax route as a freelancer returns 200](docs/evidence/part-a-tax-and-logging/11-postman-tax-freelancer-200.png)

---

## 13. Logging and Monitoring

### 13.1 How logging works

The API uses **Winston** (`config/logger.js`) instead of `console.log`. Every entry has a timestamp, a level (`error`, `warn`, `info`) and structured fields, and goes to three places:

| Destination | Detail |
|---|---|
| Console | Coloured, readable output while developing |
| Local files | `logs/app.log` (everything) and `logs/error.log` (errors only), JSON format, rotated at 5 MB with 3 files kept. The `logs/` folder is git-ignored |
| **Better Stack** (cloud) | Shipped automatically when `BETTERSTACK_SOURCE_TOKEN` and `BETTERSTACK_INGESTING_HOST` are set in `.env`. Leave them empty to log locally only |

The level is set with `LOG_LEVEL` (default `info`), and logging is silent during unit tests.

### 13.2 What is logged

| Event | Level | What is recorded |
|---|---|---|
| `http.request` | info, warn for 4xx, error for 5xx | Request ID, method, path (without the query string), status, duration, IP and user ID |
| `auth.register.success`, `auth.register.duplicate` | info, warn | New registration, or a rejected duplicate email |
| `auth.login.success`, `auth.login.failed`, `auth.login.locked` | info, warn, warn | Login attempts with the reason (unknown email or wrong password), the user ID, a masked email and the IP |
| `booking.created`, `transaction.created`, `booking.rejected` | info, info, warn | Bookings and the transactions they create, and rejected bookings (gig not found, or booking your own gig) |
| `auth.token.missing`, `auth.token.invalid`, `access.denied` | warn | Requests without a token, with an invalid or expired token, or from the wrong role |
| `security.rate_limit` | warn | Which limiter fired, the IP and the path |
| `error` | warn or error | Failed requests handled by the global error handler |
| `db.connected`, `server.started`, `server.shutdown`, `server.fatal`, `process.unhandled_rejection` | info or error | Server and database lifecycle events and crashes |

### 13.3 What is never logged

A redaction layer (`config/logSanitiser.js`) runs on every entry before it reaches any destination:

- Any field named like `password`, `token`, `authorization`, `secret`, `cookie`, `jwt` or `mongoUri` is replaced with `[REDACTED]`.
- Username and password inside MongoDB connection strings are hidden.
- Emails are masked (`al***@example.com`), which is enough to spot repeated attempts without storing the full address.
- Request bodies are never logged, and query strings are dropped from paths.

Six backend unit tests cover the redaction (section 9.3).

### 13.4 Why it matters

- **Detecting attacks:** repeated `auth.login.failed` events for one masked email or IP show password guessing, and `security.rate_limit` and `auth.login.locked` events show an attack being blocked.
- **Tracing problems:** the request ID is returned in the `X-Request-Id` header and appears on every line for that request, so one request can be followed through the system.
- **Accountability:** bookings, transactions and access-denied events record who did what and when.
- **Resilience:** logs in a cloud platform survive the loss of the server or container, and cannot be quietly edited by someone who gains access to it.
- **Safety:** redaction means the logs themselves cannot become a source of leaked credentials.

### 13.5 Evidence

Each pair shows the same event in the local log file and in Better Stack.

| Local log (`logs/app.log`) | Better Stack |
|---|---|
| ![Register, local](docs/evidence/part-a-tax-and-logging/12-register-local-log.png) | ![Register, Better Stack](docs/evidence/part-a-tax-and-logging/13-register-betterstack.png) |
| ![Duplicate registration, local](docs/evidence/part-a-tax-and-logging/14-register-duplicate-local-log.png) | ![Duplicate registration, Better Stack](docs/evidence/part-a-tax-and-logging/15-register-duplicate-betterstack.png) |
| ![Failed login, local](docs/evidence/part-a-tax-and-logging/16-login-failed-local-log.png) | ![Failed login, Better Stack](docs/evidence/part-a-tax-and-logging/17-login-failed-betterstack.png) |
| ![Successful login, local](docs/evidence/part-a-tax-and-logging/18-login-success-local-log.png) | ![Successful login, Better Stack](docs/evidence/part-a-tax-and-logging/19-login-success-betterstack.png) |
| ![Booking, local](docs/evidence/part-a-tax-and-logging/20-booking-local-log.png) | ![Booking, Better Stack](docs/evidence/part-a-tax-and-logging/21-booking-betterstack.png) |
| ![Rate limit, local](docs/evidence/part-a-tax-and-logging/22-rate-limit-local-log.png) | ![Rate limit, Better Stack](docs/evidence/part-a-tax-and-logging/23-rate-limit-betterstack.png) |

Server start-up and the health check:

![Server start-up log](docs/evidence/part-a-tax-and-logging/03-node-server-startup.png)

![Health check](docs/evidence/part-a-tax-and-logging/04-api-health-check.png)

---

## 14. Docker

### 14.1 What runs

`docker-compose.yml` starts three containers on one network:

| Service | Built from | Port | Notes |
|---|---|---|---|
| `mongo` | `mongo:latest` image | 27017 | Data kept in the `mongo-data` volume |
| `backend` | `Dockerfile` in the project root | 5000 (HTTPS) | Reads secrets from the git-ignored `.env` file. `cert.pem` and `key.pem` are mounted read-only |
| `frontend` | `client/dockerfile` | 3000 (nginx on port 80) | Serves the built React app |

### 14.2 How the images are built

- **Multi-stage builds:** dependencies and the build happen in a builder stage, and only the result is copied into the final image.
- **Backend:** `node:22-alpine`. The final stage patches operating system packages (`apk upgrade`), removes npm because the running API does not need it, and runs as a non-root user (`appuser`). `logs/` is the only extra folder that user can write to.
- **Frontend:** the React app is built with Node, then served by `nginx:alpine` with patched packages.
- **No secrets in images:** `.dockerignore` files keep `node_modules`, `.env`, `.git`, `cert.pem`, `key.pem` and logs out of the build. Secrets are passed at run time through `env_file`, and HTTPS certificates are mounted as volumes.
- **Pipeline:** the CI pipeline builds both images, starts this Compose stack and scans the images for vulnerabilities on every push (section 10).

### 14.3 Running the stack

1. Clone the repository and open it in a terminal.
2. Create the `.env` file from the template (`cp .env.example .env`, or `copy .env.example .env` in PowerShell). For the database container, set:

   ```env
   MONGO_URI=mongodb://mongo:27017/hustlehub
   ```

   Keep `NODE_ENV=development` for this local demonstration, because the production CORS allow-list is a placeholder (see the known limitations in section 6). Set `JWT_SECRET` to a long random string.

3. Generate the HTTPS certificate in the project root (press Enter through the prompts):

   ```bash
   openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
   ```

4. Build and start everything:

   ```bash
   docker compose up --build
   ```

5. Open the app at <http://localhost:3000>. Check the API at <https://localhost:5000/api/health> and accept the self-signed certificate once.
6. Stop the stack with `docker compose down`. Add `-v` to also delete the database volume.

### 14.4 Evidence

Three containers running in Docker Desktop:

![Docker Desktop with three containers running](docs/evidence/part-c-docker-and-security/01-docker-desktop-three-containers-running.png)

Building and starting the stack:

![docker compose up --build](docs/evidence/part-c-docker-and-security/02-docker-compose-up-build-vscode.png)

![Containers created](docs/evidence/part-c-docker-and-security/03-docker-compose-up-containers-created.png)

![MongoDB container logs](docs/evidence/part-c-docker-and-security/04-docker-compose-mongo-logs.png)

---

## 15. Additional Security Features

Two features were added beyond the minimum requirements: **account lockout** and an **audit trail**.

### 15.1 Account lockout

**What it does:** after **5 failed password attempts** on an existing account, the account is locked for **15 minutes**. While it is locked, login returns `429 Account is temporarily locked. Try again in N minutes.`, even if the correct password is used. A successful login resets the counter. The counter and the lock time are stored on the user in MongoDB (`failedLoginAttempts`, `lockoutUntil`), and every lock is logged as `auth.login.locked`.

**Threat addressed:** password guessing and credential stuffing (OWASP A07). The IP rate limiter alone can be bypassed by rotating IP addresses, and its counters are in memory so they reset on restart. The lock belongs to the account, so it holds however many addresses the attacker uses, and it survives a restart.

**How to see it working:**

1. Register a test user, then send `POST /api/auth/login` with a wrong password several times. Each wrong attempt returns `401 Invalid email or password`.
2. From one IP address, the IP rate limiter usually answers first with `429 Too many attempts`. To see the account lock itself, restart the API (the limiter counters reset but the lock remains in MongoDB), or log in from a different IP, and try again. The response is `429 Account is temporarily locked`.

**Trade-off:** an attacker could lock a victim's account on purpose. The lock is short (15 minutes), each one is logged, and the "locked" reply also confirms the account exists. These are listed in the known limitations in section 6.

Evidence: the lockout fields on the user model, the three places in the login code, and the Postman requests.

![User model with lockout fields](docs/evidence/part-c-docker-and-security/08-user-model-lockout-fields-wide.png)

![Login: lockout check](docs/evidence/part-c-docker-and-security/11-login-account-lockout-check.png)

![Login: increment failed attempts and lock](docs/evidence/part-c-docker-and-security/10-login-increment-failed-attempts-and-lock.png)

![Login: reset attempts on success](docs/evidence/part-c-docker-and-security/09-login-reset-failed-attempts-on-success.png)

![Postman: register the test user](docs/evidence/part-c-docker-and-security/16-postman-register-lockout-test-user.png)

![Postman: wrong password returns 401](docs/evidence/part-c-docker-and-security/17-postman-login-wrong-password-401.png)

![Postman: repeated attempts return 429](docs/evidence/part-c-docker-and-security/18-postman-login-rate-limit-429.png)

### 15.2 Audit trail

**What it does:** security-relevant actions are saved as records in an `AuditLog` collection in MongoDB. Each record has the action, the user ID, the IP address, details and a timestamp. The helper is `utils/auditLogger.js`, and a failed audit write never breaks the request.

| Action | Recorded when |
|---|---|
| `USER_LOGIN_SUCCESS`, `USER_LOGIN_FAILED` | A login succeeds, or fails (with a masked email and the attempt count) |
| `GIG_CREATED`, `GIG_UPDATED`, `GIG_DELETED` | A freelancer creates, edits or deletes a gig |
| `BOOKING_CREATED` | A client books a gig (booking ID, gig ID and amount) |

**Threat addressed:** lack of accountability and monitoring (OWASP A09). If something goes wrong, the audit trail shows who did what, when and from where. It is kept separate from the operational logs in section 13, so it can be queried and reviewed on its own.

**How to see it working:** perform an action (log in, create a gig, book a gig), then look in the `auditlogs` collection, for example with `db.auditlogs.find().sort({ timestamp: -1 })` in `mongosh` or in MongoDB Compass or Atlas. For the screenshots below, a temporary read-only route was used to display the entries. **It was removed afterwards, because it returned the audit log to anyone without logging in.** That route was spotted during the security review (see section 11).

Evidence:

![AuditLog model](docs/evidence/part-c-docker-and-security/05-audit-log-model.png)

![Audit logger helper](docs/evidence/part-c-docker-and-security/06-audit-logger-util.png)

![Audit entry: gig created](docs/evidence/part-c-docker-and-security/14-audit-log-gig-created.png)

![Audit entry: gig updated](docs/evidence/part-c-docker-and-security/13-audit-log-gig-updated.png)

![Audit entry: gig deleted](docs/evidence/part-c-docker-and-security/12-audit-log-gig-deleted.png)

![Audit entry: booking created](docs/evidence/part-c-docker-and-security/15-audit-log-booking-created.png)

![Temporary route used to display the entries (since removed)](docs/evidence/part-c-docker-and-security/19-temporary-audit-logs-route-server-js.png)

![Audit entries returned by the temporary route](docs/evidence/part-c-docker-and-security/20-postman-audit-logs-response.png)

---

## 16. Demonstration Video

**Part 3 demonstration (YouTube):** https://youtu.be/PASTE_NEW_VIDEO_ID_HERE

The video walks through the features described in sections 7 and 10 to 15.

**Part 2 demonstration (earlier submission):** https://youtu.be/Y0zaNs76LAc

---

## Appendix A: Part 1 Feedback Checklist

| Feedback | Where addressed |
|---|---|
| Fuller system overview | [Section 1](#1-system-overview) |
| Architecture diagram showing MERN components and where each sits, distinct from a flow diagram | [Section 3](#3-system-architecture) |
| Data flow diagrams with bullet steps for Register and Login | [Section 4](#4-data-flow-register-and-login) |
| Run and dependency instructions | [Section 8](#8-setup-running-the-application) |
| Justification of each decision, with alternatives (for example JWT vs sessions) | [Section 5](#5-security-design-decisions) |
| Security risks, vulnerabilities and mitigations, with a diagram | [Section 6](#6-security-risks-and-mitigations) |
| Clients, Freelancers and Admins | [Section 2](#2-users-and-roles) |

---

## Appendix B: Part 1 Evidence Screenshots

These screenshots were captured during Part 1 and are kept as evidence of the original authentication backend.

### B.1 Part 1 security implementation (code)

#### Password Hashing
Passwords are never stored in plain text. They are hashed with bcrypt (10 salt rounds).

<img width="850" height="269" alt="image" src="https://github.com/user-attachments/assets/1ab204ae-28ea-455c-bd5f-f44fc6f7cb89" />


<img width="903" height="172" alt="image" src="https://github.com/user-attachments/assets/6dc423f9-f1ae-40be-b626-6d37d4de07ce" />


#### JWT Authentication 
When you login successfully a JWT token will be generated containing the users ID and their role , this JWT token is then sent to the Authorization header for protected routes.

<img width="668" height="199" alt="image" src="https://github.com/user-attachments/assets/9ffad78d-8a63-4f45-a9c4-ed5a7030903d" />


<img width="940" height="628" alt="image" src="https://github.com/user-attachments/assets/c1e26cf1-2cc2-4e5d-a6dd-b61749c80da7" />


#### Input validation
express-validator checks all incoming data and make sure it is valid before we process the data, this keeps us safe from injection attacks and ensures our data's integrity.

<img width="940" height="584" alt="image" src="https://github.com/user-attachments/assets/5c34b977-7e1c-427f-a49c-0461610635bc" />

<img width="902" height="564" alt="image" src="https://github.com/user-attachments/assets/1f731595-68b5-4d35-bd1e-95b7161f2cbf" />

<img width="940" height="323" alt="image" src="https://github.com/user-attachments/assets/3a56ff1e-aa9c-4c70-aba9-90b3f5416712" />

<img width="940" height="466" alt="image" src="https://github.com/user-attachments/assets/bbc8f1d1-acf9-414c-8891-5fc591361dee" />


#### Secure Error Handling
we have a global error handler that will catch all exceptions this will return a standardised JSON response without giving away our file paths , configuration values or our stack traces.

<img width="940" height="233" alt="image" src="https://github.com/user-attachments/assets/8a5efa82-32b4-457f-9a5d-29a5e32467f2" />

<img width="940" height="377" alt="image" src="https://github.com/user-attachments/assets/7b795cc0-1d5e-47a7-a50d-7218730d6f97" />

<img width="940" height="143" alt="image" src="https://github.com/user-attachments/assets/016e1dbd-0c48-4d2c-bbb3-e47ce8f04e7e" />





### B.2 Part 1 Postman results

###### Part 1 Postman tests

##### Server Health
<img width="940" height="461" alt="image" src="https://github.com/user-attachments/assets/99fae2b5-f7c9-485d-aa8c-c5012783842d" />

##### Registration

###### Success
<img width="940" height="462" alt="image" src="https://github.com/user-attachments/assets/51933216-b359-439d-a05c-7dfc15df18c2" />

###### Duplicate
<img width="940" height="462" alt="image" src="https://github.com/user-attachments/assets/0aa70b93-9ae7-4eff-82d3-ef8eb626bb98" />

###### Missing a password
<img width="940" height="465" alt="image" src="https://github.com/user-attachments/assets/d2866ddb-cca2-465b-9c4c-10408aa51cfb" />

##### Logging in

###### Success
<img width="940" height="469" alt="image" src="https://github.com/user-attachments/assets/5c902384-9f7e-44e2-9adc-9bcb51b232af" />

###### Failed login (wrong password)
<img width="940" height="466" alt="image" src="https://github.com/user-attachments/assets/6a068370-f2a0-430c-9292-7d807ac68f5d" />

##### Protected Route 

###### With a token
<img width="940" height="465" alt="image" src="https://github.com/user-attachments/assets/8ba394b3-0599-4580-8e4a-07bc4cff4309" />

###### Without a token
<img width="940" height="470" alt="image" src="https://github.com/user-attachments/assets/f48d3776-4b6f-4570-b12b-1677d07c2164" />




## Reference

We declare we used AI to help with the formatting and styling of the read me file.

Diagrams.net, 2026. Diagrams.net – Free Online Diagram Software. [Online] Available at: Diagrams.net [Accessed 12 October 2026].

GitHub, 2026. GitHub Actions documentation. [Online] Available at: https://docs.github.com/en/actions [Accessed 8 November 2026].

GitHub, 2026. About code scanning with CodeQL. [Online] Available at: https://docs.github.com/en/code-security/code-scanning [Accessed 8 November 2026].

Gitleaks, 2026. Gitleaks: detect secrets in git repositories. [Online] Available at: https://github.com/gitleaks/gitleaks [Accessed 8 November 2026].

Anchore, 2026. Grype: vulnerability scanner for container images and filesystems. [Online] Available at: https://github.com/anchore/grype [Accessed 8 November 2026].

South African Revenue Service, 2026. Rates of tax for individuals. [Online] Available at: https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/ [Accessed 9 November 2026].

Docker, 2026. Docker Compose documentation. [Online] Available at: https://docs.docker.com/compose/ [Accessed 9 November 2026].

Winston contributors, 2026. Winston: a logger for just about everything. [Online] Available at: https://github.com/winstonjs/winston [Accessed 9 November 2026].

Better Stack, 2026. Better Stack Logs. [Online] Available at: https://betterstack.com/logs [Accessed 9 November 2026].

Recharts, 2026. Recharts: a composable charting library built on React components. [Online] Available at: https://recharts.org [Accessed 9 November 2026].

