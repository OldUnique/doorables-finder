import type { Metadata } from "next";
import SimplePage from "../../components/SimplePage";
import { pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Use",
  description: "The terms for using Adorable Vault, the free fan-made Disney Doorables collection tracker and marketplace.",
  path: "/terms",
});

const body = `
These terms explain the rules for using Adorable Vault at mydoorables.com. By using the site you agree to them. If you do not agree, please do not use the site.

## About the site

Adorable Vault is a free, fan-made tool for tracking Disney Doorables collections, sharing collector pages, and connecting with other collectors. It is an independent project and is **not affiliated with, sponsored by, or endorsed by Disney or Just Play**. Disney, Doorables and related character names and marks belong to their respective owners and are used here only to identify products for collectors.

## Your account

You are responsible for your account and for keeping your password safe. Please give accurate information and choose a username that is not offensive or misleading. Accounts are intended for adults or for families where a parent or guardian manages the account. We may suspend or remove accounts that break these terms.

## Your content

You keep ownership of the content you post, such as notes, listings, photos, messages and feedback. By posting it, you give Adorable Vault permission to store and display it as needed to run the site, for example showing your listing on the marketplace or an approved photo in the catalog. Only post photos you took yourself or have the right to share.

Please do not post content that is illegal, hateful, harassing, sexually explicit, misleading, or that infringes someone else's rights, and do not use the site to send spam.

## Marketplace and trading

The marketplace lets collectors list figures and contact each other. Adorable Vault is not a party to any sale or trade, does not handle payments or shipping, and does not verify listings, users or the authenticity of items. You are responsible for your own transactions. Describe items honestly, never list counterfeit figures as genuine, and follow the safety advice in our [trading and selling guide](/guides/trading-and-selling-doorables). Minors should only trade with a parent or guardian handling the arrangements.

## Catalog and guides

We work hard to keep the catalog and guides accurate, but they are provided for information only and may contain errors or omissions. Rarity, release details and photos can change as new information is published. Nothing on the site is a price guide or a guarantee of value.

## Advertising

The site is free and supported by ads, including ads from Google AdSense. Ads are provided by third parties and are not endorsements. See the [privacy policy](/privacy) for how advertising cookies work.

## Availability and changes

We may change, pause or discontinue any part of the site at any time. We may update these terms; the date at the top shows the latest version, and continued use means you accept the updated terms.

## Disclaimer and limitation of liability

The site is provided "as is" without warranties of any kind. To the fullest extent allowed by law, Adorable Vault is not liable for any indirect or consequential losses, lost data, or losses arising from transactions between users.

## Contact

Questions about these terms? Reach us through the [contact page](/contact).
`;

export default function TermsPage() {
  return (
    <SimplePage
      eyebrow="📜 Terms"
      title="Terms of Use"
      lead="The ground rules for using Adorable Vault, its marketplace and its collector tools."
      updated="November 14, 2026"
      body={body}
    />
  );
}
