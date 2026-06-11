"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "../../lib/supabase";

type Visibility = "private" | "extras_only" | "full";

type ProfileRow = {
  username: string | null;
  is_subscribed: boolean | null;
  collection_visibility: string | null;
  free_months_earned?: number | null;
  referral_username_used?: string | null;
};

const SELLER_PRICE_LABEL = "$3/month";
const SUPPORTER_PRICE_LABEL = "$15/year";

function cleanUsername(value: string) {
  return value
    .trim()
    .replace(/^@+/, "")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toLowerCase()
    .slice(0, 30);
}

function normalizeVisibility(value: unknown): Visibility {
  const clean = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")
    .replace(/\+/g, "_");

  if (["full", "public", "full_collection", "full_public", "all"].includes(clean)) {
    return "full";
  }

  if (
    ["extras_only", "wishlist_extras", "wishlist_and_extras", "wishlist", "extras"].includes(clean)
  ) {
    return "extras_only";
  }

  return "private";
}

function visibilityLabel(value: Visibility) {
  if (value === "full") return "Full Collection";
  if (value === "extras_only") return "Wishlist + Extras";
  return "Private";
}

function visibilityHelp(value: Visibility) {
  if (value === "full") {
    return "Other collectors can see your full public collection, wishlist, and extras.";
  }

  if (value === "extras_only") {
    return "Other collectors can see what you still need and what extras you may trade or sell.";
  }

  return "Only you can see your collection details.";
}

function safeNextPath() {
  if (typeof window === "undefined") return "/account";
  return `${window.location.pathname}${window.location.search}`;
}

function getProfileUrl(username: string) {
  if (typeof window !== "undefined") return `${window.location.origin}/collector/${username}`;
  return `https://www.mydoorables.com/collector/${username}`;
}

function getFreeVaultMessage(ownedCount: number, isSubscribed: boolean) {
  if (isSubscribed) {
    return {
      label: "Paid Perks Active",
      title: "Thanks for supporting the vault 👑",
      text: "Your paid perks are active. Collection tracking stays free and unlimited for every collector.",
      tone: "success",
    };
  }

  if (ownedCount > 0) {
    return {
      label: "Free Unlimited Vault",
      title: "Your collector vault is growing 💜",
      text: `You have ${ownedCount} Doorable${ownedCount === 1 ? "" : "s"} tracked. Keep adding as many as you want for free.`,
      tone: "purple",
    };
  }

  return {
    label: "Free Unlimited Vault",
    title: "Start with your first saved Doorable",
    text: "Track unlimited Doorables for free. Seller Plus, supporter perks, and founding bundles help keep the site running.",
    tone: "neutral",
  };
}

