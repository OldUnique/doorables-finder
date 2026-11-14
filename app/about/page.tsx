import Link from "next/link";
import AboutClient from "./AboutClient";
import { GUIDES } from "../../lib/guides";
import "../content.css";

function AboutStory() {
  return (
    <section className="cvArticle" style={{ marginTop: 18 }} aria-labelledby="our-story">
      <div className="cvProse">
        <div className="cvEyebrow">💜 Our story</div>
        <h2 id="our-story" style={{ marginTop: 8 }}>Who runs Adorable Vault</h2>
        <p>
          Adorable Vault is run by Josh, a Disney Doorables collector who built it for one simple reason: keeping
          track of a growing Doorables collection with screenshots, memory and spreadsheets stopped working. Once a
          collection spans several series, it gets genuinely hard to remember which Stitch you already have, which
          Ultra Rares you still need, and which duplicates you can trade. Adorable Vault started as the tool Josh
          wanted for himself and grew into a free tracker for any collector.
        </p>
        <p>
          It is a small, independent, fan-made project. It is <strong>not affiliated with, sponsored by, or endorsed by
          Disney or Just Play</strong>, the company that makes Doorables under license from Disney. Character and
          product names are used only so collectors can identify their figures.
        </p>

        <h2>What we are building</h2>
        <p>
          The goal is a calm, useful home base for collectors: a complete catalog of figures, a quick way to mark what
          you have, need and can trade, a progress bar for every series, a public collector page you control, and a
          simple marketplace for passing extras on to other collectors. Everything is designed to work on a phone,
          because that is where most collecting happens, in the toy aisle, at a trade meet or while opening a box.
        </p>
        <p>
          Alongside the tracker we publish free <Link href="/guides">collector guides</Link> and a full{" "}
          <Link href="/series">checklist for every series and set</Link>. The guides cover the questions collectors
          ask most, like <Link href="/guides/doorables-rarity-explained">how rarity works</Link>,{" "}
          <Link href="/guides/how-to-identify-doorables">how to identify a figure</Link> and{" "}
          <Link href="/guides/trading-and-selling-doorables">how to trade safely</Link>.
        </p>

        <h2>How the catalog is kept accurate</h2>
        <p>
          The catalog lists every figure with its series, rarity and movie, and it is checked regularly for new
          releases. New figures are added once a manufacturer listing or a reliable published checklist exists. When
          a manufacturer has named figures but not confirmed which are rare, those figures are marked Unknown rather
          than guessed. Collectors help too, by submitting photos (reviewed before they appear) and by reporting
          missing figures or mistakes on the <Link href="/feedback">feedback page</Link>.
        </p>

        <h2>How the site is funded</h2>
        <p>
          Every feature on Adorable Vault is free for every collector, with no plans or paywalls. The site is supported
          by a limited number of ads served by Google AdSense, which help cover hosting and development. Ads are never
          endorsements, and we do not sell your personal information. You can read exactly what we collect in the{" "}
          <Link href="/privacy">privacy policy</Link>.
        </p>

        <h2>Get in touch</h2>
        <p>
          Questions, corrections and ideas are always welcome. The best way to reach Josh is the{" "}
          <Link href="/contact">contact page</Link>. If you are new to Doorables, start with{" "}
          <Link href={`/guides/${GUIDES[0].slug}`}>{GUIDES[0].title}</Link>.
        </p>
      </div>
    </section>
  );
}

export default function AboutPage() {
  return <AboutClient story={<AboutStory />} />;
}
