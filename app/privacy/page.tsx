import type { Metadata } from "next";
import SimplePage from "../../components/SimplePage";
import { pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How Adorable Vault collects, uses and protects your information, including cookies, Google AdSense advertising, release emails, and your choices.",
  path: "/privacy",
});

const body = `
This privacy policy explains what information Adorable Vault ("we", "us") collects when you use mydoorables.com, how it is used, and the choices you have. Adorable Vault is a free, fan-made Disney Doorables collection tracker run by an individual collector. It is not affiliated with Disney or Just Play.

## Information you give us

When you create an account and use the tracker, we store:

- **Account details**: your email address and the username you choose.
- **Collection data**: the figures you track, quantities, and any notes you add.
- **Profile settings**: your collection visibility (private, wishlist and extras, or full collection) and whether other collectors may message you about your collection.
- **Marketplace content**: listings you create (title, description, price, photo, shipping and pickup details) and messages you send to other collectors.
- **Feedback and submissions**: feedback you send, including an optional name and an optional reply email if you ask to be contacted, and figure photos you submit for the catalog.
- **Release emails**: if you sign up for new Doorables release updates, the email address you enter and the page you signed up from.

Anything you choose to make public, such as a public collector page, marketplace listing or approved feedback post, can be seen by other visitors.

## Information collected automatically

Like most websites, our hosting provider receives standard technical information when you visit, such as your IP address, browser type and the pages you request. We use Vercel Web Analytics to understand overall traffic, such as which pages are visited. Our sign-in system stores a session in your browser so you stay logged in.

## Advertising and cookies (Google AdSense)

Adorable Vault shows ads to keep the site free. Ads are provided by **Google AdSense**, a third-party advertising service.

- Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites.
- Google's use of advertising cookies enables it and its partners to serve ads to you based on your visit to this site and/or other sites on the Internet.
- You may opt out of personalized advertising by visiting [Google Ads Settings](https://adssettings.google.com). You can also opt out of some third-party vendors' use of cookies for personalized advertising at [www.aboutads.info](https://www.aboutads.info/choices).
- Third-party vendors and ad networks may also use web beacons and similar technologies to measure ad performance.

To learn more about how Google uses information from sites that use its services, see [How Google uses information from sites or apps that use our services](https://policies.google.com/technologies/partner-sites). Where required by law, such as for visitors in the European Economic Area, the UK and Switzerland, Google may ask for your consent before using cookies for personalized ads.

You can also control or delete cookies through your browser settings. Blocking cookies may affect sign-in and some site features.

## How we use information

We use the information above to:

- Run the tracker, your public collector page, the marketplace and messaging.
- Keep the catalog accurate and review submitted photos and feedback.
- Reply to you when you ask us to.
- Send optional new-release emails if you signed up for them.
- Protect the site against abuse, spam and fraud.
- Understand overall usage so we can improve the site.

We do not sell your personal information.

## Service providers

We rely on a few trusted providers to run the site: **Supabase** (database, sign-in, and stored release-email addresses), **Vercel** (hosting and analytics), **Google AdSense** (advertising) and an email delivery provider for feedback notifications and, when release emails are sent, those announcements. They process data on our behalf to provide their services. Adorable Vault does not currently sell anything or take payments. If you made a payment in the past, it was processed by Stripe, and we never received or stored your full card number.

## Release emails

You can optionally sign up to be emailed when new Disney Doorables figures are added to the catalog. This is separate from creating an account.

- We use the email address you provide only to send those release updates, and to honor unsubscribe or data requests.
- We do not use release-email sign-ups for unrelated marketing, and we do not sell or rent this list.
- You can unsubscribe at any time using the link in a release email, or by contacting us through the [contact page](/contact). After you unsubscribe we keep a record that the address should not be emailed again, unless you sign up once more.
- Signing up for release emails is optional and is not required to use the tracker, the free demo, the guides or any other part of the site.

## Children

Adorable Vault is a general-audience site and is not directed to children under 13. Accounts, the marketplace and messaging are intended for adults, or for families where a parent or guardian manages the account. We do not knowingly collect personal information from children under 13. If you believe a child has provided us personal information, please contact us and we will delete it.

## Data retention and your choices

We keep your account data for as long as your account is active. You can change your collection visibility at any time, edit or remove your listings, and update your collection. Release-email addresses are kept until you unsubscribe or ask us to delete them. To request a copy of your data, a correction, or deletion of your account and its data, contact us through the [contact page](/contact). Depending on where you live, you may have additional rights under local law, and we will honor valid requests.

## Security

We use reputable providers and access controls to protect your information. No method of transmission or storage is completely secure, so please use a unique password for your account.

## Changes to this policy

We may update this policy as the site changes. The date at the top shows when it was last updated. Significant changes will be noted on the site.

## Contact

Questions about this policy? Reach us through the [contact page](/contact).
`;

export default function PrivacyPage() {
  return (
    <SimplePage
      eyebrow="🔒 Privacy"
      title="Privacy Policy"
      lead="What Adorable Vault collects, how it is used, how advertising cookies and release emails work, and the choices you have."
      updated="November 19, 2026"
      body={body}
    />
  );
}
