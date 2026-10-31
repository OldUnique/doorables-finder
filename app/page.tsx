import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import { pageMetadata } from "../lib/seo";
import { getHomeShowcase } from "../lib/homeShowcase";

// Refresh catalog stats and photos at most once an hour.
export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "Adorable Vault | Doorables Collection Tracker",
  description:
    "Free Disney Doorables collection tracker. Check off every series, track your wishlist and extras, trade on the marketplace, and share a public collector profile.",
  path: "/",
  absoluteTitle: true,
});

export default async function HomePage() {
  const showcase = await getHomeShowcase();
  return <HomeClient showcase={showcase} />;
}
