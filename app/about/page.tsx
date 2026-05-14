"use client";

import Link from "next/link";
import { useEffect } from "react";

const featureCards = [
  {
    icon: "📦",
    title: "Track what you own",
    text: "Save your collection, update quantities, add notes, and see progress by series so your vault stays organized.",
  },
  {
    icon: "🔎",
    title: "Find what you need",
    text: "Search by name, series, rarity, movie, subcategory, notes, have, need, and extras when you are hunting.",
  },
  {
    icon: "🔁",
    title: "Organize extras",
    text: "Keep duplicate Doorables in one clean place so they can become trades, gifts, listings, or future collector connections.",
  },
];

const nextCards = [
  {
    icon: "📸",
    title: "Better photos",
    text: "Collector-submitted photos can help improve the visual checklist over time without relying on copied images.",
  },
  {
    icon: "💬",
    title: "Better messaging",
    text: "Marketplace and collector messaging will keep getting cleaner, easier, and more helpful.",
  },
  {
    icon: "✨",
    title: "Better tools",
    text: "More mobile polish, clearer filters, series improvements, and collector-friendly upgrades are part of the plan.",
  },
];

const trustItems = [
  { icon: "🚫", label: "No ads. Ever." },
  { icon: "💜", label: "Fan-made by collectors" },
  { icon: "📱", label: "Built for mobile checking" },
  { icon: "🔐", label: "Stripe handles checkout" },
];

const checklistItems = [
  { icon: "✅", text: "Track owned, needed, skipped, and extra Doorables in one place." },
  { icon: "✅", text: "Use filters and search while shopping, watching lives, trading, or organizing." },
  { icon: "✅", text: "Browse or create marketplace listings when you are ready to connect with collectors." },
];

const audienceItems = [
  { icon: "💜", text: "Casual collectors who want a simple checklist." },
  { icon: "💎", text: "Serious collectors trying to complete sets and series." },
  { icon: "🛍️", text: "Collectors with extras who want an easier way to list or trade." },
];

function setMeta(name: string, content: string) {
  let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    tag.name = name;
    document.head.appendChild(tag);
  }
  tag.content = content;
}

