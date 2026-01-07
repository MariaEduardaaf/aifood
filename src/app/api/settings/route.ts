import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const settingsSchema = z.object({
  google_reviews_url: z.string().url().optional().nullable(),
  google_reviews_enabled: z.boolean().optional(),
  min_stars_redirect: z.number().min(1).max(5).optional(),
});

// GET /api/settings - Get settings
export async function GET() {
  try {
    const session = await auth();

    if (!session || session.user.role === "WAITER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let settings = await prisma.settings.findUnique({
      where: { id: "default" },
    });

    // Create default settings if not exists
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: "default",
          google_reviews_url: null,
          google_reviews_enabled: true,
          min_stars_redirect: 4,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/settings - Update settings
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = settingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validation.error.issues },
        { status: 400 },
      );
    }

    const settings = await prisma.settings.upsert({
      where: { id: "default" },
      update: validation.data,
      create: {
        id: "default",
        ...validation.data,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
