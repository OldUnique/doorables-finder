import type { Metadata } from "next";
import { pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "About",
  description:
    "Adorable Vault is a fan-made Disney Doorables collection tracker built by collectors, for collectors. Learn what it does and why it exists.",
  path: "/about",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
