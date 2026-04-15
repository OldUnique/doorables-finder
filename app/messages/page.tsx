"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getSupabase } from "../../lib/supabase";

type Conversation = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string | null;
  listing_title?: string | null;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string | null;
};

export default function MessagesPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const searchParams = useSearchParams();

  const [userId, setUserId] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void initialize();
  }, []);

  async function initialize() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setError(authError?.message || "Please sign in.");
        setLoading(false);
        return;
      }

      setUserId(String(user.id));

      const listingId = searchParams.get("listing");
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
      .select("id, user_id, title")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) return;
    if (String(listing.user_id) === currentUserId) return;

    const { data: existing } = await supabase
      .from("marketplace_conversations")
      .select("*")
      .eq("listing_id", listingId)
      .eq("buyer_id", currentUserId)
      .maybeSingle();

    if (existing) {
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
      .select()
      .single();

    if (created) {
      setSelectedConversationId(String(created.id));
    }
  }

  async function loadConversations(currentUserId: string) {
    const { data, error } = await supabase
      .from("marketplace_conversations")
      .select(`
        *,
        marketplace_listings (
          title
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
    })) as Conversation[];

    setConversations(mapped);

    const firstId = selectedConversationId || (mapped[0] ? mapped[0].id : "");
    setSelectedConversationId(firstId);

    if (firstId) {
      await loadMessages(firstId);
    } else {
      setMessages([]);
    }
  }

  async function loadMessages(conversationId: string) {
    const { data, error } = await supabase
      .from("marketplace_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      setError(error.message);
      return;
    }

    setMessages(
      (data || []).map((row: any) => ({
        id: String(row.id),
        conversation_id: String(row.conversation_id),
        sender_id: String(row.sender_id),
        body: String(row.body ?? ""),
        created_at: row.created_at,
      }))
    );
  }

  async function sendMessage() {
    if (!selectedConversationId || !draft.trim()) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from("marketplace_messages")
        .insert([
          {
            conversation_id: selectedConversationId,
            sender_id: userId,
            body: draft.trim(),
          },
        ]);

      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }

      setDraft("");
      setSaving(false);
      await loadMessages(selectedConversationId);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not send message.");
      setSaving(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 24,
        color: "white",
        background:
          "radial-gradient(circle at 20% 20%, rgba(168,85,247,0.30) 0%, rgba(168,85,247,0) 22%), radial-gradient(circle at 80% 10%, rgba(59,130,246,0.26) 0%, rgba(59,130,246,0) 22%), linear-gradient(180deg, #09090f 0%, #111827 45%, #020617 100%)",
      }}
    >
      <style jsx>{`
        .shell {
          max-width: 1280px;
          margin: 0 auto;
        }
        .nav {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }
        .navLinks {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .navButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 18px;
          border-radius: 16px;
          text-decoration: none;
          color: white;
          font-weight: 800;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(8px);
        }
        .navButton:hover {
          background: rgba(255,255,255,0.14);
        }
      `}</style>

      <div className="shell">
        <nav className="nav">
          <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: -1 }}>
            Doorables Finder
          </div>

          <div className="navLinks">
            <Link href="/" className="navButton">🏠 Home</Link>
            <Link href="/collection" className="navButton">Collection</Link>
            <Link href="/marketplace" className="navButton">Marketplace</Link>
            <Link href="/messages" className="navButton">Messages</Link>
            <Link href="/sell" className="navButton">Sell</Link>
            <Link href="/subscription" className="navButton">Subscription</Link>
            <Link href="/feedback" className="navButton">💙 Feedback</Link>
          </div>
        </nav>

        <div
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
            Talk to buyers and sellers without posting contact info.
          </div>
          {!!error && <div style={{ marginTop: 10, color: "#fecaca", fontWeight: 700 }}>{error}</div>}
        </div>

        {loading ? (
          <div style={{ padding: 20 }}>Loading messages...</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "320px 1fr",
              gap: 16,
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.96)",
                color: "#111827",
                borderRadius: 22,
                padding: 14,
                boxShadow: "0 12px 28px rgba(0,0,0,0.14)",
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
                      <div style={{ fontWeight: 800 }}>{item.listing_title || "Listing"}</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.96)",
                color: "#111827",
                borderRadius: 22,
                padding: 14,
                boxShadow: "0 12px 28px rgba(0,0,0,0.14)",
                minHeight: 520,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Conversation</div>

              <div
                style={{
                  flex: 1,
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  padding: 12,
                  background: "#fafafa",
                  overflow: "auto",
                  display: "grid",
                  gap: 8,
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
                          maxWidth: "75%",
                          padding: "10px 12px",
                          borderRadius: 14,
                          background: mine ? "#4f46e5" : "white",
                          color: mine ? "white" : "#111827",
                          border: mine ? "none" : "1px solid #e5e7eb",
                        }}
                      >
                        <div>{msg.body}</div>
                        <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
                          {msg.created_at ? new Date(msg.created_at).toLocaleString() : ""}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message..."
                  style={{
                    flex: 1,
                    minHeight: 90,
                    border: "1px solid #d1d5db",
                    borderRadius: 14,
                    padding: 12,
                    boxSizing: "border-box",
                  }}
                />
                <button
                  onClick={() => void sendMessage()}
                  disabled={saving || !selectedConversationId}
                  style={{
                    alignSelf: "end",
                    padding: "12px 16px",
                    borderRadius: 14,
                    border: "none",
                    background: "#4f46e5",
                    color: "white",
                    fontWeight: 900,
                    cursor: "pointer",
                    minWidth: 120,
                  }}
                >
                  {saving ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
