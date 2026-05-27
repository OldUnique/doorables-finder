"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";

type Conversation = {
  id: string;
  listing_id: string | null;
  buyer_id: string;
  seller_id: string;
  created_at: string | null;
  listing_title: string | null;
  seller_name: string | null;
  conversation_type: string | null;
  collector_name: string | null;
  unread_count: number;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string | null;
};

function formatMessageTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function cleanUsername(value: string) {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

export default function MessagesPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");

  const [newCollectorUsername, setNewCollectorUsername] = useState("");
  const [creatingCollectorChat, setCreatingCollectorChat] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);

  useEffect(() => {
    void initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`messages-inbox-live-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "marketplace_messages",
        },
        async () => {
          await refreshConversationsQuietly();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, userId]);

  useEffect(() => {
    if (!selectedConversationId || !userId) return;

    const channel = supabase
      .channel(`messages-live-${selectedConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "marketplace_messages",
          filter: `conversation_id=eq.${selectedConversationId}`,
        },
        async () => {
          await loadMessages(selectedConversationId);
          await markConversationRead(selectedConversationId, userId);
          await refreshConversationsQuietly();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId, supabase, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function initialize() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        const nextPath =
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : "/messages";

        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      const currentUserId = String(user.id);
      setUserId(currentUserId);

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("username")
        .eq("id", currentUserId)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
      }

      setUsername(String(profile?.username ?? "").toLowerCase());

      const params =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : null;

      const listingId = params?.get("listing") || "";
      const conversationIdFromUrl = params?.get("conversation") || "";
      const draftFromUrl = params?.get("draft") || "";

      let preferredConversationId = conversationIdFromUrl;

      if (listingId) {
        const marketplaceConversationId = await ensureMarketplaceConversation(
          currentUserId,
          listingId
        );

        if (marketplaceConversationId) {
          preferredConversationId = marketplaceConversationId;
        }
      }

      await loadConversations(currentUserId, preferredConversationId);

      if (draftFromUrl) {
        setDraft(draftFromUrl);

        if (typeof window !== "undefined" && preferredConversationId) {
          window.history.replaceState(
            null,
            "",
            `/messages?conversation=${encodeURIComponent(preferredConversationId)}`
          );
        }
      }

      setLoading(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not load messages.");
      setLoading(false);
    }
  }

  async function refreshConversationsQuietly() {
    if (!userId) return;
    await loadConversations(userId, selectedConversationId, true);
  }

  async function ensureMarketplaceConversation(
    currentUserId: string,
    listingId: string
  ): Promise<string> {
    const { data: listing, error: listingError } = await supabase
      .from("marketplace_listings")
      .select("id, user_id, title, seller_name")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) return "";
    if (String(listing.user_id) === currentUserId) return "";

    const { data: sellerProfile } = await supabase
      .from("users")
      .select("username")
      .eq("id", String(listing.user_id))
      .maybeSingle();

    const sellerDisplayName =
      String(sellerProfile?.username ?? "") ||
      String(listing.seller_name ?? "Collector");

    const { data: existing } = await supabase
      .from("marketplace_conversations")
      .select("id")
      .eq("conversation_type", "marketplace")
      .eq("listing_id", listingId)
      .eq("buyer_id", currentUserId)
      .eq("seller_id", String(listing.user_id))
      .maybeSingle();

    if (existing?.id) {
      return String(existing.id);
    }

    const { data: created } = await supabase
      .from("marketplace_conversations")
      .insert([
        {
          listing_id: listingId,
          buyer_id: currentUserId,
          seller_id: String(listing.user_id),
          listing_title: String(listing.title ?? "Listing"),
          conversation_type: "marketplace",
          collector_name: sellerDisplayName,
        },
      ])
      .select("id")
      .single();

    return created?.id ? String(created.id) : "";
  }

  async function loadConversations(
    currentUserId: string,
    conversationIdFromUrl?: string,
    keepCurrentView?: boolean
  ) {
    const { data, error } = await supabase
      .from("marketplace_conversations")
      .select(`
        id,
        listing_id,
        buyer_id,
        seller_id,
        created_at,
        listing_title,
        conversation_type,
        collector_name,
        marketplace_listings (
          title,
          seller_name
        )
      `)
      .or(`buyer_id.eq.${currentUserId},seller_id.eq.${currentUserId}`)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      return;
    }

    const baseMapped = ((data || []) as any[]).map((row) => ({
      id: String(row.id),
      listing_id: row.listing_id ? String(row.listing_id) : null,
      buyer_id: String(row.buyer_id),
      seller_id: String(row.seller_id),
      created_at: row.created_at,
      listing_title:
        row.listing_title ??
        row.marketplace_listings?.title ??
        null,
      seller_name: row.marketplace_listings?.seller_name ?? "Collector",
      conversation_type: row.conversation_type ?? "marketplace",
      collector_name: row.collector_name ?? null,
    })) as Omit<Conversation, "unread_count">[];

    const unreadCounts = new Map<string, number>();

    if (baseMapped.length > 0) {
      const { data: unreadRows } = await supabase
        .from("marketplace_messages")
        .select("conversation_id")
        .in(
          "conversation_id",
          baseMapped.map((item) => item.id)
        )
        .neq("sender_id", currentUserId)
        .is("read_at", null);

      ((unreadRows || []) as any[]).forEach((row) => {
        const conversationId = String(row.conversation_id);
        unreadCounts.set(conversationId, (unreadCounts.get(conversationId) || 0) + 1);
      });
    }

    const mapped: Conversation[] = baseMapped.map((item) => ({
      ...item,
      unread_count: unreadCounts.get(item.id) || 0,
    }));

    setConversations(mapped);

    const currentStillExists = mapped.some((item) => item.id === selectedConversationId);
    const preferredId =
      conversationIdFromUrl ||
      (currentStillExists ? selectedConversationId : "") ||
      (mapped[0] ? mapped[0].id : "");

    setSelectedConversationId(preferredId);

    if (preferredId) {
      await loadMessages(preferredId);
      await markConversationRead(preferredId, currentUserId);

      if (!keepCurrentView && typeof window !== "undefined" && window.innerWidth <= 920) {
        setShowConversationList(false);
      }
    } else {
      setMessages([]);
      setShowConversationList(true);
    }
  }

  async function loadMessages(conversationId: string) {
    const { data, error } = await supabase
      .from("marketplace_messages")
      .select("id, conversation_id, sender_id, body, read_at, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      setError(error.message);
      return;
    }

    setMessages(
      ((data || []) as any[]).map((row) => ({
        id: String(row.id),
        conversation_id: String(row.conversation_id),
        sender_id: String(row.sender_id),
        body: String(row.body ?? ""),
        read_at: row.read_at,
        created_at: row.created_at,
      }))
    );
  }

  async function markConversationRead(conversationId: string, currentUserId?: string) {
    const activeUserId = currentUserId || userId;
    if (!activeUserId) return;

    await supabase
      .from("marketplace_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", activeUserId)
      .is("read_at", null);

    setConversations((prev) =>
      prev.map((item) =>
        item.id === conversationId ? { ...item, unread_count: 0 } : item
      )
    );

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("messages-read-updated"));
    }
  }

  async function sendMessage() {
    if (!selectedConversationId || !draft.trim() || !userId) return;

    try {
      setSending(true);
      setError("");

      const { error } = await supabase.from("marketplace_messages").insert([
        {
          conversation_id: selectedConversationId,
          sender_id: userId,
          body: draft.trim(),
          read_at: null,
        },
      ]);

      if (error) {
        setError(error.message);
        setSending(false);
        return;
      }

      setDraft("");
      setSending(false);
      await loadMessages(selectedConversationId);
      await refreshConversationsQuietly();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not send message.");
      setSending(false);
    }
  }

  async function startCollectorChat() {
    try {
      setError("");

      const cleanCollectorUsername = cleanUsername(newCollectorUsername);

      if (!cleanCollectorUsername) {
        setError("Enter a username first.");
        return;
      }

      if (!userId) {
        router.replace("/login?next=/messages");
        return;
      }

      if (cleanCollectorUsername === username.trim().toLowerCase()) {
        setError("You cannot start a collector chat with yourself.");
        return;
      }

      setCreatingCollectorChat(true);

      const { data: userRow, error: userRowError } = await supabase
        .from("users")
        .select("id, username")
        .ilike("username", cleanCollectorUsername)
        .maybeSingle();

      if (userRowError) {
        setError(userRowError.message);
        setCreatingCollectorChat(false);
        return;
      }

      if (!userRow?.id) {
        setError("No collector account found with that username.");
        setCreatingCollectorChat(false);
        return;
      }

      const otherUserId = String(userRow.id);
      const otherUsername = String(userRow.username ?? cleanCollectorUsername);

      const { data: existing, error: existingError } = await supabase
        .from("marketplace_conversations")
        .select("id")
        .eq("conversation_type", "collector")
        .or(
          `and(buyer_id.eq.${userId},seller_id.eq.${otherUserId}),and(buyer_id.eq.${otherUserId},seller_id.eq.${userId})`
        )
        .maybeSingle();

      if (existingError) {
        setError(existingError.message);
        setCreatingCollectorChat(false);
        return;
      }

      let conversationId = "";

      if (existing?.id) {
        conversationId = String(existing.id);
      } else {
        const { data: created, error: createError } = await supabase
          .from("marketplace_conversations")
          .insert([
            {
              listing_id: null,
              buyer_id: userId,
              seller_id: otherUserId,
              listing_title: null,
              conversation_type: "collector",
              collector_name: otherUsername,
            },
          ])
          .select("id")
          .single();

        if (createError) {
          setError(createError.message);
          setCreatingCollectorChat(false);
          return;
        }

        conversationId = String(created.id);
      }

      setNewCollectorUsername("");
      setCreatingCollectorChat(false);
      await loadConversations(userId, conversationId);
      setShowConversationList(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not start collector chat.");
      setCreatingCollectorChat(false);
    }
  }

  const activeConversation =
    conversations.find((item) => item.id === selectedConversationId) ?? null;

  const totalUnread = useMemo(
    () => conversations.reduce((sum, item) => sum + item.unread_count, 0),
    [conversations]
  );

  function getConversationTitle(conversation: Conversation | null) {
    if (!conversation) return "Conversation";

    if (conversation.conversation_type === "collector") {
      return conversation.collector_name || conversation.seller_name || "Collector Chat";
    }

    return `${conversation.collector_name || conversation.seller_name || "Seller"} — ${
      conversation.listing_title || "Listing"
    }`;
  }

  function getConversationTypeLabel(conversation: Conversation) {
    return conversation.conversation_type === "collector"
      ? "Collector Chat"
      : "Marketplace Chat";
  }

  function getConversationIcon(conversation: Conversation) {
    return conversation.conversation_type === "collector" ? "💜" : "🛍️";
  }

  return (
    <main className="messagesPage">
      <style jsx>{`
        .messagesPage {
          min-height: 100vh;
          background:
            radial-gradient(circle at 20% 20%, rgba(168,85,247,0.30) 0%, rgba(168,85,247,0) 22%),
            radial-gradient(circle at 80% 10%, rgba(59,130,246,0.26) 0%, rgba(59,130,246,0) 22%),
            radial-gradient(circle at 70% 80%, rgba(236,72,153,0.16) 0%, rgba(236,72,153,0) 24%),
            linear-gradient(180deg, #09090f 0%, #111827 45%, #020617 100%);
          padding: 16px;
          color: #ffffff;
        }

        .shell {
          max-width: 1320px;
          margin: 0 auto;
        }

        .hero {
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.14), transparent 34%),
            linear-gradient(135deg, rgba(17,24,39,0.92), rgba(67,56,202,0.88));
          border-radius: 28px;
          padding: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.30);
          margin-bottom: 18px;
          border: 1px solid rgba(255,255,255,0.12);
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 14px;
          align-items: center;
        }

        .heroTitle {
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 1000;
          letter-spacing: -1px;
          line-height: 1;
          color: #ffffff;
        }

        .heroSub {
          margin-top: 8px;
          color: rgba(255,255,255,0.92);
          line-height: 1.5;
          font-weight: 750;
        }

        .heroActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .bubbleLink,
        .bubbleLink:visited,
        .bubbleButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 46px;
          padding: 11px 16px;
          border-radius: 999px;
          border: 1px solid transparent;
          text-decoration: none !important;
          font-weight: 950;
          cursor: pointer;
          box-sizing: border-box;
          white-space: nowrap;
          font-family: inherit;
        }

        .bubblePrimary,
        .bubblePrimary:visited {
          background: linear-gradient(135deg, #60a5fa, #8b5cf6);
          color: #ffffff !important;
          box-shadow: 0 14px 28px rgba(79,70,229,0.34);
        }

        .bubbleLight,
        .bubbleLight:visited {
          background: rgba(255,255,255,0.12);
          color: #ffffff !important;
          border-color: rgba(255,255,255,0.18);
        }

        .bubbleSoft,
        .bubbleSoft:visited {
          background: #eef2ff;
          color: #3730a3 !important;
          border-color: #c7d2fe;
        }

        .bubbleNeutral,
        .bubbleNeutral:visited {
          background: #f8fafc;
          color: #111827 !important;
          border-color: #d1d5db;
        }

        .errorBox {
          margin-top: 12px;
          border-radius: 16px;
          padding: 12px 14px;
          background: rgba(254, 226, 226, 0.14);
          border: 1px solid rgba(254, 202, 202, 0.28);
          color: #fecaca;
          font-weight: 850;
        }

        .messagesLayout {
          display: grid;
          grid-template-columns: 380px 1fr;
          gap: 16px;
        }

        .conversationSidebar,
        .messagePanel {
          background: rgba(255,255,255,0.97);
          color: #111827;
          border-radius: 24px;
          padding: 14px;
          box-shadow: 0 12px 28px rgba(0,0,0,0.14);
          min-height: 640px;
          border: 1px solid rgba(255,255,255,0.50);
        }

        .conversationSidebar {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .sidebarTitle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          font-weight: 1000;
          font-size: 18px;
          color: #111827;
        }

        .sidebarCountWrap {
          display: inline-flex;
          gap: 8px;
          align-items: center;
          color: #64748b;
          font-size: 13px;
        }

        .totalUnreadBadge {
          min-height: 24px;
          padding: 4px 9px;
          border-radius: 999px;
          background: linear-gradient(135deg, #ec4899, #8b5cf6);
          color: #ffffff !important;
          font-size: 12px;
          font-weight: 1000;
          box-shadow: 0 8px 16px rgba(139,92,246,0.28);
        }

        .startBox {
          background:
            radial-gradient(circle at top right, rgba(196,181,253,0.28), transparent 30%),
            #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 12px;
          color: #111827;
        }

        .input,
        .draftBox {
          color: #111827;
          background: #ffffff;
          font-family: inherit;
        }

        .input::placeholder,
        .draftBox::placeholder {
          color: #64748b;
          opacity: 1;
        }

        .input {
          width: 100%;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid #d1d5db;
          box-sizing: border-box;
          font-size: 14px;
        }

        .conversationList {
          display: grid;
          gap: 8px;
          overflow: auto;
          max-height: 448px;
          padding-right: 2px;
        }

        .conversationButton {
          width: 100%;
          text-align: left;
          padding: 13px 14px;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          color: #111827 !important;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
          font-family: inherit;
          appearance: none;
        }

        .conversationButton,
        .conversationButton * {
          color: #111827;
        }

        .conversationButton:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 20px rgba(15,23,42,0.08);
          border-color: #c7d2fe;
        }

        .conversationButton.active {
          background:
            radial-gradient(circle at top right, rgba(196,181,253,0.34), transparent 34%),
            linear-gradient(135deg, #ffffff, #f5f3ff);
          border-color: #8b5cf6;
          box-shadow: 0 12px 24px rgba(124,58,237,0.13);
          color: #111827 !important;
        }

        .conversationTopLine {
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }

        .conversationIcon {
          width: 34px;
          height: 34px;
          min-width: 34px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: #eef2ff;
          color: #3730a3 !important;
        }

        .conversationTitle {
          font-weight: 1000;
          line-height: 1.25;
          word-break: break-word;
          display: block;
          color: #111827 !important;
          font-size: 14px;
        }

        .conversationMeta {
          font-size: 12px;
          color: #475569 !important;
          margin-top: 4px;
          font-weight: 800;
          display: block;
          line-height: 1.35;
        }

        .unreadBadge {
          min-width: 24px;
          height: 24px;
          padding: 0 7px;
          border-radius: 999px;
          background: linear-gradient(135deg, #ec4899, #8b5cf6);
          color: #ffffff !important;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 1000;
          box-shadow: 0 8px 16px rgba(139,92,246,0.28);
          margin-left: auto;
        }

        .messagePanel {
          display: flex;
          flex-direction: column;
        }

        .messageHeader {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }

        .messageTitle {
          font-weight: 1000;
          line-height: 1.25;
          color: #111827;
          font-size: 18px;
        }

        .messageSubtitle {
          color: #64748b;
          font-size: 13px;
          font-weight: 800;
          margin-top: 4px;
        }

        .messageList {
          flex: 1;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 12px;
          background:
            radial-gradient(circle at top right, rgba(221,214,254,0.34), transparent 30%),
            #fafafa;
          overflow: auto;
          display: grid;
          align-content: start;
          gap: 10px;
          min-height: 430px;
          max-height: 430px;
        }

        .emptyState {
          color: #475569;
          padding: 16px;
          border-radius: 16px;
          background: #ffffff;
          border: 1px dashed #d1d5db;
          font-weight: 850;
          text-align: center;
        }

        .messageBubble {
          max-width: min(86%, 680px);
          padding: 11px 13px;
          border-radius: 18px;
          box-shadow: 0 6px 18px rgba(0,0,0,0.08);
        }

        .messageMine {
          justify-self: end;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          color: #ffffff;
          border-bottom-right-radius: 6px;
        }

        .messageTheirs {
          justify-self: start;
          background: #ffffff;
          color: #111827;
          border: 1px solid #e5e7eb;
          border-bottom-left-radius: 6px;
        }

        .composer {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          margin-top: 12px;
          align-items: end;
        }

        .draftBox {
          width: 100%;
          min-height: 92px;
          border: 1px solid #d1d5db;
          border-radius: 16px;
          padding: 12px;
          box-sizing: border-box;
          resize: vertical;
          font-size: 14px;
        }

        .draftBox:focus,
        .input:focus {
          outline: none;
          border-color: #8b5cf6;
          box-shadow: 0 0 0 4px rgba(139,92,246,0.12);
        }

        .mobileBackButton {
          display: none;
        }

        .loadingCard {
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.16);
          box-shadow: 0 20px 44px rgba(0,0,0,0.28);
          border-radius: 24px;
          padding: 22px;
          color: #ffffff;
          font-weight: 950;
          text-align: center;
        }

        .tipText {
          color: #64748b;
          font-size: 12px;
          margin-top: 8px;
          line-height: 1.45;
          font-weight: 750;
        }

        @media (max-width: 920px) {
          .messagesPage {
            padding: 12px;
          }

          .hero {
            grid-template-columns: 1fr;
            border-radius: 22px;
            padding: 18px;
          }

          .heroActions {
            display: grid;
            grid-template-columns: 1fr;
            justify-content: stretch;
          }

          .bubbleLink,
          .bubbleButton {
            width: 100%;
          }

          .messagesLayout {
            display: block;
          }

          .mobileHidden {
            display: none !important;
          }

          .conversationSidebar,
          .messagePanel {
            min-height: auto;
            padding: 12px;
            border-radius: 20px;
          }

          .conversationList {
            max-height: none;
          }

          .messageList {
            min-height: 52vh;
            max-height: 52vh;
          }

          .composer {
            grid-template-columns: 1fr;
          }

          .mobileBackButton {
            display: inline-flex;
            width: auto;
          }
        }
      `}</style>

      <div className="shell">
        <section className="hero">
          <div>
            <div className="heroTitle">Messages 💬</div>
            <div className="heroSub">
              Marketplace chats and collector-to-collector chats all in one place.
            </div>
            {!!error && <div className="errorBox">{error}</div>}
          </div>

          <div className="heroActions">
            <Link href="/marketplace" className="bubbleLink bubbleLight">
              🛍️ Marketplace
            </Link>
            <Link href="/collection" className="bubbleLink bubbleLight">
              💎 Collection
            </Link>
          </div>
        </section>

        {loading ? (
          <div className="loadingCard">Loading messages...</div>
        ) : (
          <div className="messagesLayout">
            <aside
              className={`conversationSidebar ${!showConversationList ? "mobileHidden" : ""}`}
            >
              <div className="sidebarTitle">
                <span>Conversations</span>
                <span className="sidebarCountWrap">
                  {totalUnread > 0 && (
                    <span className="totalUnreadBadge">
                      {totalUnread > 9 ? "9+" : totalUnread} unread
                    </span>
                  )}
                  <span>{conversations.length}</span>
                </span>
              </div>

              <div className="startBox">
                <div style={{ fontWeight: 950, marginBottom: 8, color: "#111827" }}>
                  Start Collector Chat
                </div>
                <div style={{ color: "#64748b", fontSize: 13, lineHeight: 1.45, marginBottom: 10, fontWeight: 750 }}>
                  Enter a collector username to start a direct chat.
                </div>
                <input
                  value={newCollectorUsername}
                  onChange={(e) => setNewCollectorUsername(e.target.value)}
                  placeholder="Collector username"
                  className="input"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void startCollectorChat();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => void startCollectorChat()}
                  disabled={creatingCollectorChat}
                  className="bubbleButton bubblePrimary"
                  style={{ marginTop: 8 }}
                >
                  {creatingCollectorChat ? "Starting..." : "💜 Start Chat"}
                </button>
              </div>

              {conversations.length === 0 ? (
                <div className="emptyState">
                  No conversations yet. Start a collector chat or message a seller from Marketplace.
                </div>
              ) : (
                <div className="conversationList">
                  {conversations.map((item) => {
                    const active = selectedConversationId === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedConversationId(item.id);
                          void loadMessages(item.id);
                          void markConversationRead(item.id, userId);
                          if (typeof window !== "undefined" && window.innerWidth <= 920) {
                            setShowConversationList(false);
                          }
                        }}
                        className={`conversationButton ${active ? "active" : ""}`}
                      >
                        <div className="conversationTopLine">
                          <span className="conversationIcon">
                            {getConversationIcon(item)}
                          </span>

                          <span style={{ minWidth: 0, flex: 1 }}>
                            <span className="conversationTitle">
                              {getConversationTitle(item)}
                            </span>
                            <span className="conversationMeta">
                              {getConversationTypeLabel(item)}
                              {item.created_at ? ` • ${formatMessageTime(item.created_at)}` : ""}
                            </span>
                          </span>

                          {item.unread_count > 0 && (
                            <span className="unreadBadge">
                              {item.unread_count > 9 ? "9+" : item.unread_count}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </aside>

            <section
              className={`messagePanel ${
                showConversationList && conversations.length > 0 ? "mobileHidden" : ""
              }`}
            >
              <div className="messageHeader">
                <div>
                  <div className="messageTitle">
                    {getConversationTitle(activeConversation)}
                  </div>
                  <div className="messageSubtitle">
                    {activeConversation
                      ? activeConversation.conversation_type === "collector"
                        ? "Collector-to-collector chat"
                        : "Marketplace listing chat"
                      : "Select or start a conversation"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowConversationList(true)}
                  className="bubbleButton bubbleNeutral mobileBackButton"
                >
                  ← Back
                </button>
              </div>

              <div className="messageList">
                {messages.length === 0 ? (
                  <div className="emptyState">
                    No messages yet. Start the conversation when you are ready.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const mine = msg.sender_id === userId;
                    return (
                      <div
                        key={msg.id}
                        className={`messageBubble ${mine ? "messageMine" : "messageTheirs"}`}
                      >
                        <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.86, marginBottom: 4 }}>
                          {mine ? "You" : activeConversation?.collector_name || activeConversation?.seller_name || "Them"}
                        </div>
                        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.45 }}>
                          {msg.body}
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.78, marginTop: 5 }}>
                          {formatMessageTime(msg.created_at)}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <div className="composer">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={
                    selectedConversationId
                      ? "Type a message..."
                      : "Select a conversation first..."
                  }
                  disabled={!selectedConversationId}
                  className="draftBox"
                  onKeyDown={(event) => {
                    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                      void sendMessage();
                    }
                  }}
                />
                <button
                  onClick={() => void sendMessage()}
                  disabled={sending || !selectedConversationId || !draft.trim()}
                  className="bubbleButton bubblePrimary"
                  style={{
                    opacity: sending || !selectedConversationId || !draft.trim() ? 0.55 : 1,
                    cursor: sending || !selectedConversationId || !draft.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>

              <div className="tipText">
                Tip: Press Ctrl + Enter, or Command + Enter on Mac, to send quickly.
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
