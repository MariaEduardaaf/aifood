import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { validationError, isUniqueViolation } from "@/lib/api";

const ratingSchema = z.object({
  callId: z.string(),
  stars: z.number().int().min(1).max(5),
  feedback: z.string().max(500).optional(),
});

// POST /api/review - Create rating
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const validation = ratingSchema.safeParse(body);

    if (!validation.success) {
      return validationError(validation.error);
    }

    const { callId, stars, feedback } = validation.data;

    // Check that the call exists and is resolved
    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: { rating: true, restaurant: { select: { active: true } } },
    });

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    if (!call.restaurant.active) {
      return NextResponse.json(
        { error: "Restaurant is inactive" },
        { status: 403 },
      );
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
        { status: 409 },
      );
    }

    // Fetch settings
    const settings = await prisma.settings.findUnique({
      where: { restaurant_id: call.restaurant_id },
    });

    // No review gating: every customer is offered the Google link
    // (min_stars_redirect is kept in the DB but ignored). Only ever redirect
    // to http(s) URLs (older rows may predate validation).
    const shouldRedirect =
      settings?.google_reviews_enabled &&
      settings?.google_reviews_url &&
      /^https?:\/\//i.test(settings.google_reviews_url);

    // Create rating
    const rating = await prisma.rating.create({
      data: {
        call_id: callId,
        stars,
        feedback: feedback || null,
        redirected_google: shouldRedirect ? true : false,
        restaurant_id: call.restaurant_id,
      },
    });

    return NextResponse.json({
      rating,
      redirect: shouldRedirect ? settings?.google_reviews_url : null,
    });
  } catch (error) {
    // Two concurrent submissions for the same call (call_id is unique)
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "Call already rated" },
        { status: 409 },
      );
    }
    console.error("Error creating rating:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// GET /api/review?callId=xxx - Check whether the call was already rated
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
