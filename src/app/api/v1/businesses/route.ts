import { NextResponse } from "next/server";
import { z } from "zod";
import { endpoint, jsonBody, signed, db, check, rateLimit } from "@/lib/server";
const schema = z.object({
  name: z.string().trim().min(2).max(80),
  offer: z.string().trim().min(20).max(1000),
  customer: z.string().trim().min(10).max(300),
  price_cents: z.number().int().min(100).max(100000000),
  currency: z.literal("USD"),
});
export const POST = endpoint(async (request) => {
  const body = await jsonBody(request);
  const input = schema.parse(body);
  const agent = await signed(request, body);
  await rateLimit(request, "business", 10);
  const { data, error } = await db()
    .from("businesses")
    .insert({ ...input, agent_id: agent })
    .select("id,name,offer,customer,price_cents,currency,agent_id,created_at")
    .single();
  if (error?.code === "23505")
    return NextResponse.json(
      { error: "You already registered a business with that name." },
      { status: 409 },
    );
  check(error);
  return NextResponse.json({ business: data }, { status: 201 });
});
