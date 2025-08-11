import { NextRequest } from "next/server";
import { z, ZodSchema } from "zod";

export async function parseJsonOrThrow<T>(
  schema: ZodSchema<T>,
  request: NextRequest
): Promise<T> {
  const json = await request.json();
  const result = schema.safeParse(json);
  if (!result.success) {
    const error = new ZodRequestError("Invalid request body", result.error);
    throw error;
  }
  return result.data;
}

export function parseQueryOrThrow<T>(
  schema: ZodSchema<T>,
  request: NextRequest
): T {
  const entries = Object.fromEntries(request.nextUrl.searchParams.entries());
  const result = schema.safeParse(entries);
  if (!result.success) {
    const error = new ZodRequestError("Invalid query parameters", result.error);
    throw error;
  }
  return result.data;
}

export class ZodRequestError extends Error {
  public readonly zodError: z.ZodError;
  constructor(message: string, zodError: z.ZodError) {
    super(message);
    this.name = "ZodRequestError";
    this.zodError = zodError;
  }
}
