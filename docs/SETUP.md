# AgniDesk — Setup & Reference

Business management system for **Agni Setu Fire Safety** — *Where Safety Meets Trust*.

Manages customers, inventory, quotations, GST / non-GST invoices, expenses, fire safety services, payments and reports.

> **Status: Phase 2** — owner login (JWT), customer management, product & inventory management, Excel storage.
> Dashboard figures are still sample data.

## Tech stack

| Layer    | Technology |
| -------- | ---------- |
| Frontend | React 19, Vite, React Router, Tailwind CSS v4, Lucide icons |
| Backend  | Node.js (>= 22.9), Express 5, Helmet, CORS, zod, express-rate-limit |
| Storage  | Google Sheets (one tab per entity) via `googleapis` |
| Auth     | JWT (`jsonwebtoken`) + bcrypt (`bcryptjs`) |

## Project structure

```
AgniDesk/
├── frontend/          React + Vite web app
├── backend/           Express REST API
│   └── data/          Excel workbooks (created at runtime, gitignored)
└── README.md
```

## Running locally

Requires Node.js 22.9 or newer.

### 1. Backend (http://localhost:5000)

```bash
cd backend
cp .env.example .env
npm install
```

Edit `backend/.env`:

- `JWT_SECRET`: a long random string. Generate one with
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `OWNER_EMAIL` / `OWNER_PASSWORD`: the owner login (password min 8 characters).

```bash
npm run dev
```

On first start the server creates `backend/data/` with `users.xlsx`, `customers.xlsx` and
`products.xlsx`, and saves the owner account with a bcrypt-hashed password.
After that, `OWNER_PASSWORD` is ignored and can be removed from `.env`.

### 2. Frontend (http://localhost:5173), in a second terminal

```bash
cd frontend
npm install
npm run dev
```

In development, Vite proxies `/api/*` to the backend.

## API

All responses use `{ success: true, data }` or `{ success: false, error: { message, details? } }`.
Protected routes need `Authorization: Bearer <token>`.

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| GET | `/api/health` | – | Health check |
| POST | `/api/auth/login` | – | `{ email, password }` → `{ token, user }` (rate limited) |
| GET | `/api/auth/me` | ✓ | Current user |
| GET | `/api/customers?search=&page=&limit=` | ✓ | List / search customers |
| POST | `/api/customers` | ✓ | Create customer |
| GET | `/api/customers/:id` | ✓ | Customer details |
| PUT | `/api/customers/:id` | ✓ | Update customer |
| DELETE | `/api/customers/:id` | ✓ | Delete customer |
| GET | `/api/products?search=&category=&lowStock=true&page=&limit=` | ✓ | List products + inventory summary |
| POST | `/api/products` | ✓ | Create product |
| GET | `/api/products/:id` | ✓ | Product details |
| PUT | `/api/products/:id` | ✓ | Update product |
| DELETE | `/api/products/:id` | ✓ | Delete product |
| GET | `/api/quotations?search=&customerId=&page=&limit=` | ✓ | List quotations |
| POST | `/api/quotations` | ✓ | Create quotation (number auto-assigned) |
| GET | `/api/quotations/:id` | ✓ | Quotation details |
| PUT | `/api/quotations/:id` | ✓ | Update quotation (number unchanged) |
| DELETE | `/api/quotations/:id` | ✓ | Delete quotation |
| GET | `/api/quotations/:id/pdf` | ✓ | Quotation PDF |
| GET | `/api/invoices?search=&customerId=&invoiceType=&paymentStatus=&page=&limit=` | ✓ | List invoices + totals |
| POST | `/api/invoices` | ✓ | Create GST / Non-GST invoice (number auto-assigned) |
| GET | `/api/invoices/:id` | ✓ | Invoice details |
| PUT | `/api/invoices/:id` | ✓ | Update invoice (type and number unchanged) |
| GET | `/api/invoices/:id/payments` | ✓ | Payments for one invoice |
| POST | `/api/invoices/:id/payments` | ✓ | Record payment `{ date, amount, mode, reference?, note? }` |
| GET | `/api/payments?search=&mode=&from=&to=&page=&limit=` | ✓ | All payments + total received |
| DELETE | `/api/payments/:id` | ✓ | Delete payment (refund / correction) |
| GET | `/api/expenses?search=&category=&from=&to=&page=&limit=` | ✓ | Expenses + category totals |
| POST / PUT / DELETE | `/api/expenses[/:id]` | ✓ | Create / update / delete expense |
| GET | `/api/products/:id/stock` | ✓ | Stock history with running balance |
| POST | `/api/products/:id/stock` | ✓ | Adjust stock `{ date, type: purchase|adjustment, quantity, note }` |
| GET | `/api/services?search=&customerId=&status=&serviceType=&page=&limit=` | ✓ | Service records + summary counts |
| GET | `/api/services/reminders?days=30` | ✓ | Overdue / due services and scheduled visits |
| POST / PUT / DELETE | `/api/services[/:id]` | ✓ | Create / update / delete service (delete refused once a certificate exists) |
| POST | `/api/services/:id/complete` | ✓ | Mark completed and issue certificate number |
| GET | `/api/services/:id/certificate` | ✓ | Service certificate PDF (completed services only) |
| GET | `/api/dashboard` | ✓ | Dashboard figures |
| POST | `/api/invoices/:id/cancel` | ✓ | Cancel invoice (invoices are never deleted) |
| GET | `/api/invoices/:id/pdf` | ✓ | Invoice PDF |

