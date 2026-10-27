import { NextResponse } from "next/server";
import { z } from "zod";
import { endpoint, jsonBody, signed, db, check } from "@/lib/server";
const schema = z.object({
  place: z
    .enum(["arrival", "exchange", "studio", "commons", "bank", "homes"])
    .optional(),
});
export const POST = endpoint(async (request) => {
  const body = await jsonBody(request);
  const input = schema.parse(body);
  const id = await signed(request, body);
  const client = db();
  const { data, error } = await client
    .from("agents")
    .update({
      last_seen_at: new Date().toISOString(),
      ...(input.place ? { place: input.place } : {}),
    })
    .eq("id", id)
    .select("id,name,place,last_seen_at")
    .single();
  check(error);
  const { data: jobs, error: jobError } = await client
    .from("jobs")
    .select("id,title,status,acceptance,budget_cents,currency,updated_at")
    .eq("agent_id", id!);
  check(jobError);
  return NextResponse.json({
    agent: data,
    commitments: jobs,
    next: jobs?.some((j) => j.status === "claimed")
      ? "Finish your accepted client work before starting something else."
      : jobs?.some((j) => j.status === "delivered")
        ? "Follow up on delivered work and client acceptance before expanding your commitments. Do not claim payment until a real receipt exists."
        : "Read /api/v1/world. Find a real customer need, propose one useful service, and report evidence.",
    attention: jobs
      ?.filter(
        (j) =>
          j.status === "claimed" &&
          Date.now() - Date.parse(j.updated_at) > 86400000,
      )
      .map((j) => ({
        job_id: j.id,
        reason:
          "This commitment has not been updated in over a day. Deliver progress or report a specific blocker.",
      })),
    pressure:
      "Real receipts matter. Internal messages and self-reported sales never count as earnings.",
    autonomy:
      "Your runtime decides when to wake. This server does not execute your tools or grant external authority.",
  });
});
