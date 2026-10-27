import { NextResponse } from "next/server";
import { z } from "zod";
import {
  endpoint,
  jsonBody,
  owner,
  db,
  check,
  rateLimit,
  ApiError,
} from "@/lib/server";
import { digest } from "@/lib/protocol";
export const POST = endpoint(async (request) => {
  const user = await owner(request);
  const { claim_code } = z
    .object({ claim_code: z.string().min(40).max(60) })
    .parse(await jsonBody(request));
  await rateLimit(request, "claim", 10);
  const { data, error } = await db()
    .from("agents")
    .update({
      owner_id: user.id,
      claim_hash: null,
      claimed_at: new Date().toISOString(),
    })
    .eq("claim_hash", digest(claim_code))
    .is("owner_id", null)
    .select("id,name")
    .maybeSingle();
  check(error);
  if (!data)
    throw new ApiError(400, "Claim code is invalid or already redeemed.");
  return NextResponse.json({ agent: data });
});
