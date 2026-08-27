# Techargi Shop POS API

A modular REST API for a POS mobile application, built with Node.js, Express, MongoDB, and Mongoose. It uses JWT authentication, bcrypt password hashing, express-validator input validation, RBAC, MongoDB transactions, aggregation reports, Helmet, CORS, compression, request logging, and rate limiting.

Flutter frontend developers should start with [FLUTTER_INTEGRATION.md](FLUTTER_INTEGRATION.md) for mobile setup, authentication, Dart client/model examples, payloads, role-based screens, and error handling.

The complete [Postman collection](postman/Techargi_POS_API.postman_collection.json) can be imported directly for API testing. Set `baseUrl` if needed, then run Health and Register/Login first; subsequent requests reuse the saved bearer token and resource IDs.

## Setup

Requirements: Node.js 18+, MongoDB 6+ (a replica set is required for order transactions), and npm.

```bash
npm install
cp .env.example .env
npm run dev
```

`npm start` runs the production process. `npm test` runs the health smoke test. The API defaults to `http://localhost:5001` because macOS commonly reserves port 5000 for AirTunes.

### Deploy to Vercel

Vercel uses `api/index.js` as the serverless entrypoint. Configure `MONGO_URI`,
`JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `TAX_RATE`, and Cloudinary variables in the Vercel
project settings, and allow Vercel's database access in your MongoDB provider.
The included `vercel.json` rewrite exposes the health endpoint at `/health` and
the API base at `/api/v1`.

### Configure Cloudinary image storage

1. Create an account at [Cloudinary](https://cloudinary.com/).
2. Open the **Dashboard**.
3. Copy the **Cloud name**, **API Key**, and **API Secret**.
4. Add them to your local `.env` file:

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

The API secret is private and must never be placed in Flutter code or committed
to Git. The backend uploads images into the `techargi/products` folder in
Cloudinary and stores the returned secure URL and public ID in the Product
document. Product images are accepted as multipart field `image` and limited
to 5 MB.

To test the integration, first start the backend and obtain an Admin JWT and a
category ID. Then run:

```bash
curl -X POST http://localhost:5001/api/v1/products \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -F "name=Cloudinary Test Product" \
  -F "category=CATEGORY_ID" \
  -F "price=100" \
  -F "cost=70" \
  -F "sku=CLOUDINARY-TEST-001" \
  -F "stockQuantity=10" \
  -F "image=@/absolute/path/to/product.jpg"
```

The response should contain an `image` URL beginning with
`https://res.cloudinary.com/`. Update and delete operations also remove the
previous Cloudinary image automatically.

### Environment variables

