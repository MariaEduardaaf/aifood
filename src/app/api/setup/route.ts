import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET /api/setup - Verificar e criar usuários padrão
// REMOVER ESTA ROTA APÓS CONFIGURAÇÃO INICIAL
export async function GET(request: NextRequest) {
  try {
    // Get current session for debugging
    const session = await auth();

    const results = {
      admin: { exists: false, created: false, updated: false },
      waiter: { exists: false, created: false, updated: false },
      kitchen: { exists: false, created: false, updated: false },
    };

    const restaurant = await prisma.restaurant.upsert({
      where: { slug: "aifood" },
      update: {},
      create: {
        name: "aiFood",
        slug: "aifood",
        active: true,
      },
    });

    // Check/Create/Update Admin
    const existingAdmin = await prisma.user.findUnique({
      where: { email: "admin@aifood.com" },
    });

    if (existingAdmin) {
      results.admin.exists = true;
      if (existingAdmin.role !== "ADMIN") {
        await prisma.user.update({
          where: { email: "admin@aifood.com" },
          data: { role: "ADMIN", restaurant_id: restaurant.id },
        });
        results.admin.updated = true;
      }
    } else {
      const adminPassword = await hash("admin123", 12);
      await prisma.user.create({
        data: {
          email: "admin@aifood.com",
          password_hash: adminPassword,
          name: "Administrador",
          role: "ADMIN",
          active: true,
          restaurant_id: restaurant.id,
        },
      });
      results.admin.created = true;
    }

    // Check/Create/Update Waiter
    const existingWaiter = await prisma.user.findUnique({
      where: { email: "garcom@aifood.com" },
    });

    if (existingWaiter) {
      results.waiter.exists = true;
      if (existingWaiter.role !== "WAITER") {
        await prisma.user.update({
          where: { email: "garcom@aifood.com" },
          data: { role: "WAITER", restaurant_id: restaurant.id },
        });
        results.waiter.updated = true;
      }
    } else {
      const waiterPassword = await hash("garcom123", 12);
      await prisma.user.create({
        data: {
          email: "garcom@aifood.com",
          password_hash: waiterPassword,
          name: "Garçom Demo",
          role: "WAITER",
          active: true,
          restaurant_id: restaurant.id,
        },
      });
      results.waiter.created = true;
    }

    // Check/Create/Update Kitchen
    const existingKitchen = await prisma.user.findUnique({
      where: { email: "cozinha@aifood.com" },
    });

    if (existingKitchen) {
      results.kitchen.exists = true;
      if (existingKitchen.role !== "KITCHEN") {
        await prisma.user.update({
          where: { email: "cozinha@aifood.com" },
          data: { role: "KITCHEN", restaurant_id: restaurant.id },
        });
        results.kitchen.updated = true;
      }
    } else {
      const kitchenPassword = await hash("cozinha123", 12);
      await prisma.user.create({
        data: {
          email: "cozinha@aifood.com",
          password_hash: kitchenPassword,
          name: "Cozinha",
          role: "KITCHEN",
          active: true,
          restaurant_id: restaurant.id,
        },
      });
      results.kitchen.created = true;
    }

    // List all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
      },
    });

    return NextResponse.json({
      message: "Setup completed",
      currentSession: session
        ? {
            userId: session.user.id,
            email: session.user.email,
            name: session.user.name,
            role: session.user.role,
          }
        : null,
      results,
      users,
      note: "Se o role na sessão estiver errado, faça LOGOUT e LOGIN novamente para atualizar o token JWT",
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: "Setup failed", details: String(error) },
      { status: 500 },
    );
  }
}
