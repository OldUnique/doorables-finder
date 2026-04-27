#!/usr/bin/env node
/*
Adorable Vault Collection Elite Merger
Run from your project root:
  node merge-collection-elite.cjs

This upgrades your EXISTING full app/collection/page.tsx and creates a backup.
It keeps your tiers, filters, uploads, public collectors, visibility, series progress, and card styling.
*/

const fs = require('fs');
const path = require('path');
const file = process.argv[2] || path.join('app', 'collection', 'page.tsx');

function stop(msg) { console.error('\n❌ ' + msg + '\n'); process.exit(1); }
function log(msg) { console.log('💜 ' + msg); }
if (!fs.existsSync(file)) stop(`Could not find ${file}. Run this from your project root.`);
let code = fs.readFileSync(file, 'utf8');
const backup = `${file}.backup-${Date.now()}`;
fs.writeFileSync(backup, code, 'utf8');
log(`Backup created: ${backup}`);

function addAfter(search, insert, label) {
  if (code.includes(insert.trim().split('\n')[0])) return log(`${label} already present`);
  const i = code.indexOf(search);
  if (i < 0) stop(`Could not find location for ${label}`);
  code = code.slice(0, i + search.length) + insert + code.slice(i + search.length);
  log(`Added ${label}`);
}
function addBefore(search, insert, label) {
  if (code.includes(insert.trim().split('\n')[0])) return log(`${label} already present`);
  const i = code.indexOf(search);
  if (i < 0) stop(`Could not find location for ${label}`);
  code = code.slice(0, i) + insert + code.slice(i);
  log(`Added ${label}`);
}
function replace(search, replacement, label) {
  if (!code.includes(search)) return log(`${label}: exact target not found; skipped`);
  code = code.replace(search, replacement);
  log(`Updated ${label}`);
}

if (!code.includes('const FREE_LIMIT = 50;')) {
  addAfter(
`type TierCard = {
  title: string;
  label: string;
  subtext: string;
  accent: string;
};`,
`\n\nconst FREE_LIMIT = 50;\nconst MONTHLY_PRICE_LABEL = "$3/month";\nconst YEARLY_PRICE_LABEL = "$15/year";\n`,
'free limit constants');
}

replace(
`  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);`,
`  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [loading, setLoading] = useState(true);`,
'notice/modal state');

if (!code.includes('document.title = "Doorables Collection Tracker | Adorable Vault";')) {
  addBefore(
`  useEffect(() => {
    void load();
  }, []);`,
`  useEffect(() => {
    document.title = "Doorables Collection Tracker | Adorable Vault";

    const description =
      "Track your Disney Doorables collection, wishlist, extras, rarity, series progress, marketplace finds, and collector notes with Adorable Vault.";

    const keywords =
      "Doorables tracker, Disney Doorables collection tracker, Doorables checklist, Doorables wishlist, Doorables marketplace, Doorables extras, Doorables collector app, Doorables inventory, Doorables series tracker, Disney Doorables checklist, Adorable Vault";

    function setMeta(name: string, content: string) {
      let tag = document.querySelector(\`meta[name="\${name}"]\`) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.name = name;
        document.head.appendChild(tag);
      }
      tag.content = content;
    }

    function setProperty(property: string, content: string) {
      let tag = document.querySelector(\`meta[property="\${property}"]\`) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", property);
        document.head.appendChild(tag);
      }
      tag.content = content;
    }

    setMeta("description", description);
    setMeta("keywords", keywords);
    setMeta("robots", "index, follow");
    setProperty("og:title", "Adorable Vault | Doorables Collection Tracker");
    setProperty("og:description", description);
    setProperty("og:type", "website");
    setProperty("og:site_name", "Adorable Vault");

    let schema = document.getElementById("adorable-vault-schema") as HTMLScriptElement | null;
    if (!schema) {
      schema = document.createElement("script");
      schema.id = "adorable-vault-schema";
      schema.type = "application/ld+json";
      document.head.appendChild(schema);
    }

    schema.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Adorable Vault",
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web",
      description,
      offers: [
        { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free tracking up to 50 Doorables." },
        { "@type": "Offer", price: "3", priceCurrency: "USD", description: "Monthly full collector access." },
        { "@type": "Offer", price: "15", priceCurrency: "USD", description: "Yearly full collector access." }
      ],
    });
  }, []);

`,
'SEO metadata');
}

