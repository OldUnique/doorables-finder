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
  themeColor: "#2a0f4d",
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
            --vault-bg: #2a0f4d;
            --vault-plum: #3a1563;
            --vault-berry: #5b1d6e;
            --vault-purple: #a855f7;
            --vault-pink: #f472b6;
            --vault-rose: #fda4af;
            --vault-peach: #fdba74;
            --vault-lilac: #c4b5fd;
            --vault-blue: #818cf8;
            --vault-gold: #fde68a;
            --vault-text: #ffffff;
            --vault-muted: rgba(255, 255, 255, 0.8);
            --vault-card: rgba(255, 255, 255, 0.96);
            --vault-border: rgba(255, 255, 255, 0.18);
            --vault-shadow: 0 18px 44px rgba(26, 6, 48, 0.4);
            --vault-accent: linear-gradient(135deg, #f472b6, #a855f7);
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
            background: transparent;
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

          /* Soft, warm, fixed backdrop shared by every page (CSS only). */
          .siteBackdrop {
            position: fixed;
            inset: 0;
            z-index: -1;
            pointer-events: none;
            overflow: hidden;
            background:
              radial-gradient(ellipse 80% 55% at 85% 105%, rgba(253, 186, 116, 0.30), transparent 70%),
              radial-gradient(ellipse 60% 45% at 10% 75%, rgba(236, 72, 153, 0.20), transparent 70%),
              linear-gradient(165deg, #2c0f52 0%, #44166e 36%, #5e1c72 68%, #3d1258 100%);
          }

          .siteBackdrop::before,
          .siteBackdrop::after {
            content: "";
            position: absolute;
            width: 90vmax;
            height: 90vmax;
            border-radius: 50%;
            will-change: transform;
          }

          .siteBackdrop::before {
            top: -45vmax;
            left: -35vmax;
            background: radial-gradient(circle, rgba(251, 113, 133, 0.50) 0%, rgba(244, 114, 182, 0.18) 38%, transparent 66%);
            animation: vaultDriftA 26s ease-in-out infinite alternate;
          }

          .siteBackdrop::after {
            top: -30vmax;
            right: -45vmax;
            background: radial-gradient(circle, rgba(196, 181, 253, 0.42) 0%, rgba(167, 139, 250, 0.14) 40%, transparent 66%);
            animation: vaultDriftB 32s ease-in-out infinite alternate;
          }

          .siteSparkles {
            position: absolute;
            inset: 0;
            background-image:
              radial-gradient(1.6px 1.6px at 12% 18%, rgba(255, 255, 255, 0.85) 40%, transparent 50%),
              radial-gradient(1.2px 1.2px at 28% 62%, rgba(255, 240, 200, 0.7) 40%, transparent 50%),
              radial-gradient(2px 2px at 46% 12%, rgba(255, 255, 255, 0.75) 40%, transparent 50%),
              radial-gradient(1.4px 1.4px at 64% 44%, rgba(253, 230, 138, 0.7) 40%, transparent 50%),
              radial-gradient(1.8px 1.8px at 82% 24%, rgba(255, 255, 255, 0.8) 40%, transparent 50%),
              radial-gradient(1.2px 1.2px at 90% 70%, rgba(249, 168, 212, 0.75) 40%, transparent 50%),
              radial-gradient(1.5px 1.5px at 8% 84%, rgba(255, 255, 255, 0.6) 40%, transparent 50%),
              radial-gradient(1.3px 1.3px at 56% 88%, rgba(196, 181, 253, 0.7) 40%, transparent 50%);
            opacity: 0.75;
            animation: vaultTwinkle 6s ease-in-out infinite alternate;
          }

          @keyframes vaultDriftA {
            from { transform: translate3d(0, 0, 0) scale(1); }
            to { transform: translate3d(8vmax, 6vmax, 0) scale(1.08); }
          }

          @keyframes vaultDriftB {
            from { transform: translate3d(0, 0, 0) scale(1.05); }
            to { transform: translate3d(-7vmax, 9vmax, 0) scale(0.96); }
          }

          @keyframes vaultTwinkle {
            from { opacity: 0.45; }
            to { opacity: 0.85; }
          }

          @media (prefers-reduced-motion: reduce) {
            .siteBackdrop::before,
            .siteBackdrop::after,
            .siteSparkles {
              animation: none;
            }
          }

          ::selection {
            background: rgba(244, 114, 182, 0.45);
            color: #ffffff;
          }

          :focus-visible {
            outline: 3px solid var(--vault-gold);
            outline-offset: 2px;
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
            background: rgba(30, 9, 52, 0.55);
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

        <div className="siteBackdrop" aria-hidden="true">
          <div className="siteSparkles" />
        </div>

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
