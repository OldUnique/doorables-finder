"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          flexWrap: "nowrap",
          overflow: "hidden",
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
            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 0.2 }}>
              Doorables Finder
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.68)" }}>
              collect • browse • sell
            </div>
          </div>
        </Link>

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
          {links.map((link) => {
            const active = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  textDecoration: "none",
                  padding: "10px 14px",
                  borderRadius: 999,
                  fontWeight: 800,
                  fontSize: 14,
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
                }}
              >
                {link.label}
              </Link>
            );
          })}
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
          {loading ? (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.75)",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              Loading...
            </div>
          ) : email ? (
            <>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.07)",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 13,
                  maxWidth: 220,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={email}
              >
                {email}
              </div>

              <button
                onClick={handleLogout}
                style={{
                  padding: "10px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.08)",
                  color: "white",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Log Out
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              style={{
                textDecoration: "none",
                padding: "10px 16px",
                borderRadius: 999,
                fontWeight: 900,
                fontSize: 14,
                background: "linear-gradient(135deg,#f59e0b,#f97316)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 10px 24px rgba(249,115,22,0.28)",
              }}
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

On Mon, Apr 13, 2026, 6:41 PM Josh Riffel <riffeljosh80@gmail.com> wrote:
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          flexWrap: "nowrap",
          overflow: "hidden",
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
            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 0.2 }}>
              Doorables Finder
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.68)" }}>
              collect • browse • sell
            </div>
          </div>
        </Link>

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
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  textDecoration: "none",
                  padding: "10px 14px",
                  borderRadius: 999,
                  fontWeight: 800,
                  fontSize: 14,
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
                }}
              >
                {link.label}
              </Link>
            );
          })}
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
          {loading ? (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.75)",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              Loading...
            </div>
          ) : email ? (
            <>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.07)",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 13,
                  maxWidth: 220,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={email}
              >
                {email}
              </div>
              <button
                onClick={handleLogout}
                style={{
                  padding: "10px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.08)",
                  color: "white",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Log Out
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              style={{
                textDecoration: "none",
                padding: "10px 16px",
                borderRadius: 999,
                fontWeight: 900,
                fontSize: 14,
                background: "linear-gradient(135deg,#f59e0b,#f97316)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 10px 24px rgba(249,115,22,0.28)",
              }}
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}