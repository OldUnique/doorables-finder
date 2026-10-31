import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import { pageMetadata } from "../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Adorable Vault | Doorables Collection Tracker",
  description:
    "Free Disney Doorables collection tracker. Check off every series, track your wishlist and extras, trade on the marketplace, and share a public collector profile.",
  path: "/",
  absoluteTitle: true,
});

export default function HomePage() {
  return <HomeClient />;
}
