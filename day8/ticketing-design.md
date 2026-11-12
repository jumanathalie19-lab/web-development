# TicketHub Design Document

## 0. Context

TicketHub is a website that sells tickets for concerts and events. Most days it is quiet and simple. A few times a month a very popular concert goes on sale and the traffic jumps by hundreds of times in a few minutes. The hard part of this design is not browsing events. It is **selling each seat exactly once, fairly, while the site is under that spike**.

**Given facts**
- 2 million registered users
- Normal day: 50,000 visitors, each viewing 10 pages; 5,000 tickets sold
- Big sale: 200,000 people try to buy 20,000 seats within the first 10 minutes

**Non-goals (out of scope):** ticket resale or transfer, refund workflows, seat recommendations, dynamic pricing, mobile wallet passes. Leaving these out keeps the design small enough to reason about.

---

## 1. Requirements

### Functional
- Sign up, log in, log out
- Browse and search events (by city, date, name)
- View an event and its seat map with live availability
- Select seats and **hold** them for a limited time (10 minutes)
- Pay for held seats and receive tickets
- View my tickets, each with a unique QR code
- Release a hold, or let it expire so the seats return to sale

### Non-functional

| Area | Requirement | Why it matters |
|---|---|---|
| **Correctness** | A seat is never sold to two people (zero tolerance). A customer is never charged without getting a ticket, and never gets a ticket without being charged. | A double sale means an angry customer at the door and a refund. This is the most important requirement. |
| **Fairness** | Roughly first come, first served. One person cannot grab hundreds of seats (limit of 6 per order). Bots and repeat refreshing do not beat real users. | People are emotional about concert tickets. Perceived unfairness damages the brand. |
| **Speed** | Event and seat pages load in under 1 s. Hold requests answer in under 300 ms (p95), even during a big sale. | A slow seat map during a sale makes people refresh, which makes the load worse. |
| **Availability** | 99.9% normally; the sale window must not go down. | A crash at sale time is the worst possible moment. |
| **Durability** | Paid orders and issued tickets are never lost. | Money and legal obligations are involved. |
| **Scalability** | Survive a spike of roughly 500 times normal traffic, without paying for that capacity all year. | See estimates below. |
| **Security** | HTTPS only, hashed passwords, users see only their own tickets, card data handled by a payment provider (we never store card numbers). | Payments and personal data. |

---

## 2. Estimates

### Normal day

| Metric | Calculation | Result |
|---|---|---|
| Page views | 50,000 × 10 | 500,000 per day |
| Average requests/s | 500,000 ÷ 86,400 | about 6 per second |
| Peak requests/s | 5 × average (evenings) | about 30 per second |
| Tickets sold | 5,000 per day ÷ 86,400 | about 0.06 per second (under 1 per second at peak) |
| Storage | 5,000 tickets/day × ~1 KB, plus orders and payments | a few GB per year |

A normal day is tiny. One small server and one database would cope.

### Big sale (200,000 people, 20,000 seats, 10 minutes)

Assumptions (stated so they can be challenged): half of the people arrive in the first minute, and each person makes about 10 requests (event page, seat map and refreshes, hold attempts, payment).

| Metric | Calculation | Result |
|---|---|---|
| Arrival rate, average | 200,000 ÷ 600 s | about 333 users per second |
| Arrival rate, opening minute | 100,000 ÷ 60 s | about 1,700 users per second |
| Total requests | 200,000 × 10 | 2 million in 10 minutes |
| Requests/s, average | 2,000,000 ÷ 600 | about 3,300 per second |
| Requests/s, opening peak | 1,700 × 10 | about 17,000 per second |
| Hold attempts | 200,000 × ~3 tries | about 600,000, or 1,000 per second on average |
| Competition | 200,000 ÷ 20,000 | **10 people for every seat** |

### Comparison

| | Normal day | Big sale | Increase |
|---|---|---|---|
| Requests/s (average) | 6 | 3,300 | about 550 times |
| Requests/s (peak) | 30 | 17,000 | about 570 times |
| Write attempts/s (holds vs sales) | 0.06 | 1,000 | about 17,000 times |
| People competing for one seat | roughly 1 | 10 | |

**What this tells us**
1. Both reads and writes explode, and writes (holds) grow the most.
2. All the traffic targets one event and its 20,000 seat rows. This is a **hot spot**, so spreading load across many events does not help.
3. Nine out of ten buyers will lose. The design must make losing quick and polite, not slow and broken.
4. The spike lasts minutes. Pre-scaling for the sale and scaling back down is cheaper than permanent capacity.

