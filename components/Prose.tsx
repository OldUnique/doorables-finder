import Link from "next/link";
import type { ReactNode } from "react";

// Tiny, dependency-free renderer for the guide articles' lightweight markdown:
// "## " / "### " headings, "- " and "1. " lists, "> " callouts, blank-line paragraphs,
// **bold** and [text](href) inline, and "[[slot-name]]" lines that render a server-provided block.

type Block =
  | { type: "h2" | "h3" | "p" | "callout"; text: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "slot"; name: string };

export function slugifyHeading(text: string) {
  return text
    .toLowerCase()
    .replace(/[*[\]()]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r/g, "").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];

  const flush = () => {
    if (para.length) blocks.push({ type: "p", text: para.join(" ") });
    para = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const slot = /^\[\[([a-z0-9-]+)\]\]$/.exec(line);
    if (slot) {
      flush();
      blocks.push({ type: "slot", name: slot[1] });
    } else if (line.startsWith("### ")) {
      flush();
      blocks.push({ type: "h3", text: line.slice(4) });
    } else if (line.startsWith("## ")) {
      flush();
      blocks.push({ type: "h2", text: line.slice(3) });
    } else if (line.startsWith("> ")) {
      flush();
      blocks.push({ type: "callout", text: line.slice(2) });
    } else if (/^- /.test(line) || /^\d+\. /.test(line)) {
      flush();
      const type = line.startsWith("- ") ? "ul" : "ol";
      const item = line.replace(/^(- |\d+\. )/, "");
      const last = blocks[blocks.length - 1];
      if (last && last.type === type) last.items.push(item);
      else blocks.push({ type, items: [item] });
    } else {
      para.push(line);
    }
  }
  flush();
  return blocks;
}

export function headingsOf(source: string) {
  return parseBlocks(source)
    .filter((b): b is { type: "h2"; text: string } => b.type === "h2")
    .map((b) => ({ id: slugifyHeading(b.text), text: b.text }));
}

export function plainWordCount(source: string) {
  return source
    .replace(/\[\[[^\]]+\]\]/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*#>]/g, "")
    .split(/\s+/)
    .filter(Boolean).length;
}

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) {
      out.push(<strong key={`${keyBase}-b${i++}`}>{m[1]}</strong>);
    } else {
      const href = m[3];
      const label = inline(m[2], `${keyBase}-l${i}`);
      out.push(
        href.startsWith("/") ? (
          <Link key={`${keyBase}-a${i++}`} href={href}>
            {label}
          </Link>
        ) : (
          <a key={`${keyBase}-a${i++}`} href={href} target="_blank" rel="noopener noreferrer">
            {label}
          </a>
        )
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function Prose({ source, slots = {} }: { source: string; slots?: Record<string, ReactNode> }) {
  const blocks = parseBlocks(source);
  return (
    <>
      {blocks.map((b, i) => {
        const k = `b${i}`;
        switch (b.type) {
          case "h2":
            return (
              <h2 key={k} id={slugifyHeading(b.text)}>
                {inline(b.text, k)}
              </h2>
            );
          case "h3":
            return <h3 key={k}>{inline(b.text, k)}</h3>;
          case "callout":
            return (
              <aside key={k} className="cvCallout">
                {inline(b.text, k)}
              </aside>
            );
          case "ul":
            return (
              <ul key={k}>
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it, `${k}-${j}`)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={k}>
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it, `${k}-${j}`)}</li>
                ))}
              </ol>
            );
          case "slot":
            return <div key={k}>{slots[b.name] ?? null}</div>;
          default:
            return (
              <p key={k}>{inline(b.text, k)}</p>
            );
        }
      })}
    </>
  );
}
