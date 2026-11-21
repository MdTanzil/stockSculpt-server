# stockSculpt — Server

REST API for **stockSculpt**, an Inventory Management System.

- **Live API:** https://stock-sculpt-server.vercel.app/api/
- **Client:** https://stocksculpt.web.app/
  ([stockSculpt-client](https://github.com/MdTanzil/stockSculpt-client))

## Tech stack

Node.js · Express 4 · MongoDB (Mongoose) · JWT auth (jsonwebtoken +
bcryptjs) · Vercel

## Requirements

- Node.js 22 or newer (the Vercel project runs **Node 26.x**).
  `jsonwebtoken` must stay on **9.0.3+**: older versions crash on Node 26
  because `jwa 1.x` uses `SlowBuffer`, which Node 26 removed.
- A MongoDB database (Atlas or local).

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Yes | Secret for signing refresh tokens |

## Getting started

```bash
npm install
# create a .env file with the variables above
npm start
```

The server listens on port 3000. `GET /` returns `server alive`.

## API

Base URL: `/api`. Protected routes need a `Bearer` JWT access token.
Admin-only routes also require the `admin` role.

### Auth — `/api/auth`

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /api/auth/login` | – | Log in |
| `POST /api/auth/logout` | – | Log out |
| `POST /api/auth/refresh` | Refresh token | Issue a new access token |
| `GET /api/auth/db-test` | – | Database connectivity check |

### Users — `/api/users`

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /api/users` | – | Register a user (role is always `user`) |
| `GET /api/users` | Admin | List users |
| `GET /api/users/:id` | Admin | Get one user |
| `PUT /api/users/:id` | Admin | Update a user (incl. changing roles) |
| `DELETE /api/users/:id` | Admin | Delete a user |

### Shops — `/api/shop`

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /api/shop/user` | User | Get the current user's shop |
| `GET /api/shop` | Admin | List all shops |
| `POST /api/shop` | User | Create a shop |
| `GET /api/shop/:id` | Owner | Get one shop |
| `PUT /api/shop/:id` | Owner | Update a shop |
| `DELETE /api/shop/:id` | Owner | Delete a shop |
| `GET /api/shop/:id/products` | Owner | List a shop's products |
| `GET /api/shop/:id/orders` | Owner | List a shop's orders |

### Products — `/api/products`

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /api/products` | User | Create a product |
| `GET /api/products` | User | List products |
| `GET /api/products/:id` | User | Get one product |
| `PUT /api/products/:id` | Owner | Update a product |
| `DELETE /api/products/:id` | Owner | Delete a product |

### Orders — `/api/order`

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /api/order` | User | Create an order |
| `GET /api/order` | User | List orders |
| `GET /api/order/:id` | User | Get one order |
| `PUT /api/order/:id` | Access check | Update an order (status etc.) |
| `DELETE /api/order/:id` | Access check | Delete an order |

The access check allows the shop owner or an admin; if the order's shop
no longer exists, only an admin may update or delete it.

### Suppliers — `/api/suppliers`

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /api/suppliers` | User | Create a supplier for your shop |
| `GET /api/suppliers` | User | List your shop's suppliers |
| `GET /api/suppliers/:id` | Access check | Get one supplier |
| `PUT /api/suppliers/:id` | Access check | Update a supplier |
| `DELETE /api/suppliers/:id` | Access check | Delete a supplier (blocked while purchase orders reference it) |

### Purchase orders — `/api/purchase-orders`

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /api/purchase-orders` | User | Create a purchase order (draft or ordered) |
| `GET /api/purchase-orders` | User | List your shop's purchase orders |
| `GET /api/purchase-orders/:id` | Access check | Get one purchase order |
| `PUT /api/purchase-orders/:id` | Access check | Update a draft/ordered purchase order |
| `POST /api/purchase-orders/:id/receive` | Access check | Receive an ordered PO — adds quantities to stock |
| `DELETE /api/purchase-orders/:id` | Access check | Delete a purchase order (received orders cannot be deleted) |

Purchase order lifecycle: `draft` → `ordered` → `received`, or `canceled`
from draft/ordered. The total cost is always computed server-side from the
line items (quantity × unit cost). Receiving is only possible from
`ordered`, so stock can never be added twice; items whose product was
deleted are skipped and reported in the response. Received and canceled
orders cannot be edited.

### Reports — `/api/reports`

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /api/reports/summary` | User | KPI summary: revenue, order counts, units sold, stock value |
| `GET /api/reports/sales-by-product` | User | Per-product units sold and revenue (all shop products) |
| `GET /api/reports/sales-by-category` | User | Per-category units sold and revenue |
| `GET /api/reports/sales-by-month` | User | Monthly revenue, order and unit counts |
| `GET /api/reports/inventory` | User | Current inventory valuation with stock status |

All report endpoints are read-only and scoped to the caller's shop. Sales
figures count **completed orders only**. The sales endpoints accept
`?from=YYYY-MM-DD&to=YYYY-MM-DD` (invalid dates return 400); without a range
the monthly report covers the last 12 months. Per-product and per-category
revenue uses the product's **current** price — orders don't store historical
prices — so it is an approximation when prices changed; the summary and
monthly revenue use each order's stored `totalPrice` and are exact. Items
whose product was deleted are skipped in the per-product/category breakdowns.
The inventory report is point-in-time and ignores the date range.

### Subscriptions — `/api/subscriptions`

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /api/subscriptions` | – | Create a subscription |
| `GET /api/subscriptions` | – | List subscriptions |
| `GET /api/subscriptions/:id` | – | Get one subscription |
| `PUT /api/subscriptions/:id` | – | Update a subscription |
| `DELETE /api/subscriptions/:id` | – | Delete a subscription |

### Admin — `/api/admin`

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /api/admin/state` | Admin | Platform stats: income, sales, totals |

## Deployment

Pushes to `main` deploy automatically to Vercel. The project settings must
use **Node.js 26.x** (older versions are discontinued by Vercel), and the
environment variables above must be set in the Vercel project.

## Known limitations

- No `/create-payment-intent` endpoint yet — Stripe checkout on the client
  cannot complete a real payment until the server adds it (needs the Stripe
  secret key in Vercel env vars).
- No `/send-email` endpoint yet — admin notice/promotional emails have no
  backend.
- `/api/subscriptions` routes are currently unauthenticated.
- `/api/auth/login` trusts the email the client sends (it does not verify
  the Firebase ID token), so a caller who knows an admin's email can mint
  a token for that account. Proper fix: verify the Firebase ID token
  server-side with `firebase-admin` (needs the Firebase service-account
  key in Vercel env vars).

## Project structure

```
config/       # CORS options
controllers/  # Route handlers (auth, user, shop, product, order,
              # supplier, purchase order, report, subscription, admin)
db/           # MongoDB connection
middlewares/  # JWT auth, role checks, ownership checks
model/        # Mongoose models (User, Shop, Product, Order, Supplier,
              # PurchaseOrder, Subscription)
routes/       # Express routers, mounted under /api
utils/        # Token helpers
index.js      # App entry point (also the Vercel function)
vercel.json   # Vercel deployment config
```
