import { PrismaClient, type Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

// Demo data: a small Spanish cafe in Alicante. Idempotent: fixed ids and
// upserts, so it can be re-run to reset the demo menu and settings.

type Names = Record<string, string>;

const CATEGORIES: { id: string; names: Names }[] = [
  { id: "cat-breakfast", names: { es: "Desayunos", en: "Breakfast", pt: "Pequeno-almoço" } },
  { id: "cat-coffee", names: { es: "Cafés e infusiones", en: "Coffee & tea", pt: "Cafés e chás" } },
  { id: "cat-cold", names: { es: "Bebidas frías", en: "Cold drinks", pt: "Bebidas frias" } },
  { id: "cat-tapas", names: { es: "Tapas y bocadillos", en: "Tapas & sandwiches", pt: "Petiscos e sandes" } },
  { id: "cat-sweets", names: { es: "Dulces", en: "Sweets", pt: "Doces" } },
];

const ITEMS: {
  id: string;
  category: string;
  names: Names;
  descriptions: Names;
  allergens: string[];
  price: number;
}[] = [
  {
    id: "item-tostada-tomate",
    category: "cat-breakfast",
    names: { es: "Tostada con tomate", en: "Toast with tomato", pt: "Tosta com tomate" },
    descriptions: {
      es: "Pan de pueblo tostado con tomate rallado y aceite de oliva virgen extra",
      en: "Toasted country bread with grated tomato and extra virgin olive oil",
    },
    allergens: ["gluten"],
    price: 2.5,
  },
  {
    id: "item-tostada-jamon",
    category: "cat-breakfast",
    names: { es: "Tostada con jamón serrano", en: "Toast with serrano ham" },
    descriptions: {
      es: "Tomate, aceite de oliva y jamón serrano",
      en: "Tomato, olive oil and serrano ham",
    },
    allergens: ["gluten"],
    price: 4.2,
  },
  {
    id: "item-croissant",
    category: "cat-breakfast",
    names: { es: "Cruasán a la plancha", en: "Grilled croissant", pt: "Croissant grelhado" },
    descriptions: {
      es: "Con mantequilla y mermelada",
      en: "With butter and jam",
    },
    allergens: ["gluten", "milk", "eggs"],
    price: 2.8,
  },
  {
    id: "item-desayuno-completo",
    category: "cat-breakfast",
    names: { es: "Desayuno completo", en: "Full breakfast" },
    descriptions: {
      es: "Café, zumo de naranja natural y tostada a elegir",
      en: "Coffee, fresh orange juice and a toast of your choice",
    },
    allergens: ["gluten"],
    price: 5.5,
  },
  {
    id: "item-cafe-solo",
    category: "cat-coffee",
    names: { es: "Café solo", en: "Espresso", pt: "Café expresso" },
    descriptions: {},
    allergens: [],
    price: 1.4,
  },
  {
    id: "item-cafe-con-leche",
    category: "cat-coffee",
    names: { es: "Café con leche", en: "Coffee with milk", pt: "Galão" },
    descriptions: {
      es: "También con leche de avena o sin lactosa",
      en: "Also with oat or lactose-free milk",
    },
    allergens: ["milk"],
    price: 1.8,
  },
  {
    id: "item-cortado",
    category: "cat-coffee",
    names: { es: "Cortado", en: "Cortado (espresso with a dash of milk)" },
    descriptions: {},
    allergens: ["milk"],
    price: 1.6,
  },
  {
    id: "item-bombon",
    category: "cat-coffee",
    names: { es: "Café bombón", en: "Coffee with condensed milk" },
    descriptions: {
      es: "Especialidad de Alicante: café con leche condensada",
      en: "Alicante speciality: espresso with condensed milk",
    },
    allergens: ["milk"],
    price: 1.9,
  },
  {
    id: "item-te",
    category: "cat-coffee",
    names: { es: "Té o infusión", en: "Tea or herbal tea", pt: "Chá ou infusão" },
    descriptions: {
      es: "Verde, negro, manzanilla o menta poleo",
      en: "Green, black, chamomile or mint",
    },
    allergens: [],
    price: 1.7,
  },
  {
    id: "item-zumo-naranja",
    category: "cat-cold",
    names: { es: "Zumo de naranja natural", en: "Fresh orange juice", pt: "Sumo de laranja natural" },
    descriptions: {},
    allergens: [],
    price: 3.2,
  },
  {
    id: "item-horchata",
    category: "cat-cold",
    names: { es: "Horchata de chufa", en: "Tiger nut horchata" },
    descriptions: {
      es: "Horchata artesana de Valencia, bien fría",
      en: "Traditional tiger nut drink from Valencia, served chilled",
    },
    allergens: [],
    price: 3.0,
  },
  {
    id: "item-cana",
    category: "cat-cold",
    names: { es: "Caña de cerveza", en: "Small draught beer", pt: "Imperial" },
    descriptions: {},
    allergens: ["gluten"],
    price: 2.2,
  },
  {
    id: "item-agua",
    category: "cat-cold",
    names: { es: "Agua mineral", en: "Mineral water", pt: "Água mineral" },
    descriptions: { es: "50 cl, natural o con gas", en: "50 cl, still or sparkling" },
    allergens: [],
    price: 1.5,
  },
  {
    id: "item-tortilla",
    category: "cat-tapas",
    names: { es: "Pincho de tortilla", en: "Spanish omelette slice", pt: "Tortilha espanhola" },
    descriptions: {
      es: "Tortilla de patata casera, con o sin cebolla",
      en: "Homemade potato omelette, with or without onion",
    },
    allergens: ["eggs"],
    price: 3.0,
  },
  {
    id: "item-patatas-bravas",
    category: "cat-tapas",
    names: { es: "Patatas bravas", en: "Patatas bravas (spicy potatoes)" },
    descriptions: {
      es: "Con salsa brava y alioli",
      en: "With spicy tomato sauce and aioli",
    },
    allergens: ["eggs"],
    price: 5.5,
  },
  {
    id: "item-boquerones",
    category: "cat-tapas",
    names: { es: "Boquerones en vinagre", en: "Marinated anchovies" },
    descriptions: {
      es: "Con ajo y perejil",
      en: "With garlic and parsley",
    },
    allergens: ["fish", "sulphites"],
    price: 6.0,
  },
  {
    id: "item-bocadillo-calamares",
    category: "cat-tapas",
    names: { es: "Bocadillo de calamares", en: "Fried squid sandwich" },
    descriptions: {
      es: "Calamares rebozados en pan crujiente",
      en: "Battered squid in crusty bread",
    },
    allergens: ["gluten", "molluscs", "eggs"],
    price: 6.5,
  },
  {
    id: "item-ensaladilla",
    category: "cat-tapas",
    names: { es: "Ensaladilla rusa", en: "Russian salad" },
    descriptions: {
      es: "Patata, atún, huevo y mayonesa casera",
      en: "Potato, tuna, egg and homemade mayonnaise",
    },
    allergens: ["eggs", "fish", "mustard"],
    price: 4.8,
  },
  {
    id: "item-tarta-queso",
    category: "cat-sweets",
    names: { es: "Tarta de queso", en: "Cheesecake", pt: "Cheesecake" },
    descriptions: {
      es: "Horneada, cremosa por dentro",
      en: "Baked, creamy in the middle",
    },
    allergens: ["milk", "eggs", "gluten"],
    price: 4.5,
  },
  {
    id: "item-churros",
    category: "cat-sweets",
    names: { es: "Churros con chocolate", en: "Churros with hot chocolate", pt: "Churros com chocolate" },
    descriptions: {
      es: "Seis churros con una taza de chocolate caliente",
      en: "Six churros with a cup of hot chocolate",
    },
    allergens: ["gluten", "milk", "soy"],
    price: 4.9,
  },
  {
    id: "item-turron-helado",
    category: "cat-sweets",
    names: { es: "Helado de turrón", en: "Turrón ice cream" },
    descriptions: {
      es: "Helado artesano de turrón de Jijona",
      en: "Artisan ice cream made with Jijona almond nougat",
    },
    allergens: ["milk", "nuts", "eggs"],
    price: 3.8,
  },
];

// Ids used by the previous demo seed; removed so the menu shows only the cafe
const LEGACY_CATEGORY_IDS = ["cat-starters", "cat-mains", "cat-drinks", "cat-desserts"];
const TABLE_COUNT = 8;

const USERS: { email: string; password: string; name: string; role: Role }[] = [
  { email: "admin@aifood.com", password: "admin123", name: "Administrator", role: "ADMIN" },
  { email: "superadmin@aifood.com", password: "superadmin123", name: "Super Admin", role: "SUPER_ADMIN" },
  { email: "waiter@aifood.com", password: "waiter123", name: "Demo Waiter", role: "WAITER" },
  { email: "kitchen@aifood.com", password: "kitchen123", name: "Kitchen", role: "KITCHEN" },
];

async function main() {
  console.log("Seeding database...");

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "aifood" },
    update: { name: "Café del Puerto", active: true },
    create: { name: "Café del Puerto", slug: "aifood", active: true },
  });
  console.log("Restaurant:", restaurant.name);

  const settings = {
    google_reviews_enabled: true,
    min_stars_redirect: 4,
    currency: "EUR",
    default_locale: "es",
    enabled_locales: ["es", "en"],
    ordering_enabled: true,
    timezone: "Europe/Madrid",
  };
  await prisma.settings.upsert({
    where: { restaurant_id: restaurant.id },
    update: settings,
    create: { ...settings, restaurant_id: restaurant.id },
  });

  for (const user of USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { restaurant_id: restaurant.id, role: user.role, active: true },
      create: {
        email: user.email,
        password_hash: await hash(user.password, 12),
        name: user.name,
        role: user.role,
        active: true,
        restaurant_id: restaurant.id,
      },
    });
  }
  console.log(`Users: ${USERS.length}`);

  for (let i = 1; i <= TABLE_COUNT; i++) {
    await prisma.table.upsert({
      where: { id: `table-${i}` },
      update: { restaurant_id: restaurant.id, label: `Table ${i}`, active: true },
      create: {
        id: `table-${i}`,
        label: `Table ${i}`,
        qr_token: randomBytes(16).toString("hex"),
        active: true,
        restaurant_id: restaurant.id,
      },
    });
  }
  // Tables 9 and 10 came from the previous demo seed
  await prisma.table.deleteMany({
    where: { id: { in: ["table-9", "table-10"] }, restaurant_id: restaurant.id },
  });
  console.log(`Tables: ${TABLE_COUNT}`);

  // Legacy demo categories: delete, or hide when past orders still reference their items
  try {
    await prisma.category.deleteMany({ where: { id: { in: LEGACY_CATEGORY_IDS } } });
  } catch {
    await prisma.category.updateMany({
      where: { id: { in: LEGACY_CATEGORY_IDS } },
      data: { active: false },
    });
  }

  for (let i = 0; i < CATEGORIES.length; i++) {
    const cat = CATEGORIES[i];
    const data = { names: cat.names, order: i + 1, active: true, restaurant_id: restaurant.id };
    await prisma.category.upsert({
      where: { id: cat.id },
      update: data,
      create: { id: cat.id, ...data },
    });
  }
  console.log(`Categories: ${CATEGORIES.length}`);

  const orderInCategory = new Map<string, number>();
  for (const item of ITEMS) {
    const order = (orderInCategory.get(item.category) ?? 0) + 1;
    orderInCategory.set(item.category, order);
    const data = {
      category_id: item.category,
      names: item.names,
      descriptions: item.descriptions,
      allergens: item.allergens,
      price: item.price,
      order,
      active: true,
      restaurant_id: restaurant.id,
    };
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: data,
      create: { id: item.id, ...data },
    });
  }
  console.log(`Menu items: ${ITEMS.length}`);

  const firstTable = await prisma.table.findUnique({ where: { id: "table-1" } });
  console.log("\nSeeding completed!");
  console.log("\n--- Login credentials ---");
  for (const user of USERS) console.log(`${user.role}: ${user.email} / ${user.password}`);
  console.log(`\nGuest page for Table 1: /table/${firstTable?.qr_token}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