| Variable | Purpose | Example |
| --- | --- | --- |
| `NODE_ENV` | Runtime mode | `development` |
| `PORT` | HTTP port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/techargi_pos` |
| `JWT_SECRET` | Token signing secret | long random value |
| `JWT_EXPIRES_IN` | Token lifetime | `1d` |
| `CORS_ORIGIN` | Allowed browser origin, or `*` | `*` |
| `TAX_RATE` | Decimal tax rate | `0.15` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | stored privately |
| `CLOUDINARY_API_KEY` | Cloudinary API key | stored privately |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | stored privately |

## Development log

1. **Step 1: Server setup and database connection.** Added environment configuration, Mongoose connection handling, Express middleware, health endpoint, graceful shutdown, centralized errors, security headers, rate limiting, and compression.
2. **Step 2: Auth system.** Added the User model, bcrypt hashing, JWT login/registration/profile endpoints, authentication middleware, and Admin/Cashier/Delivery Person RBAC.
3. **Step 3: Product CRUD.** Added Category and Product models, product CRUD, category management, low-stock filtering, and stock updates.
4. **Step 4: Orders and checkout.** Added order schema, server-side pricing/tax/discount calculations, availability and stock checks, and a MongoDB transaction that decrements stock atomically while creating the order.
5. **Step 5: Delivery management.** Added delivery assignment, customer contact/address data, delivery-person scoping, and delivery status transitions.
6. **Step 6: Aggregation reports.** Added daily, monthly, and yearly aggregation reports with revenue, profit, payment breakdown, top items, and trends.
7. **Step 7: Verification and documentation.** Added the health test, `.env.example`, and this API reference.

## Schema and relationships

- **User**: name, email, hashed password, role, phone, active state. A user creates many Orders and a delivery person is assigned many Deliveries.
- **Category**: name, description, active state. One Category has many Products.
- **Product**: name, category, price, cost, SKU, stock quantity, low-stock threshold, image, availability.
- **Order**: order number, line items, subtotal, discount, tax, total, payment method/status, order status, creator. Each line item references a Product.
- **Delivery**: one-to-one Order, assigned User, status, and customer name/phone/address/notes.

## Authentication

Send the returned token on protected requests:

```http
Authorization: Bearer <jwt>
```

The first registration creates a Cashier by default. Admin creation is restricted to an Admin. In a new installation, promote the first administrative account directly in MongoDB or add a provisioning workflow appropriate to your deployment.

### Create the first Admin

Add these private values to `.env` (never commit them):

```env
ADMIN_NAME=System Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=use-a-strong-password
ADMIN_PHONE=+15550000000
```

Then run:

```bash
npm run seed:admin
```

The migration creates the Admin if the email does not exist. If it already exists, it promotes the account, activates it, and replaces its password. It is safe to rerun, but rerunning intentionally changes the password to the current `ADMIN_PASSWORD` value.

## API endpoints

All responses use `{ "success": true, "data": ... }`; errors use `{ "success": false, "message": "..." }`.

### Auth: `/api/v1/auth`

| Method | Endpoint | Auth | Body |
| --- | --- | --- | --- |
| POST | `/register` | Public | `{ name, email, password, phone? }` (creates a `Customer`) |
| POST | `/login` | Public | `{ email, password }` |
| GET | `/me` | Any user | None |
| PATCH | `/me` | Any user | `{ name?, phone? }` |
| POST | `/users` | Admin | `{ name, email, password, role, phone? }` |

Login/register response includes `{ user: { id, name, email, role, phone }, token }`.

### Products and categories: `/api/v1/products`

| Method | Endpoint | Auth | Body/query |
| --- | --- | --- | --- |
| GET | `/` | Any user | `lowStock=true` and/or `category=<id>` |
| POST | `/` | Admin | `multipart/form-data`: product fields plus optional image file field `image` |
| GET | `/:id` | Any user | None |
| PATCH | `/:id` | Admin | Any editable product fields; optionally `multipart/form-data` with image file field `image` |
| DELETE | `/:id` | Admin | None |
| PATCH | `/:id/stock` | Admin | `{ stockQuantity }` |
| GET | `/categories` | Any user | None |
| POST | `/categories` | Admin | `{ name, description? }` |
| PATCH | `/categories/:id` | Admin | `{ name?, description?, isActive? }` |

### Orders: `/api/v1/orders`

| Method | Endpoint | Auth | Body |
| --- | --- | --- | --- |
| POST | `/` | Admin/Cashier/Customer | `{ items: [{ productId, quantity }], paymentMethod, discount? }` |
| GET | `/` | Admin/Cashier: all orders; Customer: own orders | None |
| GET | `/:id` | Admin/Cashier: any order; Customer: own order | None |
| PATCH | `/:id/status` | Admin/Cashier | `{ orderStatus?, paymentStatus? }` |

Checkout calculates subtotal, discount, tax, and total from database prices. It checks all items and decrements inventory in one MongoDB transaction.

Customer checkout should keep its cart in the Flutter app (for example, a list of
product IDs and quantities), then submit that list to `POST /orders`. The server
rechecks availability and stock and returns the authoritative totals. Customers
cannot set discounts or payment/order status fields.

### Deliveries: `/api/v1/deliveries`

| Method | Endpoint | Auth | Body |
| --- | --- | --- | --- |
| GET | `/` | Any user | Delivery People see assigned deliveries only |
| POST | `/` | Admin/Cashier | `{ order, assignedTo, customer: { name, phone, address, deliveryNotes? } }` |
| PATCH | `/:id/status` | Admin/Delivery Person | `{ status }` where status is `Pending`, `In Progress`, `Out for Delivery`, `Delivered`, or `Cancelled` |

### Reports: `/api/v1/reports`

Admin-only endpoints:

- `GET /daily?date=YYYY-MM-DD`
- `GET /monthly?year=YYYY&month=MM`
- `GET /yearly?year=YYYY`

Each returns `totalSales`, `totalProfit`, `paymentMethodBreakdown`, `topItems`, and a `trend` array. Daily trend keys are dates; monthly keys are dates in the selected month; yearly keys are `YYYY-MM`.

## Project structure

```text
src/
  config/       environment and MongoDB connection
  controllers/  HTTP handlers
  middlewares/  auth, validation, and error handling
  models/       Mongoose schemas
  routes/       versioned resource routes
  services/     transactional business logic
  utils/        shared helpers
  app.js        Express composition
  server.js     process startup and shutdown
```
