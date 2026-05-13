"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/about", label: "About", icon: "💜" },
  { href: "/collection", label: "Collection", icon: "🧸" },
  { href: "/sell", label: "Sell", icon: "🏷️" },
  { href: "/marketplace", label: "Marketplace", icon: "🛍️" },
  { href: "/messages", label: "Messages", icon: "✉️" },
  { href: "/pricing", label: "Plans", icon: "👑" },
  { href: "/feedback", label: "Feedback", icon: "💬" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Nav() {
  const pathname = usePathname() || "/";
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="vaultNav">
      <style jsx>{`
        .vaultNav {
          position: sticky;
          top: 0;
          z-index: 1000;
          color: white;
          background:
            radial-gradient(circle at 16% 0%, rgba(236, 72, 153, 0.24), transparent 34%),
            radial-gradient(circle at 84% 0%, rgba(59, 130, 246, 0.28), transparent 34%),
            linear-gradient(135deg, rgba(17, 24, 39, 0.94), rgba(49, 46, 129, 0.92));
          border-bottom: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.28);
          backdrop-filter: blur(18px);
        }

        .navShell {
          max-width: 1500px;
          margin: 0 auto;
          padding: 14px 24px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 14px;
          align-items: center;
        }

        .brand,
        .brand:visited {
          display: inline-flex;
          align-items: center;
          gap: 11px;
          color: white;
          text-decoration: none;
          min-width: 0;
        }

        .brandIcon {
          width: 50px;
          height: 50px;
          flex: 0 0 auto;
          border-radius: 18px;
          display: grid;
          place-items: center;
          font-size: 25px;
          background:
            radial-gradient(circle at 30% 20%, #fef3c7, transparent 34%),
            linear-gradient(135deg, #ec4899, #7c3aed 52%, #2563eb);
          border: 1px solid rgba(255, 255, 255, 0.25);
          box-shadow: 0 14px 28px rgba(124, 58, 237, 0.36);
        }

        .brandText {
          display: grid;
          gap: 2px;
          min-width: 0;
        }

        .brandTitle {
          font-size: 22px;
          font-weight: 1000;
          line-height: 1;
          letter-spacing: -0.7px;
          background: linear-gradient(90deg, #ffffff, #fde68a, #f0abfc, #bfdbfe);
          -webkit-background-clip: text;
          color: transparent;
          white-space: nowrap;
        }

        .brandSub {
          color: rgba(255, 255, 255, 0.72);
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 0.04em;
          text-transform: lowercase;
          white-space: nowrap;
        }

        .desktopLinks {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .rightActions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
        }

        .navPill,
        .navPill:visited,
        .accountButton,
        .accountButton:visited {
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border-radius: 999px;
          color: white;
          text-decoration: none;
          font-weight: 950;
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.15);
          transition:
            transform 0.16s ease,
            background 0.16s ease,
            border-color 0.16s ease,
            box-shadow 0.16s ease;
        }

        .navPill,
        .navPill:visited {
          padding: 9px 12px;
          font-size: 13px;
          background: rgba(255, 255, 255, 0.10);
        }

        .navPill:hover,
        .navPill.active {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.18);
          border-color: rgba(253, 230, 138, 0.55);
          box-shadow: 0 12px 26px rgba(124, 58, 237, 0.26);
        }

        .navPill.active {
          color: #fff7ed;
          background:
            radial-gradient(circle at top left, rgba(253, 230, 138, 0.24), transparent 40%),
            linear-gradient(135deg, rgba(124, 58, 237, 0.9), rgba(37, 99, 235, 0.72));
        }

        .navIcon {
          width: 24px;
          height: 24px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.14);
          font-size: 13px;
        }

        .accountButton,
        .accountButton:visited {
          min-height: 42px;
          padding: 10px 14px;
          background: linear-gradient(135deg, #ec4899, #7c3aed, #2563eb);
          border-color: rgba(255, 255, 255, 0.22);
          box-shadow: 0 14px 26px rgba(124, 58, 237, 0.30);
          white-space: nowrap;
          font-size: 13px;
        }

        .menuButton {
          display: none;
          min-height: 48px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 18px;
          padding: 12px 15px;
          color: white;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.18);
          font-size: 16px;
          font-weight: 1000;
          cursor: pointer;
          font-family: inherit;
        }

        .menuLines {
          display: grid;
          gap: 4px;
        }

        .menuLines span {
          width: 18px;
          height: 2px;
          border-radius: 999px;
          background: white;
          display: block;
          transition: transform 0.18s ease, opacity 0.18s ease;
        }

        .menuButton.open .menuLines span:nth-child(1) {
          transform: translateY(6px) rotate(45deg);
        }

        .menuButton.open .menuLines span:nth-child(2) {
          opacity: 0;
        }

        .menuButton.open .menuLines span:nth-child(3) {
          transform: translateY(-6px) rotate(-45deg);
        }

        .mobilePanel {
          display: none;
        }

        .navPill:focus-visible,
        .accountButton:focus-visible,
        .menuButton:focus-visible,
        .brand:focus-visible {
          outline: 3px solid rgba(253, 230, 138, 0.9);
          outline-offset: 3px;
        }

        @media (max-width: 1180px) {
          .navShell {
            grid-template-columns: auto minmax(0, 1fr) auto;
          }

          .desktopLinks {
            justify-content: flex-end;
          }

          .navPill {
            padding: 9px 10px;
          }

          .rightActions {
            display: none;
          }
        }

        @media (max-width: 920px) {
          .navShell {
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 10px;
            padding: 10px 11px;
          }

          .brandIcon {
            width: 48px;
            height: 48px;
            border-radius: 17px;
          }

          .brandTitle {
            font-size: 20px;
          }

          .brandSub {
            font-size: 10px;
          }

          .desktopLinks {
            display: none;
          }

          .menuButton {
            display: inline-flex;
          }

          .mobilePanel {
            display: grid;
            gap: 8px;
            padding: 0 11px 12px;
            max-height: 0;
            overflow: hidden;
            opacity: 0;
            transform: translateY(-4px);
            transition:
              max-height 0.22s ease,
              opacity 0.18s ease,
              transform 0.18s ease,
              padding-bottom 0.18s ease;
          }

          .mobilePanel.open {
            max-height: 720px;
            opacity: 1;
            transform: translateY(0);
            padding-bottom: 12px;
          }

          .mobileLinks {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }

          .mobileLinks .navPill,
          .mobileLinks .navPill:visited {
            min-height: 48px;
            border-radius: 16px;
            padding: 10px;
            font-size: 13px;
            justify-content: flex-start;
          }

          .mobileAccount {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }

          .mobileAccount .accountButton {
            border-radius: 16px;
            min-height: 48px;
          }

          .navIcon {
            width: 28px;
            height: 28px;
          }
        }

        @media (max-width: 430px) {
          .brandTitle {
            font-size: 18px;
          }

          .brandSub {
            display: none;
          }

          .menuButton {
            min-height: 46px;
            padding: 11px 13px;
          }

          .mobileLinks,
          .mobileAccount {
            grid-template-columns: 1fr;
          }

          .mobileLinks .navPill,
          .mobileLinks .navPill:visited {
            min-height: 46px;
          }
        }
      `}</style>

      <div className="navShell">
        <Link href="/" className="brand" aria-label="Adorable Vault home" onClick={closeMenu}>
          <span className="brandIcon">💜</span>
          <span className="brandText">
            <span className="brandTitle">Adorable Vault</span>
            <span className="brandSub">track • trade • showcase</span>
          </span>
        </Link>

        <nav className="desktopLinks" aria-label="Main navigation">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`navPill ${active ? "active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="navIcon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="rightActions">
          <Link href="/login" className="accountButton">
            💜 Sign In
          </Link>
        </div>

        <button
          className={`menuButton ${menuOpen ? "open" : ""}`}
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <span>Menu</span>
          <span className="menuLines" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>

      <div className={`mobilePanel ${menuOpen ? "open" : ""}`}>
        <nav className="mobileLinks" aria-label="Mobile navigation">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`navPill ${active ? "active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={closeMenu}
              >
                <span className="navIcon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mobileAccount">
          <Link href="/login" className="accountButton" onClick={closeMenu}>
            💜 Sign In
          </Link>
          <Link href="/account" className="accountButton" onClick={closeMenu}>
            ⚙️ Account
          </Link>
        </div>
      </div>
    </header>
  );
}
