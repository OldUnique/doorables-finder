"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabase } from "../lib/supabase";

const links = [
  { href: "/", label: "🏠 Home" },
  { href: "/about", label: "About" },
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
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    let active = true;

    async function refreshUnread() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (user?.id) {
        await loadUnreadCount(user.id);
      } else {
        setUnreadCount(0);
      }
    }

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
          await refreshUnread();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marketplace_conversations" },
        async () => {
          await refreshUnread();
        }
      )
      .subscribe();

    function handleUnreadRefreshEvent() {
      void refreshUnread();
    }

    if (typeof window !== "undefined") {
      window.addEventListener("messages-read-updated", handleUnreadRefreshEvent);
    }

    return () => {
      active = false;
      authSub.data.subscription.unsubscribe();
      void supabase.removeChannel(channel);

      if (typeof window !== "undefined") {
        window.removeEventListener("messages-read-updated", handleUnreadRefreshEvent);
      }
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
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="appHeader">
      <div className="headerShell">
        <Link href="/" className="brandLink" onClick={() => setMenuOpen(false)}>
          <div className="brandLogo" aria-hidden="true">
            <div className="chestTop" />
            <div className="chestBody">
              <span className="heartLock">💜</span>
            </div>
            <div className="chestGlow" />
          </div>

          <div>
            <div className="brandTitle">Adorable Vault</div>
            <div className="brandTagline">track • trade • showcase</div>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="mobileMenuToggle"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          <span>{menuOpen ? "Close" : "Menu"}</span>
          <span aria-hidden="true">{menuOpen ? "✕" : "☰"}</span>
        </button>

        <nav className={menuOpen ? "navOpen" : ""}>
          {links.map((link) => {
            const active =
              pathname === link.href ||
              (link.href !== "/" && pathname?.startsWith(link.href + "/"));
            const isMessages = link.href === "/messages";

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={active ? "navLink navLinkActive" : "navLink"}
              >
                {link.label}

                {isMessages && unreadCount > 0 && (
                  <span title={`${unreadCount} unread`} className="unreadBadge">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="accountArea">
          {loading ? (
            <span className="loadingText">Loading...</span>
          ) : email ? (
            <>
              <span className="emailText">{email}</span>
              <button type="button" onClick={() => void handleLogout()} className="accountButton">
                Log Out
              </button>
            </>
          ) : (
            <Link href="/login" onClick={() => setMenuOpen(false)} className="accountButton">
              Log In
            </Link>
          )}
        </div>
      </div>

      <style jsx>{`
        .appHeader {
          position: sticky;
          top: 0;
          z-index: 40;
          backdrop-filter: blur(16px);
          background:
            radial-gradient(circle at 12% 0%, rgba(236,72,153,0.20), transparent 26%),
            radial-gradient(circle at 82% 0%, rgba(59,130,246,0.18), transparent 26%),
            linear-gradient(135deg, rgba(8,11,24,0.94), rgba(32,17,68,0.90), rgba(30,41,99,0.90));
          border-bottom: 1px solid rgba(255,255,255,0.10);
          box-shadow: 0 12px 28px rgba(0,0,0,0.25);
        }

        .headerShell {
          max-width: 1320px;
          margin: 0 auto;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
        }

        .brandLink {
          display: flex;
          align-items: center;
          gap: 13px;
          color: white;
          text-decoration: none;
          font-weight: 900;
          min-width: 220px;
        }

        .brandLogo {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          position: relative;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 30% 20%, rgba(255,255,255,0.36), transparent 26%),
            linear-gradient(135deg, #7c3aed, #2563eb);
          box-shadow:
            0 12px 24px rgba(79,70,229,0.30),
            inset 0 0 0 1px rgba(255,255,255,0.22);
          overflow: hidden;
          flex: 0 0 auto;
        }

        .chestTop {
          position: absolute;
          top: 9px;
          width: 31px;
          height: 16px;
          border-radius: 12px 12px 4px 4px;
          background: linear-gradient(135deg, #fbbf24, #f97316);
          border: 2px solid rgba(92,45,9,0.55);
          box-shadow: inset 0 4px 6px rgba(255,255,255,0.28);
        }

        .chestBody {
          position: absolute;
          bottom: 9px;
          width: 35px;
          height: 25px;
          border-radius: 7px 7px 11px 11px;
          background: linear-gradient(135deg, #92400e, #f59e0b 52%, #7c2d12);
          border: 2px solid rgba(92,45,9,0.62);
          display: grid;
          place-items: center;
          box-shadow: inset 0 6px 8px rgba(255,255,255,0.20);
        }

        .heartLock {
          font-size: 15px;
          filter: drop-shadow(0 2px 2px rgba(0,0,0,0.25));
          transform: translateY(1px);
        }

        .chestGlow {
          position: absolute;
          inset: -16px;
          background: conic-gradient(from 90deg, transparent, rgba(255,255,255,0.35), transparent);
          opacity: 0.22;
        }

        .brandTitle {
          font-size: 22px;
          line-height: 1.05;
          font-weight: 1000;
          letter-spacing: -0.4px;
          background: linear-gradient(90deg, #fde68a, #f9a8d4, #93c5fd);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .brandTagline {
          font-size: 12px;
          opacity: 0.88;
          font-weight: 800;
          color: #d8b4fe;
          letter-spacing: 0.2px;
        }

        .mobileMenuToggle {
          display: none;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 44px;
          padding: 10px 13px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.09);
          color: white;
          font-weight: 900;
          cursor: pointer;
        }

        nav {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .navLink {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 15px;
          border-radius: 16px;
          color: white;
          text-decoration: none;
          font-weight: 850;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
          white-space: nowrap;
        }

        .navLink:hover {
          transform: translateY(-1px);
          background: rgba(255,255,255,0.10);
        }

        .navLinkActive {
          background: linear-gradient(135deg, rgba(236,72,153,0.92), rgba(124,58,237,0.95), rgba(59,130,246,0.92));
          border: 1px solid rgba(255,255,255,0.22);
          box-shadow: 0 10px 22px rgba(124,58,237,0.28);
        }

        .unreadBadge {
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 999px;
          background: #ef4444;
          color: white;
          font-size: 11px;
          font-weight: 1000;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 2px rgba(10,14,30,0.88);
        }

        .accountArea {
          display: flex;
          align-items: center;
          gap: 10px;
          color: white;
          font-size: 14px;
          font-weight: 800;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .loadingText {
          opacity: 0.84;
        }

        .emailText {
          opacity: 0.86;
          max-width: 220px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #f9fafb;
        }

        .accountButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 10px 14px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.12);
          background: linear-gradient(135deg, rgba(255,255,255,0.11), rgba(255,255,255,0.05));
          color: white;
          font-weight: 900;
          cursor: pointer;
          text-decoration: none;
        }

        @media (max-width: 1100px) {
          .brandLink {
            min-width: auto;
          }

          .navLink {
            padding: 11px 13px;
          }
        }

        @media (max-width: 920px) {
          .headerShell {
            padding: 12px 14px;
          }

          .brandLogo {
            width: 44px;
            height: 44px;
            border-radius: 15px;
          }

          .brandTitle {
            font-size: 20px;
          }

          .mobileMenuToggle {
            display: inline-flex;
            margin-left: auto;
          }

          nav {
            width: 100%;
            display: none !important;
            flex-direction: column;
            align-items: stretch !important;
            order: 3;
            padding: 8px;
            border-radius: 20px;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.08);
          }

          nav.navOpen {
            display: flex !important;
          }

          .navLink {
            width: 100%;
            min-height: 48px;
            box-sizing: border-box;
          }

          .accountArea {
            width: 100%;
            order: 4;
            justify-content: space-between;
            padding-top: 2px;
          }

          .emailText {
            max-width: calc(100vw - 145px);
          }
        }

        @media (max-width: 420px) {
          .brandTagline {
            display: none;
          }

          .brandTitle {
            font-size: 18px;
          }

          .accountArea {
            font-size: 12px;
          }
        }
      `}</style>
    </header>
  );
}
