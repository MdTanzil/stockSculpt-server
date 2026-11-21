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
| `GET /api/shop/user` | User | Get the caller's shop (owned, else first staff shop) — includes the caller's `role` |
| `GET /api/shop` | Admin | List all shops |
| `POST /api/shop` | User | Create a shop |
| `GET /api/shop/:id` | Team member | Get one shop |
| `PUT /api/shop/:id` | Owner | Update a shop |
| `PUT /api/shop/:id/plan` | Admin | Change a shop's subscription plan (`free` / `premium`) |
| `DELETE /api/shop/:id` | Owner | Delete a shop |
| `GET /api/shop/:id/products` | Team member | List a shop's products |
| `GET /api/shop/:id/orders` | Team member | List a shop's orders |

A shop's `subscriptionPlan` can only be changed through
`PUT /api/shop/:id/plan` (admin only). The create and update endpoints strip
`subscriptionPlan` from the request body, so members can never upgrade
themselves.

### Shop staff — `/api/shop/:id/members`

Staff roles, weakest to strongest: **viewer** (read-only), **staff** (add
and edit products, orders, suppliers and purchase orders; cannot delete),
**manager** (everything except staff management and shop settings),
**owner** (everything). The owner is not a member record — ownership comes
from the shop. Platform admins bypass shop checks as before.

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /api/shop/:id/members` | Owner | List the team (owner + staff members) |
| `POST /api/shop/:id/members` | Owner | Add a staff member by email (`{email, role}`) |
| `PUT /api/shop/:id/members/:memberId` | Owner | Change a member's role |
| `DELETE /api/shop/:id/members/:memberId` | Owner | Remove a staff member (their account is untouched) |

Adding a member requires the person to already have an account — no
invitation email is sent (there is no email service yet). Once added, the
shop appears in their dashboard when they sign in. The role levels are
enforced in `middlewares/shopRole.js` (`requireShopRole` /
`requireResourceRole`) with the shared helpers in `utils/shopAccess.js`.

### Products — `/api/products`

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /api/products` | Staff+ | Create a product |
| `GET /api/products` | User | List products |
| `GET /api/products/barcode/:code` | User | Find a product in the caller's shop by barcode (404 if none) |
| `GET /api/products/:id` | User | Get one product |
| `PUT /api/products/:id` | Staff+ | Update a product |
| `DELETE /api/products/:id` | Manager+ | Delete a product |

Products have an optional `barcode` field, unique per shop (sparse index,
so products without a barcode don't collide). Creating or updating a
product with a barcode another product in the same shop already uses
returns 400; sending an empty barcode clears it.

### Orders — `/api/order`

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /api/order` | Staff+ | Create an order |
| `POST /api/order/pos` | Staff+ | Counter sale: checks stock, decrements it, creates a completed order |
| `GET /api/order` | User | List orders |
| `GET /api/order/:id` | User | Get one order |
| `PUT /api/order/:id` | Staff+ | Update an order (status etc.) |
| `DELETE /api/order/:id` | Manager+ | Delete an order |

The role check allows the required shop role or a platform admin; if the
order's shop no longer exists, only an admin may update or delete it.

A POS sale (`POST /api/order/pos`, body `{items: [{product, quantity}],
paymentMethod: "cash" | "card"}`) validates every line against the
caller's shop and current stock, decrements stock atomically per line
(with rollback if a later line runs out), computes the total server-side
from current prices, and creates a **completed** order with
`source: "pos"` and the recorded payment method (no payment is processed).
The back-office `POST /api/order` does NOT check or decrement stock.

### Suppliers — `/api/suppliers`

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /api/suppliers` | Staff+ | Create a supplier for your shop |
| `GET /api/suppliers` | User | List your shop's suppliers |
| `GET /api/suppliers/:id` | Team member | Get one supplier |
| `PUT /api/suppliers/:id` | Staff+ | Update a supplier |
| `DELETE /api/suppliers/:id` | Manager+ | Delete a supplier (blocked while purchase orders reference it) |

### Purchase orders — `/api/purchase-orders`

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /api/purchase-orders` | Staff+ | Create a purchase order (draft or ordered) |
| `GET /api/purchase-orders` | User | List your shop's purchase orders |
| `GET /api/purchase-orders/:id` | Team member | Get one purchase order |
| `PUT /api/purchase-orders/:id` | Staff+ | Update a draft/ordered purchase order |
| `POST /api/purchase-orders/:id/receive` | Staff+ | Receive an ordered PO — adds quantities to stock |
| `DELETE /api/purchase-orders/:id` | Manager+ | Delete a purchase order (received orders cannot be deleted) |

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

All report endpoints are read-only and scoped to the caller's shop — any
team member (viewer included) can view them. Sales
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
- Staff invites send no email (no email service yet) — the person must
  already have an account, and the shop appears in their dashboard once
  added. A user who is staff in several shops works in the first
  membership found.
- The old per-resource ownership middlewares
  (`checkShopOwnership`, `checkProductOwnership`, `checkOrderAccess`,
  `checkSupplierAccess`, `checkPurchaseOrderAccess`) are unused since the
  role middleware replaced them; they remain as dead files.

## Project structure

```
config/       # CORS options
controllers/  # Route handlers (auth, user, shop, shop member, product,
              # order, supplier, purchase order, report, subscription,
              # admin)
db/           # MongoDB connection
middlewares/  # JWT auth, role checks, shop role checks
model/        # Mongoose models (User, Shop, ShopMember, Product, Order,
              # Supplier, PurchaseOrder, Subscription)
routes/       # Express routers, mounted under /api
utils/        # Token helpers, shop access helpers
index.js      # App entry point (also the Vercel function)
vercel.json   # Vercel deployment config
```
