# Super Admin: Plan and How It Works

## Goal
Build a Super Admin panel that controls everything that exists today, but at the multi-restaurant level.

## Scope (V1)

### 1) Restaurants
- Create, edit and deactivate restaurants.
- Fields: name, slug, domain, active.

### 2) Users per restaurant
- Create users with the existing roles (ADMIN, MANAGER, WAITER, KITCHEN).
- Password reset (optional).

### 3) Tables per restaurant
- Table CRUD.
- Generate a QR code per table.

### 4) Menu per restaurant
- Category CRUD.
- Item CRUD.

### 5) Operations
- Calls and orders per restaurant (list and status).

### 6) Metrics
- Metrics per restaurant.
- Aggregated view (all restaurants).

## How the panel works

- Route: `/superadmin`.
- Access: `SUPER_ADMIN` role.
- Main navigation: Restaurants, Users, Tables, Menu, Operations, Metrics, Feedbacks.
- The restaurant selector sits at the top and applies `restaurantId` to the URL.
- Each area uses `restaurantId` to filter data and prevent leakage between tenants.

## Main flows

1) Create a restaurant
- Super Admin creates a restaurant with name, slug and domain.
- The system creates default settings.

2) Create the restaurant's admin
- Super Admin creates an ADMIN user linked to the restaurant.

3) Manage tables/menu
- Select a restaurant.
- Same CRUD as the current panel, but filtered by tenant.

4) Monitor operations
- Lists calls and orders per restaurant.
- Filters by status and period.

5) Metrics
- KPIs for the selected restaurant.
- Global comparison (aggregated).

## Implementation steps

1) Backend
- Add the `SUPER_ADMIN` role.
- Create APIs for restaurant CRUD.
- Allow the super admin to query data by `restaurant_id`.

2) Frontend
- Create the layout and pages under `/superadmin`.
- Implement restaurant selects and the screens for each area.

3) Security
- Middleware blocks unauthorized access.
- APIs validate `SUPER_ADMIN`.

4) Migration
- Update the seed to create a super admin.

## Notes
- Keeps the current panel (restaurant admin) separate and simpler.
- Super Admin is exclusively for SaaS operations.
