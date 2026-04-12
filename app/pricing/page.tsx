"use client";

import { useState } from "react";

type PlanKey = "monthly" | "yearly";

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [error, setError] = useState("");

  const handleCheckout = async (priceLookupKey: PlanKey) => {
    try {
      setError("");
      setLoadingPlan(priceLookupKey);

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: priceLookupKey }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to start checkout.");
      }

      if (!data?.url) {
        throw new Error("Stripe checkout URL was not returned.");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoadingPlan(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-6 py-14 shadow-2xl sm:px-10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-10 top-12 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />
            <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />
          </div>

          <div className="relative z-10 text-center">
            <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-slate-200 backdrop-blur">
              ✨ Collector Plans ✨
            </p>

            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
              Pick your Doorables vibe
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
              Unlock the full collector experience. Use code{" "}
              <span className="font-bold text-white">FIRSTMONTHFREE</span> at
              checkout for your monthly plan.
            </p>
          </div>

          {error ? (
            <div className="relative z-10 mx-auto mt-8 max-w-3xl rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <div className="relative z-10 mt-12 grid gap-8 md:grid-cols-2">
            <section className="group relative overflow-hidden rounded-[2rem] border border-blue-300/20 bg-white p-8 text-slate-900 shadow-2xl transition hover:-translate-y-1 hover:shadow-blue-500/10">
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-blue-200/40 blur-3xl" />

              <div className="relative">
                <div className="mb-3 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
                  Flexible
                </div>

                <div className="mb-4 text-2xl font-black">Monthly 💎</div>

                <div className="mb-3 flex items-end gap-1">
                  <span className="text-5xl font-black">$3</span>
                  <span className="pb-1 text-xl font-semibold text-slate-600">
                    /month
                  </span>
                </div>

                <p className="mb-6 text-sm text-slate-600">
                  First month FREE with code FIRSTMONTHFREE
                </p>

                <ul className="mb-8 space-y-3 text-sm text-slate-700">
                  <li>✨ Easy way to start</li>
                  <li>💜 Full collector access</li>
                  <li>📦 Browse, collect, and sell</li>
                </ul>

                <button
                  type="button"
                  onClick={() => handleCheckout("monthly")}
                  disabled={loadingPlan !== null}
                  className="w-full rounded-full bg-blue-600 px-5 py-3.5 font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loadingPlan === "monthly"
                    ? "Loading..."
                    : "Start Monthly ✨"}
                </button>
              </div>
            </section>

            <section className="group relative overflow-hidden rounded-[2rem] border border-amber-300/30 bg-white p-8 text-slate-900 shadow-2xl ring-2 ring-amber-400/40 transition hover:-translate-y-1 hover:shadow-amber-500/10">
              <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-amber-200/50 blur-3xl" />

              <div className="relative">
                <div className="mb-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
                  Best Value
                </div>

                <div className="mb-4 flex items-center gap-2 text-2xl font-black">
                  <span>Yearly 🔥</span>
                </div>

                <div className="mb-3 flex items-end gap-1">
                  <span className="text-5xl font-black">$15</span>
                  <span className="pb-1 text-xl font-semibold text-slate-600">
                    /year
                  </span>
                </div>

                <p className="mb-6 text-sm text-slate-600">
                  Save money and keep everything unlocked all year.
                </p>

                <ul className="mb-8 space-y-3 text-sm text-slate-700">
                  <li>🚀 Lowest overall cost</li>
                  <li>🎉 Perfect for active collectors</li>
                  <li>⭐ Best deal for long-term use</li>
                </ul>

                <button
                  type="button"
                  onClick={() => handleCheckout("yearly")}
                  disabled={loadingPlan !== null}
                  className="w-full rounded-full bg-amber-500 px-5 py-3.5 font-bold text-white transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loadingPlan === "yearly" ? "Loading..." : "Get Best Deal 🚀"}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}