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

## Excel storage notes

- Each write is serialised per file and written atomically (temp file + rename), so concurrent
  requests can't lose updates and a crash can't leave a half-written workbook.
- **Run a single backend process.** The write lock is in-process; cluster mode or multiple
  instances could corrupt data.
- You can open the workbooks in Excel to view data. **Close Excel before saving changes in AgniDesk.**
  On Windows an open file is locked, and the API returns a "file is locked" error.
- Formatting added manually in Excel is not preserved; AgniDesk rewrites the sheet on each save.

## Environment variables

See [backend/.env.example](../backend/.env.example) and [frontend/.env.example](../frontend/.env.example).
Frontend `VITE_*` variables are bundled into the browser and must never contain secrets.

## Deployment notes

Frontend and backend deploy separately. `DATA_DIR` must point to **persistent storage**
(e.g. a mounted disk). Serverless platforms with ephemeral filesystems (e.g. Vercel functions)
must not host the Excel files.
