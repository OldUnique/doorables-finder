import Link from "next/link";

export default function Nav() {
  const navItems = [
    { href: "/", label: "Home", icon: "🏠" },
    { href: "/about", label: "About", icon: "💜" },
    { href: "/collection", label: "Collection", icon: "🧸" },
    { href: "/marketplace", label: "Marketplace", icon: "🛍️" },
    { href: "/sell", label: "Sell", icon: "🏷️" },
    { href: "/feedback", label: "Feedback", icon: "💬" },
    { href: "/pricing", label: "Plans", icon: "👑" },
    { href: "/messages", label: "Messages", icon: "✉️" },
    { href: "/account", label: "Account", icon: "⚙️" },
  ];

  return (
    <header className="vaultNav">
      <style jsx>{`
        .vaultNav {
          position: sticky;
          top: 0;
          z-index: 1000;
          margin: -24px -24px 18px;
          padding: 14px 24px;
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
          display: grid;
          grid-template-columns: auto 1fr auto;
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

        .brandText { display: grid; gap: 2px; min-width: 0; }

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

        .navLinks {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .navPill,
        .navPill:visited {
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 9px 12px;
          border-radius: 999px;
          color: white;
          text-decoration: none;
          font-size: 13px;
          font-weight: 950;
          background: rgba(255, 255, 255, 0.10);
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.15);
          transition: transform 0.16s ease, background 0.16s ease, border-color 0.16s ease;
        }

        .navPill:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.17);
          border-color: rgba(255, 255, 255, 0.26);
        }

        .navPill:focus-visible,
        .accountButton:focus-visible,
        .menuButton:focus-visible {
          outline: 3px solid rgba(253, 230, 138, 0.9);
          outline-offset: 3px;
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

        .rightActions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
        }

        .accountButton,
        .accountButton:visited {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 999px;
          color: white;
          text-decoration: none;
          font-weight: 1000;
          background: linear-gradient(135deg, #ec4899, #7c3aed, #2563eb);
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 14px 26px rgba(124, 58, 237, 0.30);
          white-space: nowrap;
        }

        .menuButton {
          display: none;
          min-height: 48px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: none;
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

        .menuLines { display: grid; gap: 4px; }

        .menuLines span {
          width: 18px;
          height: 2px;
          border-radius: 999px;
          background: white;
          display: block;
        }

        @media (max-width: 1180px) {
          .navShell { grid-template-columns: auto 1fr; }
          .rightActions { display: none; }
          .navLinks { justify-content: flex-end; }
          .navPill { padding: 9px 10px; }
        }

        @media (max-width: 920px) {
          .vaultNav {
            margin: -11px -11px 12px;
            padding: 10px 11px;
          }

          .navShell {
            grid-template-columns: 1fr auto;
            gap: 10px;
          }

          .brandIcon {
            width: 48px;
            height: 48px;
            border-radius: 17px;
          }

          .brandTitle { font-size: 20px; }
          .brandSub { font-size: 10px; }
          .menuButton { display: inline-flex; }

          .navLinks {
            grid-column: 1 / -1;
            width: 100%;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
            justify-content: stretch;
          }

          .navPill,
          .navPill:visited {
            min-height: 48px;
            border-radius: 16px;
            padding: 10px;
            font-size: 13px;
            justify-content: flex-start;
          }

          .navIcon {
            width: 28px;
            height: 28px;
          }

          .accountButton { display: none; }
        }

        @media (max-width: 430px) {
          .brandTitle { font-size: 18px; }
          .brandSub { display: none; }
          .menuButton { min-height: 46px; padding: 11px 13px; }
          .navLinks { grid-template-columns: 1fr; }
          .navPill, .navPill:visited { min-height: 46px; }
        }
      `}</style>

      <div className="navShell">
        <Link href="/" className="brand" aria-label="Adorable Vault home">
          <span className="brandIcon">💜</span>
          <span className="brandText">
            <span className="brandTitle">Adorable Vault</span>
            <span className="brandSub">track • trade • showcase</span>
          </span>
        </Link>

        <nav className="navLinks" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="navPill">
              <span className="navIcon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="rightActions">
          <Link href="/login" className="accountButton">💜 Sign In</Link>
        </div>

        <button className="menuButton" type="button" aria-label="Menu">
          <span>Menu</span>
          <span className="menuLines" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>
    </header>
  );
}
