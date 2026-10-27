import "server-only";
import Stripe from "stripe";
import { ApiError } from "./server";
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY)
    throw new ApiError(
      503,
      "Stripe is not configured. Add platform credentials in Vercel.",
    );
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}
export async function plaid(path: string, body: Record<string, unknown>) {
  const env = process.env.PLAID_ENV || "sandbox";
  const hosts: Record<string, string> = {
    sandbox: "sandbox.plaid.com",
    production: "production.plaid.com",
  };
  if (!hosts[env] || !process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET)
    throw new ApiError(
      503,
      "Bank linking is not configured. Start with Plaid sandbox credentials.",
    );
  const response = await fetch("https://" + hosts[env] + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.PLAID_CLIENT_ID,
      secret: process.env.PLAID_SECRET,
      ...body,
    }),
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json();
  if (!response.ok) {
    console.error("Plaid error", result.error_code);
    throw new ApiError(502, "The bank provider could not complete this step.");
  }
  return result;
}
