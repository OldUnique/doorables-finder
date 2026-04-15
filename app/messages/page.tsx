"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppHeader from "../../components/AppHeader";
import { getSupabase } from "../../lib/supabase";

type Conversation = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string | null;
  listing_title: string | null;
  seller_name: string | null;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string | null;
};

export default function MessagesPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [userId, setUserId] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void initialize();
  }, []);

  useEffect(() => {
    if (!selectedConversationId) return;

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
          await markConversationRead(selectedConversationId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversationId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function initialize() {
    try {
      setLoading(true);
      setError("");

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setError(authError?.message || "Auth session missing!");
        setLoading(false);
        return;
      }

      setUserId(String(user.id));

      const listingId =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("listing")
          : null;

      if (listingId) {
        await ensureConversation(String(user.id), listingId);
      }

      await loadConversations(String(user.id));
      setLoading(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not load messages.");
      setLoading(false);
    }
  }

  async function ensureConversation(currentUserId: string, listingId: string) {
    const { data: listing, error: listingError } = await supabase
      .from("marketplace_listings")
      .select("id, user_id, title, seller_name")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) return;
    if (String(listing.user_id) === currentUserId) return;

    const { data: existing } = await supabase
      .from("marketplace_conversations")
      .select("id")
      .eq("listing_id", listingId)
      .eq("buyer_id", currentUserId)
      .maybeSingle();

    if (existing?.id) {
      setSelectedConversationId(String(existing.id));
      return;
    }

    const { data: created } = await supabase
      .from("marketplace_conversations")
      .insert([
        {
          listing_id: listingId,
          buyer_id: currentUserId,
          seller_id: String(listing.user_id),
        },
      ])
      .select("id")
      .single();

    if (created?.id) {
      setSelectedConversationId(String(created.id));
    }
  }

  async function loadConversations(currentUserId: string) {
    const { data, error } = await supabase
      .from("marketplace_conversations")
      .select(`
        id,
        listing_id,
        buyer_id,
        seller_id,
        created_at,
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

    const mapped = (data || []).map((row: any) => ({
      id: String(row.id),
      listing_id: String(row.listing_id),
      buyer_id: String(row.buyer_id),
      seller_id: String(row.seller_id),
      created_at: row.created_at,
      listing_title: row.marketplace_listings?.title ?? "Listing",
      seller_name: row.marketplace_listings?.seller_name ?? "Seller",
    })) as Conversation[];

    setConversations(mapped);

    const firstId = selectedConversationId || (mapped[0] ? mapped[0].id : "");
    setSelectedConversationId(firstId);

    if (firstId) {
      await loadMessages(firstId);
      await markConversationRead(firstId);
    } else {
      setMessages([]);
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

  async function markConversationRead(conversationId: string) {
    if (!userId) return;

    await supabase
      .from("marketplace_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", userId)
      .is("read_at", null);
  }

  async function sendMessage() {
    if (!selectedConversationId || !draft.trim() || !userId) return;

    try {
      setSending(true);

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
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not send message.");
      setSending(false);
    }
  }

  const activeConversation =
    conversations.find((item) => item.id === selectedConversationId) ?? null;

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 20% 20%, rgba(168,85,247,0.30) 0%, rgba(168,85,247,0) 22%), radial-gradient(circle at 80% 10%, rgba(59,130,246,0.26) 0%, rgba(59,130,246,0) 22%), linear-gradient(180deg, #09090f 0%, #111827 45%, #020617 100%)",
      }}
    >
      <AppHeader />

      <div style={{ maxWidth: 1320, margin: "0 auto", padding: 24, color: "white" }}>
        <section
          style={{
            background: "linear-gradient(135deg, rgba(17,24,39,0.92), rgba(67,56,202,0.88))",
            borderRadius: 28,
            padding: 24,
            boxShadow: "0 20px 40px rgba(0,0,0,0.30)",
            marginBottom: 18,
          }}
        >
          <div style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900, letterSpacing: -1 }}>
            Messages 💬
          </div>
          <div style={{ marginTop: 8, opacity: 0.92 }}>
            Live chat for buyers and sellers.
          </div>
          {!!error && (
            <div style={{ marginTop: 10, color: "#fecaca", fontWeight: 700 }}>{error}</div>
          )}
        </section>

        {loading ? (
          <div style={{ color: "white", padding: 20 }}>Loading messages...</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "320px 1fr",
              gap: 16,
            }}
          >
            <aside
              style={{
                background: "rgba(255,255,255,0.96)",
                color: "#111827",
                borderRadius: 22,
                padding: 14,
                boxShadow: "0 12px 28px rgba(0,0,0,0.14)",
                minHeight: 640,
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Conversations</div>

              {conversations.length === 0 ? (
                <div style={{ color: "#6b7280" }}>No conversations yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {conversations.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSelectedConversationId(item.id);
                        void loadMessages(item.id);
                        void markConversationRead(item.id);
                      }}
                      style={{
                        textAlign: "left",
                        padding: "12px 14px",
                        borderRadius: 14,
                        border: "1px solid #e5e7eb",
                        background: selectedConversationId === item.id ? "#eef2ff" : "white",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>
                        {item.seller_name || "Seller"} — {item.listing_title || "Listing"}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </aside>

            <section
              style={{
                background: "rgba(255,255,255,0.96)",
                color: "#111827",
                borderRadius: 22,
                padding: 14,
                boxShadow: "0 12px 28px rgba(0,0,0,0.14)",
                minHeight: 640,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 10 }}>
                {activeConversation
                  ? `${activeConversation.seller_name || "Seller"} — ${activeConversation.listing_title || "Listing"}`
                  : "Conversation"}
              </div>

              <div
                style={{
                  flex: 1,
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  padding: 12,
                  background: "#fafafa",
                  overflow: "auto",
                  display: "grid",
                  gap: 10,
                  minHeight: 420,
                  maxHeight: 420,
                }}
              >
                {messages.length === 0 ? (
                  <div style={{ color: "#6b7280" }}>No messages yet.</div>
                ) : (
                  messages.map((msg) => {
                    const mine = msg.sender_id === userId;
                    return (
                      <div
                        key={msg.id}
                        style={{
                          justifySelf: mine ? "end" : "start",
                          maxWidth: "76%",
                          padding: "10px 12px",
                          borderRadius: 16,
                          background: mine ? "#2563eb" : "white",
                          color: mine ? "white" : "#111827",
                          border: mine ? "none" : "1px solid #e5e7eb",
                          boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.86, marginBottom: 4 }}>
                          {mine ? "You" : activeConversation?.seller_name || "Them"}
                        </div>
                        <div>{msg.body}</div>
                        <div style={{ fontSize: 11, opacity: 0.78, marginTop: 4 }}>
                          {msg.created_at ? new Date(msg.created_at).toLocaleString() : ""}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message..."
                  style={{
                    flex: 1,
                    minHeight: 92,
                    border: "1px solid #d1d5db",
                    borderRadius: 14,
                    padding: 12,
                    boxSizing: "border-box",
                    resize: "vertical",
                  }}
                />
                <button
                  onClick={() => void sendMessage()}
                  disabled={sending || !selectedConversationId}
                  style={{
                    alignSelf: "end",
                    padding: "12px 18px",
                    borderRadius: 14,
                    border: "none",
                    background: "#4f46e5",
                    color: "white",
                    fontWeight: 900,
                    cursor: "pointer",
                    minWidth: 120,
                  }}
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
