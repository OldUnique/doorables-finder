"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabase } from "../lib/supabase";

type HeaderLink = {
  href: string;
  icon: string;
  label: string;
  shortLabel?: string;
};

const links: HeaderLink[] = [
  { href: "/", icon: "🏠", label: "Home" },
  { href: "/about", icon: "💜", label: "About" },
  { href: "/collection", icon: "🧸", label: "Collection" },
  { href: "/sell", icon: "🏷️", label: "Sell" },
  { href: "/marketplace", icon: "🛍️", label: "Marketplace", shortLabel: "Market" },
  { href: "/messages", icon: "💬", label: "Messages" },
  { href: "/pricing", icon: "👑", label: "Subscription", shortLabel: "Plans" },
  { href: "/feedback", icon: "💙", label: "Feedback" },
];

function isActivePath(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => getSupabase(), []);

  const [email, setEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    let active = true;

    async function safeLoadUnreadCount(userId: string) {
      try {
        await loadUnreadCount(userId);
      } catch {
        if (active) setUnreadCount(0);
      }
    }

    async function refreshUnread() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!active) return;

        if (session?.user?.id) {
          void safeLoadUnreadCount(session.user.id);
        } else {
          setUnreadCount(0);
        }
      } catch {
        if (active) setUnreadCount(0);
      }
    }

    async function loadUser() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!active) return;

        setEmail(session?.user?.email ?? null);
        setAuthChecked(true);

        if (session?.user?.id) {
          void safeLoadUnreadCount(session.user.id);
        } else {
          setUnreadCount(0);
        }
      } catch {
        if (!active) return;
        setEmail(null);
        setAuthChecked(true);
        setUnreadCount(0);
      }
    }

    void loadUser();

    const authSub = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      setEmail(session?.user?.email ?? null);
      setAuthChecked(true);

      if (session?.user?.id) {
        void safeLoadUnreadCount(session.user.id);
      } else {
        setUnreadCount(0);
      }
    });

    const channel = supabase
      .channel("header-unread-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marketplace_messages" },
        () => {
          void refreshUnread();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marketplace_conversations" },
        () => {
          void refreshUnread();
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

    const conversationIds = conversations.map((conversation: { id: string }) => conversation.id);

    const { data: messages, error: msgError } = await supabase
      .from("marketplace_messages")
      .select("id")
      .in("conversation_id", conversationIds)
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
    setEmail(null);
    setUnreadCount(0);
    router.push("/login");
  }

  function renderNavLink(link: HeaderLink, mobile = false) {
    const active = isActivePath(pathname, link.href);
    const label = mobile && link.shortLabel ? link.shortLabel : link.label;
    const isMessages = link.href === "/messages";

    return (
      <Link
        key={`${mobile ? "mobile" : "desktop"}-${link.href}`}
        href={link.href}
        onClick={() => setMenuOpen(false)}
        className={active ? "navBubble navBubbleActive" : "navBubble"}
        aria-current={active ? "page" : undefined}
      >
        <span className="navBubbleIcon" aria-hidden="true">
          {link.icon}
        </span>
        <span className="navBubbleLabel">{label}</span>
        {isMessages && unreadCount > 0 ? (
          <span className="unreadBadge" title={`${unreadCount} unread`}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Link>
    );
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

          <div className="brandText">
            <div className="brandTitle">Adorable Vault</div>
            <div className="brandTagline">track • trade • showcase</div>
          </div>
        </Link>

        <nav className="desktopNav" aria-label="Main navigation">
          {links.map((link) => renderNavLink(link))}
        </nav>

        <div className="desktopAccountArea">
          {!authChecked ? (
            <span className="accountPlaceholder" aria-hidden="true" />
          ) : email ? (
            <>
              <span className="emailBubble" title={email}>
                {email}
              </span>
              <button type="button" onClick={() => void handleLogout()} className="accountButton">
                Log Out
              </button>
            </>
          ) : (
            <Link href="/login" className="accountButton">
              Log In
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="mobileMenuToggle"
          aria-expanded={menuOpen}
          aria-controls="mobile-header-panel"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          <span>{menuOpen ? "Close" : "Menu"}</span>
          <span aria-hidden="true">{menuOpen ? "✕" : "☰"}</span>
        </button>

        <div
          id="mobile-header-panel"
          className={menuOpen ? "mobilePanel mobilePanelOpen" : "mobilePanel"}
        >
          <div className="mobilePanelHeader">
            <div className="mobilePanelIntro">
              <div className="mobilePanelTitle">Where to next?</div>
              <div className="mobilePanelSubtitle">Quick links for your vault.</div>
            </div>

            {authChecked && email ? (
              <button type="button" onClick={() => void handleLogout()} className="mobileAccountButton">
                Log Out
              </button>
            ) : (
              <Link href="/login" onClick={() => setMenuOpen(false)} className="mobileAccountButton">
                Log In
              </Link>
            )}
          </div>

          {authChecked && email ? (
            <div className="mobileSignedInBubble" title={email}>
              Signed in as {email}
            </div>
          ) : null}

          <nav className="mobileNav" aria-label="Mobile navigation">
            {links.map((link) => renderNavLink(link, true))}
          </nav>
        </div>
      </div>

      <style jsx>{`
        .appHeader {
          position: sticky;
          top: 0;
          z-index: 50;
          backdrop-filter: blur(16px);
          background:
            radial-gradient(circle at 12% 0%, rgba(236, 72, 153, 0.2), transparent 28%),
            radial-gradient(circle at 88% 0%, rgba(59, 130, 246, 0.2), transparent 28%),
            linear-gradient(135deg, rgba(8, 11, 24, 0.96), rgba(32, 17, 68, 0.94), rgba(30, 41, 99, 0.94));
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22);
        }

        .headerShell {
          max-width: 1380px;
          margin: 0 auto;
          padding: 12px 18px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 14px;
        }

        .brandLink {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          color: white;
          text-decoration: none;
          min-width: 0;
        }

        .brandText {
          min-width: 0;
        }

        .brandLogo {
          width: 46px;
          height: 46px;
          border-radius: 16px;
          position: relative;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.36), transparent 26%),
            linear-gradient(135deg, #7c3aed, #2563eb);
          box-shadow:
            0 12px 24px rgba(79, 70, 229, 0.3),
            inset 0 0 0 1px rgba(255, 255, 255, 0.22);
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
          border: 2px solid rgba(92, 45, 9, 0.55);
          box-shadow: inset 0 4px 6px rgba(255, 255, 255, 0.28);
        }

        .chestBody {
          position: absolute;
          bottom: 9px;
          width: 35px;
          height: 25px;
          border-radius: 7px 7px 11px 11px;
          background: linear-gradient(135deg, #92400e, #f59e0b 52%, #7c2d12);
          border: 2px solid rgba(92, 45, 9, 0.62);
          display: grid;
          place-items: center;
          box-shadow: inset 0 6px 8px rgba(255, 255, 255, 0.2);
        }

        .heartLock {
          font-size: 15px;
          filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.25));
          transform: translateY(1px);
        }

        .chestGlow {
          position: absolute;
          inset: -16px;
          background: conic-gradient(from 90deg, transparent, rgba(255, 255, 255, 0.35), transparent);
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
          white-space: nowrap;
        }

        .brandTagline {
          margin-top: 2px;
          font-size: 12px;
          font-weight: 850;
          color: #d8b4fe;
          letter-spacing: 0.2px;
          white-space: nowrap;
          opacity: 0.92;
        }

        .desktopNav {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .navBubble {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 44px;
          padding: 10px 14px;
          border-radius: 999px;
          color: #ffffff;
          text-decoration: none;
          font-size: 14px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: 0.1px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.08));
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            0 8px 18px rgba(0, 0, 0, 0.12);
          transition: transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
          white-space: nowrap;
        }

        .navBubble:hover {
          transform: translateY(-1px);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1));
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            0 10px 20px rgba(0, 0, 0, 0.15);
        }

        .navBubbleActive {
          background: linear-gradient(135deg, rgba(236, 72, 153, 0.95), rgba(124, 58, 237, 0.95), rgba(59, 130, 246, 0.95));
          border-color: rgba(255, 255, 255, 0.26);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            0 12px 24px rgba(124, 58, 237, 0.28);
        }

        .navBubbleIcon {
          width: 28px;
          height: 28px;
          min-width: 28px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.12);
          font-size: 14px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
        }

        .navBubbleLabel {
          color: #ffffff;
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
          box-shadow: 0 0 0 2px rgba(10, 14, 30, 0.88);
        }

        .desktopAccountArea {
          display: inline-flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          min-width: 0;
        }

        .emailBubble {
          max-width: 230px;
          min-height: 42px;
          padding: 10px 14px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.08));
          border: 1px solid rgba(255, 255, 255, 0.16);
          color: #f9fafb;
          font-size: 13px;
          font-weight: 800;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .accountButton,
        .mobileAccountButton {
          min-height: 42px;
          padding: 10px 16px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.08));
          color: white;
          text-decoration: none;
          font-size: 14px;
          font-weight: 950;
          font-family: inherit;
          cursor: pointer;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            0 8px 18px rgba(0, 0, 0, 0.12);
        }

        .accountPlaceholder {
          width: 84px;
          min-height: 42px;
          opacity: 0;
          pointer-events: none;
        }

        .mobileMenuToggle {
          display: none;
          min-height: 42px;
          padding: 10px 14px;
          border-radius: 999px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.08));
          color: #ffffff;
          font-size: 14px;
          font-weight: 950;
          font-family: inherit;
          cursor: pointer;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            0 8px 18px rgba(0, 0, 0, 0.12);
        }

        .mobilePanel {
          display: none;
        }

        @media (max-width: 1320px) {
          .emailBubble {
            display: none;
          }

          .navBubble {
            padding: 10px 12px;
          }
        }

        @media (max-width: 1140px) {
          .headerShell {
            grid-template-columns: auto auto;
            justify-content: space-between;
          }

          .desktopNav,
          .desktopAccountArea {
            display: none;
          }

          .mobileMenuToggle {
            display: inline-flex;
          }

          .mobilePanel {
            grid-column: 1 / -1;
            width: 100%;
            display: none;
            gap: 12px;
            padding: 14px;
            border-radius: 24px;
            background:
              radial-gradient(circle at top right, rgba(147, 197, 253, 0.16), transparent 34%),
              linear-gradient(135deg, rgba(30, 27, 75, 0.94), rgba(49, 46, 129, 0.9));
            border: 1px solid rgba(255, 255, 255, 0.15);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.12),
              0 14px 30px rgba(0, 0, 0, 0.24);
          }

          .mobilePanelOpen {
            display: grid;
          }

          .mobilePanelHeader {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
          }

          .mobilePanelIntro {
            min-width: 0;
          }

          .mobilePanelTitle {
            color: white;
            font-size: 17px;
            font-weight: 1000;
          }

          .mobilePanelSubtitle {
            margin-top: 2px;
            color: rgba(255, 255, 255, 0.72);
            font-size: 12px;
            font-weight: 800;
          }

          .mobileSignedInBubble {
            min-height: 44px;
            padding: 10px 14px;
            border-radius: 999px;
            display: flex;
            align-items: center;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.08));
            border: 1px solid rgba(255, 255, 255, 0.16);
            color: #f3f4f6;
            font-size: 13px;
            font-weight: 850;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .mobileNav {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .mobileNav .navBubble {
            width: 100%;
            min-height: 58px;
            justify-content: flex-start;
            padding: 12px 14px;
            border-radius: 20px;
            white-space: nowrap;
          }

          .mobileNav .navBubbleIcon {
            width: 34px;
            height: 34px;
            min-width: 34px;
            font-size: 17px;
          }

          .mobileNav .navBubbleLabel {
            font-size: 15px;
          }
        }

        @media (max-width: 560px) {
          .headerShell {
            padding: 12px 14px;
          }

          .brandLogo {
            width: 42px;
            height: 42px;
            border-radius: 14px;
          }

          .brandTitle {
            font-size: 18px;
          }

          .brandTagline {
            display: none;
          }

          .mobilePanelHeader {
            flex-direction: column;
            align-items: stretch;
          }

          .mobileAccountButton {
            width: 100%;
          }

          .mobileNav {
            grid-template-columns: 1fr;
          }

          .mobileNav .navBubble {
            min-height: 54px;
          }
        }

        @media (max-width: 360px) {
          .brandTitle {
            font-size: 16px;
          }

          .mobileMenuToggle span:first-child {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}
