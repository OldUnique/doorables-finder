import { env } from "./env";

const BYPASS_EMAILS = [
  "riffeljosh80@gmail.com",
  "jjowens@ktc.edu",
  "dntuttle1@gmail.com",
];

export function computeLocalAccess(
  email: string | null | undefined,
  subscribed: boolean
) {
  const normalizedEmail = (email || "").toLowerCase().trim();
  const ownerEmail = (env.ownerEmail || "").toLowerCase().trim();

  const isOwner = !!ownerEmail && normalizedEmail === ownerEmail;

  const isBypass =
    BYPASS_EMAILS.includes(normalizedEmail) || isOwner;

  const accessGranted = isBypass || subscribed;

  return {
    isOwner,
    hasActiveSubscription: subscribed,
    accessGranted,
  };
}