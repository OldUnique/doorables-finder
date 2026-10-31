import type { Metadata } from "next";
import { pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Plans & Pricing",
  description:
    "Adorable Vault is free to use. Compare plans and see what's included for tracking your Disney Doorables collection.",
  path: "/pricing",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