export default function AccountPage() {
  const supabase = useMemo(() => getSupabase(), []);

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");

  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");

  const [visibility, setVisibility] = useState<Visibility>("private");

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [freeMonthsEarned, setFreeMonthsEarned] = useState(0);
  const [referralUsed, setReferralUsed] = useState("");

  const [ownedCount, setOwnedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [extrasCount, setExtrasCount] = useState(0);
  const [activeListingsCount, setActiveListingsCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [referralStatus, setReferralStatus] = useState("");

  useEffect(() => {
    void loadAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAccount() {
    try {
      setLoading(true);
      setError("");
      setNotice("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setUserId("");
        setLoading(false);
        return;
      }

      setUserId(String(user.id));
      setEmail(String(user.email || ""));

      let profile: ProfileRow | null = null;

      const fullProfile = await supabase
        .from("users")
        .select("username, is_subscribed, collection_visibility, free_months_earned, referral_username_used")
        .eq("id", user.id)
        .maybeSingle();

      if (!fullProfile.error) {
        profile = fullProfile.data as ProfileRow | null;
      } else {
        const basicProfile = await supabase
          .from("users")
          .select("username, is_subscribed, collection_visibility")
          .eq("id", user.id)
          .maybeSingle();

        if (!basicProfile.error) {
          profile = basicProfile.data as ProfileRow | null;
        }
      }

      const resolvedUsername = cleanUsername(String(profile?.username || ""));
      setUsername(resolvedUsername);
      setOriginalUsername(resolvedUsername);
      setIsSubscribed(!!profile?.is_subscribed);
      setVisibility(normalizeVisibility(profile?.collection_visibility));
      setFreeMonthsEarned(Number(profile?.free_months_earned || 0));
      setReferralUsed(String(profile?.referral_username_used || ""));

      await loadStats(String(user.id));
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your account.");
      setLoading(false);
    }
  }

  async function loadStats(currentUserId: string) {
    const [doorablesResult, userDoorablesResult, listingsResult] = await Promise.allSettled([
      supabase.from("doorables").select("id", { count: "exact", head: true }),
      supabase.from("user_doorables").select("doorable_id, qty_owned").eq("user_id", currentUserId),
      supabase.from("marketplace_listings").select("id, status").eq("user_id", currentUserId),
    ]);

    if (doorablesResult.status === "fulfilled" && !doorablesResult.value.error) {
      setTotalCount(doorablesResult.value.count || 0);
    }

    if (userDoorablesResult.status === "fulfilled" && !userDoorablesResult.value.error) {
      const rows = userDoorablesResult.value.data || [];
      const ownedIds = new Set<string>();
      let extras = 0;

      rows.forEach((row: any) => {
        const qty = Number(row.qty_owned || 0);
        if (qty > 0 && row.doorable_id) ownedIds.add(String(row.doorable_id));
        if (qty > 1) extras += qty - 1;
      });

      setOwnedCount(ownedIds.size);
      setExtrasCount(extras);
    }

    if (listingsResult.status === "fulfilled" && !listingsResult.value.error) {
      const rows = listingsResult.value.data || [];
      setActiveListingsCount(
        rows.filter((row: any) => String(row.status || "active") === "active").length
      );
    }
  }

  async function saveAccount() {
    try {
      setSaving(true);
      setError("");
      setNotice("");

      if (!userId) {
        setError("Please sign in first.");
        setSaving(false);
        return;
      }

      const clean = cleanUsername(username);

      if (!clean) {
        setError("Please add a username before saving.");
        setSaving(false);
        return;
      }

      if (clean.length < 3) {
        setError("Username needs to be at least 3 characters.");
        setSaving(false);
        return;
      }

      const { data: existingUser, error: existingError } = await supabase
        .from("users")
        .select("id, username")
        .ilike("username", clean)
        .neq("id", userId)
        .maybeSingle();

      if (existingError) {
        setError("Could not check username: " + existingError.message);
        setSaving(false);
        return;
      }

      if (existingUser?.id) {
        setError("That username is already taken. Try a small variation.");
        setSaving(false);
        return;
      }

      const updatePayload = {
        email: email || null,
        username: clean,
        collection_visibility: visibility,
      };

      const { data: updated, error: updateError } = await supabase
        .from("users")
        .update(updatePayload)
        .eq("id", userId)
        .select("id, username")
        .maybeSingle();

      if (updateError || !updated?.id) {
        const { error: upsertError } = await supabase.from("users").upsert(
          {
            id: userId,
            ...updatePayload,
          },
          { onConflict: "id" }
        );

        if (upsertError) {
          setError("Could not save account: " + upsertError.message);
          setSaving(false);
          return;
        }
      }

      setUsername(clean);
      setOriginalUsername(clean);
      setNotice("Account saved 💜 Your vault settings are updated.");
      setSaving(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save account.");
      setSaving(false);
    }
  }

  async function shareProfile() {
    const clean = cleanUsername(username);

    if (!clean) {
      setShareStatus("Save a username before sharing your profile.");
      return;
    }

    const profileUrl = getProfileUrl(clean);

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: "My Adorable Vault profile",
          text: "Check out my Adorable Vault collector profile 💜",
          url: profileUrl,
        });
        setShareStatus("Profile shared 💜");
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(profileUrl);
        setShareStatus("Profile link copied 💜");
      } else {
        setShareStatus(profileUrl);
      }

      window.setTimeout(() => setShareStatus(""), 3000);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setShareStatus("Could not share automatically. Try copying your profile link.");
    }
  }

  async function copyReferralText() {
    const clean = cleanUsername(username);

    if (!clean) {
      setReferralStatus("Save a username first so people can use your referral.");
      return;
    }

    const profileUrl = getProfileUrl(clean);
    const text = `I use Adorable Vault to track my Doorables collection 💜 Check it out here: ${profileUrl} — referral username: @${clean}`;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setReferralStatus("Referral message copied 💜");
      } else {
        setReferralStatus(text);
      }

      window.setTimeout(() => setReferralStatus(""), 4000);
    } catch {
      setReferralStatus("Could not copy automatically. Try sharing your profile link instead.");
    }
  }

  async function signOut() {
    try {
      setSigningOut(true);
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (err) {
      setSigningOut(false);
      setError(err instanceof Error ? err.message : "Could not sign out.");
    }
  }

  const cleanCurrentUsername = cleanUsername(username);
  const hasUnsavedUsername = cleanCurrentUsername !== originalUsername;

  const completion = totalCount ? Math.round((ownedCount / totalCount) * 100) : 0;
  const profileUrl = cleanCurrentUsername ? `/collector/${cleanCurrentUsername}` : "";
  const profileFullUrl = cleanCurrentUsername ? getProfileUrl(cleanCurrentUsername) : "";
  const vaultMessage = getFreeVaultMessage(ownedCount, isSubscribed);

  const setupSteps = [
    {
      label: "Save a username",
      done: !!cleanCurrentUsername,
      detail: cleanCurrentUsername ? `@${cleanCurrentUsername}` : "Creates your public collector link",
    },
    {
      label: "Choose visibility",
      done: visibility !== "private",
      detail:
        visibility === "private"
          ? "Private is safest, but public profiles help sharing"
          : visibilityLabel(visibility),
    },
    {
      label: "Start tracking",
      done: ownedCount > 0,
      detail: ownedCount > 0 ? `${ownedCount} saved Doorables` : "Add your first owned Doorable",
    },
    {
      label: "Share your profile",
      done: !!cleanCurrentUsername && visibility !== "private",
      detail: "Perfect for trades, wishlists, and showing extras",
    },
    {
      label: "Use marketplace tools",
      done: activeListingsCount > 0 || extrasCount > 0,
      detail:
        activeListingsCount > 0
          ? `${activeListingsCount} active listing${activeListingsCount === 1 ? "" : "s"}`
          : extrasCount > 0
            ? `${extrasCount} extra${extrasCount === 1 ? "" : "s"} ready to list`
            : "Track extras first, then list them",
    },
  ];

  const setupDone = setupSteps.filter((step) => step.done).length;
  const setupPercent = Math.round((setupDone / setupSteps.length) * 100);

  if (loading) {
    return (
      <main className="accountPage loadingPage">
        <style jsx>{pageStyles}</style>

        <div className="loadingCard">
          <div className="loadingIcon">💜</div>
          <h1>Loading your account...</h1>
          <p>Getting your vault settings ready.</p>
        </div>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="accountPage">
        <style jsx>{pageStyles}</style>
        <div className="shell">
          <section className="hero guestHero">
            <div>
              <div className="badge">🔐 Account</div>
              <h1 className="heroTitle">Sign in to manage your vault.</h1>
              <p className="heroText">
                Your account page is where you manage your username, public collector profile,
                collection visibility, free tracker status, supporter perks, referral info, and seller tools.
              </p>
              <div className="heroActions">
                <Link href={`/login?next=${encodeURIComponent(safeNextPath())}`} className="primaryButton">
                  💜 Sign In / Sign Up
                </Link>
                <Link href="/demo" className="secondaryButton">
                  👀 Preview First
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="accountPage">
      <style jsx>{pageStyles}</style>

      <div className="shell">
        <section className="hero">
          <div>
            <div className="badge">⚙️ Account Home Base</div>
            <h1 className="heroTitle">Your Vault Account</h1>
            <p className="heroText">
              Make your vault feel personal: set your collector name, choose what others can see,
              share your profile, and jump back into tracking without digging around.
            </p>

            <div className="signedInPill">
              Signed in as <strong>{email}</strong>
            </div>
          </div>

          <div className="heroSideCard">
            <div className="sideLabel">{vaultMessage.label}</div>
            <div className="sideTitle">{isSubscribed ? "Paid Perks 👑" : "Free Vault 💜"}</div>
            <div className="sideText">{vaultMessage.text}</div>
          </div>
        </section>

        <div className="statusStack">
          {!!notice && <div className="noticeBox">{notice}</div>}
          {!!error && <div className="errorBox">{error}</div>}
        </div>

        <section className="statsGrid">
          <div className="statCard">
            <div className="statIcon">💎</div>
            <div className="statValue">{ownedCount}</div>
            <div className="statLabel">Owned Doorables</div>
          </div>

          <div className="statCard">
            <div className="statIcon">✨</div>
            <div className="statValue">{completion}%</div>
            <div className="statLabel">Collection Complete</div>
          </div>

          <div className="statCard">
            <div className="statIcon">🔁</div>
            <div className="statValue">{extrasCount}</div>
            <div className="statLabel">Extras Tracked</div>
          </div>

          <div className="statCard">
            <div className="statIcon">🛍️</div>
            <div className="statValue">{activeListingsCount}</div>
            <div className="statLabel">Active Listings</div>
          </div>
        </section>

        <section className="setupCard">
          <div>
            <div className="eyebrow">Vault setup</div>
            <h2 className="panelTitle">Make your account feel finished</h2>
            <p className="mutedText">
              A complete account makes the site feel more like a personal collector vault and less like another random checklist.
            </p>
          </div>

          <div className="setupProgress">
            <div className="progressCircle">{setupPercent}%</div>
            <div>
              <strong>
                {setupDone}/{setupSteps.length} setup steps complete
              </strong>
              <div className="progressTrack">
                <div className="progressFill" style={{ width: `${setupPercent}%` }} />
              </div>
            </div>
          </div>

          <div className="setupGrid">
            {setupSteps.map((step) => (
              <div key={step.label} className={`setupStep ${step.done ? "done" : ""}`}>
                <span>{step.done ? "✅" : "○"}</span>
                <span>
                  <strong>{step.label}</strong>
                  <small>{step.detail}</small>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="layoutGrid">
          <div className="mainStack">
            <section className="panelCard">
              <div className="panelHeader">
                <div>
                  <div className="eyebrow">Public identity</div>
                  <h2 className="panelTitle">Collector profile</h2>
                </div>
                {hasUnsavedUsername && <span className="unsavedPill">Unsaved</span>}
              </div>

              <div className="formGrid">
                <div>
                  <label className="fieldLabel">Username</label>
                  <div className="usernameRow">
                    <span className="atSymbol">@</span>
                    <input
                      value={username}
                      onChange={(event) => setUsername(cleanUsername(event.target.value))}
                      placeholder="collector_username"
                      className="field usernameField"
                      autoComplete="off"
                    />
                  </div>
                  <div className="helperText">
                    Use letters, numbers, and underscores only. This creates your shareable collector link.
                  </div>
                </div>

                <div className="profilePreviewBox">
                  <div>
                    <div className="previewLabel">Profile link</div>
                    {cleanCurrentUsername ? (
                      <Link href={profileUrl} className="profileLink">
                        {profileFullUrl}
                      </Link>
                    ) : (
                      <div className="mutedText">Save a username to create your profile link.</div>
                    )}
                  </div>

                  <button type="button" onClick={() => void shareProfile()} className="softButton">
                    🔗 Share / Copy
                  </button>
                </div>

                {!!shareStatus && <div className="copyStatus">{shareStatus}</div>}

                <div className="visibilityBox">
                  <div className="visibilityHeader">
                    <div>
                      <div className="previewLabel">Collection visibility</div>
                      <div className="helperText">{visibilityHelp(visibility)}</div>
                    </div>
                    <strong>{visibilityLabel(visibility)}</strong>
                  </div>

                  <div className="visibilityButtons">
                    <button
                      type="button"
                      onClick={() => setVisibility("private")}
                      className={`visibilityButton ${visibility === "private" ? "active" : ""}`}
                    >
                      🔒 Private
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibility("extras_only")}
                      className={`visibilityButton ${visibility === "extras_only" ? "active" : ""}`}
                    >
                      💜 Wishlist + Extras
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibility("full")}
                      className={`visibilityButton ${visibility === "full" ? "active" : ""}`}
                    >
                      🌟 Full Collection
                    </button>
                  </div>
                </div>

                <button type="button" onClick={() => void saveAccount()} disabled={saving} className="saveButton">
                  {saving ? "Saving..." : "Save Account Settings 💜"}
                </button>
              </div>
            </section>

            <section className="panelCard">
              <div className="panelHeader">
                <div>
                  <div className="eyebrow">Quick links</div>
                  <h2 className="panelTitle">Jump back into the vault</h2>
                </div>
              </div>

              <div className="quickGrid">
                <Link href="/collection" className="quickCard">
                  <span className="quickIcon">🧸</span>
                  <span>
                    <strong>Collection</strong>
                    <small>Track have, need, and extras</small>
                  </span>
                </Link>

                <Link href="/marketplace" className="quickCard">
                  <span className="quickIcon">🛍️</span>
                  <span>
                    <strong>Marketplace</strong>
                    <small>Browse collector listings</small>
                  </span>
                </Link>

                <Link href="/sell" className="quickCard">
                  <span className="quickIcon">🏷️</span>
                  <span>
                    <strong>Sell Extras</strong>
                    <small>Create or edit listings</small>
                  </span>
                </Link>

                <Link href="/messages" className="quickCard">
                  <span className="quickIcon">✉️</span>
                  <span>
                    <strong>Messages</strong>
                    <small>Collector and seller chats</small>
                  </span>
                </Link>
              </div>
            </section>
          </div>

          <aside className="sideStack">
            <section className={`panelCard subscriptionCard ${vaultMessage.tone}`}>
              <div className="eyebrow">Plan status</div>
              <h2 className="panelTitle">{vaultMessage.title}</h2>
              <p className="mutedText">{vaultMessage.text}</p>

              {!isSubscribed && (
                <>
                  <div className="freeProgressBox">
                    <div className="progressTop">
                      <strong>Unlimited free tracking</strong>
                      <span>∞</span>
                    </div>
                    <div className="helperText">
                      Track as many Doorables as you want for free. Paid options are for seller tools, supporter perks, and launch bundles.
                    </div>
                  </div>

                  <div className="planMiniGrid">
                    <div className="planMini">
                      <span>Seller Plus</span>
                      <strong>{SELLER_PRICE_LABEL}</strong>
                    </div>
                    <div className="planMini best">
                      <span>Supporter</span>
                      <strong>{SUPPORTER_PRICE_LABEL}</strong>
                    </div>
                  </div>
                </>
              )}

              <div className="sideButtons">
                <Link href="/pricing" className="primaryButton">
                  {isSubscribed ? "View Perks" : "Support / Seller Perks"}
                </Link>
                <Link href="/collection" className="secondaryButton">
                  Open Collection
                </Link>
              </div>
            </section>

            <section className="panelCard">
              <div className="eyebrow">Referral perks</div>
              <h2 className="panelTitle">Share the vault</h2>
              <p className="mutedText">
                Your username can be used as a referral username when someone chooses a paid seller, supporter, or founding bundle. Copy a quick invite message and send it to collector friends.
              </p>

              <div className="referralBox">
                <span>Your referral username</span>
                <strong>{cleanCurrentUsername ? `@${cleanCurrentUsername}` : "Save username first"}</strong>
              </div>

              <button type="button" onClick={() => void copyReferralText()} className="softButton" style={{ width: "100%" }}>
                Copy Referral Message 💜
              </button>

              {!!referralStatus && <div className="copyStatus">{referralStatus}</div>}

              <div className="miniList">
                <div className="miniItem">
                  <span>🎁</span>
                  <span>
                    Free months earned: <strong>{freeMonthsEarned}</strong>
                  </span>
                </div>
                <div className="miniItem">
                  <span>💜</span>
                  <span>
                    Referral used: <strong>{referralUsed ? `@${referralUsed}` : "None yet"}</strong>
                  </span>
                </div>
              </div>
            </section>

            <section className="panelCard nextCard">
              <div className="eyebrow">Best next move</div>
              <h2 className="panelTitle">Keep the hook going</h2>
              <div className="miniList">
                <Link href="/collection" className="miniItem linkedMini">
                  <span>💜</span>
                  <span>
                    Add a few more Doorables so your progress and series stats feel alive.
                  </span>
                </Link>
                <Link href="/marketplace" className="miniItem linkedMini">
                  <span>🛍️</span>
                  <span>
                    Check the Marketplace and see how extras could turn into trades or sales.
                  </span>
                </Link>
                <Link href="/feedback" className="miniItem linkedMini">
                  <span>💬</span>
                  <span>
                    Leave feedback if anything feels confusing, missing, or not collector-friendly.
                  </span>
                </Link>
              </div>
            </section>

            <section className="panelCard dangerCard">
              <div className="eyebrow">Account access</div>
              <h2 className="panelTitle">Sign out</h2>
              <p className="mutedText">This only signs you out on this device. Your vault data stays saved.</p>
              <button type="button" onClick={() => void signOut()} disabled={signingOut} className="signOutButton">
                {signingOut ? "Signing out..." : "Sign Out"}
              </button>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

const pageStyles = `
  .accountPage {
    min-height: 100vh;
    color: white;
    background:
      radial-gradient(circle at 8% 4%, rgba(168, 85, 247, 0.42) 0%, transparent 28%),
      radial-gradient(circle at 88% 10%, rgba(59, 130, 246, 0.30) 0%, transparent 27%),
      radial-gradient(circle at 70% 94%, rgba(236, 72, 153, 0.22) 0%, transparent 30%),
      linear-gradient(180deg, #030712 0%, #080b1f 45%, #020617 100%);
    overflow-x: hidden;
  }

  .accountPage::before {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    background-image:
      radial-gradient(2px 2px at 18% 22%, rgba(255,255,255,0.78) 35%, transparent 36%),
      radial-gradient(1.5px 1.5px at 78% 16%, rgba(255,255,255,0.65) 35%, transparent 36%),
      radial-gradient(1.8px 1.8px at 48% 72%, rgba(255,255,255,0.58) 35%, transparent 36%),
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: auto, auto, auto, 46px 46px, 46px 46px;
    opacity: 0.7;
    mask-image: linear-gradient(to bottom, rgba(0,0,0,0.92), transparent 80%);
  }

  .shell {
    position: relative;
    z-index: 1;
    max-width: 1220px;
    margin: 0 auto;
    padding: 22px;
    padding-bottom: 84px;
  }

  .loadingPage {
    display: grid;
    place-items: center;
    padding: 20px;
  }

  .loadingCard {
    width: min(520px, 100%);
    border-radius: 28px;
    padding: 28px;
    text-align: center;
    background: rgba(255,255,255,0.10);
    border: 1px solid rgba(255,255,255,0.16);
    box-shadow: 0 24px 60px rgba(0,0,0,0.35);
  }

  .loadingIcon {
    width: 64px;
    height: 64px;
    margin: 0 auto 12px;
    border-radius: 22px;
    display: grid;
    place-items: center;
    font-size: 31px;
    background: linear-gradient(135deg, #ec4899, #7c3aed, #2563eb);
  }

  .hero {
    border-radius: 32px;
    padding: 28px;
    margin-bottom: 18px;
    background:
      radial-gradient(circle at top right, rgba(255,255,255,0.14), transparent 34%),
      linear-gradient(135deg, rgba(30,41,59,0.95), rgba(88,28,135,0.86));
    border: 1px solid rgba(255,255,255,0.16);
    box-shadow: 0 26px 64px rgba(0,0,0,0.36);
    display: grid;
    grid-template-columns: minmax(0, 1fr) 330px;
    gap: 18px;
    align-items: center;
  }

  .guestHero {
    grid-template-columns: 1fr;
  }

  .badge {
    display: inline-flex;
    width: fit-content;
    align-items: center;
    gap: 8px;
    padding: 9px 13px;
    border-radius: 999px;
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.15);
    color: #fde68a;
    font-size: 13px;
    font-weight: 1000;
    margin-bottom: 12px;
  }

  .heroTitle {
    margin: 0;
    font-size: clamp(2.15rem, 5.4vw, 4rem);
    line-height: 0.96;
    letter-spacing: -1.8px;
    font-weight: 1000;
    text-wrap: balance;
  }

  .heroText {
    margin: 12px 0 0;
    color: rgba(255,255,255,0.88);
    font-size: 16px;
    line-height: 1.65;
    max-width: 760px;
  }

  .signedInPill {
    margin-top: 16px;
    display: inline-flex;
    width: fit-content;
    max-width: 100%;
    border-radius: 999px;
    padding: 9px 12px;
    color: rgba(255,255,255,0.92);
    background: rgba(15,23,42,0.54);
    border: 1px solid rgba(255,255,255,0.16);
    font-size: 13px;
    font-weight: 850;
    word-break: break-word;
  }

  .signedInPill strong {
    margin-left: 4px;
  }

  .heroSideCard {
    border-radius: 24px;
    padding: 18px;
    background: rgba(15,23,42,0.58);
    border: 1px solid rgba(255,255,255,0.14);
    box-shadow: 0 14px 28px rgba(0,0,0,0.20);
  }

  .sideLabel,
  .eyebrow,
  .previewLabel {
    color: #7c3aed;
    font-size: 12px;
    font-weight: 1000;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .heroSideCard .sideLabel {
    color: #fde68a;
  }

  .sideTitle {
    margin-top: 7px;
    font-size: 24px;
    line-height: 1.05;
    font-weight: 1000;
  }

  .sideText {
    margin-top: 8px;
    color: rgba(255,255,255,0.80);
    font-size: 13px;
    line-height: 1.45;
    font-weight: 800;
  }

  .statusStack {
    display: grid;
    gap: 10px;
    margin-bottom: 18px;
  }

  .noticeBox,
  .errorBox,
  .copyStatus {
    border-radius: 18px;
    padding: 13px 14px;
    font-weight: 900;
    line-height: 1.45;
  }

  .noticeBox,
  .copyStatus {
    background: #ecfdf5;
    color: #065f46;
    border: 1px solid #bbf7d0;
  }

  .errorBox {
    background: #fff1f2;
    color: #9f1239;
    border: 1px solid #fecdd3;
  }

  .statsGrid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 18px;
  }

  .statCard,
  .panelCard,
  .setupCard {
    background: linear-gradient(180deg, #ffffff, #f8fafc);
    color: #111827;
    border-radius: 26px;
    border: 1px solid rgba(255,255,255,0.62);
    box-shadow: 0 18px 40px rgba(0,0,0,0.24);
  }

  .statCard {
    padding: 18px;
  }

  .statIcon {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border-radius: 16px;
    background: linear-gradient(135deg, #ede9fe, #bfdbfe);
    font-size: 23px;
    margin-bottom: 12px;
  }

  .statValue {
    font-size: 32px;
    line-height: 1;
    font-weight: 1000;
    color: #312e81;
  }

  .statLabel {
    margin-top: 6px;
    color: #64748b;
    font-size: 13px;
    line-height: 1.35;
    font-weight: 850;
  }

  .setupCard {
    margin-bottom: 18px;
    padding: 22px;
    background:
      radial-gradient(circle at top right, rgba(196,181,253,0.34), transparent 30%),
      linear-gradient(180deg, #ffffff, #f8fafc);
    display: grid;
    grid-template-columns: minmax(0, 1fr) 280px;
    gap: 16px;
    align-items: center;
  }

  .setupProgress {
    display: grid;
    grid-template-columns: 72px 1fr;
    gap: 12px;
    align-items: center;
    padding: 13px;
    border-radius: 20px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
  }

  .progressCircle {
    width: 64px;
    height: 64px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, #4f46e5, #a855f7);
    color: white;
    font-weight: 1000;
  }

  .setupGrid {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 9px;
  }

  .setupStep {
    display: grid;
    grid-template-columns: 24px 1fr;
    gap: 8px;
    align-items: start;
    padding: 11px;
    border-radius: 16px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
  }

  .setupStep.done {
    background: #ecfdf5;
    border-color: #bbf7d0;
  }

  .setupStep strong,
  .setupStep small {
    display: block;
  }

  .setupStep strong {
    font-size: 13px;
    line-height: 1.2;
  }

  .setupStep small {
    margin-top: 3px;
    color: #64748b;
    font-size: 11px;
    line-height: 1.25;
    font-weight: 800;
  }

  .layoutGrid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 370px;
    gap: 18px;
    align-items: start;
  }

  .mainStack,
  .sideStack {
    display: grid;
    gap: 18px;
  }

  .panelCard {
    padding: 22px;
  }

  .panelHeader {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: start;
    margin-bottom: 16px;
  }

  .panelTitle {
    margin: 5px 0 0;
    color: #111827;
    font-size: 25px;
    line-height: 1.05;
    letter-spacing: -0.7px;
    font-weight: 1000;
  }

  .unsavedPill {
    border-radius: 999px;
    padding: 7px 10px;
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
    font-size: 12px;
    font-weight: 1000;
  }

  .formGrid {
    display: grid;
    gap: 16px;
  }

  .fieldLabel {
    display: block;
    color: #334155;
    font-size: 13px;
    font-weight: 950;
    margin-bottom: 6px;
  }

  .usernameRow {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    border-radius: 16px;
    border: 1px solid #d1d5db;
    background: #ffffff;
    overflow: hidden;
  }

  .atSymbol {
    padding-left: 14px;
    padding-right: 2px;
    color: #7c3aed;
    font-weight: 1000;
    font-size: 16px;
  }

  .field {
    width: 100%;
    min-height: 52px;
    padding: 14px;
    border-radius: 15px;
    border: 1px solid #d1d5db;
    box-sizing: border-box;
    font-size: 15px;
    background: white;
    color: #111827;
    outline: none;
  }

  .usernameField {
    border: none;
    border-radius: 0;
    padding-left: 6px;
  }

  .field:focus,
  .usernameRow:focus-within {
    border-color: #8b5cf6;
    box-shadow: 0 0 0 4px rgba(139,92,246,0.12);
  }

  .helperText,
  .mutedText {
    color: #64748b;
    line-height: 1.55;
    font-size: 14px;
    font-weight: 800;
  }

  .helperText {
    margin-top: 7px;
    font-size: 13px;
  }

  .profilePreviewBox,
  .visibilityBox,
  .freeProgressBox,
  .referralBox {
    border-radius: 20px;
    padding: 16px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
  }

  .profilePreviewBox {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
  }

  .profileLink,
  .profileLink:visited {
    display: inline-flex;
    margin-top: 5px;
    color: #4f46e5 !important;
    font-weight: 1000;
    text-decoration: none !important;
    word-break: break-word;
  }

  .visibilityHeader {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: start;
    margin-bottom: 12px;
  }

  .visibilityButtons {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 9px;
  }

  .visibilityButton,
  .softButton,
  .saveButton,
  .signOutButton,
  .primaryButton,
  .secondaryButton {
    min-height: 48px;
    border-radius: 16px;
    padding: 12px 14px;
    font-weight: 1000;
    font-family: inherit;
    cursor: pointer;
    text-decoration: none !important;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-sizing: border-box;
  }

  .visibilityButton,
  .softButton,
  .secondaryButton {
    color: #3730a3 !important;
    background: #eef2ff;
    border: 1px solid #c7d2fe;
  }

  .visibilityButton.active,
  .saveButton,
  .primaryButton {
    border: 1px solid transparent;
    color: white !important;
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    box-shadow: 0 14px 28px rgba(79,70,229,0.24);
  }

  .saveButton {
    width: 100%;
    border-radius: 999px;
  }

  .saveButton:disabled,
  .signOutButton:disabled {
    opacity: 0.65;
    cursor: wait;
  }

  .quickGrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .quickCard,
  .quickCard:visited {
    display: grid;
    grid-template-columns: 48px 1fr;
    gap: 10px;
    align-items: center;
    min-height: 82px;
    border-radius: 20px;
    padding: 13px;
    color: #111827 !important;
    text-decoration: none !important;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .quickCard:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgba(79,70,229,0.12);
  }

  .quickIcon {
    width: 48px;
    height: 48px;
    border-radius: 17px;
    display: grid;
    place-items: center;
    font-size: 24px;
    background: linear-gradient(135deg, #ede9fe, #bfdbfe);
  }

  .quickCard strong,
  .quickCard small {
    display: block;
  }

  .quickCard strong {
    font-size: 15px;
    font-weight: 1000;
    line-height: 1.15;
  }

  .quickCard small {
    margin-top: 3px;
    color: #64748b;
    font-size: 12px;
    line-height: 1.3;
    font-weight: 800;
  }

  .subscriptionCard {
    background:
      radial-gradient(circle at top right, rgba(196,181,253,0.34), transparent 30%),
      linear-gradient(180deg, #ffffff, #f8fafc);
  }

  .subscriptionCard.warning {
    background:
      radial-gradient(circle at top right, rgba(250,204,21,0.32), transparent 32%),
      linear-gradient(180deg, #ffffff, #fff7ed);
  }

  .subscriptionCard.danger {
    background:
      radial-gradient(circle at top right, rgba(244,63,94,0.20), transparent 30%),
      linear-gradient(180deg, #ffffff, #fff1f2);
  }

  .subscriptionCard.success {
    background:
      radial-gradient(circle at top right, rgba(34,197,94,0.20), transparent 30%),
      linear-gradient(180deg, #ffffff, #ecfdf5);
  }

  .progressTop {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: center;
    margin-bottom: 10px;
    color: #312e81;
    font-weight: 1000;
  }

  .progressTrack {
    height: 11px;
    border-radius: 999px;
    overflow: hidden;
    background: #e5e7eb;
    margin-top: 9px;
  }

  .progressFill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #60a5fa, #c084fc, #f0abfc);
  }

  .planMiniGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 9px;
    margin-top: 12px;
  }

  .planMini {
    border-radius: 16px;
    padding: 11px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
  }

  .planMini.best {
    background: #fef3c7;
    border-color: #fde68a;
  }

  .planMini span,
  .planMini strong,
  .referralBox span,
  .referralBox strong {
    display: block;
  }

  .planMini span,
  .referralBox span {
    color: #64748b;
    font-size: 12px;
    font-weight: 900;
    margin-bottom: 4px;
  }

  .planMini strong,
  .referralBox strong {
    color: #312e81;
    font-size: 19px;
    font-weight: 1000;
    word-break: break-word;
  }

  .sideButtons {
    display: grid;
    gap: 10px;
    margin-top: 16px;
  }

  .miniList {
    display: grid;
    gap: 10px;
    margin-top: 14px;
  }

  .miniItem,
  .miniItem:visited {
    display: grid;
    grid-template-columns: 34px 1fr;
    gap: 10px;
    align-items: start;
    padding: 12px;
    border-radius: 17px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    color: #374151 !important;
    line-height: 1.45;
    font-weight: 800;
    font-size: 13px;
    text-decoration: none !important;
  }

  .linkedMini:hover {
    border-color: #a78bfa;
    box-shadow: 0 10px 22px rgba(124,58,237,0.12);
  }

  .nextCard {
    background:
      radial-gradient(circle at top right, rgba(191,219,254,0.55), transparent 32%),
      linear-gradient(180deg, #ffffff, #f8fafc);
  }

  .dangerCard {
    background: linear-gradient(180deg, #ffffff, #fff7ed);
  }

  .signOutButton {
    width: 100%;
    margin-top: 12px;
    color: #9f1239;
    background: #fff1f2;
    border: 1px solid #fecdd3;
  }

  .heroActions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 20px;
  }

  @media (max-width: 1080px) {
    .setupGrid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 980px) {
    .shell {
      padding: 14px;
      padding-bottom: 62px;
    }

    .hero {
      grid-template-columns: 1fr;
      border-radius: 24px;
      padding: 21px;
      gap: 14px;
    }

    .heroTitle {
      font-size: clamp(2rem, 10vw, 3rem);
      letter-spacing: -1.2px;
    }

    .heroText {
      font-size: 14px;
      line-height: 1.5;
    }

    .heroSideCard {
      border-radius: 20px;
    }

    .statsGrid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .statCard {
      border-radius: 20px;
      padding: 14px;
    }

    .statValue {
      font-size: 26px;
    }

    .setupCard {
      grid-template-columns: 1fr;
      border-radius: 22px;
      padding: 17px;
    }

    .setupProgress {
      grid-template-columns: 64px 1fr;
      padding: 11px;
    }

    .progressCircle {
      width: 58px;
      height: 58px;
    }

    .layoutGrid {
      grid-template-columns: 1fr;
    }

    .panelCard {
      border-radius: 22px;
      padding: 17px;
    }

    .panelHeader,
    .visibilityHeader {
      display: grid;
    }

    .profilePreviewBox {
      grid-template-columns: 1fr;
    }

    .softButton,
    .primaryButton,
    .secondaryButton {
      width: 100%;
    }

    .visibilityButtons {
      grid-template-columns: 1fr;
    }

    .quickGrid {
      grid-template-columns: 1fr;
    }

    .signedInPill {
      display: grid;
      border-radius: 18px;
    }
  }

  @media (max-width: 520px) {
    .setupGrid {
      grid-template-columns: 1fr;
    }

    .planMiniGrid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 420px) {
    .statsGrid {
      grid-template-columns: 1fr;
    }

    .heroActions {
      display: grid;
      grid-template-columns: 1fr;
    }
  }
`;