---

## 3. API

REST over HTTPS, JSON bodies, `Authorization: Bearer <token>` except for browsing events and logging in.

| # | Method | Endpoint | Purpose | Success | Errors |
|---|---|---|---|---|---|
| 1 | POST | `/v1/users` | Sign up | 201 | 400, 409 (email taken) |
| 2 | POST | `/v1/sessions` | Log in | 200 | 401 |
| 3 | GET | `/v1/events?city=&date=&q=&cursor=&limit=20` | Browse and search events | 200 | 400 |
| 4 | GET | `/v1/events/{eventId}` | Event details | 200 | 404 |
| 5 | GET | `/v1/events/{eventId}/seats?section=` | Seat map with status per seat | 200 | 404, 403 (not admitted from the waiting room) |
| 6 | POST | `/v1/events/{eventId}/holds` | Hold seats for 10 minutes | 201 | 400, 401, 403, 409 (a seat is taken), 429 |
| 7 | DELETE | `/v1/holds/{orderId}` | Release held seats | 204 | 401, 404 |
| 8 | POST | `/v1/orders/{orderId}/payments` | Pay for held seats | 201 | 401, 402 (payment failed), 404, 410 (hold expired) |
| 9 | GET | `/v1/tickets` | List my tickets | 200 | 401 |
| 10 | GET | `/v1/tickets/{ticketId}` | One ticket with QR code | 200 | 401, 404 |
| 11 | POST | `/v1/events/{eventId}/queue` | Join the waiting room for a big sale | 202 | 401 |
| 12 | GET | `/v1/events/{eventId}/queue/status` | Position and admission token | 200 | 401 |

### Examples

**Hold seats**
```
POST /v1/events/88/holds
Authorization: Bearer <token>
{ "seatIds": [4121, 4122] }

201 Created
{
  "orderId": "b7e1…",
  "seatIds": [4121, 4122],
  "totalCents": 24000,
  "expiresAt": "2026-12-01T19:10:00Z"
}
```

**Someone else got there first**
```
409 Conflict
{ "error": "seat_unavailable", "unavailableSeatIds": [4122],
  "message": "Seat 4122 was just taken. Please choose another seat." }
```
Nothing is held. A hold of several seats is all or nothing.

**Pay**
```
POST /v1/orders/b7e1…/payments
Idempotency-Key: 5c0d…
{ "paymentMethodToken": "tok_abc" }

201 Created
{ "orderId": "b7e1…", "status": "paid", "ticketIds": ["t1…", "t2…"] }
```

**Design choices**
- A hold is a *resource*: `POST …/holds` creates one, `DELETE` removes it.
- `409 Conflict` for a taken seat, `410 Gone` for an expired hold, `402 Payment Required` for a failed payment, and `429 Too Many Requests` with `Retry-After` for rate limits.
- The `Idempotency-Key` header means that if a payment request is retried (network drop, double click), the customer is charged only once.
- Cursor pagination for event lists.

---

## 4. Data Model

PostgreSQL. A relational database is the right choice here because we need **transactions**, **constraints** and **row-level locking** to guarantee correctness.

