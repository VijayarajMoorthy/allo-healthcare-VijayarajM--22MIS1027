# Concurrency-Safe Inventory Reservation Portal

An internship-level assignment submission implementing a robust, race-condition-safe inventory reservation system. The portal temporarily reserves warehouse stocks during checkout, automatically expires holds after 10 minutes, and prevents double-booking using PostgreSQL row-level locking.

---

## ⚡ Key Features

1.  **Product Catalog Dashboard**: Live inventory stock indicators (*In Stock*, *Low Stock*, *Out of Stock*) synchronizing directly with Supabase.
2.  **Concurrency Control**: Custom raw SQL transaction using PostgreSQL `SELECT ... FOR UPDATE` to block race conditions.
3.  **Lazy Reservation Expiration**: Seamless, background-less auto-release mechanism when reservation data is fetched or mutated.
4.  **Interactive Checkout Panel**: Live real-time browser countdown clock with active urgent state warning (< 2 minutes).
5.  **Clean & Premium UI**: Styled beautifully with Tailwind CSS v4, Lucide icons, glassmorphism card templates, and shadcn/ui.

---

## 🏗️ Architecture Design & Concurrency Safety

### Why Row-Level Locking (`SELECT FOR UPDATE`)?
Under heavy concurrent traffic, multiple users might attempt to reserve the last available item of a popular product at the exact same millisecond. Traditional checks like:
```typescript
const inventory = await prisma.inventory.findUnique(...)
if (inventory.available >= quantity) { ... }
```
introduce a **Time-of-Check to Time-of-Use (TOCTOU)** vulnerability, leading to database overselling.

We solve this issue by executing the inventory check and reservation inside a PostgreSQL transaction, beginning with a raw SQL locking read:
```sql
SELECT id, "totalQuantity", "reservedQuantity"
FROM "Inventory"
WHERE "productId" = $1 AND "warehouseId" = $2
FOR UPDATE;
```
This forces Postgres to lock the matched row. Concurrent reservation requests for this specific product/warehouse combination are blocked at the locking statement and wait in line until the first transaction either `COMMITS` or `ROLLBACKS`.

### Lazy Expiration (No Cron/Redis)
Rather than hosting heavy background cron processes or configuring Redis, our system relies on **Lazy Expiration**.
- When details of a reservation are requested (`GET /api/reservations/:id`), or when a confirm/release is initiated, a helper checks if `status === 'pending'` and `expiresAt < new Date()`.
- If expired, the status is immediately updated to `released` and the stock is returned back into available warehouse inventory.
- The UI handles the expired state (HTTP `410 Gone`) seamlessly.

---

## 📦 Tech Stack

-   **Framework**: Next.js 16 (App Router, Turbopack, Client/Server Actions)
-   **ORM**: Prisma v7 (Centralized Config, pg Pool adapter)
-   **Database**: Supabase PostgreSQL (hosted)
-   **Styling**: Tailwind CSS v4 + shadcn/ui
-   **Components**: Sonner Toast, Badge, Dialog, Table, Input, Card

---

## 🛠️ Local Development & Setup

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
# Supabase Transaction Pooler / Session Connection String
DATABASE_URL="postgresql://postgres.dtxkrsdelhlalbcoqzti:syJ86QKypbZvd6Yx@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
```

### 3. Sync Database Schema & Seed Data
Generate Prisma client and sync the schema layout:
```bash
cmd /c "npx prisma db push"
```
Populate the database with initial products, warehouses, and starting stock counts:
```bash
npm run seed
```

### 4. Boot Dev Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to browse and test the secure portal!