## Quotations & invoices

- **Numbering** restarts every financial year (April–March): `QT/2026-27/0001`,
  `INV/2026-27/0001` (GST) and `NG/2026-27/0001` (Non-GST). Numbers are assigned inside the
  file lock, so two invoices can never get the same number.
- **Calculations** happen on the server: discount is applied before tax, GST is split into
  CGST + SGST (within Gujarat) or charged as IGST (other states, auto-detected from the
  customer's GSTIN), and the grand total is rounded to the nearest rupee.
- **Customer snapshot:** each document stores the customer's billing details at the time it
  was saved, so editing a customer later doesn't change old invoices.
- **Cancelling:** invoices can't be deleted (continuous GST numbering). Cancelled invoices keep
  their number, show a CANCELLED watermark and are excluded from totals.
- Customers with quotations or invoices can't be deleted.
- Set `BUSINESS_GSTIN` in `backend/.env` so it is printed on GST invoices.

## Stock & payments (calculated, never stored)

- **Available stock** = opening stock + stock adjustments − quantities on active invoices.
  Creating, editing or cancelling an invoice changes stock automatically. Products are
  never written to when you sell, so the numbers cannot drift out of sync.
- **Amount paid** on an invoice = sum of its payment records (`payments.xlsx`).
- An invoice with payments cannot be cancelled until the payments are deleted, and its
  total cannot be reduced below the amount already received.
- Selling more than available stock is allowed (stock goes negative) with a warning.

## Fire safety services

- Status flow: **scheduled → completed / cancelled**. Completing a service issues a certificate
  number (`CERT/2026-27/0001`, restarting each financial year), assigned inside the file lock.
- Completed services can be edited but not reverted or deleted (the certificate may be with the customer).
- **Reminders:** a completed service with a next due date shows as a reminder from 30 days before
  the due date (or when overdue) until a newer service of the same type is recorded for that customer.
  Scheduled visits in the window are listed too. Reminders offer "Book service" and a WhatsApp message.

## Storage: Google Sheets (all data)

**Every record is stored in the Google spreadsheet** (one tab per entity). The server keeps no data files,
so it can be deployed without a persistent disk.

| Tab | Contents |
| --- | --- |
| Users | Login accounts (bcrypt PasswordHash, Role, PasswordChangedAt) |
| Customers | Customers |
| Products | Products. `Stock` = current stock (display, kept up to date); `OpeningStock` is the stored value |
| StockMovements | Stock received / corrections (tab created automatically) |
| Quotations | Quotations (line items + customer snapshot as JSON in `ItemsJSON` / `CustomerJSON`) |
| Invoices | Invoices. `PaidAmount` / `PaymentStatus` are display columns kept up to date from Payments |
| InvoiceItems | One row per invoice line, **rebuilt automatically** from Invoices (don't edit here) |
| Payments | Payments received |
| Expenses | Expenses |
| Services | Service visits. `Equipment` = readable summary; `EquipmentJSON` = data |
| Settings | Business settings (tab created automatically) |

- Your existing columns are matched by header name; extra columns the app needs are **appended to the end of the
  header row at startup** (existing columns are never moved). Unknown columns you add are kept.
- Rows whose ID doesn't look like the app's IDs (e.g. `CUS-0001`) are ignored.
- **Edit data in AgniDesk.** Direct edits in the sheet show in the app within ~5 s, but editing calculated/JSON
  columns or deleting rows that other records reference can break totals.
- Google API quota (~60 requests/min): all tabs are read in one batch request and cached ~5 s; rate-limit errors
  are retried automatically with backoff.
- **Security:** the Users tab holds password hashes and roles. Share the spreadsheet only with the service account
  and the admins. Use report exports (Excel) to share data with others.
- If Google Sheets is unreachable, the app can't be used (every request checks the login account).
- One-time moves from the old local Excel files (already run): `npm run migrate:customers-to-sheets`,
  `npm run migrate:users-to-sheets`, `npm run migrate:all-to-sheets` (all safe to re-run).
- Tab names can be overridden with `GOOGLE_SHEETS_<NAME>_TAB` (used for testing on temporary tabs).

## Environment variables

See [backend/.env.example](../backend/.env.example) and [frontend/.env.example](../frontend/.env.example).
Frontend `VITE_*` variables are bundled into the browser and must never contain secrets.

## Deployment notes

Frontend and backend deploy separately. All data lives in Google Sheets, so the backend needs **no persistent
disk** — only its environment variables (JWT secret, spreadsheet ID) and the service account key (provide the JSON
key as a secret file on the host). Run a single backend instance (write locks are in-process).
