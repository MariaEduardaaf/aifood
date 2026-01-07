import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/chamados - List calls (for waiter dashboard)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const calls = await prisma.call.findMany({
      where: status ? { status: status as "OPEN" | "RESOLVED" } : undefined,
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
