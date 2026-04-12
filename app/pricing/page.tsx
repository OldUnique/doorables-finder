"use client";

import { useState } from "react";

type PlanKey = "monthly" | "yearly";

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [error, setError] = useState("");

  const handleCheckout = async (plan: PlanKey) => {
    try {
      setError("");
      setLoadingPlan(plan);

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Unable to start checkout.");
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
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-6 py-16 text-white">
<div className="mb-6 rounded-2xl bg-red-500 p-6 text-3xl font-black text-white">
  TEST PRICING PAGE
</div>

      <div className="mx-auto max-w-6xl">
        <section className="mb-12 overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur sm:p-12">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-4 py-1.5 text-sm font-medium text-fuchsia-200">
              ✨ Collector Plans ✨
            </div>

            <h1 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl">
              Pick your Doorables vibe
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Unlock the full collector experience. Use code{" "}
              <span className="font-bold text-white">FIRSTMONTHFREE</span> at
              checkout for your monthly plan.
            </p>
          </div>
        </section>

        {error ? (
          <div className="mb-8 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <section className="grid gap-8 md:grid-cols-2">
          <div className="rounded-[28px] border border-blue-300/20 bg-white p-8 text-slate-900 shadow-2xl">
            <div className="mb-4 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
              Flexible
            </div>

            <h2 className="text-3xl font-black">Monthly 💎</h2>

            <div className="mt-5 flex items-end gap-1">
              <span className="text-5xl font-black">$3</span>
              <span className="pb-1 text-xl font-semibold text-slate-500">
                /month
              </span>
            </div>

            <p className="mt-4 text-sm text-slate-600">
              First month FREE with code FIRSTMONTHFREE
            </p>

            <div className="my-8 h-px bg-slate-200" />

            <ul className="space-y-4 text-sm text-slate-700">
              <li className="flex items-start gap-3">
                <span>✨</span>
                <span>Easy way to start</span>
              </li>
              <li className="flex items-start gap-3">
                <span>💜</span>
                <span>Full collector access</span>
              </li>
              <li className="flex items-start gap-3">
                <span>📦</span>
                <span>Browse, collect, and sell</span>
              </li>
            </ul>

            <button
              type="button"
              onClick={() => handleCheckout("monthly")}
              disabled={loadingPlan === "monthly"}
              className="mt-10 w-full rounded-2xl bg-blue-600 px-5 py-4 text-base font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loadingPlan === "monthly" ? "Loading..." : "Start Monthly ✨"}
            </button>
          </div>

          <div className="relative rounded-[28px] border-2 border-amber-400 bg-white p-8 text-slate-900 shadow-2xl">
            <div className="absolute -top-4 right-6 rounded-full bg-amber-400 px-4 py-1 text-xs font-black uppercase tracking-wide text-slate-950 shadow-lg">
              Most Popular
            </div>

            <div className="mb-4 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
              Best Value
            </div>

            <h2 className="text-3xl font-black">Yearly 🔥</h2>

            <div className="mt-5 flex items-end gap-1">
              <span className="text-5xl font-black">$15</span>
              <span className="pb-1 text-xl font-semibold text-slate-500">
                /year
              </span>
            </div>

            <p className="mt-4 text-sm text-slate-600">
              Save money and keep everything unlocked all year.
            </p>

            <div className="my-8 h-px bg-slate-200" />

            <ul className="space-y-4 text-sm text-slate-700">
              <li className="flex items-start gap-3">
                <span>🚀</span>
                <span>Lowest overall cost</span>
              </li>
              <li className="flex items-start gap-3">
                <span>🎉</span>
                <span>Perfect for active collectors</span>
              </li>
              <li className="flex items-start gap-3">
                <span>⭐</span>
                <span>Best deal for long-term use</span>
              </li>
            </ul>

            <button
              type="button"
              onClick={() => handleCheckout("yearly")}
              disabled={loadingPlan === "yearly"}
              className="mt-10 w-full rounded-2xl bg-amber-500 px-5 py-4 text-base font-bold text-white transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loadingPlan === "yearly" ? "Loading..." : "Get Best Deal 🚀"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
