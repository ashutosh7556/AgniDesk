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

In development, Vite proxies `/api/*` to the backend, so no CORS setup is needed locally.

**Login (Phase 1 mock):** any valid email plus a password of 6+ characters.

## API

| Method | Endpoint      | Description          |
| ------ | ------------- | -------------------- |
| GET    | `/api/health` | Service health check |