```
users
  id             UUID PK
  email          TEXT UNIQUE NOT NULL
  password_hash  TEXT NOT NULL
  created_at     TIMESTAMPTZ

venues
  id        UUID PK
  name      TEXT NOT NULL
  city      TEXT NOT NULL
  capacity  INT

events
  id          UUID PK
  venue_id    UUID FK -> venues.id NOT NULL
  title       TEXT NOT NULL
  starts_at   TIMESTAMPTZ NOT NULL
  on_sale_at  TIMESTAMPTZ NOT NULL
  status      TEXT CHECK (status IN ('scheduled','on_sale','sold_out','cancelled'))
  INDEX (starts_at)                         -- upcoming events list

orders
  id          UUID PK
  user_id     UUID FK -> users.id NOT NULL
  event_id    UUID FK -> events.id NOT NULL
  status      TEXT CHECK (status IN ('pending','paid','expired','cancelled'))
  total_cents INT NOT NULL CHECK (total_cents >= 0)
  expires_at  TIMESTAMPTZ NOT NULL          -- hold deadline
  created_at  TIMESTAMPTZ
  INDEX (user_id, created_at DESC)
  INDEX (status, expires_at)                -- finds expired holds quickly

seats                                       -- one row per seat PER EVENT
  id          BIGINT PK
  event_id    UUID FK -> events.id NOT NULL
  section     TEXT NOT NULL
  row_label   TEXT NOT NULL
  seat_number INT NOT NULL
  price_cents INT NOT NULL
  status      TEXT NOT NULL DEFAULT 'available'
              CHECK (status IN ('available','held','sold'))
  order_id    UUID FK -> orders.id NULL     -- set while held or sold
  UNIQUE (event_id, section, row_label, seat_number)
  INDEX (event_id, status)

tickets
  id         UUID PK
  order_id   UUID FK -> orders.id NOT NULL
  seat_id    BIGINT FK -> seats.id NOT NULL
  user_id    UUID FK -> users.id NOT NULL
  qr_code    TEXT UNIQUE NOT NULL
  issued_at  TIMESTAMPTZ
  UNIQUE (seat_id)                          -- last line of defense against double sale

payments
  id               UUID PK
  order_id         UUID FK -> orders.id NOT NULL
  idempotency_key  TEXT UNIQUE NOT NULL
  provider_ref     TEXT UNIQUE
  amount_cents     INT NOT NULL
  status           TEXT CHECK (status IN ('pending','succeeded','failed'))
  created_at       TIMESTAMPTZ
```

