import { createClient } from "@supabase/supabase-js";
let sharedClient: ReturnType<typeof createClient> | null = null;
export function browserDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return (sharedClient ??= createClient(url, key));
}
export async function ownerFetch(path: string, body: unknown) {
  const client = browserDb();
  if (!client) throw new Error("Connect Supabase first.");
  const { data } = await client.auth.getSession();
  if (!data.session) throw new Error("Sign in first.");
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + data.session.access_token,
    },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Request failed");
  return result;
}
