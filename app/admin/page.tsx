"use client";

import { useEffect, useState } from "react";
import Nav from "../../components/Nav";

const EMAIL_KEY = "doorables-local-email";
const SUB_KEY = "doorables-local-subscribed";

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [months, setMonths] = useState("1");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setEmail(localStorage.getItem(EMAIL_KEY) || "");
    setSubscribed(localStorage.getItem(SUB_KEY) === "true");
  }, []);

  async function createCoupon() {
    setMessage("");
    const res = await fetch("/api/admin/create-coupon", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        code: coupon,
        durationCount: Number(months || "1"),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data?.error || "Could not create coupon.");
      return;
    }
    setMessage("Coupon starter request completed.");
  }

  return (
    <main>
      <div style={{ background: "linear-gradient(135deg, rgba(91,33,182,0.9), rgba(29,78,216,0.85))", padding: 24, borderRadius: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 34, fontWeight: 800 }}>Admin 👑</div>
      </div>

      <Nav />

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <div style={{ background: "rgba(255,255,255,0.92)", color: "#111827", borderRadius: 20, padding: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 12 }}>Current local admin state</div>
          <div>Saved email: <strong>{email || "None"}</strong></div>
          <div style={{ marginTop: 8 }}>Demo paid access: <strong>{subscribed ? "Active" : "Inactive"}</strong></div>
          <div style={{ marginTop: 12, lineHeight: 1.6 }}>
            If your saved login email matches <strong>OWNER_EMAIL</strong> and <strong>AUTO_OWNER_BYPASS=true</strong>, you should always get in.
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.92)", color: "#111827", borderRadius: 20, padding: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 12 }}>Coupon starter</div>
          <input
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            placeholder="FREE1MONTH"
            style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #ddd", boxSizing: "border-box", marginBottom: 10 }}
          />
          <input
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            placeholder="1"
            style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #ddd", boxSizing: "border-box", marginBottom: 10 }}
          />
          <button onClick={createCoupon} style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid #8b5cf6", background: "#ede9fe", fontWeight: 700, cursor: "pointer" }}>
            Create Coupon
          </button>
          {message ? <div style={{ marginTop: 12 }}>{message}</div> : null}
        </div>
      </div>
    </main>
  );
}