**Relationships**
- A venue has many events. An event has many seats (one row per physical seat for that event, so a seat's status belongs to the event).
- A user has many orders. An order belongs to one event, covers one or more seats and has one or more payment attempts.
- An order has many tickets. Each ticket points to exactly one seat, and each seat has at most one ticket (`UNIQUE (seat_id)`).

**Key choices**
- `seats` holds a row per seat per event (20,000 rows for a big concert). This makes "seat 4121 for event 88" a single row that can be locked and updated atomically.
- The `UNIQUE` and `CHECK` constraints put rules in the database, so a bug in application code cannot break them.
- Money is stored as integer cents to avoid rounding errors.

---

## 5. Preventing Double Booking

This is the most important part of the design. The goal: **if two people click the same seat at the same moment, exactly one of them gets it.**

### The naive version and why it fails
```
1. SELECT status FROM seats WHERE id = 4121;     -- both users see 'available'
2. (app checks: status is available, fine)
3. UPDATE seats SET status = 'held' WHERE id = 4121;   -- both succeed
```
Between step 1 and step 3 there is a gap. Two requests can both read "available" inside that gap. This is a **race condition**, and the seat is sold twice.

### The fix: check and change in one atomic step
Do not read first. Let the database make the decision inside a single `UPDATE` with the condition in the `WHERE` clause, inside a transaction:

```sql
BEGIN;

-- 1. Create the pending order (10-minute deadline)
INSERT INTO orders (id, user_id, event_id, status, total_cents, expires_at)
VALUES ($order, $user, $event, 'pending', 0, now() + interval '10 minutes');

-- 2. Claim all requested seats at once (IDs sorted ascending to avoid deadlocks)
UPDATE seats
SET    status = 'held', order_id = $order
WHERE  id = ANY($seatIds)
  AND  event_id = $event
  AND (
        status = 'available'
        OR (status = 'held' AND order_id IN (
              SELECT id FROM orders WHERE status = 'pending' AND expires_at < now()))
      );

-- 3. Application checks: rows affected == number of seats requested?
--    yes -> COMMIT      no  -> ROLLBACK and return 409 (nothing is held)
COMMIT;
```

**Why this is safe**
1. When two transactions run an `UPDATE` on the same row, PostgreSQL takes a **row lock**. The second one waits until the first commits.
2. After the first commits, the second re-checks its `WHERE` condition against the new row. The seat is now `held`, the condition is false, and it updates **0 rows**.
3. The application sees "0 rows updated for a seat I wanted", rolls back and returns `409 Conflict`. One winner, one polite loser, and no gap to exploit.
4. Because the update covers all seats in one statement and one transaction, a multi-seat hold is **all or nothing**. A customer never ends up with half of the seats they wanted.
5. Locking rows in ascending ID order prevents **deadlocks** when two customers want overlapping sets of seats.

### Holds expire
- A hold lasts 10 minutes (`orders.expires_at`). Without this, someone could pick seats and walk away, and the seats would be locked forever.
- Expiry is enforced in two ways: the claim query above treats a seat whose order has expired as available (always correct, even if cleanup is late), and a background job runs every 30 seconds to mark expired orders `expired` and set their seats back to `available`.

### Payment: turning a hold into a sale
```sql
BEGIN;
-- Confirm the hold is still ours and not expired (locks the order row)
SELECT status, expires_at FROM orders WHERE id = $order AND user_id = $user FOR UPDATE;
-- if status != 'pending' or expires_at < now()  -> ROLLBACK, return 410 Gone

-- (payment provider charged successfully, using the Idempotency-Key)

UPDATE seats   SET status = 'sold' WHERE order_id = $order AND status = 'held';
INSERT INTO tickets (order_id, seat_id, user_id, qr_code) SELECT ... FROM seats WHERE order_id = $order;
UPDATE orders  SET status = 'paid' WHERE id = $order;
COMMIT;
```
- The `FOR UPDATE` lock stops the expiry job and a second payment click from changing the order while we finalize it.
- The **idempotency key** (unique in `payments`) means a retried request returns the original result instead of charging twice.
- If the charge succeeds but the hold expired in the meantime, we check whether the seats are still free. If they are, we complete the sale. If not, we automatically refund. The customer is never left charged with no ticket.

### Layers of defense
| Layer | What it guarantees |
|---|---|
| Conditional `UPDATE` in a transaction | Only one request can move a seat from `available` to `held` |
| `FOR UPDATE` on the order at payment | No two payments finalize the same order |
| `UNIQUE (seat_id)` on `tickets` | Even if application code has a bug, the database refuses a second ticket for the same seat |
| `CHECK` constraints on status | No invalid states such as `status = 'banana'` |
| Idempotency key on payments | No double charge on retries |

The constraint layers mean correctness does not depend on every developer writing perfect code. The database enforces it.

---

## 6. Architecture

### Simple version (enough for a normal day)
```
Browser -> Load Balancer -> App Server -> PostgreSQL
```

### Version that survives the big sale
```
                 +----------------+
  Browser  ----> |      CDN       |  static files, event pages, cached seat-map snapshots
     |           +----------------+
     v
 +------------------+
 | WAF / Rate limit |  blocks bots, caps requests per user/IP
 +--------+---------+
          v
 +------------------+       +---------------------+
 |  Load Balancer   | ----> | Waiting Room Service| (queue + admission tokens, backed by Redis)
 +--------+---------+       +---------------------+
          v
 +---------------------------+
 | Stateless App Servers xN  |  auto-scaled, pre-warmed before the sale
 +--+-----------+----------+-+
    |           |          |
    v           v          v
 +-------+  +-----------------+   +-----------------+
 | Redis |  |   PostgreSQL    |   |  Message Queue  |
 | cache |  | Primary (holds, |   +--------+--------+
 +-------+  |  payments)      |            |
            |  Read replicas  |            v
            +-----------------+   +------------------+   +------------------+
                                  | Payment Worker   |-->| Payment Provider |
                                  +------------------+   +------------------+
                                  | Ticket/Email     |
                                  | Worker           |
                                  +------------------+
                                  | Hold-Expiry Job  |
                                  +------------------+
```

### What each component does and which problem it solves

| Component | What it does | Problem it solves |
|---|---|---|
| **CDN** | Serves static files and cached public pages (event list, event details) from servers near the user | Takes most of the 500,000 daily page views and the sale-day page loads off our servers |
| **WAF / rate limiter** | Limits requests per user and per IP, blocks known bots, returns `429` | Bots and refresh-spamming; fairness |
| **Load balancer** | Spreads requests over many app servers, removes unhealthy ones | Single point of failure and capacity limit of one server |
| **Waiting room (queue)** | At sale time, users get a place in a queue. We admit them in batches (for example 500 per second) and give each an admission token needed for the seat and hold endpoints. Redis stores the queue. | Turns a spike of 17,000 requests per second into a steady flow the database can handle. Also gives fairness: the order is determined by arrival time, not by who refreshes fastest. |
| **Stateless app servers** | Run the API. Keep no user state, so any server can handle any request. Auto-scaled and **pre-warmed before the on-sale time**. | Capacity for the spike; losing a server loses nothing |
| **Redis cache** | Caches event data and a **seat-map snapshot per event, refreshed every 2 seconds**. Also stores sessions and the waiting room. | Thousands of people loading the seat map each second would otherwise all hit the database. |
| **PostgreSQL primary** | The single source of truth. Handles holds, payments and ticket creation using the transactions in section 5. | Correctness. Only one place decides who owns a seat. |
| **Read replicas** | Serve browsing, "my tickets" and search | Keeps read load away from the primary so it can focus on holds |
| **Message queue + workers** | Payment processing, ticket generation and confirmation emails run asynchronously | A slow payment provider or email service cannot slow down or block hold requests. A queue absorbs bursts. |
| **Hold-expiry job** | Releases expired holds every 30 seconds | Abandoned seats come back on sale |
| **Backups, failover** | Standby replica with automatic failover, point-in-time recovery | Primary database failure |

### How it survives the big sale

1. **Before the sale:** scale up app servers and Redis, warm caches, and run a load test. After the sale, scale back down.
2. **Opening minute:** 100,000 people arrive. Most of them are served by the CDN and the waiting room, which are cheap. Only admitted users reach the seat and hold endpoints, so the **database sees a controlled number of holds per second (hundreds), not 17,000**.
3. **Seat map:** served from the Redis snapshot (up to about 2 seconds old). Millions of reads never touch PostgreSQL.
4. **Clicking a seat:** the hold request goes to the primary. The conditional `UPDATE` decides the winner. Losers receive `409` with a friendly message and the seat map refreshes.
5. **Payment:** goes through the queue to a worker, which calls the payment provider. If the provider is slow, holds and browsing are unaffected.
6. **Sell-out:** when no `available` seats are left, the event status becomes `sold_out`. The CDN serves a cheap "sold out" page. Seats released by expired holds reappear and can be bought.

### Failure scenarios
- **App server dies:** the load balancer removes it. The others absorb the load because servers are stateless.
- **Redis dies:** the seat map falls back to read replicas (slower, still correct). Holds are unaffected because the hold decision is made in PostgreSQL, not Redis. The waiting room is the exposed part, so Redis runs with a replica and automatic failover.
- **Payment provider is slow or down:** holds stay valid for 10 minutes, payment retries are safe thanks to idempotency keys. We may extend a hold during a provider outage.
- **Primary database dies:** a replica is promoted. Because correctness-critical writes go to one primary with synchronous replication to one standby, a committed hold or sale is not lost.

---

## 7. Trade-offs

| Decision | What we gained | What we gave up |
|---|---|---|
| **Waiting room for big sales** | Protects the database, gives a fair order, turns a stampede into a steady flow | Users wait, which some will find annoying. It adds an extra component to build and explain. We use it only for events flagged as high demand. |
| **Cached seat map (about 2 s old)** | Millions of reads served cheaply and quickly | A user can click a seat that was just taken, and gets a `409`. We accept this because the database check is the real decision. The cache is only a hint. |
| **Pessimistic claim in PostgreSQL instead of a Redis lock or eventual consistency** | Strong correctness: the database guarantees one owner per seat, with constraints as a safety net | Writes for one event all go through one primary, which limits throughput. The waiting room and the small amount of work per hold keep us below that limit. We could later shard by event. |
| **10-minute hold** | Gives people time to pay without losing their seats | Abandoned holds keep seats unavailable for up to 10 minutes. A shorter hold (for example 5 minutes) would release seats faster but would make slow payers lose seats. For a high-demand sale we could shorten it. |
| **Asynchronous payment and ticket creation** | Slow payment provider cannot block seat selection | The user sees "processing" for a moment, and we need idempotency keys and a way to handle "charged but hold expired" |
| **Per-order limit of 6 seats and rate limiting** | Fairness, fewer bots and scalpers | Large groups need multiple orders. Determined bots can still try, so it reduces rather than eliminates abuse. |

---

## 8. Risks and Open Questions
- **Hot spot:** one event receives all the traffic. Mitigated with the waiting room and caching, but we should load test with realistic numbers before the first big sale.
- **Estimates are assumptions** (half of the people arrive in the first minute, about 10 requests per person, about 3 hold attempts each). They need to be checked against real data after the first sale.
- **Bot defense:** rate limits and CAPTCHAs help, but a determined attacker is hard to stop completely. Open question: should we require verified accounts for big sales?
- **Payment edge case:** the policy for "hold expired during payment" (honor the sale if the seats are free, otherwise refund) should be reviewed by the business.
- **Waiting-room fairness:** is first-come-first-served the fairest rule, or should there be a random lottery for the very biggest events?