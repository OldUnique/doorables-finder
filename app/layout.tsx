import type { Metadata, Viewport } from "next";
import AppHeader from "./components/AppHeader";
import { Analytics } from "@vercel/analytics/next";

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
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Adorable Vault | Doorables Collection Tracker",
    description:
      "Track your Doorables collection, wishlist, extras, marketplace listings, and public collector profile.",
    url: "https://www.mydoorables.com",
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
            max-width: 1500px;
            margin: 0 auto;
            padding: 18px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
            font-size: 12px;
            line-height: 1.5;
            font-weight: 800;
          }

          .footerLinks {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
          }

          .footerLinks a {
            color: rgba(255, 255, 255, 0.82);
            text-decoration: none;
            font-weight: 950;
          }

          .footerLinks a:hover {
            color: #fde68a;
            text-decoration: underline;
            text-underline-offset: 4px;
          }

          @media (max-width: 920px) {
            .footerShell {
              padding: 16px 12px;
              display: grid;
              text-align: center;
              justify-content: center;
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
          <AppHeader />

          <main id="main-content" className="siteMain">
            {children}
          </main>

          <footer className="siteFooter">
            <div className="footerShell">
              <div>
                💜 Adorable Vault — fan-made collector tools for tracking, trading, and showcasing.
              </div>

              <nav className="footerLinks" aria-label="Footer navigation">
                <a href="/about">About</a>
                <a href="/pricing">Plans</a>
                <a href="/feedback">Feedback</a>
                <a href="/demo">Demo</a>
              </nav>
            </div>
          </footer>
        </div>

        <Analytics />
      </body>
    </html>
  );
}
