import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import type { ZodError } from "zod";

// Standard 400 for zod failures: `error` is always a renderable string.
export function validationError(error: ZodError) {
  const first = error.issues[0];
  const message = first
    ? (first.path.length ? `${first.path.join(".")}: ` : "") + first.message
    : "Invalid data";
  return NextResponse.json(
    { error: message, issues: error.issues },
    { status: 400 },
  );
}

// True when Prisma rejected a write because of a unique constraint
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
