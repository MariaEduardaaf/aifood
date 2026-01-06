import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminPassword = await hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@aifood.com" },
    update: {},
    create: {
      email: "admin@aifood.com",
      password_hash: adminPassword,
      name: "Administrador",
      role: "ADMIN",
      active: true,
    },
  });
  console.log("Created admin user:", admin.email);

  // Create waiter user
  const waiterPassword = await hash("garcom123", 12);
  const waiter = await prisma.user.upsert({
    where: { email: "garcom@aifood.com" },
    update: {},
    create: {
      email: "garcom@aifood.com",
      password_hash: waiterPassword,
      name: "Garçom Demo",
      role: "WAITER",
      active: true,
    },
  });
  console.log("Created waiter user:", waiter.email);

  // Create sample tables
  const tables = [];
  for (let i = 1; i <= 10; i++) {
    const table = await prisma.table.upsert({
      where: { id: `table-${i}` },
      update: {},
      create: {
        id: `table-${i}`,
        label: `Mesa ${i}`,
        active: true,
      },
    });
    tables.push(table);
  }
  console.log(`Created ${tables.length} tables`);

  // Create default settings with test restaurant (La Nieta, Madrid)
  const settings = await prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      google_reviews_url:
        "https://search.google.com/local/writereview?placeid=ChIJmYSE24UoQg0R-6rgBEDufpU",
      google_reviews_enabled: true,
      min_stars_redirect: 4,
    },
  });
  console.log("Created default settings with Google Reviews URL");

  // Create menu categories
  const categories = [
    {
      id: "cat-entradas",
      name_pt: "Entradas",
      name_es: "Entrantes",
      name_en: "Starters",
      order: 1,
    },
    {
      id: "cat-pratos",
      name_pt: "Pratos Principais",
      name_es: "Platos Principales",
      name_en: "Main Courses",
      order: 2,
    },
    {
      id: "cat-bebidas",
      name_pt: "Bebidas",
      name_es: "Bebidas",
      name_en: "Drinks",
      order: 3,
    },
    {
      id: "cat-sobremesas",
      name_pt: "Sobremesas",
      name_es: "Postres",
      name_en: "Desserts",
      order: 4,
    },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: cat,
    });
  }
  console.log(`Created ${categories.length} menu categories`);

  // Create menu items
  const menuItems = [
    // Entradas
    {
      id: "item-bruschetta",
      category_id: "cat-entradas",
      name_pt: "Bruschetta de Tomate",
      name_es: "Bruschetta de Tomate",
      name_en: "Tomato Bruschetta",
      description_pt:
        "Pão italiano crocante com tomates frescos, manjericão e azeite",
      description_es:
        "Pan italiano crujiente con tomates frescos, albahaca y aceite de oliva",
      description_en:
        "Crispy Italian bread with fresh tomatoes, basil and olive oil",
      price: 24.9,
      order: 1,
    },
    {
      id: "item-carpaccio",
      category_id: "cat-entradas",
      name_pt: "Carpaccio de Carne",
      name_es: "Carpaccio de Res",
      name_en: "Beef Carpaccio",
      description_pt:
        "Finas fatias de carne crua com rúcula, parmesão e alcaparras",
      description_es:
        "Finas lonchas de carne cruda con rúcula, parmesano y alcaparras",
      description_en:
        "Thin slices of raw beef with arugula, parmesan and capers",
      price: 38.9,
      order: 2,
    },
    // Pratos
    {
      id: "item-picanha",
      category_id: "cat-pratos",
      name_pt: "Picanha Grelhada",
      name_es: "Picaña a la Parrilla",
      name_en: "Grilled Picanha",
      description_pt:
        "Picanha grelhada ao ponto, acompanhada de arroz, farofa e vinagrete",
      description_es:
        "Picaña a la parrilla al punto, acompañada de arroz, farofa y vinagreta",
      description_en:
        "Grilled picanha cooked to perfection, served with rice, farofa and vinaigrette",
      price: 89.9,
      order: 1,
    },
    {
      id: "item-salmao",
      category_id: "cat-pratos",
      name_pt: "Salmão Grelhado",
      name_es: "Salmón a la Parrilla",
      name_en: "Grilled Salmon",
      description_pt:
        "Filé de salmão grelhado com legumes salteados e purê de batatas",
      description_es:
        "Filete de salmón a la parrilla con verduras salteadas y puré de papas",
      description_en:
        "Grilled salmon fillet with sautéed vegetables and mashed potatoes",
      price: 79.9,
      order: 2,
    },
    {
      id: "item-risoto",
      category_id: "cat-pratos",
      name_pt: "Risoto de Funghi",
      name_es: "Risotto de Hongos",
      name_en: "Mushroom Risotto",
      description_pt: "Risoto cremoso com mix de cogumelos e parmesão",
      description_es: "Risotto cremoso con mezcla de hongos y parmesano",
      description_en: "Creamy risotto with mixed mushrooms and parmesan",
      price: 59.9,
      order: 3,
    },
    // Bebidas
    {
      id: "item-suco",
      category_id: "cat-bebidas",
      name_pt: "Suco Natural",
      name_es: "Jugo Natural",
      name_en: "Fresh Juice",
      description_pt: "Suco natural de laranja, limão, maracujá ou abacaxi",
      description_es: "Jugo natural de naranja, limón, maracuyá o piña",
      description_en: "Fresh orange, lemon, passion fruit or pineapple juice",
      price: 12.9,
      order: 1,
    },
    {
      id: "item-refrigerante",
      category_id: "cat-bebidas",
      name_pt: "Refrigerante",
      name_es: "Refresco",
      name_en: "Soft Drink",
      description_pt: "Coca-Cola, Guaraná ou Sprite (350ml)",
      description_es: "Coca-Cola, Guaraná o Sprite (350ml)",
      description_en: "Coca-Cola, Guaraná or Sprite (350ml)",
      price: 8.9,
      order: 2,
    },
    {
      id: "item-cerveja",
      category_id: "cat-bebidas",
      name_pt: "Cerveja Artesanal",
      name_es: "Cerveza Artesanal",
      name_en: "Craft Beer",
      description_pt: "Cerveja artesanal da casa (500ml)",
      description_es: "Cerveza artesanal de la casa (500ml)",
      description_en: "House craft beer (500ml)",
      price: 18.9,
      order: 3,
    },
    // Sobremesas
    {
      id: "item-pudim",
      category_id: "cat-sobremesas",
      name_pt: "Pudim de Leite",
      name_es: "Flan de Leche",
      name_en: "Milk Pudding",
      description_pt: "Pudim de leite condensado com calda de caramelo",
      description_es: "Flan de leche condensada con salsa de caramelo",
      description_en: "Condensed milk pudding with caramel sauce",
      price: 16.9,
      order: 1,
    },
    {
      id: "item-petit",
      category_id: "cat-sobremesas",
      name_pt: "Petit Gâteau",
      name_es: "Petit Gâteau",
      name_en: "Chocolate Lava Cake",
      description_pt:
        "Bolinho de chocolate com recheio cremoso e sorvete de baunilha",
      description_es:
        "Bizcocho de chocolate con relleno cremoso y helado de vainilla",
      description_en:
        "Chocolate cake with creamy filling and vanilla ice cream",
      price: 28.9,
      order: 2,
    },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }
  console.log(`Created ${menuItems.length} menu items`);

  console.log("Seeding completed!");
  console.log("\n--- Login Credentials ---");
  console.log("Admin: admin@aifood.com / admin123");
  console.log("Garçom: garcom@aifood.com / garcom123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
