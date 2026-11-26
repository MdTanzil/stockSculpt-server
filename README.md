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
| `STRIPE_SECRET_KEY` | For payments | Stripe secret key (`sk_test_...` in test mode, from the same Stripe account as the test publishable key in the client). Without it the payment endpoints answer 503 and the payment page shows a "not set up yet" notice. |

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
| `PUT /api/shop/:id/plan` | Admin | Change a shop's plan by name (`{ plan: "Starter" }` — must match a plan in the plans collection; a $0 plan sets `free`, a priced plan sets `premium`). A paid plan also needs a period: `interval` `"monthly"` (default) or `"yearly"`, or an exact `endDate` — the shop's `subscriptionStartDate` / `subscriptionEndDate` are set from it; the Free plan has no dates |
| `DELETE /api/shop/:id` | Owner | Delete a shop |
| `GET /api/shop/:id/products` | Team member | List a shop's products |
| `GET /api/shop/:id/orders` | Team member | List a shop's orders |
| `GET /api/shop/:id/audit-logs` | Team member | List a shop's audit log (newest first; see below) |

**Audit log:** every mutation to a shop's products, orders (including
POS sales), suppliers, purchase orders, staff and shop settings is
recorded in the `AuditLog` collection — who did it (`actor`, populated
as `{name, email}`), what happened (`action`, e.g.
`product.created`, `order.status_changed`, `pos.sale`,
`purchase_order.received`, `staff.role_changed`, `shop.plan_changed`),
which item (`entityType` / `entityId` / `entityName` — the name is a
snapshot, so a deleted item still reads sensibly), and a short
human-readable summary (`details`, e.g. `Stock 5 → 3` or `Status
pending → completed`). Entries are written by the controllers through
`utils/auditLog.js` after the mutation succeeds, and a failed write
never breaks the operation. There is no endpoint that updates or
deletes entries — the log is append-only. The list endpoint takes
`?entityType=&action=&actor=&from=&to=` filters (dates are
`YYYY-MM-DD`; the `to` day is included whole) and `?page=&limit=`
(default 50, max 100), returning `{ logs, total, page, pages }`.

A shop's `subscriptionPlan` can only be changed through
`PUT /api/shop/:id/plan` (admin only). The create and update endpoints strip
`subscriptionPlan` from the request body, so members can never upgrade
themselves. The shop also carries `planName` (e.g. "Starter") — the
specific plan it is on — and `subscriptionStartDate` /
`subscriptionEndDate`, the plan's current period (null on the Free plan,
which never expires). `subscriptionPlan` stays the simple free/paid
flag, and all four are always set together by the plan endpoint (and by
a successful payment, which copies the period from the Subscription
record it creates). The Subscription collection is the payment history;
the Shop carries the live state the UI shows.

**Grace period and automatic cancellation:** when a paid plan reaches
its end date it is not cancelled at once — the shop gets 5 extra days
to pay (`GRACE_DAYS` in `utils/subscriptionExpiry.js`), during which it
keeps the paid plan and the owner sees a renewal notice. Once the grace
period runs out the subscription is cancelled automatically: the shop
drops to the Free plan with no dates. There is no background job on this
serverless backend, so the check runs lazily — every read of a shop
(`findCallerShop`, `getShop`, `getShops`) applies it, so any shop past
its grace period is already Free by the time anyone sees it.

**Paid features and the product limit:** the Free plan covers the
core — products (up to its limit), orders, the dashboard and invoices.
Point of sale, barcode scanning, reports, suppliers, purchase orders
and staff roles are paid features: their endpoints require a premium
plan (`middlewares/requirePremium.js`, 403 `PREMIUM_REQUIRED`
otherwise). Creating a product is also limited by the shop's plan:
`POST /api/products` counts the shop's products against its plan's
`productLimit` and rejects with 403 `PRODUCT_LIMIT_REACHED` when the
shop is at its limit. Nothing is ever deleted on a downgrade — a shop
over its limit keeps all its products and can still sell them; it just
cannot add new ones until it is back under the limit or upgrades.

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
| `POST /api/products/import` | Staff+ | Bulk import products from a parsed CSV: `{ rows: [{ name, price, discountPrice, stock, category, barcode, description, row }] }` — each row is validated with the same rules as single creation (a bad row is reported, not fatal); returns 201 with `{ created, errors: [{ row, name, error }] }` when at least one product was created, else 400. At most 500 rows per file; the plan limit is checked for the whole batch first (a batch that would exceed it is refused with `PRODUCT_LIMIT_REACHED`); one `product.imported` audit entry summarises the import |
| `GET /api/products` | User | List products |
| `GET /api/products/barcode/:code` | User | Find a product in the caller's shop by barcode (404 if none) |
| `GET /api/products/:id` | User | Get one product |
| `PUT /api/products/:id` | Staff+ | Update a product |
| `DELETE /api/products/:id` | Manager+ | Delete a product |

