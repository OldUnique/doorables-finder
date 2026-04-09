
"use client";


import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Doorable = {
  id: string;
  name: string | null;
  series: string | null;
  subcategory: string | null;
  rarity: string | null;
  movie: string | null;
  image_url: string | null;
};

function uniqueSorted(values: (string | null)[]) {
  return Array.from(new Set(values.filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));
}

function getSeriesNumber(value: string | null) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const m = value.match(/(\d+)/);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
}

function getRarityTheme(rarity?: string | null) {
  const r = (rarity || "").toLowerCase();

  if (r.includes("exclusive")) {
    return {
      bg: "linear-gradient(180deg,#fff3b0 0%,#d4af37 100%)",
      text: "#2f2200",
      badgeBg: "#b8860b",
      badgeText: "#ffffff",
    };
  }

  if (r.includes("limited")) {
    return {
      bg: "linear-gradient(180deg,#fff9c4 0%,#facc15 100%)",
      text: "#3d3200",
      badgeBg: "#d4a300",
      badgeText: "#ffffff",
    };
  }

  if (r.includes("ultra")) {
    return {
      bg: "linear-gradient(180deg,#bfdbfe 0%,#3b82f6 100%)",
      text: "#052c65",
      badgeBg: "#1d4ed8",
      badgeText: "#ffffff",
    };
  }

  if (r.includes("rare")) {
    return {
      bg: "linear-gradient(180deg,#bbf7d0 0%,#22c55e 100%)",
      text: "#052e16",
      badgeBg: "#15803d",
      badgeText: "#ffffff",
    };
  }

  return {
    bg: "linear-gradient(180deg,#ffffff 0%,#f3f4f6 100%)",
    text: "#111827",
    badgeBg: "#d1d5db",
    badgeText: "#111827",
  };
}

