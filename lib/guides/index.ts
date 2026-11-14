// Guide metadata only (safe to import from client components; article bodies live in ./content).

export type GuideMeta = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  emoji: string;
  category: "Getting started" | "Collecting" | "Buying & trading" | "Using the vault";
  readMinutes: number;
  updated: string; // ISO date
};

export const GUIDES: GuideMeta[] = [
  {
    slug: "what-are-disney-doorables",
    title: "What Are Disney Doorables? A Beginner's Guide",
    shortTitle: "What are Doorables?",
    description:
      "New to Disney Doorables? Learn what they are, who makes them, how the door-shaped blind boxes work, and how to start a collection without overspending.",
    emoji: "🚪",
    category: "Getting started",
    readMinutes: 6,
    updated: "2026-11-14",
  },
  {
    slug: "how-to-identify-doorables",
    title: "How to Identify Which Doorables You Have",
    shortTitle: "Identify your figures",
    description:
      "A practical method for working out which Doorables figure, series and finish you are holding, using the checklist, packaging, bases, finishes and the catalog.",
    emoji: "🔎",
    category: "Getting started",
    readMinutes: 6,
    updated: "2026-11-14",
  },
  {
    slug: "doorables-rarity-explained",
    title: "Doorables Rarity Explained: Common to Limited Edition",
    shortTitle: "Rarity explained",
    description:
      "What Common, Rare, Ultra Rare, Special Edition, Limited Edition, Exclusive and Bonus mean on a Doorables checklist, with real counts from the Adorable Vault catalog.",
    emoji: "💎",
    category: "Collecting",
    readMinutes: 7,
    updated: "2026-11-14",
  },
  {
    slug: "doorables-series-list",
    title: "Every Doorables Series and Set: A Complete Overview",
    shortTitle: "Every series and set",
    description:
      "A complete, catalog-backed overview of Disney Doorables series: the main numbered series 1 to 16, Star Wars and Marvel, themed lines, and Collection Peek sets.",
    emoji: "📚",
    category: "Collecting",
    readMinutes: 8,
    updated: "2026-11-14",
  },
  {
    slug: "organize-and-display-doorables",
    title: "How to Organize and Display Your Doorables Collection",
    shortTitle: "Organize & display",
    description:
      "Shelf, case and storage ideas for tiny figures, plus how to sort by series, movie or color, protect finishes from dust and sunlight, and keep extras separate.",
    emoji: "🗂️",
    category: "Collecting",
    readMinutes: 6,
    updated: "2026-11-14",
  },
  {
    slug: "trading-and-selling-doorables",
    title: "Trading and Selling Doorables Safely",
    shortTitle: "Trade & sell safely",
    description:
      "How to trade and sell Doorables without getting burned: pricing extras fairly, clear photos and descriptions, safe payment and shipping, and red flags to watch for.",
    emoji: "🤝",
    category: "Buying & trading",
    readMinutes: 7,
    updated: "2026-11-14",
  },
  {
    slug: "finding-rare-doorables",
    title: "Where to Buy Doorables and How to Find Rare Figures",
    shortTitle: "Where to buy & hunt",
    description:
      "Where Doorables are sold, how pack sizes compare, and realistic strategies for finding rare, Special Edition and chase figures without wasting money.",
    emoji: "🛒",
    category: "Buying & trading",
    readMinutes: 6,
    updated: "2026-11-14",
  },
  {
    slug: "spot-fake-damaged-doorables",
    title: "How to Spot Fake and Damaged Doorables",
    shortTitle: "Spot fakes & damage",
    description:
      "How to tell a counterfeit or damaged Doorable from a normal factory variation, what to check before buying second-hand, and what to do if you receive a fake.",
    emoji: "🕵️",
    category: "Buying & trading",
    readMinutes: 6,
    updated: "2026-11-14",
  },
  {
    slug: "doorables-for-parents",
    title: "Doorables for Parents: Kids, Collecting and Keeping It Fun",
    shortTitle: "A guide for parents",
    description:
      "A parent's guide to Disney Doorables: age labels and small parts, budgets, handling duplicates and disappointment, and turning collecting into reading, sorting and trading skills.",
    emoji: "👨‍👩‍👧",
    category: "Getting started",
    readMinutes: 6,
    updated: "2026-11-14",
  },
  {
    slug: "how-to-use-adorable-vault",
    title: "How to Use Adorable Vault to Track Your Collection",
    shortTitle: "Using Adorable Vault",
    description:
      "A step-by-step walkthrough of Adorable Vault: tracking quantities as Have, Need and Extra, filters, series progress, your public collector page, and listing extras.",
    emoji: "💜",
    category: "Using the vault",
    readMinutes: 6,
    updated: "2026-11-14",
  },
];

export function getGuide(slug: string) {
  return GUIDES.find((g) => g.slug === slug) || null;
}
