import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { validationError } from "@/lib/api";

export const dynamic = "force-dynamic";

const createCallSchema = z.object({
  // TODO(security): resolve table from qr_token instead of id
  tableId: z.string(),
  type: z.enum(["CALL_WAITER", "REQUEST_BILL"]),
});

const callStatusSchema = z.enum(["OPEN", "RESOLVED"]);

// Minimum seconds between two calls of the same type from the same table
const RATE_LIMIT_SECONDS = 30;

// GET /api/calls - List calls (for waiter dashboard)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      session.user.role !== "WAITER" &&
      session.user.role !== "ADMIN" &&
      session.user.role !== "MANAGER" &&
      session.user.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const statusValidation = statusParam
      ? callStatusSchema.safeParse(statusParam)
      : null;

    if (statusValidation && !statusValidation.success) {
      return validationError(statusValidation.error);
    }

    const status = statusValidation?.data;
    const restaurantIdParam = searchParams.get("restaurantId");
    const restaurantId =
      session.user.role === "SUPER_ADMIN"
        ? restaurantIdParam
        : session.user.restaurant_id;

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurantId is required" },
        { status: 400 },
      );
    }

    const calls = await prisma.call.findMany({
      where: status
        ? {
            status,
            restaurant_id: restaurantId,
          }
        : { restaurant_id: restaurantId },
      orderBy: { created_at: "asc" },
      include: {
        table: {
          select: {
            id: true,
            label: true,
          },
        },
        resolver: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(calls);
  } catch (error) {
    console.error("Error fetching calls:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/calls - Create new call (public, rate limited)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const validation = createCallSchema.safeParse(body);

    if (!validation.success) {
      return validationError(validation.error);
    }

    const { tableId, type } = validation.data;

    // Check if table exists and is active
    const table = await prisma.table.findUnique({
      where: { id: tableId },
      include: { restaurant: { select: { active: true } } },
    });

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    if (!table.restaurant.active) {
      return NextResponse.json(
        { error: "Restaurant is inactive" },
        { status: 403 },
      );
    }

    if (!table.active) {
      return NextResponse.json({ error: "Table is inactive" }, { status: 400 });
    }

    // Rate limiting by table and type, backed by the DB so it holds across
    // serverless instances. ponytail: check-then-insert is not atomic.
    const now = Date.now();
    const lastCall = await prisma.call.findFirst({
      where: {
        table_id: tableId,
        type,
        created_at: { gte: new Date(now - RATE_LIMIT_SECONDS * 1000) },
      },
      orderBy: { created_at: "desc" },
      select: { created_at: true },
    });

    if (lastCall) {
      const secondsSinceLastCall = (now - lastCall.created_at.getTime()) / 1000;
      if (secondsSinceLastCall < RATE_LIMIT_SECONDS) {
        const waitTime = Math.ceil(RATE_LIMIT_SECONDS - secondsSinceLastCall);
        return NextResponse.json(
          {
            error: "Rate limit exceeded",
            waitTime,
            message: `Wait ${waitTime} seconds before making a new call`,
          },
          { status: 429 },
        );
      }
    }

    // Check if there's already an open call of the same type for this table
    const existingCall = await prisma.call.findFirst({
      where: {
        table_id: tableId,
        type,
        status: "OPEN",
        restaurant_id: table.restaurant_id,
      },
    });

    if (existingCall) {
      return NextResponse.json({
        message: "There is already an open call",
        call: existingCall,
      });
    }

    // Create the call
    const call = await prisma.call.create({
      data: {
        table_id: tableId,
        type,
        status: "OPEN",
        restaurant_id: table.restaurant_id,
      },
      include: {
        table: {
          select: {
            label: true,
          },
        },
      },
    });

    return NextResponse.json(call, { status: 201 });
  } catch (error) {
    console.error("Error creating call:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
