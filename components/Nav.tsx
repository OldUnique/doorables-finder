import Link from "next/link";

export default function Nav() {
  const style = {
    padding: "10px 14px",
    borderRadius: 12,
    background: "#ffffff",
    border: "1px solid #d1d5db",
    textDecoration: "none",
    color: "#111827",
    fontWeight: 700 as const,
  };

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
      <Link href="/" style={style}>Home</Link>
      <Link href="/login" style={style}>Login</Link>
      <Link href="/collection" style={style}>Collection</Link>
      <Link href="/account" style={style}>Account</Link>
    </div>
  );
}