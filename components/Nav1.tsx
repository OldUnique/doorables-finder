"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

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

const styles: Record<string, CSSProperties> = {
  header: {
    position: "sticky",
    top: 0,
    zIndex: 1000,
    color: "white",
    background:
      "radial-gradient(circle at 16% 0%, rgba(236, 72, 153, 0.24), transparent 34%), radial-gradient(circle at 84% 0%, rgba(59, 130, 246, 0.28), transparent 34%), linear-gradient(135deg, rgba(17, 24, 39, 0.96), rgba(49, 46, 129, 0.94))",
    borderBottom: "1px solid rgba(255, 255, 255, 0.14)",
    boxShadow: "0 14px 34px rgba(0, 0, 0, 0.28)",
    backdropFilter: "blur(18px)",
  },
  shell: {
    maxWidth: 1500,
    margin: "0 auto",
    padding: "14px 24px",
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto",
    gap: 14,
    alignItems: "center",
  },
  brand: {
    display: "inline-flex",
    alignItems: "center",
    gap: 11,
    color: "white",
    textDecoration: "none",
    minWidth: 0,
  },
  brandIcon: {
    width: 50,
    height: 50,
    flex: "0 0 auto",
    borderRadius: 18,
    display: "grid",
    placeItems: "center",
    fontSize: 25,
    background:
      "radial-gradient(circle at 30% 20%, #fef3c7, transparent 34%), linear-gradient(135deg, #ec4899, #7c3aed 52%, #2563eb)",
    border: "1px solid rgba(255, 255, 255, 0.25)",
    boxShadow: "0 14px 28px rgba(124, 58, 237, 0.36)",
  },
  brandText: {
    display: "grid",
    gap: 2,
    minWidth: 0,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: 1000,
    lineHeight: 1,
    letterSpacing: -0.7,
    color: "#ffffff",
    whiteSpace: "nowrap",
  },
  brandSub: {
    color: "rgba(255, 255, 255, 0.72)",
    fontSize: 11,
    fontWeight: 850,
    letterSpacing: "0.04em",
    textTransform: "lowercase",
    whiteSpace: "nowrap",
  },
  desktopLinks: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  rightActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  navIcon: {
    width: 25,
    height: 25,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: "rgba(255, 255, 255, 0.14)",
    fontSize: 13,
    flex: "0 0 auto",
  },
  menuButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 18,
    padding: "12px 15px",
    color: "white",
    background: "rgba(255, 255, 255, 0.14)",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    fontSize: 16,
    fontWeight: 1000,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  mobilePanel: {
    display: "grid",
    gap: 9,
    padding: "0 11px 12px",
  },
  mobileLinks: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
  },
  mobileAccount: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
  },
};

function pillStyle(active = false, mobile = false): CSSProperties {
  return {
    minHeight: mobile ? 50 : 42,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: mobile ? "flex-start" : "center",
    gap: 8,
    padding: mobile ? "11px 12px" : "9px 12px",
    borderRadius: mobile ? 17 : 999,
    color: "white",
    textDecoration: "none",
    fontSize: mobile ? 14 : 13,
    fontWeight: 950,
    background: active
      ? "radial-gradient(circle at top left, rgba(253, 230, 138, 0.24), transparent 42%), linear-gradient(135deg, rgba(124, 58, 237, 0.98), rgba(37, 99, 235, 0.78))"
      : "rgba(255, 255, 255, 0.11)",
    border: active
      ? "1px solid rgba(253, 230, 138, 0.62)"
      : "1px solid rgba(255, 255, 255, 0.16)",
    boxShadow: active
      ? "0 14px 28px rgba(124, 58, 237, 0.30)"
      : "0 10px 22px rgba(0, 0, 0, 0.16)",
    whiteSpace: "nowrap",
    width: mobile ? "100%" : "auto",
    boxSizing: "border-box",
  };
}

