import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { generateToken } from "@/lib/utils";

const createTableSchema = z.object({
  label: z.string().min(1).max(50),
});

// GET /api/mesas - List all tables
export async function GET() {
  try {
    const session = await auth();

    if (
      !session ||
      (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tables = await prisma.table.findMany({
      orderBy: { created_at: "asc" },
      include: {
        _count: {
          select: {
            calls: {
              where: { status: "OPEN" },
            },
          },
        },
      },
    });

    return NextResponse.json(tables);
  } catch (error) {
    console.error("Error fetching tables:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/mesas - Create new table
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (
      !session ||
      (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = createTableSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues },
        { status: 400 },
      );
    }

    const { label } = validation.data;

    const table = await prisma.table.create({
      data: {
        label,
        qr_token: generateToken(32),
        active: true,
      },
    });

    return NextResponse.json(table, { status: 201 });
  } catch (error) {
    console.error("Error creating table:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
