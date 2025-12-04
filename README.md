# Bulletproof Booking API

A small, well‑architected Node.js API that demonstrates how to prevent double‑booking of appointment slots under high concurrency.

This repo implements:

- `POST /api/book-appointment` — idempotent booking endpoint that guarantees only one successful booking per slot.
- `POST /api/hold-appointment` — a soft‑hold (5 minute TTL) to reserve a slot while the user completes checkout.
- `src/tests/test-concurrency.js` — a concurrency test that fires simultaneous requests to prove the locking strategy.

---

## The Challenge

Imagine three clients (web, SMS bot, receptionist) attempt to book the exact same appointment slot at the exact same millisecond. The API must ensure:

- Exactly one booking succeeds (HTTP `201`).
- All other attempts fail gracefully with HTTP `409 Conflict` and a clear error message.

This repo demonstrates a production‑minded approach that survives multi‑process and multi‑instance deployments.

---

## Tech Stack & Components

- Node.js + Express
- MongoDB + Mongoose (primary persistent store)
- Redis (soft‑hold cache using TTL)
- Pino (structured logging)

Project layout (important files):

```
src/
├── app.js                # Express app
├── server.js             # Server + DB connections
├── config/
│   ├── db.js             # MongoDB connection
│   └── redis.js          # Redis client
├── controllers/
│   └── booking.controller.js
├── services/
│   └── booking.service.js
├── models/
│   └── Appointment.js    # Mongoose schema & unique index on `slot`
└── tests/
    └── test-concurrency.js
```

---

## Locking Strategy (How double‑booking is prevented)

Primary: MongoDB Unique Index on the `slot` field.

- Rationale: A unique index is enforced at the database level, so it works correctly across multiple application instances without relying on in‑memory locks.
- Implementation: The `Appointment` model has a unique constraint on `slot`. When two concurrent `insert` operations target the same slot, the first insert succeeds and subsequent inserts fail with Mongo duplicate key error (`error.code === 11000`). The service translates that to a `409 Conflict` and a clear message `Slot already booked`.

Soft‑hold (bonus): Redis `SET key value NX EX <ttl>` is used to reserve a slot for a short period (default 300s) while the user finishes checkout. The hold flow checks whether the slot is already booked before setting a hold.

Combined behaviour:

- Book endpoint attempts to create a persistent `Appointment` record. If duplicate key error occurs, the client receives `409 Conflict`.
- Hold endpoint first checks the DB for an existing booking; if booked -> `409 Conflict`. Otherwise attempts to set a Redis `NX` key; if it already exists -> `409 Conflict` (held by another user).

This approach is simple, reliable, and works in distributed environments.

---

## API Endpoints

- `POST /api/book-appointment`

  - Request body: `{ "slot": "<ISO timestamp>", "patientName": "<name>" }`
  - Success: `201` — `{ message: "Booking confirmed", appointment: { ... } }`
  - Conflict: `409` — `{ error: "Slot already booked" }`

- `POST /api/hold-appointment`
  - Request body: same as above
  - Success (slot free and not held): `200` — `{ message: "Slot held for 5 minutes" }`
  - Conflict if slot already booked: `409` — `{ error: "Slot already booked" }`
  - Conflict if slot currently held: `409` — `{ error: "Slot is currently held by another user" }`

Example curl (book):

```bash
curl -s -X POST http://localhost:3000/api/book-appointment \
  -H "Content-Type: application/json" \
  -d '{"slot":"2025-12-05T10:00:00.000Z","patientName":"Alice"}'
```

Example curl (hold):

```bash
curl -s -X POST http://localhost:3000/api/hold-appointment \
  -H "Content-Type: application/json" \
  -d '{"slot":"2025-12-05T10:00:00.000Z","patientName":"Alice"}'
```

---

## Running Locally

Prereqs:

- Node.js (tested on Node 20+)
- MongoDB (local or remote)
- Redis

Steps:

1. Install dependencies

```bash
npm install
```

2. Configure environment variables (examples)

```
PORT=3000
MONGO_URI=mongodb://localhost:27017/steer-booking
REDIS_URL=redis://localhost:6379
SOFT_HOLD_SECONDS=300
```

3. Start the server in dev mode

```bash
npm run dev
```

The server will connect to MongoDB and Redis and expose the endpoints under `/api`.

---

## Concurrency Proof (Stress Test)

There is a test script at `src/tests/test-concurrency.js`. The script:

- Fires `N` simultaneous `POST` requests for the same slot (default 10).
- Prints concise per-request results and a summary.

Run it with the server running:

```bash
npm run test
```

Expected output on a fresh database (or if test uses a unique slot per run):

- 1 request -> `201 Created`
- remaining -> `409 Conflict`

If you re-run the test using the same static slot, you will likely see all requests return `409` because the slot is already booked by a previous run. For repeatable runs, either clear the test appointment from the DB or update the test to use a generated slot/time.

---

## Logging

Project uses `pino` for structured logging. Controllers and services log errors and important events using `pino`. In development the `pino-pretty` transport is used for human-friendly output.

## Screenshots
Concurrency Test

<img width="530" height="310" alt="image" src="https://github.com/user-attachments/assets/1b46db70-f4ce-44df-8efb-d93d09eba835" />

- Try to hold appointment for already booked slot
  <img width="1170" height="406" alt="image" src="https://github.com/user-attachments/assets/46784e21-3920-4a86-8526-5b00cc2e6fa1" />

- Hold appointment for different slot
  <img width="1170" height="406" alt="image" src="https://github.com/user-attachments/assets/575a3b5a-6e4c-4ca2-b713-45705abd1335" />



