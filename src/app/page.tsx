import { getWorld } from "@/lib/world";
import { Overview } from "@/components/overview";
export const dynamic = "force-dynamic";
export default async function Home() {
  return <Overview world={await getWorld()} />;
}
