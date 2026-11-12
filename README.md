# AgniDesk

Business management system for **Agni Setu Fire Safety** — *Where Safety Meets Trust*.

Manages customers, inventory, quotations, GST / non-GST invoices, expenses, fire safety services, payments and reports.

> **Status: Phase 6** — customers (Google Sheets), products & stock, quotations, GST / Non-GST invoices, payments, expenses, services & certificates, dashboard, reports with Excel export, settings and backup/restore.

## Tech stack

| Layer    | Technology |
| -------- | ---------- |
| Frontend | React 19, Vite, React Router, Tailwind CSS v4, Lucide icons |
| Backend  | Node.js (>= 22.9), Express 5, Helmet, CORS, zod, express-rate-limit |
| Storage  | **Google Sheets** (one tab per entity) via `googleapis`; no local data files |
| Auth     | JWT (`jsonwebtoken`) + bcrypt (`bcryptjs`) |
| PDF      | `pdfkit` (server-side) |

In development, Vite proxies `/api/*` to the backend, so no CORS setup is needed locally.

**Login:** owner email and password set in `backend/.env` on first start. See [docs/SETUP.md](docs/SETUP.md) for setup, API reference and Google Sheets storage notes.

## API

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET    | `/api/health` | Service health check |
| POST   | `/api/auth/login` | Owner login |
| GET    | `/api/auth/me` | Current user |
| CRUD   | `/api/customers` | Customers |
| CRUD   | `/api/products` | Products & inventory |
| CRUD   | `/api/quotations` | Quotations (+ `/:id/pdf`) |
| CRUD   | `/api/invoices` | Invoices (+ `/:id/pdf`, `/:id/payments`, `/:id/cancel`) |
| GET/DELETE | `/api/payments` | Payment history |
| CRUD   | `/api/expenses` | Expenses |
| GET/POST | `/api/products/:id/stock` | Stock history / adjust stock |
| CRUD   | `/api/services` | Service records (+ `/reminders`, `/:id/complete`, `/:id/certificate`) |
| GET    | `/api/dashboard` | Dashboard figures |
| GET/PUT | `/api/settings` | Business & document settings |
| PUT    | `/api/auth/profile`, `/api/auth/password` | Owner profile / change password |
| GET    | `/api/reports/:type` (+ `/export`) | Reports (JSON / Excel) |
| GET/POST | `/api/backup`, `/api/backup/restore` | Full backup download / restore |
