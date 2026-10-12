# HustleHub+ Freelance Marketplace

INSY7314 – POE Part 2. A secure MERN-stack marketplace where Clients book services from Freelancers. Part 1 built the secure authentication backend. Part 2 adds MongoDB, gigs, bookings, transactions, income tracking, more security middleware, a React frontend and automated tests.

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
10. [Demonstration Video](#10-demonstration-video)
11. [Appendix A: Part 1 Feedback Checklist](#appendix-a-part-1-feedback-checklist)
12. [Appendix B: Part 1 Evidence Screenshots](#appendix-b-part-1-evidence-screenshots)

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
| Testing | Postman and Newman (API), React Testing Library with Vitest (UI) | 2 |

Stack: MongoDB and Mongoose, Node.js with Express 4 over HTTPS, React 18 (Vite), plus bcrypt, jsonwebtoken, helmet, cors, express-rate-limit, express-mongo-sanitize and express-validator.

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

- **Client:** hires freelancers. This is the default role at registration.
- **Freelancer:** sells gigs, sees bookings made on them and tracks income.
- **Administrator:** exists in the data model and RBAC middleware and can see all bookings. Admins cannot be created through the public form (it only accepts client or freelancer), so admin accounts are created directly in the database. Admin tooling is out of scope for this phase.

---

## 3. System Architecture

This shows the components and where each sits in the MERN stack. The flow diagrams in section 4 show how data moves between them.

add screenshot


| MERN layer | Components | Responsibility |
|---|---|---|
| React  | client/src pages, components, AuthContext, PrivateRoute, axiosInstance.js | UI, route protection, session state, safe rendering |
| Express | server.js, routes/, middlewares/ | HTTPS server, middleware pipeline, JWT and role checks, validation |
| Node.js | controllers/, config/env.js | Business logic (booking, income, ownership), configuration |
| MongoDB | models/, Atlas database | Persistent storage |

---

## 4. Data Flow: Register and Login

Rectangles are processes, cylinders are data stores, dotted arrows are failure responses.

### 4.1 Registration

add screenshot

1. **React form:** react-hook-form checks the fields for usability only. The server never trusts it.
2. **Perimeter:** HTTPS, Helmet headers, CORS origin check, and a 10 KB body limit (413 if exceeded).
3. **Sanitise:** express-mongo-sanitize strips $ and . keys (NoSQL injection). A custom middleware strips HTML tags from all strings (XSS).
4. **Rate limit:** 5 registrations per IP per 15 minutes, then 429.
5. **Validate:** username 3+ alphanumeric, valid email, password 8+ with upper, lower and digit, role client or freelancer. Failures return 400 with per-field errors.
6. **Duplicate check:** an existing email returns 400.
7. **Hash:** bcrypt with a per-user salt. The plain password is never stored or logged.
8. **Save and respond:** 201 with the user minus the password hash. React then logs the user in.

### 4.2 Login

add screenshot

1. **React form:** checks that email and password are present and well formed.
2. **Perimeter and sanitise:** same protections as registration.
3. **Rate limit:** counts failed attempts only (5 per 15 minutes per IP), so genuine users are never locked out by their own successful logins.
4. **Validate:** valid email, password present.
5. **Look up** the user by email.
6. **Compare** the password with the stored hash. An unknown email and a wrong password return the same 401 Invalid email or password., so attackers cannot tell which accounts exist.
7. **Issue JWT:** payload is only id and role, signed with a secret from the environment, valid 7 days.
8. **Browser:** React stores the token and an Axios interceptor sends Authorization: Bearer <token> on every later request. The server then runs verifyToken, then requireRole, then an ownership check in the controller.

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
| NoSQL injection | **express-mongo-sanitize** plus Mongoose type casting | Trusting Mongoose alone | Stops operator payloads such as {"$gt": ""} reaching queries |
| XSS | Server tag stripping, React escaping, DOMPurify, CSP | One layer only | Overlapping layers. Output encoding is the primary defence |
| Brute force and abuse | express-rate-limit: login 5 failed per 15 min, register 5 per 15 min, bookings 10 per hour | Account lockout; CAPTCHA; WAF | Lockout lets attackers lock out victims on purpose. CAPTCHA needs a third party. A WAF suits production |
| Headers | Helmet (CSP, HSTS, nosniff, frame protection, hides X-Powered-By) | Hand-set headers | Easy to get wrong manually |
| Access control | RBAC (requireRole) plus ownership checks in controllers | Hiding buttons in React; full ABAC | UI hiding is cosmetic. Ownership checks stop one freelancer editing another's gig |
| Transport | HTTPS (self-signed in development) | Plain HTTP | Protects passwords and tokens in transit. Production would use a CA certificate |
| Errors | Global handler with generic messages. One message for unknown email and wrong password | Raw errors | No stack paths, queries or account enumeration |
| Secrets | .env, git-ignored. *.pem also ignored. Fails fast if JWT_SECRET is missing | Hard-coded secrets | Secrets never reach the repository |
| Payments | Simulated transactions only | Real card processing | No card data held, so no PCI-DSS exposure |
| Token storage | localStorage with Axios interceptor | httpOnly cookie | Simple with a separate API origin. XSS could read it, which we offset with DOMPurify, React escaping, tag stripping and CSP. Cookies would need CSRF protection |

---

## 6. Security Risks and Mitigations

add screenshot

| Threat | How it could be exploited | Mitigation | Verified by |
|---|---|---|---|
| Broken access control (A01) | Client creates gigs, freelancer edits another's gig, client reads income | requireRole, ownership checks | Newman folders 1 and 3 |
| Cryptographic failures (A02) | Database leak, traffic sniffing | bcrypt, no password in responses, HTTPS, .env | Newman login tests |
| NoSQL injection (A03) | {"email": {"$gt": ""}} bypasses login | mongo-sanitize, Mongoose, validator | Newman folder 4 |
| XSS (A03) | <script> in a gig title runs in other browsers | Tag stripping, React escaping, DOMPurify, CSP | Newman folder 4, frontend test |
| Abuse and brute force (A04, A07) | Password guessing, spam accounts or bookings | Rate limiters, strong password rules, identical login errors | Newman folder 5 (429) |
| Forged tokens (A07) | Tampered or unsigned JWT | Signed HS256 JWT with expiry | Newman folder 4 (401) |
| Misconfiguration (A05) | Missing headers, verbose errors | Helmet, CORS allow-list, generic errors | Newman setup folder |
| Denial of service | Huge bodies, floods | 10 KB limit (413), rate limits | Newman folder 4 |
| Vulnerable components (A06) | Outdated packages | Locked versions, run npm audit before release | Manual |

Known limitations and next steps

- JWT lasts 7 days and cannot be revoked. Use short-lived access tokens with refresh tokens.
- Token is in localStorage. An httpOnly cookie plus CSRF token would remove XSS token theft.
- Helmet's default CSP is used. A custom policy should be set on the host that serves the React app.
- Rate-limit counters are in memory. They reset on restart. A Redis store would fix this.
- updateGig passes req.body to Mongoose (mass-assignment risk). It should whitelist title, description, price and category.
- Gig and booking routes lack express-validator rules. A negative price or malformed ID returns a generic 500 instead of a precise 400.
- Stack traces are returned when NODE_ENV=development. Always run production with NODE_ENV=production.
- The booking and income update are separate writes. A MongoDB transaction would make them atomic.
- The dashboard Edit button points to a route that does not exist yet. The PUT /api/gigs/:id endpoint is ready for it.

---

## 7. Part 2 Features and API

- **Gigs:** freelancers create gigs. Anyone can browse. Only the owner can edit or delete.
- **Bookings:** a client books a gig and the price is copied from the gig. Payment is simulated.
- **Transactions:** every booking creates a transaction linking client, freelancer and booking.
- **Income:** the freelancer's income rises by the gig price on each booking. GET /api/users/me/income returns the total and the transaction list.
- **Security additions:** NoSQL and XSS sanitising, rate limiting (login, register, bookings), Helmet and CSP, RBAC with ownership checks.

Base URL https://localhost:5000/api. Protected routes need Authorization: Bearer <token>. Errors look like { "status": 403, "message": "..." }, and validation errors add "errors": [{ "field", "message" }].

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
| GET /health | Public | API status |

---

## 8. Setup: Running the Application

**Prerequisites:** Node.js 18 or newer, Git, OpenSSL, and a MongoDB database (MongoDB Atlas or a local MongoDB Community Server). Install Newman for the API tests with npm install -g newman.

**Main dependencies** (all installed by npm install)

| Part | Packages |
|---|---|
| Backend | express, mongoose, bcrypt, jsonwebtoken, express-validator, helmet, cors, express-rate-limit, express-mongo-sanitize, dotenv (nodemon for development) |
| Frontend | react, react-dom, react-router-dom, react-hook-form, axios, dompurify, vite |
| Testing | vitest, jsdom, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event |

### Backend (Terminal 1, project root)

1. Clone and install:
   
   git clone https://github.com/ChippsEthan/INSY7314Group.git  
   cd INSY7314Group  
   npm install
   
2. Create .env from the template (cp .env.example .env, or copy .env.example .env in PowerShell) and fill it in:
   env
   
   PORT=5000  
   NODE_ENV=development  
   JWT_SECRET=a_long_random_string_of_at_least_32_characters  
   SALT_ROUNDS=10  
   MONGO_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/hustlehub?appName=Cluster0  
   
   For a local database use mongodb://localhost:27017/hustlehub.
3. Generate the HTTPS certificate (press Enter through the prompts):
   
   openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
   
4. Start the API. You should see MongoDB connected successfully and the HTTPS address:
  
   npm start
   
5. Trust the certificate once: open <https://localhost:5000/api/health> in the browser, click **Advanced**, then **Proceed**.

### Frontend (Terminal 2)


cd client
npm install
cp .env.example .env     # contains VITE_API_URL=https://localhost:5000
npm run dev

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
   bash
   npm run test:api
   
   This runs newman run HustleHub_Part2.postman_collection.json --insecure (--insecure is needed for the self-signed certificate).

Result: 47 requests, 88 assertions, 0 failed.

![Newman run, part 1](docs/evidence/newman-run-1.png)

![Newman run, part 2](docs/evidence/newman-run-2.png)

![Newman run, part 3](docs/evidence/newman-run-3.png)

### 9.2 Frontend tests

React Testing Library with **Vitest** (the Vite-native runner, with the same describe / it / expect API as Jest).

bash
cd client
npm test


| File | Covers |
|---|---|
| src/pages/components.test.jsx (10 tests) | LoginPage renders fields and shows "required" errors when empty. GigCard shows title, price and category. Navbar shows Login and Register when logged out, and username, Logout and freelancer links when logged in. **BookingConfirmationPage** shows the confirmation message, gig title and price |
| src/components/rbac.test.jsx (5 tests) | PrivateRoute redirects logged-out users to /login, redirects a client away from a freelancer route and renders for the correct role. Navbar hides freelancer links from clients. GigCard removes <script> content (XSS) |

Result: 2 files, 15 tests, all passing. The yellow React Router "Future Flag Warning" lines are harmless notices.

![Frontend tests passing](docs/evidence/frontend-tests.png)

---

## 10. Demonstration Video

YouTube link: https://youtu.be/Y0zaNs76LAc

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

######## Success
<img width="940" height="462" alt="image" src="https://github.com/user-attachments/assets/51933216-b359-439d-a05c-7dfc15df18c2" />

######## Duplicate
<img width="940" height="462" alt="image" src="https://github.com/user-attachments/assets/0aa70b93-9ae7-4eff-82d3-ef8eb626bb98" />

######## Missing a password
<img width="940" height="465" alt="image" src="https://github.com/user-attachments/assets/d2866ddb-cca2-465b-9c4c-10408aa51cfb" />

##### Logging in

######## Success
<img width="940" height="469" alt="image" src="https://github.com/user-attachments/assets/5c902384-9f7e-44e2-9adc-9bcb51b232af" />

######## Failed login (wrong password)
<img width="940" height="466" alt="image" src="https://github.com/user-attachments/assets/6a068370-f2a0-430c-9292-7d807ac68f5d" />

##### Protected Route 

######## With a token
<img width="940" height="465" alt="image" src="https://github.com/user-attachments/assets/8ba394b3-0599-4580-8e4a-07bc4cff4309" />

######## Without a token
<img width="940" height="470" alt="image" src="https://github.com/user-attachments/assets/f48d3776-4b6f-4570-b12b-1677d07c2164" />




## Reference

We declare we used AI to help with the formatting and styling of the read me file.

Diagrams.net, 2026. Diagrams.net – Free Online Diagram Software. [Online] Available at: Diagrams.net [Accessed 12 October 2026].

