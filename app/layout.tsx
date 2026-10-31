import type { Metadata, Viewport } from "next";
import Nav from "../components/Nav";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";

const ADSENSE_CLIENT_ID =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-5461396984327450";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.mydoorables.com"),
  title: {
    default: "Adorable Vault | Doorables Collection Tracker",
    template: "%s | Adorable Vault",
  },
  description:
    "Track your Doorables collection, wishlist, extras, marketplace listings, and public collector profile with Adorable Vault.",
  applicationName: "Adorable Vault",
  keywords: [
    "Doorables tracker",
    "Doorables collection",
    "Doorables checklist",
    "Doorables wishlist",
    "Doorables extras",
    "Adorable Vault",
    "MyDoorables",
    "collector tracker",
  ],
  authors: [{ name: "Adorable Vault" }],
  creator: "Adorable Vault",
  publisher: "Adorable Vault",

  /*
    IMPORTANT FOR GOOGLE:
    Do NOT put alternates.canonical: "/" in the root layout.
    A root canonical can accidentally make every page tell Google
    that the homepage is the main/canonical page.

    Instead:
    - Keep metadataBase here.
    - Add page-specific canonicals inside each page that needs one.
  */

  openGraph: {
    title: "Adorable Vault | Doorables Collection Tracker",
    description:
      "Track your Doorables collection, wishlist, extras, marketplace listings, and public collector profile.",
    siteName: "Adorable Vault",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Adorable Vault | Doorables Collection Tracker",
    description:
      "Track your Doorables collection, wishlist, extras, marketplace listings, and public collector profile.",
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    "google-adsense-account": ADSENSE_CLIENT_ID,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#24105f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Script
          id="adsense-script"
          async
          strategy="afterInteractive"
          crossOrigin="anonymous"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
        />
        <style>{`
          :root {
            color-scheme: dark;
            --vault-bg: #020617;
            --vault-purple: #7c3aed;
            --vault-pink: #ec4899;
            --vault-blue: #2563eb;
            --vault-gold: #fde68a;
            --vault-text: #ffffff;
            --vault-muted: rgba(255, 255, 255, 0.74);
            --vault-card: rgba(255, 255, 255, 0.94);
            --vault-border: rgba(255, 255, 255, 0.14);
            --vault-shadow: 0 18px 44px rgba(0, 0, 0, 0.32);
          }

          * {
            box-sizing: border-box;
          }

          html {
            min-height: 100%;
            background: var(--vault-bg);
            scroll-behavior: smooth;
            -webkit-text-size-adjust: 100%;
            text-size-adjust: 100%;
          }

          body {
            margin: 0;
            min-height: 100vh;
            color: var(--vault-text);
            background:
              radial-gradient(circle at 10% 0%, rgba(236, 72, 153, 0.22), transparent 30%),
              radial-gradient(circle at 90% 4%, rgba(59, 130, 246, 0.24), transparent 32%),
              radial-gradient(circle at 60% 100%, rgba(168, 85, 247, 0.18), transparent 34%),
              linear-gradient(135deg, #020617 0%, #172554 45%, #1d1d68 100%);
            font-family:
              Inter,
              ui-sans-serif,
              system-ui,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;
            overflow-x: hidden;
          }

          body::before {
            content: "";
            position: fixed;
            inset: 0;
            z-index: -2;
            pointer-events: none;
            background-image:
              radial-gradient(2px 2px at 18% 22%, rgba(255, 255, 255, 0.45) 35%, transparent 36%),
              radial-gradient(1.5px 1.5px at 78% 16%, rgba(255, 255, 255, 0.36) 35%, transparent 36%),
              radial-gradient(1.8px 1.8px at 48% 72%, rgba(255, 255, 255, 0.28) 35%, transparent 36%),
              linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
            background-size: auto, auto, auto, 48px 48px, 48px 48px;
            opacity: 0.62;
            mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.98), transparent 86%);
          }

          a {
            color: inherit;
          }

          button,
          input,
          select,
          textarea {
            font: inherit;
          }

          img {
            max-width: 100%;
          }

          .skipLink {
            position: fixed;
            left: 12px;
            top: 12px;
            z-index: 99999;
            transform: translateY(-160%);
            border-radius: 999px;
            padding: 12px 16px;
            color: #111827;
            background: #fde68a;
            font-weight: 1000;
            text-decoration: none;
            box-shadow: 0 14px 30px rgba(0, 0, 0, 0.28);
          }

          .skipLink:focus {
            transform: translateY(0);
          }

          .siteFrame {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }

          .siteMain {
            flex: 1;
            width: 100%;
          }

          .siteFooter {
            color: rgba(255, 255, 255, 0.76);
            border-top: 1px solid rgba(255, 255, 255, 0.12);
            background: rgba(2, 6, 23, 0.62);
            backdrop-filter: blur(16px);
          }

          .footerShell {
            max-width: 1200px;
            margin: 0 auto;
            padding: 26px 24px;
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: center;
            gap: 16px 24px;
            font-size: 13px;
            line-height: 1.5;
            font-weight: 800;
          }

          .footerTitle {
            color: #ffffff;
            font-size: 17px;
            font-weight: 1000;
          }

          .footerTag {
            margin-top: 4px;
            max-width: 420px;
            color: rgba(255, 255, 255, 0.66);
          }

          .footerLinks {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
          }

          .footerLinks a {
            padding: 8px 13px;
            border-radius: 999px;
            color: rgba(255, 255, 255, 0.88);
            background: rgba(255, 255, 255, 0.07);
            border: 1px solid rgba(255, 255, 255, 0.14);
            text-decoration: none;
            font-weight: 950;
          }

          .footerLinks a:hover {
            color: #fde68a;
            border-color: rgba(253, 230, 138, 0.5);
          }

          .footerFine {
            grid-column: 1 / -1;
            padding-top: 14px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.5);
            font-size: 12px;
            font-weight: 700;
          }

          @media (max-width: 920px) {
            .footerShell {
              padding: 22px 16px 110px;
              grid-template-columns: 1fr;
              text-align: center;
              justify-items: center;
            }

            .footerLinks {
              justify-content: center;
            }
          }
        `}</style>

        <a href="#main-content" className="skipLink">
          Skip to content
        </a>

        <div className="siteFrame">
          <Nav />

          <main id="main-content" className="siteMain">
            {children}
          </main>

          <footer className="siteFooter">
            <div className="footerShell">
              <div className="footerBrand">
                <div className="footerTitle">💜 Adorable Vault</div>
                <div className="footerTag">
                  Free, fan-made tools for tracking, trading, and showcasing your Disney Doorables.
                </div>
              </div>

              <nav className="footerLinks" aria-label="Footer navigation">
                <a href="/collection">Collection</a>
                <a href="/marketplace">Marketplace</a>
                <a href="/demo">Demo</a>
                <a href="/about">About</a>
                <a href="/pricing">Pricing</a>
                <a href="/feedback">Feedback</a>
              </nav>

              <div className="footerFine">
                © {new Date().getFullYear()} Adorable Vault · Not affiliated with Disney or Just Play.
              </div>
            </div>
          </footer>
        </div>

        <Analytics />
      </body>
    </html>
  );
}
