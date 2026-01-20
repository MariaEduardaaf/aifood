import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const ratingSchema = z.object({
  callId: z.string(),
  stars: z.number().min(1).max(5),
  feedback: z.string().optional(),
});

// POST /api/avaliacao - Criar avaliação
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = ratingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validation.error.issues },
        { status: 400 },
      );
    }

    const { callId, stars, feedback } = validation.data;

    // Verificar se o chamado existe e está resolvido
    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: { rating: true },
    });

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    if (call.status !== "RESOLVED") {
      return NextResponse.json(
        { error: "Call must be resolved before rating" },
        { status: 400 },
      );
    }

    if (call.rating) {
      return NextResponse.json(
        { error: "Call already rated" },
        { status: 400 },
      );
    }

    // Buscar configurações
    const settings = await prisma.settings.findUnique({
      where: { restaurant_id: call.restaurant_id },
    });

    const minStars = settings?.min_stars_redirect ?? 4;
    const shouldRedirect =
      stars >= minStars &&
      settings?.google_reviews_enabled &&
      settings?.google_reviews_url;

    // Criar avaliação
    const rating = await prisma.rating.create({
      data: {
        call_id: callId,
        stars,
        feedback: stars < minStars ? feedback : null,
        redirected_google: shouldRedirect ? true : false,
        restaurant_id: call.restaurant_id,
      },
    });

    return NextResponse.json({
      rating,
      redirect: shouldRedirect ? settings?.google_reviews_url : null,
    });
  } catch (error) {
    console.error("Error creating rating:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// GET /api/avaliacao?callId=xxx - Verificar se chamado já foi avaliado
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get("callId");

    if (!callId) {
      return NextResponse.json({ error: "callId required" }, { status: 400 });
    }

    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: { rating: true },
    });

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    return NextResponse.json({
      hasRating: !!call.rating,
      canRate: call.status === "RESOLVED" && !call.rating,
    });
  } catch (error) {
    console.error("Error checking rating:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