Products have an optional `barcode` field, unique per shop (partial index
on string barcodes, so products without a barcode don't collide —
a sparse compound index does NOT work here: it still includes documents
that have the shop field, with the missing barcode treated as null).
Creating or updating a product with a barcode another product in the same
shop already uses returns 400; sending an empty barcode clears it.

Products also have an optional `lowStockThreshold` (a whole number >= 0,
default 5): stock at or below it counts as low stock for that product
in the dashboard banner, the product table, the low-stock filter and the
reports. Sending an empty threshold clears it back to the default; an
invalid value returns 400. The CSV import accepts a `lowStockThreshold`
column with the same rules.

Products also have an optional `discountPrice` (a sale price). When set
below the regular `price`, customers pay the discount price instead —
POS sale totals, report revenue and stock valuation all use the
effective price (`utils/effectivePrice.js`; the client mirrors the
rule in `src/utils/productPrice.js`). A discount price must be 0 or
more and below the regular price, otherwise creating or updating the
product returns 400; sending an empty discount price clears it.
Indexes are created explicitly at startup (`db/index.js` runs
`createIndexes()` for every model after connecting) rather than relying
on Mongoose's background auto-indexing, whose failures are silent.

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

The back-office `POST /api/order` checks stock the same way: every line
must exist in the caller's shop with a whole-number quantity of at
least 1, and the order is refused with 400 ("Not enough stock for X
(only N left)") when a line exceeds the stock. Creating an order
decrements stock (a cancelled order holds no stock, so nothing is
decremented for one). The stock follows the order afterwards: `PUT`
cancelling an order restores its stock, un-cancelling decrements it
again (failing if there is not enough left), and editing the products
adjusts stock by the difference per product; `DELETE` restores the
stock of a non-cancelled order. The shared rules live in
`utils/orderStock.js` and are used by both the back-office handlers
and the POS sale.

Every order records who created it (`createdBy`, set server-side from
the caller's account — a client cannot claim another staff member
prepared an order). Order reads populate it as `{name, email}` so the
invoice and the POS receipt can show "Prepared by". Orders created
before this field existed have no value.

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
revenue uses the product's **current effective** price (the discount price
when one is set) — orders don't store historical prices — so it is an
approximation when prices changed; the summary and monthly revenue use
each order's stored `totalPrice` and are exact. Items
whose product was deleted are skipped in the per-product/category breakdowns.
The inventory report is point-in-time and ignores the date range.

### Plans — `/api/plans`

Subscription plans live in the database, managed by the admin (Manage
Plans page), instead of being hardcoded in the client. The subscription
page, the home page pricing section and the Stripe payment flow all read
from here, so an admin price change takes effect everywhere at once. The
default plans (Free $0/3 products, Starter $10/200, Company $20/450,
Enterprise $50/1,500 — yearly prices are 10x monthly, i.e. 2 months free)
are seeded automatically on first run when the collection is empty.

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /api/plans` | – | List active plans, in display order |
| `GET /api/plans/all` | Admin | List all plans, including inactive |
| `POST /api/plans` | Admin | Create a plan |
| `PUT /api/plans/:id` | Admin | Update a plan |
| `DELETE /api/plans/:id` | Admin | Delete a plan |

Plan fields: `name` (unique), `description`, `price` (monthly, USD),
`yearlyPrice` (optional), `productLimit`, `features` (string list),
`popular`, `active`, `order`. The `features` list is what the pricing
cards show: Free lists the core features only, paid plans list the
core plus the paid features — the cards cross out any paid feature a
plan's list does not mention, so keep the lists honest.

### Payments — `/api`

Stripe subscription payments (test mode). The client confirms the
PaymentIntent directly with Stripe, then records the payment here.

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /api/create-payment-intent` | User | Create a PaymentIntent for a plan; the price is looked up from the plan in the database, never trusted from the client |
| `POST /api/payments` | User | Verify a succeeded PaymentIntent with Stripe, record the payment, activate premium on the caller's shop for the billing period (monthly/yearly; paying again while a subscription is running extends it from its current end date) |

`POST /api/payments` is idempotent per `transactionId` (the Stripe
PaymentIntent id): a retry returns the original record instead of
recording the payment twice.

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

- No `/send-email` endpoint yet — admin notice/promotional emails have no
  backend.
- Expired subscriptions are not auto-downgraded — nothing runs when a
  subscription's `endDate` passes, so the shop keeps the premium plan
  until an admin changes it.
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
