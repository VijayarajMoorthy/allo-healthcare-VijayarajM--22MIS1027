# Concurrency-Safe Inventory Reservation Portal

An assignment submission implementing a robust, race-condition-safe inventory reservation system. The portal temporarily reserves warehouse stock during checkout, automatically expires holds after 10 minutes, and prevents double-booking using PostgreSQL row-level locking.

---

# ⚡ Key Features

## 1. Product Catalog Dashboard
- Live inventory stock indicators:
  - **In Stock**
  - **Low Stock**
  - **Out of Stock**
- Inventory data syncs directly with Supabase PostgreSQL.

## 2. Concurrency-Safe Reservations
- Prevents overselling during simultaneous checkout attempts.
- Uses PostgreSQL row-level locking with `SELECT ... FOR UPDATE`.
- Ensures only one transaction can reserve a product inventory row at a time.

## 3. Automatic Reservation Expiration
- Reservations automatically expire after 10 minutes.
- Expired reservations release reserved stock back into inventory.
- No cron jobs or Redis workers required.

## 4. Interactive Checkout Experience
- Real-time reservation countdown timer.
- Urgent warning state when less than 2 minutes remain.
- Clean handling of expired reservation states.

## 5. Modern UI
- Built using Tailwind CSS v4 and shadcn/ui.
- Glassmorphism cards and responsive layouts.
- Lucide icons and toast notifications for polished UX.

---

# 🏗️ Architecture & Reservation Flow

## Preventing Double Booking

When multiple users try to reserve the same product at the same time, there’s a risk that inventory could be oversold if requests read stock simultaneously before updates are saved.

To prevent this, the system uses a PostgreSQL transaction with row-level locking:

```sql
SELECT id, "totalQuantity", "reservedQuantity"
FROM "Inventory"
WHERE "productId" = $1 AND "warehouseId" = $2
FOR UPDATE;
```

This locks the selected inventory row until the transaction finishes.

While one reservation is being processed, other requests for the same product must wait, ensuring stock counts remain accurate and preventing race conditions.

---

## Reservation Expiration

Reservations remain active for 10 minutes during checkout.

Instead of using background cron jobs or Redis workers, the system uses a lightweight lazy expiration mechanism:

- Whenever a reservation is viewed, confirmed, or updated, the system checks whether it has expired.
- If the reservation time has passed:
  - The reservation status is updated to `released`
  - Reserved stock is returned back to inventory
- Expired reservations return an HTTP `410 Gone` response for proper frontend handling.

This approach keeps the architecture simple while still maintaining reliable inventory consistency.

---

# 📦 Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions, Turbopack) |
| Database | Supabase PostgreSQL |
| ORM | Prisma v7 |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui |
| Icons | Lucide React |
| Notifications | Sonner Toast |

---

# 🛠️ Local Development & Setup

## 1. Install Dependencies

```bash
npm install
```

---

## 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="your_supabase_connection_string"
```

---

## 3. Sync Database Schema

Generate Prisma client and push the schema:

```bash
cmd /c "npx prisma db push"
```

---

## 4. Seed Initial Data

Populate products, warehouses, and inventory data:

```bash
npm run seed
```

---

## 5. Start Development Server

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

---

# 🔄 Expiry Mechanism in Production

The application uses a lazy expiration strategy instead of background cron jobs or Redis workers.

Whenever a reservation is fetched, confirmed, or updated, the backend checks:
- whether the reservation is still `pending`
- whether `expiresAt` is older than the current time

If expired:
- the reservation status is changed to `released`
- reserved inventory is returned back to stock

This approach keeps infrastructure simple and reduces operational overhead while still maintaining inventory consistency.

---

# ⚖️ Trade-offs Made

- Used lazy expiration instead of scheduled background jobs to keep deployment simple and lightweight.
- Chose PostgreSQL row-level locking over distributed locking systems since this application runs on a single relational database.
- Inventory updates are transaction-safe but currently optimized for assignment-scale traffic rather than massive distributed systems.

---



The deployed link  : https://allohealthcarevijayarajm.vercel.app/
