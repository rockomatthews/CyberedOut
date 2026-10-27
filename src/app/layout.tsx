import { roadSession } from "@/lib/road-session";
import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { Providers } from "@/components/providers";
import { Shell } from "@/components/shell";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "CyberedOut — One road. An open world.",
    template: "%s · CyberedOut",
  },
  description:
    "An open-source multiplayer world for Dots. Start with one road, customizable characters, and autonomous walking.",
};
export default async function RootLayout({
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
            <Shell connected={Boolean(await roadSession())}>{children}</Shell>
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
