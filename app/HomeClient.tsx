"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "../lib/supabase";
import { EMPTY_SHOWCASE, type HomeShowcase, type ShowcaseFigure } from "../lib/homeShowcase";
import "./home.css";

type Announcement = {
  id: number;
  title: string;
  body: string;
  is_active: boolean;
  updated_by: string | null;
  updated_at: string | null;
};

type HomeStats = {
  owned: number;
  needed: number;
  extras: number;
  total: number;
  progress: number;
};

const ADMIN_EMAILS = [
  "riffeljosh80@gmail.com",
  "rffeljosh80@gmail.com",
  "jjowens@ktc.edu",
  "dntuttle1@gmail.com",
];

const DEFAULT_ANNOUNCEMENT_TITLE = "A Quick Update from Adorable Vault 💜";

const DEFAULT_ANNOUNCEMENT_BODY = `I want to sincerely apologize for how long it has taken me to get everything set up and working the way it should. I truly appreciate your patience and support while I continue improving the website.

I’m happy to share that Adorable Vault is now free to use. I want it to remain a welcoming and accessible place where collectors can organize their collections without having to pay.

I am also starting another business, so some updates may happen more gradually than I originally planned. Adorable Vault is still important to me, and I will continue making as much time for it as possible while improving the site step by step.

To help cover website costs while keeping it free, you may occasionally see a few carefully placed ads. I will do my best to keep them limited and avoid disruptive pop-ups or clutter.

Thank you for your understanding, patience, and continued support. I’m grateful to have you here and excited to keep building Adorable Vault with you 💜`;

function formatNumber(value: number) {
  return value.toLocaleString();
}

function displayDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type AdSlotProps = {
  slot?: string;
  label?: string;
};

