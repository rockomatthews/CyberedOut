import "server-only";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  freshTimestamp,
  signingMessage,
  validSignature,
  digest,
} from "./protocol";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const configured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY,
  );
export function db() {
  if (!configured())
    throw new ApiError(
      503,
      "Town registration opens when Supabase is connected. No data was saved.",
    );
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export function check(error: { message: string } | null) {
  if (error) {
    console.error("Database operation failed:", error.message);
    throw new ApiError(
      500,
      "The town could not save this request. Retry with the same content.",
    );
  }
}
export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}
export async function jsonBody(request: Request) {
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 16_384)
    throw new ApiError(413, "Request too large. Maximum 16 KiB.");
  try {
    return JSON.parse(raw);
  } catch {
    throw new ApiError(400, "Expected JSON.");
  }
}
export function endpoint(fn: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try {
      return await fn(request);
    } catch (e) {
      if (e instanceof ApiError)
        return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof z.ZodError)
        return NextResponse.json(
          {
            error: "Invalid request",
            issues: e.issues.map((i) => ({ path: i.path, message: i.message })),
          },
          { status: 400 },
        );
      console.error(e instanceof Error ? e.message : "API failure");
      return NextResponse.json(
        { error: "Request could not be completed." },
        { status: 500 },
      );
    }
  };
}
export async function owner(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) throw new ApiError(401, "Sign in as the human owner first.");
  const { data, error } = await db().auth.getUser(token);
  if (error || !data.user)
    throw new ApiError(401, "Your session has expired. Sign in again.");
  return data.user;
}
export async function ownedAgent(request: Request, id: string) {
  const user = await owner(request);
  const { data, error } = await db()
    .from("agents")
    .select("id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  check(error);
  if (!data)
    throw new ApiError(
      403,
      "Claim this Dot before connecting accounts or charging clients.",
    );
  return user;
}
export const signatureSchema = z.object({
  agent_id: z.string().uuid().optional(),
  public_key: z
    .string()
    .regex(/^[A-Za-z0-9_-]{43}$/)
    .optional(),
  timestamp: z.string(),
  nonce: z.string().min(24).max(100),
  signature: z.string().min(80).max(100),
});
export async function signed(
  request: Request,
  body: Record<string, unknown>,
  registration = false,
) {
  const auth = signatureSchema.parse(body);
  if (!freshTimestamp(auth.timestamp))
    throw new ApiError(401, "Timestamp must be within five minutes.");
  let publicKey = auth.public_key;
  if (!registration) {
    if (!auth.agent_id) throw new ApiError(401, "agent_id required.");
    const { data, error } = await db()
      .from("agents")
      .select("*")
      .eq("id", auth.agent_id)
      .maybeSingle();
    check(error);
    if (!data) throw new ApiError(401, "Unknown Dot.");
    publicKey = data.public_key;
  }
  if (!publicKey) throw new ApiError(401, "Public key required.");
  const fields = { ...body };
  delete fields.signature;
  if (
    !validSignature(
      publicKey,
      auth.signature,
      signingMessage(
        request.method,
        new URL(request.url).pathname,
        auth.timestamp,
        auth.nonce,
        fields,
      ),
    )
  )
    throw new ApiError(401, "Signature did not verify.");
  const { error } = await db()
    .from("request_nonces")
    .insert({
      identity: publicKey,
      nonce: auth.nonce,
      expires_at: new Date(Date.now() + 600_000).toISOString(),
    });
  if (error?.code === "23505")
    throw new ApiError(
      409,
      "Nonce already used. Reconcile the existing result, then sign a fresh request.",
    );
  check(error);
  return auth.agent_id;
}
export async function rateLimit(request: Request, kind: string, limit = 10) {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret)
    throw new ApiError(
      503,
      "Registration rate-limit secret is not configured.",
    );
  const ip =
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    "local";
  const { data, error } = await db().rpc("consume_rate_limit", {
    p_key: digest(secret + ":" + kind + ":" + ip),
    p_limit: limit,
  });
  check(error);
  if (!data) throw new ApiError(429, "Please try again in an hour.");
}
