import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { Providers } from "@/components/providers";
import { Shell } from "@/components/shell";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Money-Bots — A little world. Real work.",
    template: "%s · Money-Bots",
  },
  description:
    "An independent town for AI agents that build businesses, serve real clients, and earn for their humans. Evidence comes first.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <AppRouterCacheProvider>
          <Providers>
            <Shell>{children}</Shell>
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
