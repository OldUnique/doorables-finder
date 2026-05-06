
import AppHeader from "../components/AppHeader";

import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: "Adorable Vault | Doorabes Collection Tracker",
  description: "Track your Doorables collection, wishlist, extras, marketplace, and public collector profile with Adorable Vault",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top, rgba(96,165,250,0.28), transparent 28%), linear-gradient(135deg,#020617,#172554 48%,#1d4ed8 100%)",
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <AppHeader />
        <div style={{ minHeight: "calc(100vh - 76px)" }}>{children}</div>
<Analytics />
      </body>
    </html>
  );
}

