"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const links = [
  { href: "/", label: "🏠 Home" },
  { href: "/app", label: "Collection" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/sell", label: "Sell" },
  { href: "/pricing", label: "Subscription" },
  { href: "/feedback", label: "💜 Feedback" },
];

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;
      setEmail(user?.email ?? null);
      setLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);
      if (!mobile) setMenuOpen(false);
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push("/auth");
    router.refresh();
  }

  const navLinks = useMemo(
    () =>
      links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            style={{
              textDecoration: "none",
              padding: isMobile ? "14px 16px" : "10px 14px",
              borderRadius: 999,
              fontWeight: 800,
              fontSize: isMobile ? 15 : 14,
              background: active
                ? "linear-gradient(135deg,#60a5fa,#2563eb)"
                : "rgba(255,255,255,0.07)",
              color: "white",
              border: active
                ? "1px solid rgba(255,255,255,0.18)"
                : "1px solid rgba(255,255,255,0.06)",
              boxShadow: active
                ? "0 10px 24px rgba(37,99,235,0.28)"
                : "none",
              flexShrink: 0,
              textAlign: "center" as const,
            }}
            onClick={() => setMenuOpen(false)}
          >
            {link.label}
          </Link>
        );
      }),
    [pathname, isMobile]
  );

  function renderAuthArea() {
    if (loading) {
      return (
        <div
          style={{
            padding: isMobile ? "14px 16px" : "10px 14px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.07)",
            color: "rgba(255,255,255,0.75)",
            fontWeight: 700,
            fontSize: 13,
            textAlign: "center",
          }}
        >
          Loading...
        </div>
      );
    }

    if (email) {
      return (
        <>
          <div
            style={{
              padding: isMobile ? "14px 16px" : "10px 14px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.07)",
              color: "white",
              fontWeight: 700,
              fontSize: 13,
              maxWidth: isMobile ? "100%" : 220,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textAlign: "center",
            }}
            title={email}
          >
            {email}
          </div>

          <button
            onClick={handleLogout}
            style={{
              padding: isMobile ? "14px 16px" : "10px 14px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.08)",
              color: "white",
              fontWeight: 800,
              cursor: "pointer",
              width: isMobile ? "100%" : "auto",
            }}
          >
            Log Out
          </button>
        </>
      );
    }

    return (
      <Link
        href="/auth"
        style={{
          textDecoration: "none",
          padding: isMobile ? "14px 16px" : "10px 16px",
          borderRadius: 999,
          fontWeight: 900,
          fontSize: 14,
          background: "linear-gradient(135deg,#f59e0b,#f97316)",
          color: "white",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 10px 24px rgba(249,115,22,0.28)",
          textAlign: "center" as const,
        }}
        onClick={() => setMenuOpen(false)}
      >
        Sign In
      </Link>
    );
  }

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        backdropFilter: "blur(18px)",
        background: "rgba(2, 6, 23, 0.88)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 12px 32px rgba(0,0,0,0.22)",
      }}
    >
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "14px 20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
          }}
        >
          <Link
            href="/"
            style={{
              textDecoration: "none",
              color: "white",
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexShrink: 0,
              minWidth: "fit-content",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg,#60a5fa,#2563eb)",
                boxShadow: "0 10px 24px rgba(37,99,235,0.35)",
                fontSize: 20,
              }}
            >
              ✨
            </div>
            <div>
              <div
                style={{
                  fontSize: isMobile ? 20 : 24,
                  fontWeight: 900,
                  letterSpacing: 0.2,
                }}
              >
                Doorables Finder
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.68)" }}>
                collect • browse • sell
              </div>
            </div>
          </Link>

          {isMobile ? (
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              style={{
                padding: "10px 14px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.08)",
                color: "white",
                fontWeight: 900,
                fontSize: 18,
                cursor: "pointer",
              }}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          ) : (
            <>
              <nav
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flex: 1,
                  justifyContent: "center",
                  overflowX: "auto",
                  overflowY: "hidden",
                  whiteSpace: "nowrap",
                }}
              >
                {navLinks}
              </nav>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexShrink: 0,
                  minWidth: "fit-content",
                }}
              >
                {renderAuthArea()}
              </div>
            </>
          )}
        </div>

        {isMobile && menuOpen ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gap: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              padding: 14,
            }}
          >
            {navLinks}
            <div
              style={{
                marginTop: 4,
                display: "grid",
                gap: 10,
              }}
            >
              {renderAuthArea()}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
