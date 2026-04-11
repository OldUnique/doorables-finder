import { env } from "./env";

export function computeLocalAccess(email: string | null | undefined, subscribed: boolean) {
  const normalizedEmail = (email || "").toLowerCase().trim();
  const ownerEmail = (env.ownerEmail || "").toLowerCase().trim();
  const isOwner = !!ownerEmail && normalizedEmail === ownerEmail;

  const accessGranted = true;

  return {
    isOwner,
    hasActiveSubscription: subscribed,
    accessGranted,
  };
}