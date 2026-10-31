import type { Metadata } from "next";
import { pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Doorables Marketplace",
  description:
    "Buy, sell, and trade Disney Doorables with other collectors. Browse listings for the figures missing from your collection.",
  path: "/marketplace",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
