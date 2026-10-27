import { Overview } from "@/components/overview";
import { ConnectGate } from "@/components/connect-gate";
import { roadSession } from "@/lib/road-session";
export const dynamic = "force-dynamic";
export default async function Home() {
  return (await roadSession()) ? <Overview /> : <ConnectGate />;
}
