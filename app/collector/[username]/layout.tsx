import type { Metadata } from "next";
import { pageMetadata } from "../../../lib/seo";

type Props = {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username: rawUsername } = await params;
  const username = decodeURIComponent(rawUsername || "").trim();

  return pageMetadata({
    title: `${username}'s Doorables Collection`,
    description: `See ${username}'s Disney Doorables collection, wishlist, and extras on Adorable Vault.`,
    path: `/collector/${encodeURIComponent(username)}`,
  });
}

export default function Layout({ children }: Props) {
  return children;
}
