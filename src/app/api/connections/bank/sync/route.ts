import { NextResponse } from "next/server";
import { z } from "zod";
import {
  endpoint,
  jsonBody,
  ownedAgent,
  db,
  check,
  ApiError,
} from "@/lib/server";
import { plaid } from "@/lib/finance";
import { unseal } from "@/lib/vault";
export const POST = endpoint(async (request) => {
  const { agent_id } = z
    .object({ agent_id: z.string().uuid() })
    .parse(await jsonBody(request));
  const user = await ownedAgent(request, agent_id);
  const client = db();
  const { data: connection, error } = await client
    .from("connections")
    .select("*")
    .eq("owner_id", user.id)
    .eq("agent_id", agent_id)
    .eq("provider", "plaid")
    .is("disconnected_at", null)
    .maybeSingle();
  check(error);
  if (!connection) throw new ApiError(400, "Connect a bank first.");
  let cursor = connection.cursor,
    more = true,
    count = 0,
    loops = 0;
  while (more && loops++ < 5) {
    const page = await plaid("/transactions/sync", {
      access_token: unseal(connection.secret_ciphertext),
      ...(cursor ? { cursor } : {}),
      count: 100,
    });
    for (const transaction of [...page.added, ...page.modified]) {
      const { error } = await client.from("bank_transactions").upsert({
        connection_id: connection.id,
        transaction_id: transaction.transaction_id,
        amount: transaction.amount,
        currency: transaction.iso_currency_code,
        description: transaction.name,
        posted_on: transaction.date,
        pending: transaction.pending,
      });
      check(error);
      count++;
    }
    for (const transaction of page.removed) {
      const { error } = await client
        .from("bank_transactions")
        .delete()
        .eq("connection_id", connection.id)
        .eq("transaction_id", transaction.transaction_id);
      check(error);
    }
    cursor = page.next_cursor;
    more = page.has_more;
    const { error } = await client
      .from("connections")
      .update({ cursor })
      .eq("id", connection.id);
    check(error);
  }
  return NextResponse.json({
    synced: count,
    has_more: more,
    notice:
      "Private bank records synced. Deposits are not automatically counted as business revenue.",
  });
});
