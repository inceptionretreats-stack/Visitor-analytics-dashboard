# 🚀 AI-Powered Face Detection Visitor Analytics Dashboard

A real-time, browser-based AI application that detects faces from a live camera
feed, recognises each visitor **once** via 128-dimensional face embeddings, and
visualises footfall analytics on a clean light dashboard.

This is a working implementation of the spec in
[`face_detection_dashboard.md`](face_detection_dashboard.md).

---

## ✨ Features

- **In-browser face detection & recognition** (TensorFlow.js via `@vladmandic/face-api`) — no images ever leave the browser.
- **Multi-face crowd tracking** — detects everyone in frame each cycle (capped at 8).
- **Each person counted once** — running-average (EMA) centroids, a three-zone match
  decision, and a confirm-before-create candidate buffer prevent the same face from being
  counted as several "visitors."
- **Accurate metrics** over Socket.io — Unique Visitors (distinct people), Returning, Total
  Visits (footfall), and Present Now.
- **Rolling 24-hour crowd heatmap** (new arrivals per hour) + a footfall area chart, a
  new-vs-returning donut, a live present/recent feed, and a frequent-visitor leaderboard.
- **Clean light analytics UI** (React + Tailwind + Recharts + Framer Motion).
- **Privacy-first**: only face embeddings are stored, never raw frames.
- **Runs with zero setup** — falls back to an in-memory store when MongoDB isn't configured.

---

## 🧱 Architecture

```
[ Browser Camera ] → [ face-api.js / TF.js ] → [ 128-d embeddings (all faces) ]
        → [ Socket.io ] → [ Node + Express ] → [ Recognition + Analytics Engine ]
        → [ MongoDB (optional) ] → [ React + Recharts Dashboard ]
```

| Layer     | Tech                                                            |
| --------- | --------------------------------------------------------------- |
| Frontend  | React (Vite), Recharts, Tailwind, Framer Motion, Zustand        |
| AI        | `@vladmandic/face-api` (TensorFlow.js) — tiny detector + landmarks + recognition |
| Realtime  | Socket.io (client + server)                                     |
| Backend   | Node.js + Express                                               |
| Database  | MongoDB via Mongoose (**optional** — in-memory fallback built in) |

> **Note:** The spec lists `face-api.js`. We use its actively-maintained drop-in
> fork **`@vladmandic/face-api`**, which is reliable with modern bundlers and
> TF.js. The API is identical.

---

## 📋 Prerequisites

- **Node.js v18+** (tested on v24)
- A **webcam**
- A modern browser (Chrome/Edge/Firefox). The camera requires
  `http://localhost` or HTTPS — `localhost` is treated as secure, so local dev works.
- *(Optional)* a MongoDB connection string for persistence.

---

## ⚡ Quick Start

From the project root:

```bash
# 1. Install everything (root tools + server + client)
npm run install:all

# 2. Start backend + frontend together
npm run dev
```

Then open **http://localhost:5173** and allow camera access.

The backend runs on **http://localhost:4000**.

### Running the two apps separately

```bash
# terminal 1 — backend
cd server && npm install && npm run dev

# terminal 2 — frontend
cd client && npm install && npm run dev
```

---

## 🔧 Configuration

### Backend (`server/.env`, all optional — copy from `.env.example`)

| Variable                   | Default                 | Description                                                  |
| -------------------------- | ----------------------- | ------------------------------------------------------------ |
| `PORT`                     | `4000`                  | HTTP / WebSocket port                                        |
| `CLIENT_ORIGIN`            | `http://localhost:5173` | Allowed CORS origin(s), comma-separated                      |
| `MONGODB_URI`              | *(unset)*               | MongoDB Atlas/local URI. Unset ⇒ in-memory store             |
| `MATCH_THRESHOLD`          | `0.55`                  | `distance ≤` ⇒ confident same-person match                   |
| `NEW_IDENTITY_THRESHOLD`   | `0.62`                  | `distance ≥` ⇒ may become a new identity (after confirmation)|
| `CONFIRM_FRAMES`           | `2`                     | Frames a new face must persist before it's counted           |
| `SESSION_GAP_SECONDS`      | `120`                   | Gap after which the same person counts as a new visit        |
| `PRESENCE_WINDOW_SECONDS`  | `10`                    | "Present now" = identities seen within this window           |
| `VISIT_LOG_RETENTION_HOURS`| `48`                    | In-memory visit-log retention (rolling heatmap source)       |
| `MAX_FACES`                | `8`                     | Max simultaneous faces processed per frame                   |

(See `server/.env.example` for the full list, including the candidate/EMA tuning knobs.)

### Frontend

| Variable          | Default                 | Description          |
| ----------------- | ----------------------- | -------------------- |
| `VITE_SERVER_URL` | `http://localhost:4000` | Backend base URL     |

---

## 🧠 How recognition works

1. The browser runs the tiny face detector every ~350 ms and computes a **128-d descriptor
   for every face** in view.
2. Throttled (~0.8 s), all descriptors for the frame are sent to the backend over Socket.io.
3. For each descriptor the backend finds the closest stored identity and decides by distance:
   - `≤ 0.55` → **confident match**: blend into that identity's running-average centroid;
     count a **new visit** only if the person was last seen more than `SESSION_GAP_SECONDS` ago.
   - `0.55–0.62` → **ambiguous**: treat as the same person (keep them "present"), don't count.
   - `≥ 0.62` → **candidate**: must be confirmed across `CONFIRM_FRAMES` frames; before a new
     identity is created, its blended centroid is re-matched so a known face at a bad angle is
     **never** forked into a duplicate.
4. So one real person becomes exactly **one** identity, counted once in *Unique Visitors*;
   leaving and returning later adds a *visit*.
5. A fresh analytics snapshot (totals, rolling 24h timeline, present-now, recent events) is
   broadcast to every connected dashboard.

---

## 🌍 Deployment

- **Frontend** → Vercel / Netlify (`npm --prefix client run build`, output `client/dist`).
- **Backend** → Railway / Render / AWS EC2 (`npm --prefix server start`).
- **Database** → MongoDB Atlas (set `MONGODB_URI`).
- Set `CLIENT_ORIGIN` on the backend and `VITE_SERVER_URL` on the frontend to the deployed URLs.
- Serve the frontend over **HTTPS** so the camera works off-localhost.

---

## 🔐 Privacy

Only mathematical face embeddings are stored — never raw images or video.
Use the **Reset** button (or `POST /api/reset`) to wipe all stored data.

---

## 🗂️ Project structure

```
.
├── client/                 # React + Vite frontend
│   ├── public/models/      # face-api.js model weights
│   └── src/
│       ├── components/     # CameraFeed, StatCard, FootfallChart, NewVsReturningChart,
│       │                   #   RollingHeatmap, EventFeed (present/recent), TopVisitors
│       ├── face/faceApi.js # model loading + multi-face detection
│       ├── store/          # zustand state
│       ├── socket.js       # socket.io client (emitFaces)
│       └── App.jsx
├── server/                 # Node + Express + Socket.io backend
│   └── src/
│       ├── index.js        # HTTP + websocket server
│       ├── analytics.js    # recognition engine + metrics + rolling timeline
│       ├── store.js        # in-memory / MongoDB write-through store
│       ├── config.js       # env-driven thresholds & windows
│       └── models/Visitor.js
└── package.json            # root scripts (install:all, dev)
```
