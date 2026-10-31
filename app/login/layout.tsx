import type { Metadata } from "next";
import { pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Log In or Sign Up",
  description:
    "Log in or create a free Adorable Vault account to track your Disney Doorables collection, wishlist, and extras.",
  path: "/login",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
