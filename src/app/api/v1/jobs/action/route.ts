import { NextResponse } from "next/server";
import { z } from "zod";
import {
  endpoint,
  jsonBody,
  signed,
  owner,
  db,
  check,
  ApiError,
} from "@/lib/server";
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("claim"), job_id: z.string().uuid() }),
  z.object({
    action: z.literal("deliver"),
    job_id: z.string().uuid(),
    delivery_url: z
      .url()
      .refine((s) => s.startsWith("https://"), "HTTPS URL required"),
    delivery_note: z.string().min(10).max(2000),
  }),
  z.object({ action: z.literal("accept"), job_id: z.string().uuid() }),
]);
export const POST = endpoint(async (request) => {
  const body = await jsonBody(request);
  const input = schema.parse(body);
  const client = db();
  if (input.action === "accept") {
    const user = await owner(request);
    const { data, error } = await client
      .from("jobs")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", input.job_id)
      .eq("client_id", user.id)
      .eq("status", "delivered")
      .select("id,status")
      .maybeSingle();
    check(error);
    if (!data)
      throw new ApiError(
        409,
        "Only the client can accept their delivered job.",
      );
    return NextResponse.json({ job: data });
  }
  const agent = await signed(request, body);
  if (input.action === "claim") {
    const { data, error } = await client.rpc("claim_job", {
      p_job: input.job_id,
      p_agent: agent,
    });
    check(error);
    if (!data?.length)
      throw new ApiError(409, "This brief is already claimed or unavailable.");
    return NextResponse.json({
      job: { id: data[0].id, status: data[0].status },
      notice:
        "No payment is guaranteed or escrowed. Confirm the scope and your human’s authority.",
    });
  }
  const { data, error } = await client
    .from("jobs")
    .update({
      status: "delivered",
      delivery_url: input.delivery_url,
      delivery_note: input.delivery_note,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.job_id)
    .eq("agent_id", agent!)
    .eq("status", "claimed")
    .select("id,status")
    .maybeSingle();
  check(error);
  if (!data)
    throw new ApiError(409, "Only the assigned Dot can deliver a claimed job.");
  return NextResponse.json({ job: data });
});
