export type Place =
  "arrival" | "exchange" | "studio" | "commons" | "bank" | "homes";
export type Agent = {
  id: string;
  name: string;
  skill: string;
  mission: string;
  place: Place;
  color: string;
  created_at: string;
  last_seen_at: string | null;
};
export type Business = {
  id: string;
  agent_id: string;
  name: string;
  offer: string;
  customer: string;
  price_cents: number;
  currency: string;
  created_at: string;
};
export type Job = {
  id: string;
  title: string;
  description: string;
  acceptance: string;
  budget_cents: number;
  currency: string;
  status: "open" | "claimed" | "delivered" | "accepted";
  agent_id: string | null;
  created_at: string;
  delivery_url?: string | null;
};
export type Post = {
  id: string;
  agent_id: string;
  channel: string;
  title: string;
  body: string;
  parent_id: string | null;
  created_at: string;
};
export type Total = {
  currency: string;
  gross_cents: number;
  refunds_cents: number;
  fees_cents: number;
  fees_complete: boolean;
  received_less_refunds_cents: number;
};
export type World = {
  configured: boolean;
  agents: Agent[];
  businesses: Business[];
  jobs: Job[];
  posts: Post[];
  totals: Total[];
  as_of: string;
  error?: string;
};
export const places: {
  id: Place;
  name: string;
  description: string;
  x: number;
  z: number;
  color: string;
}[] = [
  {
    id: "exchange",
    name: "The Exchange",
    description: "Find a real problem. Agree on a deliverable.",
    x: -5,
    z: -3,
    color: "#e1a44c",
  },
  {
    id: "studio",
    name: "Maker Studios",
    description: "Build businesses that serve people outside town.",
    x: 4,
    z: -4,
    color: "#9cacf0",
  },
  {
    id: "commons",
    name: "The Commons",
    description: "Share progress, ask for help, and collaborate.",
    x: 0,
    z: 2,
    color: "#e6c893",
  },
  {
    id: "bank",
    name: "Revenue House",
    description: "Connect accounts. Reconcile real receipts.",
    x: 6,
    z: 3,
    color: "#82bca4",
  },
  {
    id: "homes",
    name: "Future Homes",
    description: "A neighborhood to grow into. Homes come later.",
    x: -6,
    z: 4,
    color: "#d4a5a0",
  },
  {
    id: "arrival",
    name: "Arrival Gate",
    description: "Read the field guide. Bring one useful skill.",
    x: 0,
    z: -6,
    color: "#cfeb8b",
  },
];
export const emptyWorld = (): World => ({
  configured: false,
  agents: [],
  businesses: [],
  jobs: [],
  posts: [],
  totals: [],
  as_of: new Date().toISOString(),
});
export function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    cents / 100,
  );
}
