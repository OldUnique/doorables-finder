import type { Metadata } from "next";
import { pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Doorables Checklist & Collection",
  description:
    "Track every Disney Doorables series: mark figures owned, wanted, or extra, add notes, and see your progress by series, rarity, and movie.",
  path: "/collection",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
