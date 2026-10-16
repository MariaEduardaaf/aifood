# 🧠 BRAIN: Intelligent Service Platform for Restaurants

> **Last updated:** 2026-01-08

## Implementation Status

| Phase | Status | Notes |
|-------|--------|-------|
| MVP (Calls) | ✅ Complete | Working 100% |
| Phase 1.5 (Google Reviews) | ✅ Complete | Smart rating flow working |
| Phase 2 (Digital Menu) | ✅ Complete | Trilingual menu with photos |
| Phase 3 (Orders) | ✅ Complete | Cart and order tracking |
| Phase 4 (Kitchen) | ✅ Complete | Kanban panel working |
| Production Deploy | ⏳ Pending | Awaiting configuration |

---

## 1. Overview

This application is a **restaurant operations and service platform**, built to solve a very common problem (especially in Europe):

> ❌ Slow service
> ❌ Overloaded waiters
> ❌ Frustrated customers
> ❌ Bad Google reviews
> ❌ No real service metrics

The solution starts **simple**, validating the problem with a **Web MVP**, and evolves into a **complete ecosystem** with multiple profiles (customer, waiter, kitchen and admin), real-time operation, metrics and online reputation.

---

## 2. Product Principles

These principles **must not be broken**, neither in the MVP nor in the future:

1. **Zero friction for the customer**

   * The customer never creates an account
   * Everything starts with the QR code

2. **Extreme simplicity for staff**

   * Waiters see only what they need
   * Few clicks, no distractions

3. **Real time is mandatory**

   * A delayed call means the product failed

4. **Data before features**

   * Every action generates a metric
   * Metrics sell the product

5. **Evolution by phases**

   * The MVP solves 1 pain point
   * Post-MVP builds differentiation

---

## 3. Problem the product solves

### For the customer

* Long wait to be served
* Difficulty asking for the bill
* Language barriers
* A feeling of being ignored

### For the restaurant

* Waiters cannot see all customers
* Lack of organization
* No service metrics
* Negative Google reviews with no control

---

## 4. System Vision (macro)

The application is **a single system**, with **one central backend**, but with **different interfaces depending on the login (role)**.

### System roles

* **CLIENT (public)** → no login
* **WAITER** → email/password login
* **KITCHEN** → email/password login
* **ADMIN / MANAGER** → email/password login
* **SUPER_ADMIN** (future)

---

## 5. Phase 1: Web MVP (closed scope)

### MVP goal

Validate that:

* The QR code gets used
* Waiters respond faster
* The restaurant sees real value
* The product is simple enough to be adopted

### MVP scope

👉 **Only 1 restaurant**
👉 **Web only**
👉 **No orders**
👉 **No menu**
👉 **No payment**

---

## 6. MVP Features

### 6.1 Customer (NO login)

**Access**

* Via a QR code fixed to the table

**Table page**

* Table identification (e.g. "Table 13")
* Buttons:

  * ✅ Call waiter
  * ✅ Request the bill

**Supported languages (MVP)**

* Portuguese
* Spanish
* English

**Behavior**

* On click:

  * Creates a "call"
  * Shows a confirmation
  * Enters a "waiting" state

**Rules**

* No sign-up
* No mandatory cookies
* The QR defines everything (table + restaurant)

---

### 6.2 Waiter (email + password login)

**Main screen: Calls**

* List of open calls
* Sorted by time (oldest first)
* Each item shows:

  * Table
  * Type (waiter / bill)
  * Time open

**Actions**

* Mark a call as resolved

**Required UX**

* Clean interface
* Designed for mobile
* Sounds/visual alerts

---

### 6.3 Admin / Manager (minimal)

**Functions**

* Create tables
* Generate a QR code per table
* Create users (waiters)
* View simple metrics

**Metrics**

* Total calls
* Average response time
* Calls by time of day

---

## 7. What was NOT in the MVP (already implemented post-MVP)

* ✅ ~~Menu~~ → **Implemented in Phase 2**
* ✅ ~~Ordering from the app~~ → **Implemented in Phase 3**
* ✅ ~~Kitchen~~ → **Implemented in Phase 4**
* ❌ AI → Future
* ❌ Ranking → Future
* ✅ ~~Automatic Google Reviews~~ → **Implemented in Phase 1.5**
* ❌ Multi-restaurant → Future
* ❌ Translation into other languages (beyond PT/ES/EN) → Future

These features were implemented **after the MVP was validated**.

---

## 8. Central entity of the system: CALL

Everything in the MVP revolves around the **call**.

### Logical structure of a call

* Table
* Type
* Status
* Time

### Types

* `CALL_WAITER`
* `REQUEST_BILL`

### Status

* `OPEN`
* `RESOLVED`

Each call **generates data**:

* how long it took
* who resolved it
* at what time

---

## 9. Main flows

### Flow: Call waiter

1. Customer scans the QR
2. Taps "Call waiter"
3. Backend creates a call
4. Waiter receives it in real time
5. Waiter attends
6. Marks it as resolved
7. System records the time

### Flow: Request the bill

Same flow, different type.

---

## 10. Real time (essential)

* Backend emits events
* The waiter panel keeps an active connection
* Updates without refresh

Without real time → **the product loses value**

---

## 11. Security and limits

### MVP

* Rate limit per table (e.g. 1 call every 30s)
* Long, unpredictable QR token
* Login protected by password hashing
* Clear separation of permissions

---

## 12. Data structure (conceptual)

### tables

* id
* label
* qr_token

### users

* id
* email
* password_hash
* role

### calls

* id
* table_id
* type
* status
* created_at
* resolved_at

---

## 13. Post-MVP: Product Evolution

After validating the MVP, the product evolves into a **complete platform**.

### New areas

#### Customer

* Digital menu
* Ordering in the app
* Automatic translation
* AI dish suggestions
* Post-visit rating

#### Waiter

* Tabs
* Order status
* Communication with the kitchen

#### Kitchen

* Preparation queue
* Status
* Notification to the waiter

#### Admin

* Advanced metrics
* Ranking
* Google Reviews configuration
* Performance per employee

---

## 14. Google Reviews (phase 1.5 / post-MVP)

Logic:

* Customer asks for the bill
* System asks: "How was the service?"

  * High score → redirects to Google Reviews
  * Low score → private feedback

Goal:

* Improve reputation
* Reduce negative public reviews

---

## 15. Ranking and reputation

Ranking based on:

* Average service time
* SLA (e.g. % attended in < 3 min)
* Positive feedback
* (optional) Google rating

---

## 16. Monetization (future)

* Monthly subscription per restaurant
* Plans based on:

  * number of tables
  * number of employees
  * advanced metrics
  * AI / ranking

---

## 17. Validation strategy

1. Small restaurants
2. Free usage
3. Simple paper QR codes
4. 1-2 weeks of testing
5. Collect data
6. Adjust UX
7. Turn it into a paid plan

---

## 18. Risks and how to mitigate them

| Risk                    | Solution                |
| ----------------------- | ----------------------- |
| Waiter ignores the panel | Alerts + simplicity    |
| Customer spams the QR   | Rate limit              |
| Bad internet            | Automatic reconnect     |
| Owner sees no value     | Show metrics            |

---

## 19. Clear definition of the MVP

> **If this does not work, nothing else matters.**

* Customer calls
* Waiter sees
* Waiter responds
* Time is measured

---

## 20. Final philosophy

This product **is not a pretty app**.
It is an **operational tool**, built to:

* reduce waiting
* improve the experience
* generate real data
* increase reputation
