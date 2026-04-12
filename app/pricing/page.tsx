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
    <main className="min-h-screen bg-slate-950 text-white px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <div className="inline-block rounded-full border border-slate-700 bg-slate-900 px-4 py-1 text-sm text-slate-200">
            ✨ Collector Plans ✨
          </div>

          <h1 className="mt-5 text-4xl font-black text-white sm:text-5xl">
            Pick your Doorables vibe
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
            Unlock the full collector experience. Use code{" "}
            <span className="font-bold text-white">FIRSTMONTHFREE</span> at
            checkout for your monthly plan.
          </p>
        </div>

        {error ? (
          <div className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-8 md:grid-cols-2">
          <section className="rounded-3xl border border-blue-500/30 bg-white p-8 text-slate-900 shadow-2xl">
            <div className="mb-3 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
              Flexible
            </div>

            <h2 className="mb-4 text-3xl font-black">Monthly 💎</h2>

            <div className="mb-2 text-5xl font-black">
              $3
              <span className="ml-1 text-2xl font-semibold text-slate-600">
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
              {loadingPlan === "monthly" ? "Loading..." : "Start Monthly ✨"}
            </button>
          </section>

          <section className="rounded-3xl border-2 border-amber-400 bg-white p-8 text-slate-900 shadow-2xl">
            <div className="mb-3 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
              Best Value
            </div>

            <h2 className="mb-4 text-3xl font-black">Yearly 🔥</h2>

            <div className="mb-2 text-5xl font-black">
              $15
              <span className="ml-1 text-2xl font-semibold text-slate-600">
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
          </section>
        </div>
      </div>
    </main>
  );
}