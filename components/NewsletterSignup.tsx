"use client";

import { FormEvent, useId, useState } from "react";
import "./NewsletterSignup.css";

type NewsletterSignupProps = {
  source?: string;
  variant?: "home" | "footer";
};

export default function NewsletterSignup({
  source = "unknown",
  variant = "footer",
}: NewsletterSignupProps) {
  const titleId = useId();
  const [email, setEmail] = useState("");
  const [honey, setHoney] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "loading") return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, honey, source }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };

      if (!res.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error || "Could not save your email just now. Please try again.");
        return;
      }

      setStatus("ok");
      setMessage("You're on the list. We'll email you when new Doorables drop.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Could not save your email just now. Please try again.");
    }
  }

  return (
    <section className={`nlSignup nlSignup--${variant}`} aria-labelledby={titleId}>
      <div className="nlInner">
        <div>
          <div className="nlEyebrow">📬 Free release emails</div>
          <h2 className="nlTitle" id={titleId}>
            Get new Doorables releases in your inbox
          </h2>
          <p className="nlLead">
            Free. Just one email when new figures drop, nothing else. Unsubscribe anytime.
          </p>
        </div>

        <form className="nlForm" onSubmit={onSubmit} noValidate>
          <label className="nlHoney" htmlFor={`nl-honey-${source}`}>
            Leave this field blank
          </label>
          <input
            id={`nl-honey-${source}`}
            className="nlHoney"
            name="company"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honey}
            onChange={(e) => setHoney(e.target.value)}
          />

          <div className="nlRow">
            <label className="nlHoney" htmlFor={`nl-email-${source}`}>
              Email address
            </label>
            <input
              id={`nl-email-${source}`}
              className="nlField"
              type="email"
              name="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder="you@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status !== "idle" && status !== "loading") setStatus("idle");
              }}
            />
            <button className="nlButton" type="submit" disabled={status === "loading"}>
              {status === "loading" ? "Signing up..." : "Notify me"}
            </button>
          </div>

          {message ? (
            <div
              className={`nlStatus ${status === "ok" ? "nlStatus--ok" : "nlStatus--error"}`}
              role="status"
            >
              {message}
            </div>
          ) : null}

          <p className="nlNote">
            We'll only use your email for new Doorables release updates. See the{" "}
            <a href="/privacy">privacy policy</a>.
          </p>
        </form>
      </div>
    </section>
  );
}
