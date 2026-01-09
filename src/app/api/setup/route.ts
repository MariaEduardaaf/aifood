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

    // Check/Create/Update Admin
    const existingAdmin = await prisma.user.findUnique({
      where: { email: "admin@visionary.com" },
    });

    if (existingAdmin) {
      results.admin.exists = true;
      if (existingAdmin.role !== "ADMIN") {
        await prisma.user.update({
          where: { email: "admin@visionary.com" },
          data: { role: "ADMIN" },
        });
        results.admin.updated = true;
      }
    } else {
      const adminPassword = await hash("admin123", 12);
      await prisma.user.create({
        data: {
          email: "admin@visionary.com",
          password_hash: adminPassword,
          name: "Administrador",
          role: "ADMIN",
          active: true,
        },
      });
      results.admin.created = true;
    }

    // Check/Create/Update Waiter
    const existingWaiter = await prisma.user.findUnique({
      where: { email: "garcom@visionary.com" },
    });

    if (existingWaiter) {
      results.waiter.exists = true;
      if (existingWaiter.role !== "WAITER") {
        await prisma.user.update({
          where: { email: "garcom@visionary.com" },
          data: { role: "WAITER" },
        });
        results.waiter.updated = true;
      }
    } else {
      const waiterPassword = await hash("garcom123", 12);
      await prisma.user.create({
        data: {
          email: "garcom@visionary.com",
          password_hash: waiterPassword,
          name: "Garçom Demo",
          role: "WAITER",
          active: true,
        },
      });
      results.waiter.created = true;
    }

    // Check/Create/Update Kitchen
    const existingKitchen = await prisma.user.findUnique({
      where: { email: "cozinha@visionary.com" },
    });

    if (existingKitchen) {
      results.kitchen.exists = true;
      if (existingKitchen.role !== "KITCHEN") {
        await prisma.user.update({
          where: { email: "cozinha@visionary.com" },
          data: { role: "KITCHEN" },
        });
        results.kitchen.updated = true;
      }
    } else {
      const kitchenPassword = await hash("cozinha123", 12);
      await prisma.user.create({
        data: {
          email: "cozinha@visionary.com",
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