replace(
`  const totalCount = cards.length;
  const ownedCount = cards.filter((c) => c.qty > 0).length;
  const needCount = cards.filter((c) => c.qty <= 0).length;
  const completion = totalCount ? Math.round((ownedCount / totalCount) * 100) : 0;`,
`  const totalCount = cards.length;
  const ownedCount = cards.filter((c) => c.qty > 0).length;
  const needCount = cards.filter((c) => c.qty <= 0).length;
  const completion = totalCount ? Math.round((ownedCount / totalCount) * 100) : 0;
  const extrasCount = cards.reduce((sum, card) => sum + Math.max(0, Number(card.qty || 0) - 1), 0);
  const freeSlotsLeft = Math.max(0, FREE_LIMIT - ownedCount);
  const freeLimitReached = !isSubscribed && ownedCount >= FREE_LIMIT;`,
'free limit derived values');

replace(
`      if (!isSubscribed && isAddingNewOwned && ownedCount >= 50) {
        setError("Free accounts can save up to 50 Doorables. Upgrade to unlock unlimited collection 💜");
        return;
      }`,
`      if (!isSubscribed && isAddingNewOwned && ownedCount >= FREE_LIMIT) {
        setError(\`Free accounts can save up to \${FREE_LIMIT} Doorables. Upgrade for unlimited tracking, marketplace tools, selling extras, and full collector access 💜\`);
        setShowUpgradeModal(true);
        document.getElementById("upgrade-wall")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }`,
'50 limit behavior');

replace(`      setSavingId(card.id);
      setError("");`, `      setSavingId(card.id);
      setError("");
      setNotice("");`, 'clear notice on save');
replace(`      setSavingId("");
    } catch (err) {`, `      setNotice(qty > 0 ? "Saved to your collection 💜" : "Removed from owned collection.");
      setSavingId("");
    } catch (err) {`, 'success notice');
replace(`    alert("Photo submitted 💜");`, `    setNotice("Photo submitted for review 💜");`, 'photo success notice');
replace(`  const cardsPerPage = isMobile ? 12 : 30;`, `  const cardsPerPage = isMobile ? 10 : 30;`, 'mobile pagination');

