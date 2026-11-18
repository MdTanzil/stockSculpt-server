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
              # subscription, admin)
db/           # MongoDB connection
middlewares/  # JWT auth, role checks, ownership checks
model/        # Mongoose models (User, Shop, Product, Order, Subscription)
routes/       # Express routers, mounted under /api
utils/        # Token helpers
index.js      # App entry point (also the Vercel function)
vercel.json   # Vercel deployment config
```
