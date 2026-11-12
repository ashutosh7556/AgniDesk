# AgniDesk

Business management system for **Agni Setu Fire Safety** — *Where Safety Meets Trust*.

Manages customers, inventory, quotations, GST / non-GST invoices, expenses, fire safety services, payments and reports.

> **Status: Phase 3** — owner login (JWT), customers, products & inventory, quotations, GST / Non-GST invoices with PDF, print and WhatsApp sharing. Dashboard figures are still sample data.

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
| CRUD   | `/api/invoices` | Invoices (+ `/:id/pdf`, `/:id/payment`, `/:id/cancel`) |