const css = `
        .eliteStatusStack { position: sticky; top: 8px; z-index: 60; display: grid; gap: 8px; margin-bottom: 12px; }
        .eliteNotice, .eliteError { border-radius: 18px; padding: 12px 14px; font-weight: 900; box-shadow: 0 12px 26px rgba(0,0,0,0.20); }
        .eliteNotice { background: #ecfdf5; color: #065f46; border: 1px solid #bbf7d0; }
        .eliteError { background: #fff1f2; color: #9f1239; border: 1px solid #fecdd3; }
        .eliteUpgradeWall { margin-bottom: 18px; border-radius: 26px; padding: 20px; color: #111827; background: radial-gradient(circle at top right, rgba(196,181,253,0.42), transparent 30%), linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96)); border: 1px solid rgba(255,255,255,0.55); box-shadow: 0 18px 38px rgba(0,0,0,0.20); display: flex; justify-content: space-between; gap: 18px; align-items: center; }
        .eliteUpgradeEyebrow { color: #6d28d9; font-size: 13px; font-weight: 1000; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 7px; }
        .eliteUpgradeTitle { font-size: clamp(1.35rem, 3vw, 2rem); font-weight: 1000; letter-spacing: -0.6px; line-height: 1.1; margin-bottom: 8px; }
        .eliteUpgradeText { color: #4b5563; line-height: 1.6; font-size: 15px; max-width: 760px; }
        .elitePlanRow { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
        .eliteMiniPlan { border-radius: 17px; padding: 11px 13px; background: #f8fafc; border: 1px solid #e5e7eb; min-width: 130px; }
        .eliteMiniPlan.best { background: linear-gradient(135deg, #f5f3ff, #eff6ff); border-color: #a78bfa; box-shadow: 0 10px 20px rgba(124,58,237,0.10); }
        .eliteMiniPlan span { display: block; color: #64748b; font-size: 12px; font-weight: 900; margin-bottom: 4px; }
        .eliteMiniPlan strong { color: #312e81; font-size: 20px; font-weight: 1000; }
        .eliteUpgradeButton, .eliteModalButton { min-height: 50px; border-radius: 17px; padding: 13px 18px; font-weight: 1000; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; background: linear-gradient(90deg, #4f46e5, #7c3aed); color: white; box-shadow: 0 14px 26px rgba(79,70,229,0.26); }
        .eliteModalOverlay { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 16px; background: rgba(2,6,23,0.72); backdrop-filter: blur(10px); }
        .eliteModal { position: relative; width: min(540px, 100%); border-radius: 30px; padding: 24px; color: #111827; background: radial-gradient(circle at top right, rgba(196,181,253,0.55), transparent 32%), linear-gradient(180deg, #ffffff, #f8fafc); border: 1px solid rgba(255,255,255,0.75); box-shadow: 0 28px 80px rgba(0,0,0,0.42); text-align: center; }
        .eliteModalClose { position: absolute; right: 14px; top: 12px; width: 38px; height: 38px; border-radius: 999px; border: none; background: #eef2ff; color: #312e81; font-size: 25px; font-weight: 900; cursor: pointer; }
        .eliteModalIcon { width: 64px; height: 64px; margin: 0 auto 12px; border-radius: 22px; display: grid; place-items: center; font-size: 31px; background: linear-gradient(135deg, #ddd6fe, #bfdbfe); }
        .eliteModalTitle { margin: 0; font-size: clamp(1.8rem, 6vw, 2.6rem); line-height: 1; letter-spacing: -1px; font-weight: 1000; color: #111827; }
        .eliteModalText { margin: 13px auto 0; max-width: 430px; color: #4b5563; line-height: 1.6; font-weight: 750; }
        .eliteModalPlans { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 18px; }
        .eliteModalPlan { border-radius: 20px; padding: 16px; background: #ffffff; border: 1px solid #e5e7eb; box-shadow: 0 10px 24px rgba(0,0,0,0.08); }
        .eliteModalPlan.best { border-color: #a78bfa; background: linear-gradient(135deg, #f5f3ff, #eff6ff); }
        .eliteBestValueTag { display: inline-flex; margin-bottom: 8px; padding: 5px 9px; border-radius: 999px; color: white; background: linear-gradient(90deg, #4f46e5, #7c3aed); font-size: 11px; font-weight: 1000; }
        .elitePlanName { font-weight: 1000; color: #334155; }
        .elitePlanPrice { margin-top: 5px; font-size: 31px; line-height: 1; font-weight: 1000; color: #312e81; }
        .elitePlanSub { margin-top: 6px; font-size: 13px; color: #64748b; font-weight: 800; }
        .eliteModalButton { margin-top: 18px; width: 100%; }
        .eliteModalLater { margin-top: 10px; border: none; background: transparent; color: #64748b; font-weight: 900; cursor: pointer; }
        .eliteMobileSticky { position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 80; display: none; grid-template-columns: 1fr auto; gap: 11px; align-items: center; padding: 11px; border-radius: 22px; background: rgba(15,23,42,0.88); border: 1px solid rgba(255,255,255,0.14); backdrop-filter: blur(14px); box-shadow: 0 18px 40px rgba(0,0,0,0.36); }
        .eliteMobileTop { color: white; font-size: 13px; font-weight: 1000; margin-bottom: 7px; }
        .eliteMobileTrack { height: 8px; border-radius: 999px; background: rgba(255,255,255,0.16); overflow: hidden; }
        .eliteMobileFill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #60a5fa, #c084fc); }
        .eliteMobileButton { min-height: 44px; border-radius: 15px; padding: 10px 14px; text-decoration: none; color: #312e81; background: white; font-weight: 1000; display: inline-flex; align-items: center; justify-content: center; }
        @media (max-width: 920px) { .eliteUpgradeWall { display: grid; padding: 16px; border-radius: 22px; } .eliteUpgradeButton { width: 100%; } .eliteMobileSticky { display: grid; } .eliteModalPlans { grid-template-columns: 1fr; } }
`;
if (!code.includes('.eliteUpgradeWall')) addBefore('        @media (min-width: 641px) {', css, 'elite CSS');

if (!code.includes('eliteStatusStack')) {
  addBefore('        <section className="heroSection">', `        <div className="eliteStatusStack">\n          {error && <div className="eliteError">{error}</div>}\n          {notice && <div className="eliteNotice">{notice}</div>}\n        </div>\n\n`, 'status banners');
}
if (!code.includes('className="eliteUpgradeWall"')) {
  addBefore('        <section className="tierGrid">', `        <section id="upgrade-wall" className="eliteUpgradeWall">\n          <div>\n            <div className="eliteUpgradeEyebrow">\n              {isSubscribed ? "👑 Full Access Active" : freeLimitReached ? "💜 Free Vault Full" : "✨ Free Collector Plan"}\n            </div>\n            <div className="eliteUpgradeTitle">\n              {isSubscribed ? "Unlimited collector tracking unlocked" : freeLimitReached ? "You reached 50 saved Doorables" : \`Save \${freeSlotsLeft} more Doorables for free\`}\n            </div>\n            <div className="eliteUpgradeText">\n              {isSubscribed\n                ? "You have unlimited collection tracking, marketplace access, selling tools, photo submissions, public collector features, and full vault access."\n                : freeLimitReached\n                  ? "Upgrade to keep adding Doorables, organize unlimited extras, use marketplace tools, and unlock full collector access."\n                  : \`You are using \${ownedCount}/\${FREE_LIMIT} free saved Doorables. Upgrade anytime for unlimited tracking.\`}\n            </div>\n            {!isSubscribed && (\n              <div className="elitePlanRow">\n                <div className="eliteMiniPlan"><span>Monthly</span><strong>{MONTHLY_PRICE_LABEL}</strong></div>\n                <div className="eliteMiniPlan best"><span>Best Value</span><strong>{YEARLY_PRICE_LABEL}</strong></div>\n              </div>\n            )}\n          </div>\n          {!isSubscribed && <Link href="/pricing" className="eliteUpgradeButton">Upgrade for Full Access</Link>}\n        </section>\n\n`, 'upgrade wall');
}

