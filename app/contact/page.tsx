import type { Metadata } from "next";
import SimplePage from "../../components/SimplePage";
import { pageMetadata } from "../../lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description:
    "How to contact Adorable Vault: report a missing figure, fix a catalog mistake, ask about your account or privacy, or suggest a feature.",
  path: "/contact",
});

const body = `
Adorable Vault is run by Josh, a Doorables collector, as an independent fan project. Messages are read personally, so thank you for your patience if a reply takes a few days.

## The fastest way to reach us

Use the [feedback page](/feedback). It goes straight to Josh. You can post publicly on the feedback wall or keep your message private, post anonymously, and add a reply email if you would like an answer.

The feedback page is the right place for:

- **Missing figures or catalog mistakes**, such as a wrong rarity, series or name. Please include the figure name, the series, and where the correct information comes from if you know.
- **Photo questions**, including problems with a photo you submitted.
- **Bugs**, like something not saving or a page that looks wrong on your phone. Mention your device and browser if you can.
- **Feature ideas**. Feedback is how new features get chosen.

## Account and privacy requests

For questions about your account, or to request a copy, correction or deletion of your data, send a private message through the [feedback page](/feedback) with a reply email, and mention that it is a privacy request. Please do not include your password. Read the [privacy policy](/privacy) for details on what we store.

## Marketplace questions

Adorable Vault does not handle payments or shipping for marketplace listings. For questions about a specific listing, message the seller through the listing. To report a listing that looks fake, misleading or unsafe, use the [feedback page](/feedback) and include a link to it.

## Press, partnerships and advertising

For anything else, including partnership or advertising questions, send a private message through the [feedback page](/feedback) with your reply email.

## Not affiliated with Disney or Just Play

Adorable Vault is fan-made and is not affiliated with Disney or Just Play. For questions about a Doorables product you bought, such as a damaged or defective figure, please contact the manufacturer or the retailer you bought it from.
`;

export default function ContactPage() {
  return (
    <SimplePage
      eyebrow="💌 Contact"
      title="Contact Adorable Vault"
      lead="Questions, corrections, privacy requests or ideas: here is how to reach the person who runs the site."
      body={body}
    />
  );
}
