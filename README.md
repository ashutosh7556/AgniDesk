# AgniDesk

Business management system for **Agni Setu Fire Safety** — *Where Safety Meets Trust*.

Manages customers, inventory, quotations, GST / non-GST invoices, expenses, fire safety services, payments and reports.

> **Status: Phase 4** — login, customers, products with calculated stock, quotations, GST / Non-GST invoices (PDF, print, WhatsApp), payments, expenses and a live dashboard.

## Tech stack

| Layer    | Technology |
| -------- | ---------- |
| Frontend | React 19, Vite, React Router, Tailwind CSS v4, Lucide icons |
| Backend  | Node.js (>= 22.9), Express 5, Helmet, CORS, zod, express-rate-limit |
| Storage  | Excel (`.xlsx`) files via `exceljs`, one workbook per entity |
| Auth     | JWT (`jsonwebtoken`) + bcrypt (`bcryptjs`) |
| PDF      | `pdfkit` (server-side) |

In development, Vite proxies `/api/*` to the backend, so no CORS setup is needed locally.

**Login:** owner email and password set in `backend/.env` on first start. See [docs/SETUP.md](docs/SETUP.md) for setup, API reference and Excel storage notes.

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
| GET    | `/api/dashboard` | Dashboard figures |
