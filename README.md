# AgniDesk

Business management system for **Agni Setu Fire Safety** — *Where Safety Meets Trust*.

Manages customers, inventory, quotations, GST / non-GST invoices, expenses, fire safety services, payments and reports.

> **Status: Phase 1** — project setup, login UI (mock auth), dashboard UI (sample data), Express backend with health check.

## Tech stack

| Layer    | Technology |
| -------- | ---------- |
| Frontend | React 19, Vite, React Router, Tailwind CSS v4, Lucide icons |
| Backend  | Node.js (>= 22.9), Express 5, Helmet, CORS |
| Storage  | Excel (`.xlsx`) via `xlsx` — *from Phase 2* |
| Auth     | JWT + bcrypt — *from Phase 2* |

## Project structure

```
AgniDesk/
├── frontend/          React + Vite web app
├── backend/           Express REST API
├── docs/              Project documentation
└── README.md
```

## Running locally

Requires Node.js 22.9 or newer.

```bash
# 1. Backend  (http://localhost:5000)
cd backend
cp .env.example .env
npm install
npm run dev

# 2. Frontend (http://localhost:5173) — in a second terminal
cd frontend
npm install
npm run dev
```

In development, Vite proxies `/api/*` to the backend, so no CORS setup is needed locally.

**Login (Phase 1 mock):** any valid email plus a password of 6+ characters.

## API

| Method | Endpoint      | Description          |
| ------ | ------------- | -------------------- |
| GET    | `/api/health` | Service health check |

All responses use the envelope `{ success: true, data }` or `{ success: false, error: { message } }`.

## Environment variables

See [backend/.env.example](backend/.env.example) and [frontend/.env.example](frontend/.env.example).
Frontend `VITE_*` variables are bundled into the browser and must never contain secrets.

## Deployment notes

Frontend and backend deploy separately. Excel business data must live on **persistent storage**
(e.g. a mounted disk). Serverless platforms with ephemeral filesystems (e.g. Vercel functions)
must not host the Excel files.
