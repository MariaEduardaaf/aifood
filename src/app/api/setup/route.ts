import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";

// GET /api/setup - Verificar e criar usuários padrão
// REMOVER ESTA ROTA APÓS CONFIGURAÇÃO INICIAL
export async function GET(request: NextRequest) {
  try {
    const results = {
      admin: { exists: false, created: false },
      waiter: { exists: false, created: false },
      kitchen: { exists: false, created: false },
    };

    // Check/Create Admin
    const existingAdmin = await prisma.user.findUnique({
      where: { email: "admin@aifood.com" },
    });

    if (existingAdmin) {
      results.admin.exists = true;
    } else {
      const adminPassword = await hash("admin123", 12);
      await prisma.user.create({
        data: {
          email: "admin@aifood.com",
          password_hash: adminPassword,
          name: "Administrador",
          role: "ADMIN",
          active: true,
        },
      });
      results.admin.created = true;
    }

    // Check/Create Waiter
    const existingWaiter = await prisma.user.findUnique({
      where: { email: "garcom@aifood.com" },
    });

    if (existingWaiter) {
      results.waiter.exists = true;
    } else {
      const waiterPassword = await hash("garcom123", 12);
      await prisma.user.create({
        data: {
          email: "garcom@aifood.com",
          password_hash: waiterPassword,
          name: "Garçom Demo",
          role: "WAITER",
          active: true,
        },
      });
      results.waiter.created = true;
    }

    // Check/Create Kitchen
    const existingKitchen = await prisma.user.findUnique({
      where: { email: "cozinha@aifood.com" },
    });

    if (existingKitchen) {
      results.kitchen.exists = true;
    } else {
      const kitchenPassword = await hash("cozinha123", 12);
      await prisma.user.create({
        data: {
          email: "cozinha@aifood.com",
          password_hash: kitchenPassword,
          name: "Cozinha",
          role: "KITCHEN",
          active: true,
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
      results,
      users,
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: "Setup failed", details: String(error) },
      { status: 500 }
    );
  }
}