function accountStyle(mobile = false, variant: "signin" | "account" = "signin"): CSSProperties {
  const accountBackground =
    variant === "account"
      ? "linear-gradient(135deg, #4f46e5, #7c3aed)"
      : "linear-gradient(135deg, #ec4899, #7c3aed, #2563eb)";

  return {
    minHeight: mobile ? 50 : 43,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: mobile ? "flex-start" : "center",
    gap: 8,
    padding: mobile ? "11px 12px" : "10px 14px",
    borderRadius: mobile ? 17 : 999,
    color: "white",
    textDecoration: "none",
    fontSize: mobile ? 14 : 13,
    fontWeight: 1000,
    background: accountBackground,
    border: "1px solid rgba(255, 255, 255, 0.22)",
    boxShadow: "0 14px 26px rgba(124, 58, 237, 0.30)",
    whiteSpace: "nowrap",
    width: mobile ? "100%" : "auto",
    boxSizing: "border-box",
  };
}

function menuLineStyle(open: boolean, line: 1 | 2 | 3): CSSProperties {
  const base: CSSProperties = {
    width: 18,
    height: 2,
    borderRadius: 999,
    background: "white",
    display: "block",
    transition: "transform 0.18s ease, opacity 0.18s ease",
  };

  if (!open) return base;
  if (line === 1) return { ...base, transform: "translateY(6px) rotate(45deg)" };
  if (line === 2) return { ...base, opacity: 0 };
  return { ...base, transform: "translateY(-6px) rotate(-45deg)" };
}

export default function Nav() {
  const pathname = usePathname() || "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsCompact(window.innerWidth <= 920);
    };

    check();
    window.addEventListener("resize", check);

    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function closeMenu() {
    setMenuOpen(false);
  }

  const compactShell: CSSProperties = isCompact
    ? {
        ...styles.shell,
        gridTemplateColumns: "minmax(0, 1fr) auto",
        padding: "10px 11px",
        gap: 10,
      }
    : styles.shell;

  const signInHref = "/login";

  return (
    <header style={styles.header}>
      <div style={compactShell}>
        <Link href="/" style={styles.brand} aria-label="Adorable Vault home" onClick={closeMenu}>
          <span
            style={
              isCompact
                ? { ...styles.brandIcon, width: 48, height: 48, borderRadius: 17 }
                : styles.brandIcon
            }
          >
            💜
          </span>
          <span style={styles.brandText}>
            <span style={isCompact ? { ...styles.brandTitle, fontSize: 20 } : styles.brandTitle}>
              Adorable Vault
            </span>
            {!isCompact ? <span style={styles.brandSub}>track • trade • showcase</span> : null}
          </span>
        </Link>

        {!isCompact ? (
          <nav style={styles.desktopLinks} aria-label="Main navigation">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={pillStyle(active)}
                  aria-current={active ? "page" : undefined}
                >
                  <span style={styles.navIcon}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        ) : null}

        {!isCompact ? (
          <div style={styles.rightActions}>
            <Link href={signInHref} style={accountStyle(false, "signin")}>
              💜 Sign In
            </Link>
          </div>
        ) : (
          <button
            style={{ ...styles.menuButton, display: "inline-flex" }}
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span>Menu</span>
            <span style={{ display: "grid", gap: 4 }} aria-hidden="true">
              <span style={menuLineStyle(menuOpen, 1)} />
              <span style={menuLineStyle(menuOpen, 2)} />
              <span style={menuLineStyle(menuOpen, 3)} />
            </span>
          </button>
        )}
      </div>

      {isCompact && menuOpen ? (
        <div style={styles.mobilePanel}>
          <nav style={styles.mobileLinks} aria-label="Mobile navigation">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={pillStyle(active, true)}
                  aria-current={active ? "page" : undefined}
                  onClick={closeMenu}
                >
                  <span style={styles.navIcon}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div style={styles.mobileAccount}>
            <Link href={signInHref} style={accountStyle(true, "signin")} onClick={closeMenu}>
              💜 Sign In
            </Link>
            <Link href="/account" style={accountStyle(true, "account")} onClick={closeMenu}>
              ⚙️ Account
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
