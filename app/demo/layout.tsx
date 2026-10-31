import type { Metadata } from "next";
import { pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Try the Demo",
  description:
    "Try the Adorable Vault Doorables tracker with sample figures before you start your own collection. No account needed.",
  path: "/demo",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
