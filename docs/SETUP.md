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
| Storage  | Excel (`.xlsx`) files via `exceljs`, one workbook per entity |
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

## Excel storage notes

- Each write is serialised per file and written atomically (temp file + rename), so concurrent
  requests can't lose updates and a crash can't leave a half-written workbook.
- **Run a single backend process.** The write lock is in-process; cluster mode or multiple
  instances could corrupt data.
- You can open the workbooks in Excel to view data. **Close Excel before saving changes in AgniDesk.**
  On Windows an open file is locked, and the API returns a "file is locked" error.
- Formatting added manually in Excel is not preserved; AgniDesk rewrites the sheet on each save.
- Quotation/invoice line items and the customer snapshot are stored as JSON text in one cell each.
  Totals have their own columns so the workbook stays readable.

## Environment variables

See [backend/.env.example](../backend/.env.example) and [frontend/.env.example](../frontend/.env.example).
Frontend `VITE_*` variables are bundled into the browser and must never contain secrets.

## Deployment notes

Frontend and backend deploy separately. `DATA_DIR` must point to **persistent storage**
(e.g. a mounted disk). Serverless platforms with ephemeral filesystems (e.g. Vercel functions)
must not host the Excel files.
