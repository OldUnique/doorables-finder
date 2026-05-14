"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="page">
      <style jsx>{`
        .page {
          min-height: 100vh;
          color: white;
          background:
            radial-gradient(circle at 8% 4%, rgba(168, 85, 247, 0.42) 0%, transparent 28%),
            radial-gradient(circle at 88% 10%, rgba(59, 130, 246, 0.30) 0%, transparent 27%),
            radial-gradient(circle at 70% 94%, rgba(236, 72, 153, 0.22) 0%, transparent 30%),
            linear-gradient(180deg, #030712 0%, #080b1f 45%, #020617 100%);
          overflow-x: hidden;
        }

        .page::before {
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
          max-width: 1120px;
          margin: 0 auto;
          padding: 22px;
          padding-bottom: 90px;
        }

        .topNav {
          display: flex;
          align-items: center;
          margin-bottom: 18px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          color: white;
          text-decoration: none;
          min-width: 0;
        }

        .brandIcon {
          width: 58px;
          height: 58px;
          border-radius: 20px;
          display: grid;
          place-items: center;
          font-size: 31px;
          background: radial-gradient(circle at top left, #fef3c7, #a855f7 48%, #020617);
          box-shadow: 0 18px 38px rgba(168, 85, 247, 0.42);
          flex: 0 0 auto;
        }

        .brandTitle {
          display: block;
          font-size: clamp(1.45rem, 4vw, 2.15rem);
          font-weight: 1000;
          line-height: 0.95;
          letter-spacing: -0.8px;
          background: linear-gradient(90deg, #fef3c7, #f0abfc, #bfdbfe);
          -webkit-background-clip: text;
          color: transparent;
        }

        .brandSub {
          display: block;
          margin-top: 5px;
          color: #d8b4fe;
          font-weight: 950;
          font-size: 14px;
        }

        .hero {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 18px;
          align-items: stretch;
          margin-bottom: 18px;
        }

        .heroCard,
        .quickCard {
          border-radius: 32px;
          border: 1px solid rgba(255,255,255,0.16);
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.14), transparent 34%),
            linear-gradient(135deg, rgba(30,41,59,0.95), rgba(88,28,135,0.86));
          box-shadow: 0 26px 64px rgba(0,0,0,0.36);
        }

        .heroCard {
          padding: 32px;
        }

        .quickCard {
          padding: 20px;
          display: grid;
          align-content: center;
          gap: 12px;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 13px;
          border-radius: 999px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.15);
          font-size: 13px;
          font-weight: 1000;
          margin-bottom: 16px;
        }

        .headline {
          margin: 0;
          font-size: clamp(2.25rem, 6vw, 4.35rem);
          line-height: 0.94;
          letter-spacing: -2px;
          font-weight: 1000;
          text-wrap: balance;
        }

        .heroText {
          margin-top: 18px;
          color: rgba(255,255,255,0.90);
          font-size: 17px;
          line-height: 1.65;
          max-width: 760px;
        }

        .buttonRow {
          display: flex;
          gap: 11px;
          flex-wrap: wrap;
          margin-top: 24px;
        }

        .primaryButton,
        .secondaryButton,
        .lightButton {
          min-height: 50px;
          border-radius: 999px;
          padding: 13px 18px;
          font-weight: 1000;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .primaryButton:hover,
        .secondaryButton:hover,
        .lightButton:hover {
          transform: translateY(-2px);
        }

        .primaryButton,
        .primaryButton:visited {
          background: linear-gradient(90deg, #ffffff, #fef3c7);
          color: #312e81;
          border: 1px solid rgba(255,255,255,0.55);
          box-shadow: 0 18px 40px rgba(255,255,255,0.22);
        }

        .secondaryButton,
        .secondaryButton:visited {
          background: linear-gradient(90deg, #4f46e5, #a855f7);
          color: #ffffff;
          border: 1px solid rgba(255,255,255,0.45);
          box-shadow: 0 16px 34px rgba(124,58,237,0.50);
        }

        .miniStat {
          border-radius: 24px;
          padding: 17px;
          background: rgba(15,23,42,0.62);
          border: 1px solid rgba(255,255,255,0.14);
          box-shadow: 0 14px 28px rgba(0,0,0,0.22);
        }

        .miniLabel {
          color: #fde68a;
          font-size: 12px;
          font-weight: 1000;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 7px;
        }

        .miniTitle {
          font-size: 22px;
          font-weight: 1000;
          line-height: 1.08;
          margin-bottom: 7px;
        }

        .miniText {
          color: rgba(255,255,255,0.82);
          line-height: 1.5;
          font-size: 14px;
        }

        .founderSection {
          margin: 18px 0;
          border-radius: 32px;
          padding: 24px;
          color: #111827;
          background:
            radial-gradient(circle at top right, rgba(250,204,21,0.34), transparent 28%),
            radial-gradient(circle at bottom left, rgba(168,85,247,0.24), transparent 30%),
            linear-gradient(180deg, #ffffff, #f8fafc);
          border: 1px solid rgba(255,255,255,0.65);
          box-shadow: 0 22px 50px rgba(0,0,0,0.24);
        }

        .founderLayout {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 18px;
          align-items: stretch;
        }

        .founderBadge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          width: fit-content;
          margin-bottom: 12px;
          border-radius: 999px;
          padding: 8px 12px;
          color: #78350f;
          background: #fef3c7;
          border: 1px solid #fde68a;
          font-size: 12px;
          font-weight: 1000;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .founderTitle {
          margin: 0;
          color: #312e81;
          font-size: clamp(1.75rem, 4vw, 3rem);
          line-height: 1;
          letter-spacing: -1.2px;
          font-weight: 1000;
        }

        .founderText {
          margin-top: 12px;
          color: #475569;
          line-height: 1.65;
          font-size: 15px;
          max-width: 720px;
        }

        .founderCard {
          display: grid;
          gap: 10px;
          align-content: center;
          border-radius: 24px;
          padding: 18px;
          background: linear-gradient(135deg, #f5f3ff, #eff6ff);
          border: 1px solid #c4b5fd;
          box-shadow: 0 16px 34px rgba(124,58,237,0.16);
        }

        .founderPerk,
        .listItem {
          display: grid;
          grid-template-columns: 34px 1fr;
          gap: 10px;
          align-items: start;
          border-radius: 16px;
          padding: 12px;
          background: rgba(255,255,255,0.82);
          border: 1px solid rgba(196,181,253,0.75);
          color: #334155;
          line-height: 1.45;
          font-size: 14px;
          font-weight: 850;
        }

        .founderFinePrint {
          margin-top: 12px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
          font-weight: 800;
        }

        .section {
          margin-top: 18px;
        }

        .sectionHeader {
          margin: 28px 0 13px;
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 14px;
        }

        .eyebrow {
          color: #fef08a;
          font-size: 13px;
          font-weight: 1000;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 6px;
        }

        .sectionTitle {
          margin: 0;
          font-size: clamp(1.48rem, 3vw, 2.2rem);
          line-height: 1.05;
          letter-spacing: -0.9px;
          font-weight: 1000;
        }

        .sectionText {
          max-width: 690px;
          color: rgba(255,255,255,0.82);
          line-height: 1.6;
          font-size: 14px;
        }

        .featureGrid,
        .splitGrid {
          display: grid;
          gap: 14px;
        }

        .featureGrid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .splitGrid {
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .featureCard {
          border-radius: 24px;
          padding: 18px;
          min-height: 190px;
          background: rgba(15,23,42,0.78);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 16px 34px rgba(0,0,0,0.24);
        }

        .featureIcon {
          width: 58px;
          height: 58px;
          border-radius: 20px;
          display: grid;
          place-items: center;
          font-size: 30px;
          background: linear-gradient(135deg, #ede9fe, #bfdbfe);
          margin-bottom: 14px;
        }

        .featureTitle {
          color: #fde68a;
          font-size: 18px;
          line-height: 1.1;
          font-weight: 1000;
          margin-bottom: 9px;
        }

        .featureText {
          color: rgba(255,255,255,0.86);
          line-height: 1.55;
          font-size: 14px;
        }

        .whiteCard,
        .noticeCard {
          color: #111827;
          border-radius: 28px;
          padding: 24px;
          border: 1px solid rgba(255,255,255,0.55);
          box-shadow: 0 18px 38px rgba(0,0,0,0.22);
        }

        .whiteCard {
          background: linear-gradient(180deg, #ffffff, #f8fafc);
        }

        .noticeCard {
          background:
            radial-gradient(circle at top right, rgba(196,181,253,0.34), transparent 30%),
            linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96));
        }

        .whiteCard .eyebrow {
          color: #7c3aed;
        }

        .whiteText,
        .noticeText {
          color: #4b5563;
          line-height: 1.65;
          font-size: 15px;
        }

        .list {
          display: grid;
          gap: 10px;
          margin-top: 15px;
        }

        .noticeTitle {
          color: #312e81;
          font-size: 21px;
          font-weight: 1000;
          margin-bottom: 8px;
        }

        .finalCta {
          text-align: center;
          margin: 22px 0 40px;
          border-radius: 30px;
          padding: 28px;
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.13), transparent 32%),
            linear-gradient(135deg, rgba(79,70,229,0.88), rgba(147,51,234,0.86));
          border: 1px solid rgba(255,255,255,0.16);
          box-shadow: 0 22px 46px rgba(0,0,0,0.28);
        }

        @media (max-width: 920px) {
          .shell {
            padding: 14px;
            padding-bottom: 70px;
          }

          .brandIcon {
            width: 54px;
            height: 54px;
            font-size: 29px;
          }

          .hero,
          .founderLayout,
          .splitGrid {
            grid-template-columns: 1fr;
          }

          .heroCard,
          .quickCard,
          .founderSection {
            border-radius: 25px;
          }

          .heroCard {
            padding: 21px;
          }

          .headline {
            font-size: clamp(2rem, 11vw, 3.05rem);
          }

          .heroText {
            font-size: 15.5px;
          }

          .buttonRow {
            display: grid;
            grid-template-columns: 1fr;
          }

          .primaryButton,
          .secondaryButton,
          .lightButton {
            width: 100%;
            box-sizing: border-box;
          }

          .sectionHeader {
            display: grid;
            margin-top: 22px;
          }

          .featureGrid {
            grid-template-columns: 1fr;
          }

          .featureCard {
            min-height: 0;
          }

          .whiteCard,
          .noticeCard,
          .founderSection {
            border-radius: 23px;
            padding: 18px;
          }

          .finalCta {
            border-radius: 24px;
            padding: 22px;
          }
        }
      `}</style>

      <div className="shell">
        <nav className="topNav">
          <Link href="/" className="brand">
            <span className="brandIcon">💎</span>
            <span>
              <span className="brandTitle">Adorable Vault</span>
              <span className="brandSub">track • trade • showcase</span>
            </span>
          </Link>
        </nav>

        <section className="hero">
          <div className="heroCard">
            <div className="badge">💜 About the vault</div>
            <h1 className="headline">Built for collectors who need less chaos and more checklist magic.</h1>
            <div className="heroText">
              Adorable Vault is a fan-made collector tool created to help Doorables fans track what they own,
              see what they still need, organize extras, build wishlists, and connect with other collectors
              through marketplace listings.
            </div>

            <div className="buttonRow">
              <Link href="/collection" className="primaryButton">Start Tracking</Link>
              <Link href="/marketplace" className="secondaryButton">Browse Marketplace</Link>
            </div>
          </div>

          <aside className="quickCard">
            <div className="miniStat">
              <div className="miniLabel">Purpose</div>
              <div className="miniTitle">A collector-first tracker</div>
              <div className="miniText">Made for quick mobile searching during shopping, live sales, trades, and collection organizing.</div>
            </div>
            <div className="miniStat">
              <div className="miniLabel">Free plan</div>
              <div className="miniTitle">Start with 50 saves</div>
              <div className="miniText">Try the tracker for free, then upgrade when you are ready for full collector access.</div>
            </div>
            <div className="miniStat">
              <div className="miniLabel">Community</div>
              <div className="miniTitle">Collector to collector</div>
              <div className="miniText">Marketplace tools help collectors list extras, message each other, and find missing pieces.</div>
            </div>
          </aside>
        </section>

        <section className="founderSection">
          <div className="founderLayout">
            <div>
              <div className="founderBadge">🔥 Limited founder bonus</div>
              <h2 className="founderTitle">Founding Collector Package with keychain 💜</h2>
              <div className="founderText">
                For the earliest supporters, Adorable Vault has a special Founding Collector Package that includes full vault access plus a limited Adorable Vault keychain while supplies last. It is a fun way to support the site early, help the collector community grow, and get a little physical vault keepsake with your membership.
              </div>

              <div className="buttonRow">
                <Link href="/pricing" className="secondaryButton">View Founder Package</Link>
                <Link href="/collection" className="primaryButton">Try the Tracker First</Link>
              </div>

              <div className="founderFinePrint">
                Keychain availability is limited and may require a separate claim/shipping form after purchase. Adorable Vault does not need your full address for normal collection tracking or marketplace browsing.
              </div>
            </div>

            <div className="founderCard">
              <div className="founderPerk">
                <span>💎</span>
                <span>Full collector access for serious tracking, extras, marketplace tools, and public profile features.</span>
              </div>
              <div className="founderPerk">
                <span>🔑</span>
                <span>Limited Adorable Vault keychain for Founding Collector supporters while supplies last.</span>
              </div>
              <div className="founderPerk">
                <span>💜</span>
                <span>Early supporter status that helps keep new features, photos, and collector tools moving forward.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="sectionHeader">
            <div>
              <div className="eyebrow">Why it exists</div>
              <h2 className="sectionTitle">Because screenshots, memory, and messy spreadsheets only work for so long.</h2>
            </div>
            <div className="sectionText">
              Collecting is fun. Keeping track of every figure, rarity, series, movie, duplicate, and wishlist item can get overwhelming.
              Adorable Vault is meant to make that process easier, faster, and a little more magical.
            </div>
          </div>

          <div className="featureGrid">
            <div className="featureCard">
              <div className="featureIcon">📦</div>
              <div className="featureTitle">Track what you own</div>
              <div className="featureText">Save your collection, update quantities, add notes, and see progress by series so your vault stays organized.</div>
            </div>
            <div className="featureCard">
              <div className="featureIcon">🔎</div>
              <div className="featureTitle">Find what you need</div>
              <div className="featureText">Search by name, series, rarity, movie, subcategory, notes, have, need, and extras when you are hunting for missing pieces.</div>
            </div>
            <div className="featureCard">
              <div className="featureIcon">🔁</div>
              <div className="featureTitle">Organize extras</div>
              <div className="featureText">Keep track of duplicates and extras so they can become trades, listings, gifts, or future collector connections.</div>
            </div>
          </div>
        </section>

        <section className="section splitGrid">
          <div className="whiteCard">
            <div className="eyebrow">What you can do</div>
            <h2 className="sectionTitle">A home base for your collection.</h2>
            <div className="whiteText">
              Adorable Vault is designed to work as a Doorables collection tracker, checklist, wishlist,
              inventory helper, rarity tracker, series progress tracker, extras organizer, and marketplace companion.
            </div>
            <div className="list">
              <div className="listItem"><span>✅</span><span>Track owned, needed, and extra Doorables in one place.</span></div>
              <div className="listItem"><span>✅</span><span>Use filters and search to quickly check your collection on mobile.</span></div>
              <div className="listItem"><span>✅</span><span>Browse or create marketplace listings when you are ready to connect with collectors.</span></div>
            </div>
          </div>

          <div className="whiteCard">
            <div className="eyebrow">Who it is for</div>
            <h2 className="sectionTitle">Collectors, traders, and completionists.</h2>
            <div className="whiteText">
              This site is for anyone who has ever wondered, “Do I already have this one?”
              or “Which ones am I still missing?” It is especially helpful during live sales,
              shopping trips, trades, blind openings, and collection clean-up days.
            </div>
            <div className="list">
              <div className="listItem"><span>💜</span><span>Casual collectors who want a simple checklist.</span></div>
              <div className="listItem"><span>💎</span><span>Serious collectors trying to complete sets and series.</span></div>
              <div className="listItem"><span>🛍️</span><span>Collectors with extras who want an easier way to list or trade.</span></div>
            </div>
          </div>
        </section>

        <section className="section splitGrid">
          <div className="noticeCard">
            <div className="noticeTitle">Fan-made collector tool</div>
            <div className="noticeText">
              Adorable Vault is a fan-made collection tracking and marketplace tool. It is not affiliated with,
              sponsored by, or endorsed by Disney or Just Play. Character names, collection names, and related references
              are used only to help collectors organize and identify their collections.
            </div>
          </div>

          <div className="noticeCard">
            <div className="noticeTitle">Marketplace responsibility</div>
            <div className="noticeText">
              Adorable Vault helps collectors connect, but buyers and sellers are responsible for their own purchases,
              payments, shipping, pickup, item condition, refunds, returns, and completed transactions. Adorable Vault does
              not process payments, hold funds, guarantee items, verify sellers, insure packages, or take responsibility for
              private buyer/seller agreements.
            </div>
          </div>
        </section>

        <section className="section">
          <div className="sectionHeader">
            <div>
              <div className="eyebrow">What is next</div>
              <h2 className="sectionTitle">The vault will keep growing with collector-friendly upgrades.</h2>
            </div>
            <div className="sectionText">
              Adorable Vault is still growing. Feedback is welcome, especially for missing figures, better images,
              filter ideas, marketplace improvements, and anything that would make collecting easier.
            </div>
          </div>

          <div className="featureGrid">
            <div className="featureCard">
              <div className="featureIcon">📸</div>
              <div className="featureTitle">Better photos</div>
              <div className="featureText">Collector-submitted photos can help improve the visual checklist over time.</div>
            </div>
            <div className="featureCard">
              <div className="featureIcon">💬</div>
              <div className="featureTitle">Better messaging</div>
              <div className="featureText">Marketplace messaging will keep improving so collector conversations feel easier and safer.</div>
            </div>
            <div className="featureCard">
              <div className="featureIcon">✨</div>
              <div className="featureTitle">Better tools</div>
              <div className="featureText">More polish, better mobile views, clearer marketplace tools, and more helpful collection features are planned.</div>
            </div>
          </div>
        </section>

        <section className="finalCta">
          <div className="eyebrow">Ready to organize the chaos?</div>
          <h2 className="sectionTitle">Open your vault and start tracking 💜</h2>
          <div className="sectionText" style={{ margin: "10px auto 0" }}>
            Save what you own, find what you need, and turn collection chaos into something you can actually use.
          </div>

          <div className="buttonRow" style={{ justifyContent: "center" }}>
            <Link href="/collection" className="primaryButton">Open Collection</Link>
            <Link href="/pricing" className="secondaryButton">View Plans</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
