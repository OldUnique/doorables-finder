"use client";

import { useState } from "react";

type PlanKey = "monthly" | "yearly";

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [error, setError] = useState("");

  const handleCheckout = async (priceLookupKey: PlanKey) => {
    try {
console.log("checkout clicked",priceLookupKey);
      setError("");
      setLoadingPlan(priceLookupKey);

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan:priceLookupKey }),
      });
console.log("checkout response status", res.status);

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
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-10">
          <p className="inline-block rounded-full bg-slate-800 px-4 py-1 text-sm">
            ✨ Collector Plans ✨
          </p>
          <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
            Pick your Doorables vibe
          </h1>
          <p className="mt-3 text-slate-300">
            Use code <span className="font-semibold">FIRSTMONTHFREE</span> at checkout for your monthly plan.
          </p>
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-3xl bg-white p-8 text-slate-900 shadow-xl">
            <div className="mb-4 text-2xl font-bold">Monthly 💎</div>
            <div className="mb-2 text-5xl font-black">$3<span className="text-2xl font-semibold">/month</span></div>
            <p className="mb-8 text-sm text-slate-600">
              First month FREE with code FIRSTMONTHFREE
            </p>

            <button
              type="button"
              onClick={() => handleCheckout("monthly")}
              disabled={loadingPlan !== null}
              className="w-full rounded-full bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loadingPlan === "monthly" ? "Loading..." : "Start Monthly ✨"}
            </button>
          </section>

          <section className="rounded-3xl bg-white p-8 text-slate-900 shadow-xl">
            <div className="mb-4 text-2xl font-bold">Yearly 🔥</div>
            <div className="mb-2 text-5xl font-black">$15<span className="text-2xl font-semibold">/year</span></div>
            <p className="mb-8 text-sm text-slate-600">
              Best value — save money yearly!
            </p>

            <button
              type="button"
              onClick={() => handleCheckout("yearly")}
              disabled={loadingPlan !== null}
              className="w-full rounded-full bg-amber-500 px-5 py-3 font-semibold text-white transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loadingPlan === "yearly" ? "Loading..." : "Get Best Deal 🚀"}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}