function AdSlot({ slot, label = "Advertisement" }: AdSlotProps) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-5461396984327450";

  useEffect(() => {
    if (!client || !slot) return;

    try {
      const adsWindow = window as Window & { adsbygoogle?: Record<string, unknown>[] };
      (adsWindow.adsbygoogle = adsWindow.adsbygoogle || []).push({});
    } catch {
      // Ad blockers or delayed AdSense loading should never break the page.
    }
  }, [client, slot]);

  // No ad unit configured yet: render nothing (Auto ads can still place ads).
  if (!client || !slot) {
    return null;
  }

  return (
    <div className="adWrap" aria-label={label}>
      <div className="adLabel">{label}</div>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

export default function HomePage({ showcase = EMPTY_SHOWCASE }: { showcase?: HomeShowcase }) {
  const [userEmail, setUserEmail] = useState("");
  const [username, setUsername] = useState("");
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [title, setTitle] = useState(DEFAULT_ANNOUNCEMENT_TITLE);
  const [body, setBody] = useState(DEFAULT_ANNOUNCEMENT_BODY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState<HomeStats>({
    owned: 0,
    needed: 0,
    extras: 0,
    total: 0,
    progress: 0,
  });

  const isAdmin = useMemo(
    () => ADMIN_EMAILS.includes(userEmail.toLowerCase()),
    [userEmail]
  );

  useEffect(() => {
    void loadPage();
  }, []);

  async function loadHomeStats(userId?: string) {
    try {
      const supabase = getSupabase();

      // Use a count query: selecting rows is capped at 1,000 by Supabase.
      const { count } = await supabase.from("doorables").select("id", { count: "exact", head: true });
      const total = count ?? 0;

      let owned = 0;
      let extras = 0;

      if (userId) {
        const { data: userRows } = await supabase
          .from("user_doorables")
          .select("doorable_id, qty_owned")
          .eq("user_id", userId);

        const ownedIds = new Set<string>();

        (userRows ?? []).forEach((row: any) => {
          const qty = Number(row?.qty_owned ?? 0);

          if (qty > 0 && row?.doorable_id) {
            ownedIds.add(String(row.doorable_id));
          }

          if (qty > 1) {
            extras += qty - 1;
          }
        });

        owned = ownedIds.size;
      }

      setStats({
        owned,
        needed: Math.max(total - owned, 0),
        extras,
        total,
        progress: total ? Math.round((owned / total) * 100) : 0,
      });
    } catch {
      // Optional stats should not crash the homepage.
    }
  }

  async function loadPage() {
    try {
      setLoading(true);
      setMessage("");

      const supabase = getSupabase();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const email = String(user?.email ?? "").toLowerCase();
      setUserEmail(email);

      if (user?.id) {
        const { data: profile } = await supabase
          .from("users")
          .select("username")
          .eq("id", user.id)
          .maybeSingle();

        setUsername(String(profile?.username ?? ""));
      }

      await loadHomeStats(user?.id);

      const { data, error } = await supabase
        .from("site_announcements")
        .select("*")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && !String(error.message).toLowerCase().includes("no rows")) {
        setMessage(error.message);
      }

      if (data) {
        const row = data as Announcement;
        setAnnouncement(row);
        setTitle(String(row.title ?? DEFAULT_ANNOUNCEMENT_TITLE));
        setBody(String(row.body ?? DEFAULT_ANNOUNCEMENT_BODY));
      }

      setLoading(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load homepage.");
      setLoading(false);
    }
  }

  async function saveAnnouncement() {
    try {
      setSaving(true);
      setMessage("");

      const supabase = getSupabase();

      const payload = {
        title: title.trim() || DEFAULT_ANNOUNCEMENT_TITLE,
        body,
        is_active: true,
        updated_by: userEmail || null,
        updated_at: new Date().toISOString(),
      };

      if (announcement?.id) {
        const { data, error } = await supabase
          .from("site_announcements")
          .update(payload)
          .eq("id", announcement.id)
          .select()
          .single();

        if (error) {
          setMessage(error.message);
          setSaving(false);
          return;
        }

        setAnnouncement(data as Announcement);
      } else {
        const { data, error } = await supabase
          .from("site_announcements")
          .insert([payload])
          .select()
          .single();

        if (error) {
          setMessage(error.message);
          setSaving(false);
          return;
        }

        setAnnouncement(data as Announcement);
      }

      setMessage("Announcement saved.");
      setSaving(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save announcement.");
      setSaving(false);
    }
  }


  // Strip markdown heading markers (e.g. "## Title") so they don't show as raw symbols.
  const announcementText = (body.trim() || DEFAULT_ANNOUNCEMENT_BODY).replace(/^#{1,6}\s*/gm, "");
  const announcementTitle = title.trim() || DEFAULT_ANNOUNCEMENT_TITLE;
  const announcementDate = displayDate(announcement?.updated_at);

  const hasPersonalStats = stats.total > 0 && (stats.owned > 0 || stats.extras > 0);

  const catalogTotal = showcase.catalogCount ?? (stats.total || null);
  const spotlightChase = showcase.spotlight.filter((f) => /limited/i.test(f.rarity));
  const spotlightSpecial = showcase.spotlight.filter((f) => /special/i.test(f.rarity));
  const spotlightUltra = showcase.spotlight.filter((f) => /ultra/i.test(f.rarity));
  const spotlightCount = showcase.spotlight.length || 50;
  const heroStats = [
    { value: catalogTotal, label: "Figures in the catalog" },
    { value: showcase.seriesCount, label: "Series & sets" },
    { value: showcase.trackedCount, label: "Figures tracked by collectors" },
  ].filter((s) => typeof s.value === "number" && s.value > 0) as { value: number; label: string }[];

  return (
    <main className="avHome">
      <div className="avShell">
        {/* ---------- HERO ---------- */}
        <section className="avHero">
          <div className="avHeroCopy">
            <a href="#new-series" className="avNewPill">
              <span className="avNewTag">New</span>
              <span>Series 16 “Ticket to Fun” is in the vault</span>
              <span aria-hidden="true">→</span>
            </a>

            <h1 className="avHeadline">
              Your Doorables collection, <span className="avGradientText">beautifully organized.</span>
            </h1>

            <p className="avLead">
              {username ? `Welcome back, ${username}! ` : ""}
              Check off every figure, keep a wishlist, track your extras, and share your collection,
              all free and made for your phone.
            </p>

            <div className="avCtaRow">
              <Link href="/collection" className="avBtn avBtnPrimary">
                💜 Start your collection
              </Link>
              <Link href="/demo" className="avBtn avBtnGhost">
                👀 Try the demo
              </Link>
            </div>

            {hasPersonalStats ? (
              <div className="avProgressCard">
                <div className="avProgressTop">
                  <span>Your vault</span>
                  <strong>
                    {formatNumber(stats.owned)} / {formatNumber(stats.total)} owned · {stats.progress}%
                  </strong>
                </div>
                <div className="avProgressTrack">
                  <div className="avProgressFill" style={{ width: `${Math.max(stats.progress, 2)}%` }} />
                </div>
                <div className="avProgressMeta">
                  <span>{formatNumber(stats.needed)} still needed</span>
                  <span>{formatNumber(stats.extras)} extras</span>
                </div>
              </div>
            ) : (
              <div className="avTrustRow">
                <span>✅ Free to use</span>
                <span>📱 Works on any phone</span>
                <span>🔒 No app to install</span>
              </div>
            )}
          </div>

          <div className="avCollage" aria-label="Doorables figures from the catalog">
            {(showcase.collage.length ? showcase.collage : FALLBACK_COLLAGE).slice(0, 9).map((f, i) => (
              <div key={`${f.id}-${i}`} className={`avTile avTile${i % 3}`}>
                <Image
                  src={f.image}
                  alt={`${f.name} Doorable`}
                  fill
                  sizes="(max-width: 960px) 30vw, 170px"
                  priority={i < 3}
                  className="avTileImg"
                />
                <span className="avTileName">{f.name}</span>
              </div>
            ))}
          </div>
        </section>

        {heroStats.length > 0 && (
          <section className="avStats" aria-label="Vault stats">
            {heroStats.map((s) => (
              <div key={s.label} className="avStat">
                <div className="avStatValue">{formatNumber(s.value)}</div>
                <div className="avStatLabel">{s.label}</div>
              </div>
            ))}
          </section>
        )}

        {/* ---------- NEW SERIES SPOTLIGHT ---------- */}
        <section id="new-series" className="avSpotlight">
          <div className="avSpotGlow" aria-hidden="true" />
          <div className="avSpotInner">
            <div className="avEyebrow avEyebrowGold">🎪 New this season</div>
            <h2 className="avSpotTitle">Series 16: Ticket to Fun</h2>
            <p className="avSpotText">
              {spotlightCount} festival-themed figures across five themes: Perfect Prizes, Amazing Amusements,
              All Fun &amp; Games, Enchanted Entertainers and Festival Foodies. Some figures connect, like the
              Stitch, Angel and Leroy coaster cars.
            </p>

            <div className="avSpotFacts">
              <div className="avFact"><strong>{spotlightCount}</strong><span>figures</span></div>
              <div className="avFact"><strong>5</strong><span>themes</span></div>
              <div className="avFact"><strong>1</strong><span>chase figure</span></div>
            </div>

            {(spotlightChase.length > 0 || spotlightSpecial.length > 0 || spotlightUltra.length > 0) && (
              <div className="avChaseList">
                {spotlightChase.map((f) => (
                  <span key={`c-${f.name}`} className="avChip avChipLimited">⭐ {f.name} · Limited Edition</span>
                ))}
                {spotlightSpecial.map((f) => (
                  <span key={`s-${f.name}`} className="avChip avChipSpecial">✨ {f.name} · Special Edition</span>
                ))}
                {spotlightUltra.map((f) => (
                  <span key={`u-${f.name}`} className="avChip avChipUltra">{f.name}</span>
                ))}
              </div>
            )}

            <div className="avCtaRow">
              <Link href="/collection?series=Series%2016" className="avBtn avBtnGold">
                Track Series 16 →
              </Link>
            </div>
          </div>
        </section>

        <section className="avAd">
          <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_HOME_TOP_SLOT} />
        </section>

        {/* ---------- RECENTLY ADDED ---------- */}
        {showcase.recent.length > 0 && (
          <section className="avSection">
            <div className="avSectionHead">
              <div>
                <div className="avEyebrow">Fresh in the vault</div>
                <h2 className="avH2">Recently added photos</h2>
              </div>
              <Link href="/collection" className="avTextLink">See the full checklist →</Link>
            </div>

            <div className="avRail">
              {showcase.recent.map((f) => (
                <Link key={f.id} href={`/collection?series=${encodeURIComponent(f.series)}`} className="avFigure">
                  <div className="avFigureImg">
                    <Image src={f.image} alt={`${f.name} Doorable`} fill sizes="160px" className="avTileImg" />
                  </div>
                  <div className="avFigureName">{f.name}</div>
                  <div className="avFigureSeries">{f.series}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ---------- BROWSE BY SERIES ---------- */}
        {showcase.series.length > 0 && (
          <section className="avSection">
            <div className="avSectionHead">
              <div>
                <div className="avEyebrow">Browse by series</div>
                <h2 className="avH2">Jump straight to a series</h2>
              </div>
              {showcase.seriesCount ? (
                <Link href="/collection" className="avTextLink">All {showcase.seriesCount} series &amp; sets →</Link>
              ) : null}
            </div>

            <div className="avSeriesGrid">
              {showcase.series.map((s) => (
                <Link key={s.name} href={`/collection?series=${encodeURIComponent(s.name)}`} className="avSeriesCard">
                  <div className="avSeriesImg">
                    {s.image ? (
                      <Image src={s.image} alt="" fill sizes="(max-width: 700px) 45vw, 220px" className="avTileImg" />
                    ) : (
                      <span className="avSeriesEmoji" aria-hidden="true">{s.name === "Series 16" ? "🎪" : "💜"}</span>
                    )}
                    {s.name === "Series 16" && <span className="avSeriesNew">New</span>}
                  </div>
                  <div className="avSeriesName">{s.name}</div>
                  <div className="avSeriesCount">{formatNumber(s.count)} figures</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ---------- HOW IT WORKS ---------- */}
        <section className="avSection">
          <div className="avSectionHead">
            <div>
              <div className="avEyebrow">How it works</div>
              <h2 className="avH2">Three taps to a tidy collection</h2>
            </div>
          </div>

          <div className="avSteps">
            <div className="avStep">
              <div className="avStepNum">1</div>
              <div className="avStepTitle">Find it fast</div>
              <div className="avStepText">Search by name, series, rarity or movie, right from the store aisle.</div>
            </div>
            <div className="avStep">
              <div className="avStepNum">2</div>
              <div className="avStepTitle">Tap to track</div>
              <div className="avStepText">Mark Have, Need or Extra. No spreadsheets or photo albums.</div>
            </div>
            <div className="avStep">
              <div className="avStepNum">3</div>
              <div className="avStepTitle">Share &amp; trade</div>
              <div className="avStepText">Show off your public profile and list extras on the marketplace.</div>
            </div>
          </div>

          <div className="avFeatureRow">
            <Link href="/collection" className="avFeature"><span>🧸</span>Collection tracker</Link>
            <Link href="/collection" className="avFeature"><span>💎</span>Wishlist &amp; extras</Link>
            <Link href="/marketplace" className="avFeature"><span>🛍️</span>Marketplace</Link>
            <Link href="/account" className="avFeature"><span>🌟</span>Public profile</Link>
          </div>
        </section>

        <section className="avAd">
          <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_HOME_MIDDLE_SLOT} />
        </section>

        {/* ---------- NEWS + PROMISE ---------- */}
        <section className="avSplit">
          <div className="avCard">
            <div className="avEyebrow">Vault news</div>
            <h2 className="avH3">{loading ? DEFAULT_ANNOUNCEMENT_TITLE : announcementTitle}</h2>
            {announcementDate ? <div className="avMuted">Last updated {announcementDate}</div> : null}

            <div className="avNewsBody">{announcementText}</div>

            {isAdmin && (
              <div className="avAdminBox">
                <div style={{ fontWeight: 950, marginBottom: 8 }}>Admin homepage update box</div>
                <div className="avAdminTip">
                  Update this whenever you want a fresh homepage post. Edit the title and body, then tap save.
                  It updates the public Vault News box without touching the rest of the page.
                </div>

                <input
                  className="avField"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Announcement title"
                />

                <textarea
                  className="avField avTextarea"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Paste this week’s update here..."
                />

                <button
                  type="button"
                  className="avBtn avBtnPrimary"
                  onClick={() => void saveAnnouncement()}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Homepage Update"}
                </button>
              </div>
            )}

            {message && <div className="avMuted" style={{ marginTop: 10 }}>{message}</div>}
          </div>

          <div className="avCard">
            <div className="avEyebrow">Collector promise</div>
            <h2 className="avH3">Clean, useful, and community-shaped.</h2>
            <ul className="avPromise">
              <li><span>✅</span><span>Track owned, needed, and extra Doorables in one clean place.</span></li>
              <li><span>💜</span><span>Free to use. A few carefully placed ads help cover hosting.</span></li>
              <li><span>🚫</span><span>No disruptive pop-ups.</span></li>
              <li><span>📱</span><span>Designed for your phone during shopping, shows, and trades.</span></li>
              <li><span>💬</span><span>Your <Link href="/feedback" className="avInlineLink">feedback</Link> shapes what gets built next.</span></li>
            </ul>
          </div>
        </section>

        <section className="avAd">
          <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_HOME_BOTTOM_SLOT} />
        </section>

        {/* ---------- FINAL CTA ---------- */}
        <section className="avFinal">
          <h2 className="avH2">Ready to open your vault? 💜</h2>
          <p className="avLead" style={{ margin: "10px auto 0" }}>
            Save what you own, find what you need, and never double-buy a figure again.
          </p>
          <div className="avCtaRow" style={{ justifyContent: "center" }}>
            <Link href="/collection" className="avBtn avBtnPrimary">Start your collection</Link>
            <Link href="/demo" className="avBtn avBtnGhost">Try the demo</Link>
          </div>
        </section>

        <p className="avFinePrint">
          Adorable Vault is a fan-made collection tracker and is not affiliated with, sponsored by, or endorsed by
          Disney or Just Play. Character names are used only to help collectors identify figures. Advertising may be
          provided by third parties such as Google AdSense; ads are not endorsements.
        </p>
      </div>

      <div className="avSticky">
        <Link href="/demo" className="avBtn avBtnGhost">👀 Demo</Link>
        <Link href="/collection" className="avBtn avBtnPrimary">💜 Start free</Link>
      </div>
    </main>
  );
}

const FALLBACK_COLLAGE: ShowcaseFigure[] = [
  "Stitch", "Ariel", "Mickey", "Tinkerbell", "Simba", "Rapunzel", "Jack", "Minnie", "Dumbo",
].map((n) => ({
  id: `local-${n}`,
  name: n,
  series: "Series 15",
  rarity: "",
  image: `/images/${encodeURIComponent(`${n} In Full Bloom (15).jpg`)}`,
}));
