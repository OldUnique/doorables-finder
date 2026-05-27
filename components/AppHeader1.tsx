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
    if (typeof document === "undefined") return;

    const originalOverflow = document.body.style.overflow;

    if (menuOpen) {
      document.body.style.overflow = "hidden";
      document.body.classList.add("av-menu-open");
    } else {
      document.body.classList.remove("av-menu-open");
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.classList.remove("av-menu-open");
    };
  }, [menuOpen]);

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
        className={active ? "avNavBubble avNavBubbleActive" : "avNavBubble"}
        aria-current={active ? "page" : undefined}
      >
        <span className="avNavIcon" aria-hidden="true">
          {link.icon}
        </span>

        <span className="avNavLabel">{label}</span>

        {mobile && (
          <span className="avNavArrow" aria-hidden="true">
            ›
          </span>
        )}

        {isMessages && unreadCount > 0 && (
          <span className="avUnreadBadge" title={`${unreadCount} unread`}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>
    );
  }

  return (
    <header className="adorableHeader">
      {menuOpen && (
        <button
          type="button"
          className="avMobileBackdrop"
          aria-label="Close navigation menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div className="avHeaderShell">
        <Link href="/" className="avBrandLink" onClick={() => setMenuOpen(false)}>
          <div className="avBrandLogo" aria-hidden="true">
            <div className="avChestTop" />
            <div className="avChestBody">
              <span className="avHeartLock">💜</span>
            </div>
            <div className="avChestGlow" />
          </div>

          <div className="avBrandText">
            <div className="avBrandTitle">Adorable Vault</div>
            <div className="avBrandTagline">track • trade • showcase</div>
          </div>
        </Link>

        <nav className="avDesktopNav" aria-label="Main navigation">
          {links.map((link) => renderNavLink(link))}
        </nav>

        <div className="avDesktopAccount">
          {!authChecked ? (
            <span className="avAccountPlaceholder" aria-hidden="true" />
          ) : email ? (
            <>
              <span className="avEmailBubble" title={email}>
                {email}
              </span>

              <button type="button" onClick={() => void handleLogout()} className="avAccountButton">
                Log Out
              </button>
            </>
          ) : (
            <Link href="/login" className="avAccountButton">
              Log In
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="avMobileMenuButton"
          aria-expanded={menuOpen}
          aria-controls="mobile-header-panel"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          <span>{menuOpen ? "Close" : "Menu"}</span>
          <span aria-hidden="true">{menuOpen ? "✕" : "☰"}</span>
        </button>

        <div
          id="mobile-header-panel"
          className={menuOpen ? "avMobilePanel avMobilePanelOpen" : "avMobilePanel"}
        >
          <div className="avMobilePanelHeader">
            <div>
              <div className="avMobileTitle">Where to next?</div>
              <div className="avMobileSubtitle">Quick links for your vault.</div>
            </div>

            {authChecked && email ? (
              <button type="button" onClick={() => void handleLogout()} className="avMobileAccountButton">
                Log Out
              </button>
            ) : (
              <Link href="/login" onClick={() => setMenuOpen(false)} className="avMobileAccountButton">
                Log In
              </Link>
            )}
          </div>

          {authChecked && email && (
            <div className="avMobileEmailBubble" title={email}>
              Signed in as {email}
            </div>
          )}

          <nav className="avMobileNav" aria-label="Mobile navigation">
            {links.map((link) => renderNavLink(link, true))}
          </nav>
        </div>
      </div>

      <style jsx global>{`
        .adorableHeader {
          position: sticky;
          top: 0;
          z-index: 999999;
          isolation: isolate;
          overflow: visible !important;
          backdrop-filter: blur(18px);
          background:
            radial-gradient(circle at 10% 0%, rgba(236, 72, 153, 0.2), transparent 26%),
            radial-gradient(circle at 90% 0%, rgba(59, 130, 246, 0.2), transparent 26%),
            linear-gradient(135deg, rgba(8, 11, 24, 0.98), rgba(32, 17, 68, 0.95), rgba(30, 41, 99, 0.95));
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.24);
        }

        .adorableHeader * {
          box-sizing: border-box;
        }

        .adorableHeader a {
          color: inherit;
          text-decoration: none !important;
        }

        .avHeaderShell {
          max-width: 1380px;
          margin: 0 auto;
          padding: 12px 18px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 14px;
          position: relative;
          z-index: 3;
        }

        .avBrandLink {
          display: inline-flex !important;
          align-items: center;
          gap: 12px;
          color: #ffffff !important;
          min-width: 0;
        }

        .avBrandLogo {
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

        .avChestTop {
          position: absolute;
          top: 9px;
          width: 31px;
          height: 16px;
          border-radius: 12px 12px 4px 4px;
          background: linear-gradient(135deg, #fbbf24, #f97316);
          border: 2px solid rgba(92, 45, 9, 0.55);
          box-shadow: inset 0 4px 6px rgba(255, 255, 255, 0.28);
        }

        .avChestBody {
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

        .avHeartLock {
          font-size: 15px;
          filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.25));
          transform: translateY(1px);
        }

        .avChestGlow {
          position: absolute;
          inset: -16px;
          background: conic-gradient(from 90deg, transparent, rgba(255, 255, 255, 0.35), transparent);
          opacity: 0.22;
        }

        .avBrandText {
          min-width: 0;
        }

        .avBrandTitle {
          font-size: 22px;
          line-height: 1.05;
          font-weight: 1000;
          letter-spacing: -0.4px;
          background: linear-gradient(90deg, #fde68a, #f9a8d4, #93c5fd);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          white-space: nowrap;
        }

        .avBrandTagline {
          margin-top: 2px;
          font-size: 12px;
          font-weight: 850;
          color: #d8b4fe;
          letter-spacing: 0.2px;
          white-space: nowrap;
          opacity: 0.92;
        }

        .avDesktopNav {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .avNavBubble {
          position: relative;
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 46px;
          padding: 10px 15px;
          border-radius: 18px;
          color: #ffffff !important;
          font-size: 14px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: 0.1px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.09));
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.13),
            0 8px 18px rgba(0, 0, 0, 0.14);
          transition: transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
          white-space: nowrap;
          overflow: hidden;
        }

        .avNavBubble:hover {
          transform: translateY(-1px);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0.12));
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.15),
            0 10px 22px rgba(0, 0, 0, 0.18);
        }

        .avNavBubbleActive {
          background: linear-gradient(135deg, rgba(236, 72, 153, 0.98), rgba(124, 58, 237, 0.96), rgba(59, 130, 246, 0.96));
          border-color: rgba(255, 255, 255, 0.32);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.15),
            0 12px 24px rgba(124, 58, 237, 0.32);
        }

        .avNavIcon {
          width: 28px;
          height: 28px;
          min-width: 28px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.14);
          font-size: 14px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
        }

        .avNavLabel {
          color: #ffffff !important;
          text-decoration: none !important;
        }

        .avNavArrow {
          margin-left: auto;
          color: rgba(255, 255, 255, 0.86);
          font-size: 28px;
          line-height: 1;
          font-weight: 500;
        }

        .avUnreadBadge {
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

        .avDesktopAccount {
          display: inline-flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          min-width: 0;
        }

        .avEmailBubble {
          max-width: 230px;
          min-height: 42px;
          padding: 10px 14px;
          border-radius: 18px;
          display: inline-flex;
          align-items: center;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.08));
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #f9fafb;
          font-size: 13px;
          font-weight: 800;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .avAccountButton,
        .avMobileAccountButton {
          min-height: 42px;
          padding: 10px 16px;
          border-radius: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.09));
          color: white !important;
          font-size: 14px;
          font-weight: 950;
          font-family: inherit;
          cursor: pointer;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            0 8px 18px rgba(0, 0, 0, 0.14);
        }

        .avAccountPlaceholder {
          width: 84px;
          min-height: 42px;
          opacity: 0;
          pointer-events: none;
        }

        .avMobileMenuButton {
          display: none;
          min-height: 42px;
          padding: 10px 14px;
          border-radius: 18px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.09));
          color: #ffffff;
          font-size: 14px;
          font-weight: 950;
          font-family: inherit;
          cursor: pointer;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            0 8px 18px rgba(0, 0, 0, 0.14);
        }

        .avMobileBackdrop,
        .avMobilePanel {
          display: none;
        }

        @media (max-width: 1320px) {
          .avEmailBubble {
            display: none;
          }

          .avNavBubble {
            padding: 10px 13px;
          }
        }

        @media (max-width: 1140px) {
          .avHeaderShell {
            grid-template-columns: auto auto;
            justify-content: space-between;
          }

          .avDesktopNav,
          .avDesktopAccount {
            display: none;
          }

          .avMobileMenuButton {
            display: inline-flex;
          }

          .avMobileBackdrop {
            position: fixed;
            inset: 0;
            z-index: 1;
            display: block;
            width: 100vw;
            height: 100dvh;
            padding: 0;
            border: none;
            background:
              radial-gradient(circle at 15% 12%, rgba(168, 85, 247, 0.26), transparent 34%),
              rgba(2, 6, 23, 0.78);
            backdrop-filter: blur(8px);
            cursor: pointer;
          }

          .avMobilePanel {
            position: absolute;
            left: 10px;
            right: 10px;
            top: calc(100% + 10px);
            z-index: 4;
            display: none;
            grid-auto-rows: max-content;
            gap: 8px;
            padding: 12px;
            border-radius: 24px;
            max-height: calc(100dvh - 96px);
            overflow-y: auto;
            overscroll-behavior: contain;
            scrollbar-width: thin;
            background:
              radial-gradient(circle at top right, rgba(147, 197, 253, 0.2), transparent 34%),
              radial-gradient(circle at bottom left, rgba(236, 72, 153, 0.16), transparent 30%),
              linear-gradient(135deg, rgba(30, 27, 75, 0.99), rgba(49, 46, 129, 0.98));
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.12),
              0 24px 60px rgba(0, 0, 0, 0.55);
          }

          .avMobilePanelOpen {
            display: grid;
          }

          .avMobilePanelHeader {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: center;
            gap: 10px;
            padding: 2px;
          }

          .avMobileTitle {
            color: white;
            font-size: 21px;
            line-height: 1.05;
            font-weight: 1000;
          }

          .avMobileSubtitle {
            margin-top: 4px;
            color: rgba(255, 255, 255, 0.78);
            font-size: 13px;
            font-weight: 850;
          }

          .avMobileEmailBubble {
            min-height: 44px;
            padding: 10px 13px;
            border-radius: 18px;
            display: flex;
            align-items: center;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.09));
            border: 1px solid rgba(255, 255, 255, 0.18);
            color: #f3f4f6;
            font-size: 13px;
            font-weight: 900;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .avMobileNav {
            display: grid;
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .avMobileNav .avNavBubble {
            width: 100%;
            min-height: 52px;
            justify-content: flex-start;
            padding: 9px 12px;
            border-radius: 17px;
            white-space: nowrap;
          }

          .avMobileNav .avNavIcon {
            width: 36px;
            height: 36px;
            min-width: 36px;
            font-size: 18px;
          }

          .avMobileNav .avNavLabel {
            font-size: 16px;
            font-weight: 1000;
          }
        }

        @media (max-width: 560px) {
          .avHeaderShell {
            padding: 12px 14px;
          }

          .avBrandLogo {
            width: 42px;
            height: 42px;
            border-radius: 14px;
          }

          .avBrandTitle {
            font-size: 18px;
          }

          .avBrandTagline {
            display: none;
          }

          .avMobilePanel {
            left: 6px;
            right: 6px;
            padding: 10px;
            gap: 8px;
            max-height: calc(100dvh - 88px);
          }

          .avMobilePanelHeader {
            grid-template-columns: 1fr;
          }

          .avMobileAccountButton {
            width: 100%;
          }
        }

        @media (max-width: 360px) {
          .avBrandTitle {
            font-size: 16px;
          }

          .avMobileMenuButton span:first-child {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}
