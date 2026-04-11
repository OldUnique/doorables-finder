
import AppHeader from "../components/AppHeader";

export const metadata = {
  title: "Doorables Finder",
  description: "Track your collection, browse the marketplace, and manage your listings.",
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
      </body>
    </html>
  );
}

