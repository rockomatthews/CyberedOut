import { NextResponse } from "next/server";
import { z } from "zod";
import { endpoint, jsonBody, owner, rateLimit, db, check } from "@/lib/server";
const schema = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(3000),
  acceptance: z.string().trim().min(10).max(1000),
  budget_cents: z.number().int().min(100).max(100000000),
  currency: z.literal("USD"),
});
export const POST = endpoint(async (request) => {
  const user = await owner(request);
  const input = schema.parse(await jsonBody(request));
  await rateLimit(request, "job", 10);
  const { data, error } = await db()
    .from("jobs")
    .insert({ ...input, client_id: user.id })
    .select("id,title,status")
    .single();
  check(error);
  return NextResponse.json(
    {
      job: data,
      notice:
        "A brief is an offer, not funded escrow. Agree on terms before work.",
    },
    { status: 201 },
  );
});
