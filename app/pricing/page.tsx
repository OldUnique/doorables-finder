"use client";

export default function PricingPage() {
  async function goToCheckout(plan: "monthly" | "yearly") {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plan }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Checkout failed");
      return;
    }

    window.location.href = data.url;
  }

  return (
    <main style={{ padding: 40, maxWidth: 1150, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 34 }}>
        <div
          style={{
            display: "inline-block",
            padding: "8px 14px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.08)",
            color: "white",
            fontWeight: 800,
            marginBottom: 14,
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          ✨ Collector Plans ✨
        </div>

        <h1
          style={{
            fontSize: 42,
            margin: "0 0 10px 0",
            color: "white",
            fontWeight: 900,
          }}
        >
          Pick your Doorables vibe
        </h1>

        <p
          style={{
            color: "rgba(255,255,255,0.78)",
            fontSize: 18,
            margin: 0,
          }}
        >
          Use code <strong>FIRSTMONTHFREE</strong> at checkout for your monthly plan.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 28,
        }}
      >
        {/* MONTHLY */}
        <section
          style={{
            background: "linear-gradient(180deg,#ffffff,#f8fbff)",
            borderRadius: 28,
            padding: 34,
            boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
            border: "1px solid #dbeafe",
          }}
        >
          <h2 style={{ fontSize: 32, marginBottom: 10 }}>Monthly 💎</h2>
          <div style={{ fontSize: 48, fontWeight: 900 }}>$3/month</div>
          <p style={{ marginBottom: 20 }}>
            First month FREE with code FIRSTMONTHFREE 🎉
          </p>

          <button
            onClick={() => goToCheckout("monthly")}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 12,
              background: "#2563eb",
              color: "white",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
            }}
          >
            Start Monthly ✨
          </button>
        </section>

        {/* YEARLY */}
        <section
          style={{
            background: "#fff",
            borderRadius: 28,
            padding: 34,
            border: "2px solid #facc15",
            boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
          }}
        >
          <h2 style={{ fontSize: 32, marginBottom: 10 }}>Yearly 🔥</h2>
          <div style={{ fontSize: 48, fontWeight: 900 }}>$15/year</div>

          <p
            style={{
              marginTop: 6,
              marginBottom: 20,
              fontWeight: 600,
              color: "#f59e0b",
            }}
          >
            ⭐ Best value — save money yearly!
          </p>

          <button
            onClick={() => goToCheckout("yearly")}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 12,
              background: "#f59e0b",
              color: "white",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
            }}
          >
            Get Best Deal 🚀
          </button>
        </section>
      </div>
    </main>
  );
}
