import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET /api/setup - Check and create default users
// REMOVE THIS ROUTE AFTER INITIAL SETUP
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
          name: "Administrator",
          role: "ADMIN",
          active: true,
          restaurant_id: restaurant.id,
        },
      });
      results.admin.created = true;
    }

    // Check/Create/Update Waiter
    const existingWaiter = await prisma.user.findUnique({
      where: { email: "waiter@aifood.com" },
    });

    if (existingWaiter) {
      results.waiter.exists = true;
      if (existingWaiter.role !== "WAITER") {
        await prisma.user.update({
          where: { email: "waiter@aifood.com" },
          data: { role: "WAITER", restaurant_id: restaurant.id },
        });
        results.waiter.updated = true;
      }
    } else {
      const waiterPassword = await hash("waiter123", 12);
      await prisma.user.create({
        data: {
          email: "waiter@aifood.com",
          password_hash: waiterPassword,
          name: "Demo Waiter",
          role: "WAITER",
          active: true,
          restaurant_id: restaurant.id,
        },
      });
      results.waiter.created = true;
    }

    // Check/Create/Update Kitchen
    const existingKitchen = await prisma.user.findUnique({
      where: { email: "kitchen@aifood.com" },
    });

    if (existingKitchen) {
      results.kitchen.exists = true;
      if (existingKitchen.role !== "KITCHEN") {
        await prisma.user.update({
          where: { email: "kitchen@aifood.com" },
          data: { role: "KITCHEN", restaurant_id: restaurant.id },
        });
        results.kitchen.updated = true;
      }
    } else {
      const kitchenPassword = await hash("kitchen123", 12);
      await prisma.user.create({
        data: {
          email: "kitchen@aifood.com",
          password_hash: kitchenPassword,
          name: "Kitchen",
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
      note: "If the role in the session is wrong, log out and log in again to refresh the JWT token",
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: "Setup failed", details: String(error) },
      { status: 500 },
    );
  }
}