replace(
`                    disabled={savingId === item.id}
                    className="qtyButton"
                    style={{
                      border: "1px solid " + rarity.border,
                      background: "rgba(255,255,255,0.90)",
                      color: rarity.text,
                    }}
                  >
                    +`,
`                    disabled={savingId === item.id || (!isSubscribed && item.qty <= 0 && ownedCount >= FREE_LIMIT)}
                    className="qtyButton"
                    style={{
                      border: "1px solid " + rarity.border,
                      background: !isSubscribed && item.qty <= 0 && ownedCount >= FREE_LIMIT ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.90)",
                      color: rarity.text,
                      opacity: !isSubscribed && item.qty <= 0 && ownedCount >= FREE_LIMIT ? 0.55 : 1,
                      cursor: !isSubscribed && item.qty <= 0 && ownedCount >= FREE_LIMIT ? "not-allowed" : "pointer",
                    }}
                  >
                    +`, 'plus button lock');

if (!code.includes('Free limit reached. Upgrade to add more.')) {
  addBefore('                <div className="qtyControls">', `                {!isSubscribed && item.qty <= 0 && ownedCount >= FREE_LIMIT && (\n                  <div style={{ marginBottom: 8, padding: 10, borderRadius: 12, background: "#fff1f2", color: "#9f1239", fontWeight: 850, fontSize: 13, lineHeight: 1.35 }}>\n                    Free limit reached. Upgrade to add more.\n                  </div>\n                )}\n\n`, 'card warning');
}

if (!code.includes('eliteModalOverlay')) {
  addBefore('    </main>', `      {showUpgradeModal && (\n        <div className="eliteModalOverlay" role="dialog" aria-modal="true">\n          <div className="eliteModal">\n            <button type="button" className="eliteModalClose" onClick={() => setShowUpgradeModal(false)} aria-label="Close upgrade popup">×</button>\n            <div className="eliteModalIcon">💜</div>\n            <h2 className="eliteModalTitle">Your free vault is full!</h2>\n            <p className="eliteModalText">You have saved {ownedCount}/{FREE_LIMIT} Doorables. Upgrade to unlock unlimited tracking, marketplace tools, selling extras, and full collector access.</p>\n            <div className="eliteModalPlans">\n              <div className="eliteModalPlan"><div className="elitePlanName">Monthly</div><div className="elitePlanPrice">$3</div><div className="elitePlanSub">Flexible access</div></div>\n              <div className="eliteModalPlan best"><div className="eliteBestValueTag">Best value</div><div className="elitePlanName">Yearly</div><div className="elitePlanPrice">$15</div><div className="elitePlanSub">Save big all year</div></div>\n            </div>\n            <Link href="/pricing" className="eliteModalButton">Upgrade Now</Link>\n            <button type="button" className="eliteModalLater" onClick={() => setShowUpgradeModal(false)}>Not right now</button>\n          </div>\n        </div>\n      )}\n\n      {!isSubscribed && (\n        <div className="eliteMobileSticky">\n          <div>\n            <div className="eliteMobileTop">{freeLimitReached ? "Free limit reached" : \`\${ownedCount}/\${FREE_LIMIT} saved\`}</div>\n            <div className="eliteMobileTrack"><div className="eliteMobileFill" style={{ width: \`\${Math.min(100, Math.round((ownedCount / FREE_LIMIT) * 100))}%\` }} /></div>\n          </div>\n          <Link href="/pricing" className="eliteMobileButton">Upgrade</Link>\n        </div>\n      )}\n\n`, 'modal and sticky');
}

fs.writeFileSync(file, code, 'utf8');
log('Elite merge complete!');
console.log('\nTest: add 51st free Doorable, mobile sticky, upgrade popup, subscribed unlimited.');
console.log('Backup:', backup);
