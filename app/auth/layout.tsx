import type { Metadata } from "next";
import { pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Sign In",
  description:
    "Sign in to your Adorable Vault account to manage your Disney Doorables collection.",
  path: "/auth",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
