// API contract smoke test against a running server with the seeded database.
//   BASE_URL=http://localhost:3010 npm run test:smoke
// Idempotent: it creates its own table (fresh QR token, no rate-limit history)
// and deletes it at the end, which also removes its orders, calls and rating.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

const BASE = (process.env.BASE_URL ?? "http://localhost:3010").replace(/\/$/, "");

type Jar = string; // Cookie header value

function cookiesOf(res: Response): string[] {
  return res.headers.getSetCookie().map((c) => c.split(";")[0]);
}

// Logs in the way a browser (or curl) does: CSRF token, then the credentials callback
async function login(email: string, password: string): Promise<{ jar: Jar; location: string }> {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  const csrfCookies = cookiesOf(csrfRes);
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: csrfCookies.join("; "),
    },
    body: new URLSearchParams({ email, password, csrfToken, callbackUrl: `${BASE}/` }),
  });
  return {
    jar: [...csrfCookies, ...cookiesOf(res)].join("; "),
    location: res.headers.get("location") ?? "",
  };
}

async function staff(email: string, password: string): Promise<Jar> {
  const { jar } = await login(email, password);
  assert.match(jar, /session-token=/, `login failed for ${email}`);
  return jar;
}

async function api(path: string, opts: { jar?: Jar; method?: string; body?: unknown } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: {
      ...(opts.jar ? { Cookie: opts.jar } : {}),
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any -- untyped API responses
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

// Reads an SSE stream in the background and lets the test wait for events
function openStream(path: string, jar: Jar) {
  const controller = new AbortController();
  const events: { event: string; data: any }[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any -- record payloads
  const ready = fetch(`${BASE}${path}`, { headers: { Cookie: jar }, signal: controller.signal }).then(
    async (res) => {
      assert.equal(res.status, 200);
      assert.match(res.headers.get("content-type") ?? "", /text\/event-stream/);
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      (async () => {
        try {
          for (;;) {
            const { value, done } = await reader.read();
            if (done) return;
            buffer += decoder.decode(value, { stream: true });
            let index;
            while ((index = buffer.indexOf("\n\n")) !== -1) {
              const block = buffer.slice(0, index);
              buffer = buffer.slice(index + 2);
              const event = block.match(/^event: (.+)$/m)?.[1];
              const data = block.match(/^data: (.+)$/m)?.[1];
              if (event && data) events.push({ event, data: JSON.parse(data) });
            }
          }
        } catch {
          // aborted
        }
      })();
    },
  );
  const waitFor = async (match: (e: { event: string; data: any }) => boolean, ms = 5000) => { // eslint-disable-line @typescript-eslint/no-explicit-any -- record payloads
    await ready;
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
      const found = events.find(match);
      if (found) return found;
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error(`SSE event not received within ${ms}ms on ${path}`);
  };
  return { waitFor, close: () => controller.abort() };
}

let admin: Jar, waiter: Jar, kitchen: Jar, superadmin: Jar;
let tableId = "";
let token = "";
let menuItemId = "";

before(async () => {
  [admin, waiter, kitchen, superadmin] = await Promise.all([
    staff("admin@aifood.com", "admin123"),
    staff("waiter@aifood.com", "waiter123"),
    staff("kitchen@aifood.com", "kitchen123"),
    staff("superadmin@aifood.com", "superadmin123"),
  ]);
  const table = await api("/api/tables", { jar: admin, body: { label: `Smoke ${Date.now()}` } });
  assert.equal(table.status, 201);
  tableId = table.json.id;
  token = table.json.qr_token;
});

after(async () => {
  if (admin) {
    await api("/api/settings", { jar: admin, method: "PUT", body: { ordering_enabled: true } });
    if (tableId) await api(`/api/tables/${tableId}`, { jar: admin, method: "DELETE" });
  }
});

test("health check is public and pings the database", async () => {
  const res = await api("/api/health");
  assert.equal(res.status, 200);
  assert.equal(res.json.db, "up");
});

test("staff endpoints reject anonymous requests with 401", async () => {
  for (const path of ["/api/orders", "/api/calls", "/api/settings", "/api/orders/stream"]) {
    const res = await api(path);
    assert.equal(res.status, 401, path);
  }
});

test("menu by QR token has the public contract shape", async () => {
  const res = await api(`/api/menu?table=${token}`);
  assert.equal(res.status, 200);
  assert.ok(res.json.restaurant.name);
  assert.deepEqual(Object.keys(res.json.settings).sort(), [
    "currency",
    "default_locale",
    "enabled_locales",
    "ordering_enabled",
  ]);
  assert.ok(res.json.settings.enabled_locales.includes(res.json.settings.default_locale));
  const item = res.json.categories[0].items[0];
  assert.ok(item.names[res.json.settings.default_locale]);
  assert.ok(Array.isArray(item.allergens));
  assert.ok("descriptions" in item && "price" in item && "image_url" in item);
  menuItemId = item.id;

  assert.equal((await api("/api/menu?table=nope")).status, 404);
  assert.equal((await api("/api/menu")).status, 400);
  assert.equal((await api("/api/menu?tableId=table-1")).status, 400, "id-based lookup is gone");
});

test("order flow: create, confirm, prepare, ready, deliver, 409 on repeat", async () => {
  const stream = openStream("/api/orders/stream", waiter);
  try {
    await stream.waitFor((e) => e.event === "refresh" && Array.isArray(e.data));

    const created = await api("/api/orders", {
      body: { table: token, items: [{ menuItemId, quantity: 2, notes: "smoke" }] },
    });
    assert.equal(created.status, 201, JSON.stringify(created.json));
    const orderId = created.json.id;
    assert.equal(created.json.status, "PENDING");
    assert.ok(created.json.items[0].menuItem.names);

    const pushed = await stream.waitFor((e) => e.event === "order" && e.data.id === orderId);
    assert.equal(pushed.data.status, "PENDING");
    assert.ok(pushed.data.table.label && pushed.data.items.length === 1);

    const guestList = await api(`/api/orders?table=${token}`);
    assert.equal(guestList.status, 200);
    assert.ok(guestList.json.some((o: { id: string }) => o.id === orderId));
    for (const field of ["restaurant_id", "confirmed_by", "prepared_by", "table_id"]) {
      assert.ok(!(field in guestList.json[0]), `guest orders must not expose ${field}`);
    }

    assert.equal((await api(`/api/orders/${orderId}/prepare`, { jar: waiter, method: "PATCH" })).status, 403);

    for (const [step, jar, status] of [
      ["confirm", waiter, "CONFIRMED"],
      ["prepare", kitchen, "PREPARING"],
      ["ready", kitchen, "READY"],
      ["deliver", waiter, "DELIVERED"],
    ] as const) {
      const res = await api(`/api/orders/${orderId}/${step}`, { jar, method: "PATCH" });
      assert.equal(res.status, 200, `${step}: ${JSON.stringify(res.json)}`);
      assert.equal(res.json.status, status);
      await stream.waitFor((e) => e.event === "order" && e.data.id === orderId && e.data.status === status);
    }

    const again = await api(`/api/orders/${orderId}/deliver`, { jar: waiter, method: "PATCH" });
    assert.equal(again.status, 409);
  } finally {
    stream.close();
  }
});

test("lite mode: orders API returns 403 ordering_disabled", async () => {
  const off = await api("/api/settings", { jar: admin, method: "PUT", body: { ordering_enabled: false } });
  assert.equal(off.status, 200);
  assert.equal(off.json.ordering_enabled, false);
  try {
    const post = await api("/api/orders", {
      body: { table: token, items: [{ menuItemId, quantity: 1 }] },
    });
    assert.equal(post.status, 403);
    assert.equal(post.json.error, "ordering_disabled");
    const get = await api(`/api/orders?table=${token}`);
    assert.equal(get.status, 403);
    assert.equal(get.json.error, "ordering_disabled");
    const menu = await api(`/api/menu?table=${token}`);
    assert.equal(menu.json.settings.ordering_enabled, false);
  } finally {
    const on = await api("/api/settings", { jar: admin, method: "PUT", body: { ordering_enabled: true } });
    assert.equal(on.json.ordering_enabled, true);
  }
});

test("settings validation: default locale must be enabled, timezone must exist", async () => {
  const badLocale = await api("/api/settings", {
    jar: admin,
    method: "PUT",
    body: { enabled_locales: ["en"], default_locale: "es" },
  });
  assert.equal(badLocale.status, 400);
  const badTz = await api("/api/settings", { jar: admin, method: "PUT", body: { timezone: "Mars/Base" } });
  assert.equal(badTz.status, 400);
  assert.equal((await api("/api/settings", { jar: waiter, method: "PUT", body: {} })).status, 403);
});

test("call, resolve, table status and review", async () => {
  const stream = openStream("/api/calls/stream", waiter);
  try {
    await stream.waitFor((e) => e.event === "refresh");

    const call = await api("/api/calls", { body: { table: token, type: "REQUEST_BILL" } });
    assert.equal(call.status, 201, JSON.stringify(call.json));
    const callId = call.json.id;
    await stream.waitFor((e) => e.event === "call" && e.data.id === callId && e.data.status === "OPEN");

    const open = await api(`/api/tables/status?table=${token}`);
    assert.equal(open.status, 200);
    assert.ok(open.json.openCalls.some((c: { id: string }) => c.id === callId));
    assert.equal(open.json.id, undefined, "public status must not expose the table id");

    const resolved = await api(`/api/calls/${callId}/resolve`, { jar: waiter, method: "PATCH" });
    assert.equal(resolved.status, 200);
    assert.equal(resolved.json.status, "RESOLVED");
    await stream.waitFor((e) => e.event === "call" && e.data.id === callId && e.data.status === "RESOLVED");
    assert.equal((await api(`/api/calls/${callId}/resolve`, { jar: waiter, method: "PATCH" })).status, 409);

    const status = await api(`/api/tables/status?table=${token}`);
    assert.equal(status.json.pendingRating?.id, callId);

    const review = await api("/api/review", { body: { callId, stars: 5 } });
    assert.equal(review.status, 200);
    assert.equal((await api("/api/review", { body: { callId, stars: 5 } })).status, 409);
  } finally {
    stream.close();
  }
});

test("waiter can read settings", async () => {
  const res = await api("/api/settings", { jar: waiter });
  assert.equal(res.status, 200);
  assert.ok(res.json.currency && res.json.timezone && Array.isArray(res.json.enabled_locales));
});

test("admin cannot see the super admin user (404)", async () => {
  const session = await api("/api/auth/session", { jar: superadmin });
  const superId = session.json.user.id;
  assert.ok(superId);
  assert.equal((await api(`/api/users/${superId}`, { jar: admin })).status, 404);
});

test("menu import skips bad rows and upserts by default-locale name", async () => {
  const name = `Smoke import ${Date.now()}`;
  const missingColumn = await api("/api/admin/menu/import", {
    jar: admin,
    body: { csv: "category,name_en,price\nSmoke,X,1" },
  });
  assert.equal(missingColumn.status, 400);
  assert.match(missingColumn.json.error, /name_es/);

  const csv = [
    "category,category_en,name_es,name_en,price,allergens",
    `Smoke import,Smoke import EN,${name},Smoke EN,"2,50",milk;gluten`,
    "Smoke import,,,No default name,1,",
  ].join("\n");
  const first = await api("/api/admin/menu/import", { jar: admin, body: { csv } });
  assert.equal(first.status, 200, JSON.stringify(first.json));
  assert.deepEqual(first.json.created, { categories: 1, items: 1 });
  assert.deepEqual(first.json.errors, [{ row: 3, message: "name_es is empty" }]);
  const second = await api("/api/admin/menu/import", { jar: admin, body: { csv } });
  assert.deepEqual(second.json.created, { categories: 0, items: 0 });
  assert.deepEqual(second.json.updated, { items: 1 });

  assert.equal(
    (await api("/api/admin/menu/import", { jar: admin, body: { url: "http://169.254.169.254/" } })).status,
    400,
  );
  assert.equal((await api("/api/admin/menu/import", { jar: waiter, body: { csv } })).status, 403);

  // Clean up the imported category (cascades to its item)
  const categories = await api("/api/categories", { jar: admin });
  const smoke = categories.json.find((c: { names: Record<string, string> }) => c.names.es === "Smoke import");
  assert.deepEqual(smoke?.names, { es: "Smoke import", en: "Smoke import EN" }, "category_en is imported");
  if (smoke) await api(`/api/categories/${smoke.id}`, { jar: admin, method: "DELETE" });
});

test("photo upload: stored, served from /api/uploads, accepted as image_url", async () => {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  );
  const upload = (jar: Jar, type: string) => {
    const form = new FormData();
    form.append("file", new Blob([png], { type }), "dot.png");
    return fetch(`${BASE}/api/upload`, { method: "POST", headers: { Cookie: jar }, body: form });
  };

  assert.equal((await upload(waiter, "image/png")).status, 403);
  assert.equal((await upload(admin, "image/jpeg")).status, 400, "bytes must match the declared type");

  const res = await upload(admin, "image/png");
  const body = (await res.json()) as { url: string };
  assert.equal(res.status, 200, JSON.stringify(body));
  assert.match(body.url, /^\/api\/uploads\/[a-f0-9]{32}\.png$/);

  const served = await fetch(`${BASE}${body.url}`);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get("content-type"), "image/png");
  assert.match(served.headers.get("cache-control") ?? "", /immutable/);
  assert.deepEqual(Buffer.from(await served.arrayBuffer()), png);

  for (const bad of ["..%2F..%2Fetc%2Fpasswd", "..%2F..%2Fpackage.json", `${"0".repeat(32)}.png`]) {
    const status = (await fetch(`${BASE}/api/uploads/${bad}`)).status;
    assert.ok(status === 404 || status === 400, `${bad}: ${status}`);
  }

  const [settings, categories] = await Promise.all([
    api("/api/settings", { jar: admin }),
    api("/api/categories", { jar: admin }),
  ]);
  const item = await api("/api/items", {
    jar: admin,
    body: {
      category_id: categories.json[0].id,
      names: { [settings.json.default_locale]: `Smoke photo ${Date.now()}` },
      price: 1,
      image_url: body.url,
    },
  });
  assert.equal(item.status, 201, JSON.stringify(item.json));
  try {
    assert.equal(item.json.image_url, body.url);
    const relative = await api(`/api/items/${item.json.id}`, {
      jar: admin,
      method: "PUT",
      body: { image_url: "/etc/passwd" },
    });
    assert.equal(relative.status, 400, "only /api/uploads/ paths are accepted besides https");
  } finally {
    await api(`/api/items/${item.json.id}`, { jar: admin, method: "DELETE" });
  }
});

test("only SUPER_ADMIN may pass restaurantId (403 for everyone else)", async () => {
  const session = await api("/api/auth/session", { jar: admin });
  const restaurantId = session.json.user.restaurant_id;
  assert.ok(restaurantId);

  for (const path of [
    "/api/settings",
    "/api/tables",
    "/api/categories",
    "/api/items",
    "/api/users",
    "/api/admin/metrics/summary",
  ]) {
    const res = await api(`${path}?restaurantId=${restaurantId}`, { jar: admin });
    assert.equal(res.status, 403, path);
  }
  assert.equal((await api(`/api/orders?restaurantId=${restaurantId}`, { jar: waiter })).status, 403);

  for (const [path, method, body] of [
    ["/api/settings", "PUT", { restaurantId, ordering_enabled: true }],
    ["/api/tables", "POST", { restaurantId, label: "Nope" }],
    ["/api/categories", "POST", { restaurantId, names: { es: "Nope" } }],
    ["/api/users", "POST", { restaurantId, email: "nope@example.com", password: "nope12345", name: "Nope", role: "WAITER" }],
    ["/api/admin/menu/import", "POST", { restaurantId, csv: "category,name_es,price\nNope,Nope,1" }],
  ] as const) {
    const res = await api(path, { jar: admin, method, body });
    assert.equal(res.status, 403, `${method} ${path}`);
  }

  // The super admin still picks the restaurant with it
  assert.equal((await api(`/api/settings?restaurantId=${restaurantId}`, { jar: superadmin })).status, 200);
});

test("metrics: unknown period is 400, summary has calls and non-cancelled totals", async () => {
  for (const path of ["/api/admin/metrics/summary", "/api/admin/metrics/orders/hourly", "/api/metrics"]) {
    const res = await api(`${path}?period=decade`, { jar: admin });
    assert.equal(res.status, 400, path);
    assert.match(res.json.error, /period/);
  }
  assert.equal((await api("/api/admin/metrics/summary?period=today", { jar: waiter })).status, 403);

  const res = await api("/api/admin/metrics/summary?period=today", { jar: admin });
  assert.equal(res.status, 200);
  for (const key of ["total", "waiter", "bill", "avgServiceTime"]) {
    assert.equal(typeof res.json.calls[key], "number", `calls.${key}`);
  }
  for (const key of ["total", "confirmed", "cancelled", "cancellationRate"]) {
    assert.equal(typeof res.json.orders[key], "number", `orders.${key}`);
  }
  assert.ok(res.json.calls.total >= 1, "the smoke call is counted today");
});

test("login is throttled after 5 failures", async () => {
  const email = `smoke-${Date.now()}@example.com`;
  for (let i = 0; i < 5; i++) {
    const { location } = await login(email, "wrong");
    assert.doesNotMatch(location, /rate_limited/);
  }
  const { location } = await login(email, "wrong");
  assert.match(location, /code=rate_limited/);
});