export default function AboutPage() {
  useEffect(() => {
    document.title = "About Adorable Vault | Doorables Collection Tracker";
    setMeta(
      "description",
      "Learn about Adorable Vault, a fan-made Doorables collection tracker, wishlist, extras organizer, and collector marketplace tool."
    );
  }, []);

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
          max-width: 1180px;
          margin: 0 auto;
          padding: 22px;
          padding-bottom: 96px;
        }

        .page a,
        .page a:visited,
        .page a:hover,
        .page a:active {
          text-decoration: none !important;
        }

        .hero {
          display: grid;
          grid-template-columns: minmax(0, 1.12fr) minmax(330px, 0.88fr);
          gap: 18px;
          align-items: stretch;
          margin-bottom: 18px;
        }

        .heroCard,
        .quickCard,
        .founderSection,
        .featureCard,
        .whiteCard,
        .noticeCard,
        .finalCta,
        .promiseStrip {
          border: 1px solid rgba(255,255,255,0.16);
          box-shadow: 0 26px 64px rgba(0,0,0,0.32);
        }

        .heroCard,
        .quickCard {
          border-radius: 32px;
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.14), transparent 34%),
            linear-gradient(135deg, rgba(30,41,59,0.95), rgba(88,28,135,0.86));
        }

        .heroCard {
          padding: 34px;
          display: grid;
          align-content: center;
        }

        .quickCard {
          padding: 18px;
          display: grid;
          gap: 12px;
        }

        .badge,
        .founderBadge,
        .adBadge {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          font-weight: 1000;
        }

        .badge {
          padding: 9px 13px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.15);
          color: #fde68a;
          font-size: 13px;
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
          max-width: 780px;
        }

        .trustRow {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
          margin-top: 17px;
        }

        .trustPill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border-radius: 999px;
          padding: 8px 11px;
          color: rgba(255,255,255,0.95);
          background: rgba(15,23,42,0.58);
          border: 1px solid rgba(255,255,255,0.20);
          font-size: 12px;
          font-weight: 1000;
        }

        .buttonRow {
          display: flex;
          gap: 11px;
          flex-wrap: wrap;
          margin-top: 24px;
        }

        .primaryButton,
        .secondaryButton,
        .softButton {
          min-height: 52px;
          border-radius: 999px;
          padding: 14px 20px;
          font-weight: 1000;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .primaryButton:hover,
        .secondaryButton:hover,
        .softButton:hover {
          transform: translateY(-2px);
        }

        .primaryButton,
        .primaryButton:visited {
          background: linear-gradient(90deg, #ffffff, #fef3c7);
          color: #312e81 !important;
          border: 1px solid rgba(255,255,255,0.55);
          box-shadow: 0 18px 40px rgba(255,255,255,0.22);
        }

        .secondaryButton,
        .secondaryButton:visited {
          background: linear-gradient(90deg, #4f46e5, #a855f7);
          color: #ffffff !important;
          border: 1px solid rgba(255,255,255,0.45);
          box-shadow: 0 16px 34px rgba(124,58,237,0.50);
        }

        .softButton,
        .softButton:visited {
          background: rgba(255,255,255,0.12);
          color: #ffffff !important;
          border: 1px solid rgba(255,255,255,0.18);
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
          font-weight: 800;
        }

        .promiseStrip {
          margin-bottom: 18px;
          border-radius: 28px;
          padding: 20px;
          color: #111827;
          background:
            radial-gradient(circle at top right, rgba(168,85,247,0.18), transparent 32%),
            radial-gradient(circle at bottom left, rgba(59,130,246,0.14), transparent 32%),
            linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96));
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 15px;
          align-items: center;
        }

        .promiseIcon {
          width: 74px;
          height: 74px;
          border-radius: 24px;
          display: grid;
          place-items: center;
          font-size: 36px;
          background: linear-gradient(135deg, #dbeafe, #f5d0fe, #fef3c7);
          border: 1px solid #e9d5ff;
        }

        .promiseTitle {
          margin: 0;
          color: #312e81;
          font-size: clamp(1.45rem, 3vw, 2rem);
          line-height: 1.05;
          letter-spacing: -0.7px;
          font-weight: 1000;
        }

        .promiseText {
          margin: 8px 0 0;
          color: #475569;
          line-height: 1.6;
          font-size: 14px;
          font-weight: 820;
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
        }

        .founderLayout {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 18px;
          align-items: stretch;
        }

        .founderBadge {
          margin-bottom: 12px;
          padding: 8px 12px;
          color: #78350f;
          background: #fef3c7;
          border: 1px solid #fde68a;
          font-size: 12px;
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
          font-weight: 800;
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
          font-weight: 800;
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
          font-weight: 800;
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

        .whiteCard .sectionTitle,
        .noticeTitle {
          color: #312e81;
        }

        .whiteText,
        .noticeText {
          color: #4b5563;
          line-height: 1.65;
          font-size: 15px;
          font-weight: 800;
        }

        .list {
          display: grid;
          gap: 10px;
          margin-top: 15px;
        }

        .noticeTitle {
          font-size: 21px;
          font-weight: 1000;
          margin-bottom: 8px;
        }

        .finalCta {
          text-align: center;
          margin: 22px 0 40px;
          border-radius: 30px;
          padding: 30px;
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.13), transparent 32%),
            linear-gradient(135deg, rgba(79,70,229,0.88), rgba(147,51,234,0.86));
          border: 1px solid rgba(255,255,255,0.16);
          box-shadow: 0 22px 46px rgba(0,0,0,0.28);
        }

        @media (max-width: 980px) {
          .shell {
            padding: 14px;
            padding-bottom: 82px;
          }

          .hero,
          .founderLayout,
          .splitGrid {
            grid-template-columns: 1fr;
          }

          .hero {
            gap: 12px;
          }

          .heroCard,
          .quickCard,
          .founderSection {
            border-radius: 25px;
          }

          .heroCard {
            padding: 21px;
          }

          .quickCard {
            padding: 14px;
          }

          .badge {
            padding: 7px 10px;
            font-size: 12px;
            margin-bottom: 12px;
          }

          .headline {
            font-size: clamp(2rem, 11vw, 3.05rem);
            letter-spacing: -1.3px;
          }

          .heroText {
            font-size: 15px;
            line-height: 1.52;
          }

          .trustRow {
            flex-wrap: nowrap;
            overflow-x: auto;
            padding-bottom: 4px;
            scrollbar-width: none;
          }

          .trustRow::-webkit-scrollbar {
            display: none;
          }

          .trustPill {
            flex: 0 0 auto;
          }

          .buttonRow {
            display: grid;
            grid-template-columns: 1fr;
          }

          .primaryButton,
          .secondaryButton,
          .softButton {
            width: 100%;
            box-sizing: border-box;
          }

          .promiseStrip {
            grid-template-columns: 1fr;
            border-radius: 23px;
            padding: 17px;
          }

          .promiseIcon {
            display: none;
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
            border-radius: 20px;
            padding: 15px;
          }

          .featureIcon {
            width: 48px;
            height: 48px;
            border-radius: 16px;
            font-size: 25px;
            margin-bottom: 10px;
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

        @media (max-width: 430px) {
          .headline {
            font-size: 1.9rem;
          }

          .founderTitle {
            font-size: 1.6rem;
          }

          .sectionTitle {
            font-size: 1.32rem;
          }

          .miniTitle {
            font-size: 19px;
          }
        }
      `}</style>

      <div className="shell">
        <section className="hero">
          <div className="heroCard">
            <div className="badge">💜 About the vault</div>
            <h1 className="headline">Built for collectors who need less chaos and more checklist magic.</h1>
            <div className="heroText">
              Adorable Vault is a fan-made collector tool created to help Doorables fans track what they own,
              see what they still need, organize extras, build wishlists, and connect with other collectors
              through collector-to-collector listings and messages.
            </div>

            <div className="trustRow">
              {trustItems.map((item) => (
                <span key={item.label} className="trustPill">
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </span>
              ))}
            </div>

            <div className="buttonRow">
              <Link href="/collection" className="primaryButton">
                Start Tracking
              </Link>
              <Link href="/demo" className="softButton">
                Preview First
              </Link>
              <Link href="/marketplace" className="secondaryButton">
                Browse Marketplace
              </Link>
            </div>
          </div>

          <aside className="quickCard">
            <div className="miniStat">
              <div className="miniLabel">Purpose</div>
              <div className="miniTitle">A collector-first tracker</div>
              <div className="miniText">
                Made for quick mobile checking during shopping, live sales, trades, blind openings, and collection organizing.
              </div>
            </div>

            <div className="miniStat">
              <div className="miniLabel">Free plan</div>
              <div className="miniTitle">Start with 50 saves</div>
              <div className="miniText">
                Try the tracker for free, then upgrade when you are ready for full collector access.
              </div>
            </div>

            <div className="miniStat">
              <div className="miniLabel">Community</div>
              <div className="miniTitle">Collector to collector</div>
              <div className="miniText">
                Marketplace tools help collectors list extras, message each other, and find missing pieces.
              </div>
            </div>
          </aside>
        </section>

        <section className="promiseStrip">
          <div className="promiseIcon">🚫</div>
          <div>
            <h2 className="promiseTitle">No ads. Ever. The vault stays clean on purpose.</h2>
            <p className="promiseText">
              Adorable Vault is meant to feel calm and useful, not stuffed with banners, pop-ups, or clutter.
              The small paid plan helps keep the site collector-focused instead of advertiser-focused.
            </p>
          </div>
        </section>

        <section className="founderSection">
          <div className="founderLayout">
            <div>
              <div className="founderBadge">🔥 Limited founder bonus</div>
              <h2 className="founderTitle">Founding Collector Package with keychain 💜</h2>
              <div className="founderText">
                For the earliest supporters, Adorable Vault has a special Founding Collector Package that includes full vault access
                plus a limited Adorable Vault keychain while supplies last. It is a fun way to support the site early, help the collector
                community grow, and get a little physical vault keepsake with your membership.
              </div>

              <div className="buttonRow">
                <Link href="/pricing" className="secondaryButton">
                  View Founder Package
                </Link>
                <Link href="/demo" className="primaryButton">
                  Try the Tracker First
                </Link>
              </div>

              <div className="founderFinePrint">
                Keychain availability is limited. Shipping details are collected only when needed for the bundle. Adorable Vault does not need
                your full address for normal collection tracking, browsing, or marketplace messaging.
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
            {featureCards.map((card) => (
              <div key={card.title} className="featureCard">
                <div className="featureIcon">{card.icon}</div>
                <div className="featureTitle">{card.title}</div>
                <div className="featureText">{card.text}</div>
              </div>
            ))}
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
              {checklistItems.map((item) => (
                <div key={item.text} className="listItem">
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="whiteCard">
            <div className="eyebrow">Who it is for</div>
            <h2 className="sectionTitle">Collectors, traders, and completionists.</h2>
            <div className="whiteText">
              This site is for anyone who has ever wondered, “Do I already have this one?” or “Which ones am I still missing?”
              It is especially helpful during live sales, shopping trips, trades, blind openings, and collection clean-up days.
            </div>
            <div className="list">
              {audienceItems.map((item) => (
                <div key={item.text} className="listItem">
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section splitGrid">
          <div className="noticeCard">
            <div className="noticeTitle">Fan-made collector tool</div>
            <div className="noticeText">
              Adorable Vault is a fan-made collection tracking and marketplace tool. It is not affiliated with, sponsored by, or endorsed by
              Disney or Just Play. Character names, collection names, and related references are used only to help collectors organize and
              identify their collections.
            </div>
          </div>

          <div className="noticeCard">
            <div className="noticeTitle">Marketplace responsibility</div>
            <div className="noticeText">
              Adorable Vault helps collectors connect, but buyers and sellers are responsible for their own purchases, payments, shipping,
              pickup, item condition, refunds, returns, and completed transactions. Adorable Vault does not process payments, hold funds,
              guarantee items, verify sellers, insure packages, or take responsibility for private buyer/seller agreements.
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
            {nextCards.map((card) => (
              <div key={card.title} className="featureCard">
                <div className="featureIcon">{card.icon}</div>
                <div className="featureTitle">{card.title}</div>
                <div className="featureText">{card.text}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="finalCta">
          <div className="eyebrow">Ready to organize the chaos?</div>
          <h2 className="sectionTitle">Open your vault and start tracking 💜</h2>
          <div className="sectionText" style={{ margin: "10px auto 0" }}>
            Save what you own, find what you need, and turn collection chaos into something you can actually use.
          </div>

          <div className="buttonRow" style={{ justifyContent: "center" }}>
            <Link href="/collection" className="primaryButton">
              Open Collection
            </Link>
            <Link href="/pricing" className="secondaryButton">
              View Plans
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
