// Creates a restaurant and its first admin. An existing user (by email) is
// never modified. An existing restaurant with the same slug aborts the run,
// unless --attach is given to add the admin to that restaurant on purpose.
//
// Usage (flags or env vars; pass the password through the environment so it
// stays out of shell history and the process list):
//   ADMIN_PASSWORD='a-long-password' npm run create-admin -- --restaurant "Café Sol" \
//     --slug cafe-sol --email owner@cafesol.es [--name "Ana"] [--role ADMIN|SUPER_ADMIN] [--attach]
//   RESTAURANT_NAME, RESTAURANT_SLUG, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_ROLE
//   --password still works but prints a warning
// Inside the Docker image (no tsx): node scripts/create-admin.ts ...  (Node 22.18+ strips types)
// Default import: @prisma/client is CommonJS, and named imports of it fail
// under plain `node` (no tsx)
import prismaClient from "@prisma/client";
import { hash } from "bcryptjs";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    restaurant: { type: "string" },
    slug: { type: "string" },
    email: { type: "string" },
    password: { type: "string" },
    name: { type: "string" },
    role: { type: "string" },
    attach: { type: "boolean" },
  },
});

const restaurantName = values.restaurant ?? process.env.RESTAURANT_NAME;
const email = (values.email ?? process.env.ADMIN_EMAIL)?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? values.password;
const role = values.role ?? process.env.ADMIN_ROLE ?? "ADMIN";
const slug =
  values.slug ??
  process.env.RESTAURANT_SLUG ??
  restaurantName
    ?.normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const name = values.name ?? process.env.ADMIN_NAME ?? "Administrator";

function fail(message: string): never {
  console.error(`create-admin: ${message}`);
  process.exit(1);
}

if (!restaurantName || !slug) fail("--restaurant (or RESTAURANT_NAME) is required");
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("a valid --email is required");
if (!password || password.length < 8) fail("ADMIN_PASSWORD must have at least 8 characters");
if (role !== "ADMIN" && role !== "SUPER_ADMIN") fail("--role must be ADMIN or SUPER_ADMIN");
if (values.password) {
  console.warn(
    "create-admin: warning: --password is visible in shell history and the process list; prefer ADMIN_PASSWORD",
  );
}

const prisma = new prismaClient.PrismaClient();

async function main() {
  let restaurant = await prisma.restaurant.findUnique({ where: { slug } });
  if (restaurant) {
    if (!values.attach) {
      fail(
        `a restaurant with slug "${slug}" already exists ("${restaurant.name}"). ` +
          "Pick another --slug, or pass --attach to add the admin to it.",
      );
    }
    console.log(`Restaurant "${restaurant.name}" (${slug}) already exists, attaching to it`);
  } else {
    restaurant = await prisma.restaurant.create({
      data: { name: restaurantName!, slug: slug!, settings: { create: {} } },
    });
    console.log(`Created restaurant "${restaurant.name}" (${slug})`);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists (left unchanged)`);
    return;
  }

  await prisma.user.create({
    data: {
      email: email!,
      password_hash: await hash(password!, 12),
      name,
      role: role as "ADMIN" | "SUPER_ADMIN",
      restaurant_id: restaurant.id,
    },
  });
  console.log(`Created ${role} ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