export default function Page() {

const router = useRouter();
const [isSubscribed, setIsSubscribed] = useState(false);

useEffect(() => {
	const subscribed = 
localStorage.getItem("doorables_subscribed");
	setIsSubscribed(subscribed === "true");
}, []);

  const [items, setItems] = useState<Doorable[]>([]);
  const [search, setSearch] = useState("");
  const [movieFilter, setMovieFilter] = useState("");
  const [rarityFilter, setRarityFilter] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("");
  const [ownedFilter, setOwnedFilter] = useState("");
  const [needFilter, setNeedFilter] = useState("");
  const [ownedMap, setOwnedMap] = useState<Record<string, number>>({});
  const [needMap, setNeedMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedOwned = localStorage.getItem("doorables-owned-counts");
    if (savedOwned) {
      try {
        setOwnedMap(JSON.parse(savedOwned));
      } catch {}
    }

    const savedNeed = localStorage.getItem("doorables-need-map");
    if (savedNeed) {
      try {
        setNeedMap(JSON.parse(savedNeed));
      } catch {}
    }

    async function load() {
      const { data, error } = await supabase
        .from("doorables")
        .select("id,name,series,subcategory,rarity,movie,image_url")
        .order("name");

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      setItems(data || []);
      setLoading(false);
    }

    load();
  }, []);

  function changeOwned(itemId: string, amount: number) {
    const nextValue = Math.max(0, (ownedMap[itemId] || 0) + amount);
    const next = { ...ownedMap, [itemId]: nextValue };
    setOwnedMap(next);
    localStorage.setItem("doorables-owned-counts", JSON.stringify(next));
  }

  function toggleNeed(itemId: string) {
    const next = { ...needMap, [itemId]: !needMap[itemId] };
    setNeedMap(next);
    localStorage.setItem("doorables-need-map", JSON.stringify(next));
  }

  async function uploadImage(file: File | undefined, itemId: string) {
    if (!file) return;

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    if (!user) {
      alert("Please log in first.");
      return;
    }

    const fileName = `${itemId}-${Date.now()}-${file.name.replace(/\s+/g, "_")}`;

    const { error: uploadError } = await supabase.storage
      .from("submissions")
      .upload(fileName, file);

    if (uploadError) {
      alert(uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("submissions")
      .getPublicUrl(fileName);

    const { error: insertError } = await supabase
      .from("image_submissions")
      .insert({
        user_id: user.id,
        doorable_id: itemId,
        image_url: urlData.publicUrl,
        status: "pending",
      });

    if (insertError) {
      alert(insertError.message);
      return;
    }

    alert("Picture submitted for approval!");
  }

  const movieOptions = useMemo(() => uniqueSorted(items.map((i) => i.movie)), [items]);
  const rarityOptions = useMemo(() => uniqueSorted(items.map((i) => i.rarity)), [items]);
  const seriesOptions = useMemo(
    () =>
      uniqueSorted(items.map((i) => i.series)).sort((a, b) => {
        const diff = getSeriesNumber(a) - getSeriesNumber(b);
        return diff !== 0 ? diff : a.localeCompare(b);
      }),
    [items]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    const filteredItems = items.filter((item) => {
      const joined = [item.name, item.series, item.subcategory, item.rarity, item.movie]
        .join(" ")
        .toLowerCase();
      const owned = ownedMap[item.id] || 0;
      const needed = !!needMap[item.id];

      if (q && !joined.includes(q)) return false;
      if (movieFilter && item.movie !== movieFilter) return false;
      if (rarityFilter && item.rarity !== rarityFilter) return false;
      if (seriesFilter && item.series !== seriesFilter) return false;
      if (ownedFilter === "owned" && owned <= 0) return false;
      if (ownedFilter === "not-owned" && owned > 0) return false;
      if (needFilter === "need" && !needed) return false;
      if (needFilter === "not-need" && needed) return false;

      return true;
    });

    return filteredItems.sort((a, b) => {
      const seriesDiff = getSeriesNumber(a.series) - getSeriesNumber(b.series);
      if (seriesDiff !== 0) return seriesDiff;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [items, search, movieFilter, rarityFilter, seriesFilter, ownedFilter, needFilter, ownedMap, needMap]);

  const totalOwned = useMemo(
    () => Object.values(ownedMap).reduce((sum, value) => sum + Number(value || 0), 0),
    [ownedMap]
  );

  const ownedTypes = useMemo(
    () => Object.values(ownedMap).filter((value) => Number(value || 0) > 0).length,
    [ownedMap]
  );

  const neededCount = useMemo(
    () => Object.values(needMap).filter(Boolean).length,
    [needMap]
  );

  const seriesProgress = useMemo(() => {
    const map: Record<string, { total: number; owned: number }> = {};

    items.forEach((item) => {
      const key = item.series || "Unknown Series";
      if (!map[key]) map[key] = { total: 0, owned: 0 };
      map[key].total += 1;
      if ((ownedMap[item.id] || 0) > 0) map[key].owned += 1;
    });

    return Object.entries(map).sort((a, b) => {
      const diff = getSeriesNumber(a[0]) - getSeriesNumber(b[0]);
      return diff !== 0 ? diff : a[0].localeCompare(b[0]);
    });
  }, [items, ownedMap]);


return (
  <>
    {!isSubscribed && (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10, 10, 20, 0.45)",
          backdropFilter: "blur(8px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <div
          style={{
            maxWidth: 520,
            width: "100%",
            background: "linear-gradient(135deg,#111827,#4338ca)",
            color: "white",
            borderRadius: 24,
            padding: 28,
            textAlign: "center",
            boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ fontSize: 38, fontWeight: 900, marginBottom: 10 }}>
            Unlock Collector Mode 💜
          </div>

          <div style={{ fontSize: 18, opacity: 0.95, lineHeight: 1.5 }}>
            Browse the database in free mode, then upgrade to unlock your full collection tracking abilities!
          </div>

          <a
            href="/pricing"
            style={{
              display: "inline-block",
              marginTop: 20,
              padding: "12px 20px",
              borderRadius: 14,
              background: "#facc15",
              color: "#111827",
              fontWeight: 900,
              textDecoration: "none",
            }}
          >
            Go to Pricing
          </a>
        </div>
      </div>
    )}

    <main style={{ padding: 20, maxWidth: 1300, margin: "0 auto" }}>
      <div
        style={{
          background: "linear-gradient(135deg,#111827,#4338ca)",
          borderRadius: 24,
          padding: 24,
          marginBottom: 16,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              margin: 0,
              fontSize: 48,
              fontWeight: 900,
              letterSpacing: 1,
              background: "linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ✨ Doorables ✨
          </h1>

          <div
            style={{
              marginTop: 8,
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: 1,
              opacity: 0.9,
            }}
          >
            Collecting Is Life 💜
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ background: "rgba(255,255,255,0.95)", color: "#111827", padding: 16, borderRadius: 20 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Owned Types</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>
            {ownedTypes} / {items.length}
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.95)", color: "#111827", padding: 16, borderRadius: 20 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Total Owned</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{totalOwned}</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.95)", color: "#111827", padding: 16, borderRadius: 20 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Need</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{neededCount}</div>
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.95)", color: "#111827", padding: 16, borderRadius: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 12 }}>Series Completion</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          {seriesProgress.map(([series, data]) => {
            const percent = data.total ? Math.round((data.owned / data.total) * 100) : 0;

            return (
              <div key={series} style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{series}</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
                  {data.owned} / {data.total} owned
                </div>
                <div style={{ background: "#e5e7eb", height: 10, borderRadius: 999, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${percent}%`,
                      background: "linear-gradient(90deg,#7c3aed,#2563eb)",
                      height: "100%",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.95)", color: "#111827", padding: 16, borderRadius: 20, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          <input
            placeholder="Search by character, series, movie..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db", boxSizing: "border-box" }}
          />

          <select value={seriesFilter} onChange={(e) => setSeriesFilter(e.target.value)} style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}>
            <option value="">All Series</option>
            {seriesOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

          <select value={movieFilter} onChange={(e) => setMovieFilter(e.target.value)} style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}>
            <option value="">All Movies</option>
            {movieOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

          <select value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)} style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}>
            <option value="">All Rarities</option>
            {rarityOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

          <select value={ownedFilter} onChange={(e) => setOwnedFilter(e.target.value)} style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}>
            <option value="">All Owned Status</option>
            <option value="owned">Owned</option>
            <option value="not-owned">Not Owned</option>
          </select>

          <select value={needFilter} onChange={(e) => setNeedFilter(e.target.value)} style={{ padding: 12, borderRadius: 12, border: "1px solid #d1d5db" }}>
            <option value="">All Need Status</option>
            <option value="need">Need</option>
            <option value="not-need">Not Need</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 20 }}>Loading...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {filtered.map((item) => {
            const rarity = getRarityTheme(item.rarity);
            const ownedQty = ownedMap[item.id] || 0;
            const needed = !!needMap[item.id];

            return (
              <div
                key={item.id}
                style={{
                  borderRadius: 18,
                  padding: 14,
                  background: rarity.bg,
                  color: rarity.text,
                  boxShadow:
                    ownedQty > 0
                      ? "0 0 0 3px rgba(124,58,237,0.35), 0 10px 24px rgba(0,0,0,0.16)"
                      : "0 8px 20px rgba(0,0,0,0.16)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: rarity.badgeBg,
                      color: rarity.badgeText,
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {item.rarity || "Common"}
                  </span>

                  <button
                    onClick={() => toggleNeed(item.id)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,0.12)",
                      background: needed ? "#fef3c7" : "rgba(255,255,255,0.75)",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    {needed ? "Still Need ⭐" : "Need!"}
                  </button>
                </div>

                <div
                  style={{
                    height: 150,
                    marginBottom: 10,
                    background: "rgba(255,255,255,0.45)",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name || "Doorable"}
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  ) : (
                    <div style={{ fontWeight: 700, opacity: 0.7 }}>No Image</div>
                  )}
                </div>

                <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>{item.name || "Unknown"}</div>

                <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 4 }}>
                  {item.series || "Unknown Series"}
                  {item.subcategory ? ` • ${item.subcategory}` : ""}
                </div>

                <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 12 }}>
                  Movie: {item.movie || "Unknown"}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <button
                    onClick={() => changeOwned(item.id, -1)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,0.12)",
                      background: "rgba(255,255,255,0.82)",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    -
                  </button>

                  <div style={{ minWidth: 90, textAlign: "center", fontWeight: 800 }}>
                    Owned: {ownedQty}
                  </div>

                  <button
                    onClick={() => changeOwned(item.id, 1)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,0.12)",
                      background: "rgba(255,255,255,0.82)",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    +
                  </button>
                </div>

                <label
                  style={{
                    display: "inline-block",
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.82)",
                    border: "1px solid rgba(0,0,0,0.12)",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  📸 Upload Picture
                  <input
                    type="file"
                    accept={"image/*"}
                    style={{ display: "none" }}
                    onChange={(e) => uploadImage(e.target.files?.[0], item.id)}
                  />
                </label>
</div>
            );
          })}
        </div>
	)}
      </main>
    </>
  );
}