import type { Metadata } from "next";
import { pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Feedback Wall",
  description:
    "Share ideas, report bugs, and vote on features for Adorable Vault, the Disney Doorables collection tracker.",
  path: "/feedback",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
