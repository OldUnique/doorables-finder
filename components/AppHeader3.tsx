"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabase } from "../lib/supabase";

const links = [
  { href: "/", label: "🏠 Home" },
  { href: "/app", label: "Collection" },
  { href: "/sell", label: "Sell" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/messages", label: "Messages" },
  { href: "/pricing", label: "Subscription" },
  { href: "/feedback", label: "💙 Feedback" },
];

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => getSupabase(), []);

  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      setEmail(user?.email ?? null);
      setLoading(false);

      if (user?.id) {
        await loadUnreadCount(user.id);
      } else {
        setUnreadCount(0);
      }
    }

    void loadUser();

    const authSub = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      setLoading(false);

      if (session?.user?.id) {
        void loadUnreadCount(session.user.id);
      } else {
        setUnreadCount(0);
      }
    });

    const channel = supabase
      .channel("header-unread-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marketplace_messages" },
        async () => {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user?.id) await loadUnreadCount(user.id);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marketplace_conversations" },
        async () => {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user?.id) await loadUnreadCount(user.id);
        }
      )
      .subscribe();

    return () => {
      active = false;
      authSub.data.subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  async function loadUnreadCount(userId: string) {
    const { data: conversations, error: convoError } = await supabase
      .from("marketplace_conversations")
      .select("id")
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

    if (convoError || !conversations?.length) {
      setUnreadCount(0);
      return;
    }

    const ids = conversations.map((c: any) => c.id);
    const { data: messages, error: msgError } = await supabase
      .from("marketplace_messages")
      .select("id")
      .in("conversation_id", ids)
      .neq("sender_id", userId)
      .is("read_at", null);

    if (msgError) {
      setUnreadCount(0);
      return;
    }

    setUnreadCount(messages?.length ?? 0);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        backdropFilter: "blur(10px)",
        background: "rgba(10, 14, 30, 0.88)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "white",
            textDecoration: "none",
            fontWeight: 900,
            fontSize: 18,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg, #2563eb, #7c3aed)",
              boxShadow: "0 10px 24px rgba(37,99,235,0.35)",
              fontSize: 18,
            }}
          >
            ✨
          </div>
          <div>
            <div style={{ fontSize: 20, lineHeight: 1.1 }}>Doorables Finder</div>
            <div style={{ fontSize: 12, opacity: 0.72, fontWeight: 700 }}>
              collect • browse • sell
            </div>
          </div>
        </Link>

        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          style={{
            display: "none",
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            fontWeight: 800,
            cursor: "pointer",
          }}
          className="mobileMenuToggle"
        >
          Menu
        </button>

        <nav
          className={menuOpen ? "navOpen" : ""}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {links.map((link) => {
            const active = pathname === link.href;
            const isMessages = link.href === "/messages";

            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  position: "relative",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px 16px",
                  borderRadius: 16,
                  color: "white",
                  textDecoration: "none",
                  fontWeight: 800,
                  background: active
                    ? "linear-gradient(135deg, rgba(37,99,235,0.95), rgba(124,58,237,0.95))"
                    : "rgba(255,255,255,0.06)",
                  border: active
                    ? "1px solid rgba(255,255,255,0.22)"
                    : "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {link.label}
                {isMessages && unreadCount > 0 && (
                  <span
                    title={`${unreadCount} unread`}
                    style={{
                      minWidth: 18,
                      height: 18,
                      padding: "0 5px",
                      borderRadius: 999,
                      background: "#ef4444",
                      color: "white",
                      fontSize: 11,
                      fontWeight: 900,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 0 0 2px rgba(10,14,30,0.88)",
                    }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "white",
            fontSize: 14,
            fontWeight: 700,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          {loading ? (
            <span style={{ opacity: 0.84 }}>Loading...</span>
          ) : email ? (
            <>
              <span
                style={{
                  opacity: 0.84,
                  maxWidth: 220,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {email}
              </span>
              <button
                onClick={() => void handleLogout()}
                style={{
                  padding: "10px 14px",
                  borderRadius: 14,
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
              href="/login"
              style={{
                padding: "10px 14px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.08)",
                color: "white",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              Log In
            </Link>
          )}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 920px) {
          .mobileMenuToggle {
            display: inline-flex !important;
          }

          nav {
            width: 100%;
            display: none !important;
            flex-direction: column;
            align-items: stretch !important;
            order: 3;
          }

          nav.navOpen {
            display: flex !important;
          }
        }
      `}</style>
    </header>
  );
}
