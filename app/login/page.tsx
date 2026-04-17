"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabase";

type AuthUserLike = {
id: string;
email?: string | null;
user_metadata?: Record<string, any> | null;
};

function sanitizeUsernameInput(value: string) {
return value.replace(/[^a-zA-Z0-9_]/g, "");
}

function normalizeUsernameForStorage(value: string) {
return sanitizeUsernameInput(value).toLowerCase();
}

function getPasswordStrength(password: string) {
let score = 0;

if (password.length >= 8) score++;
if (password.length >= 12) score++;
if (/[A-Z]/.test(password)) score++;
if (/[a-z]/.test(password)) score++;
if (/\d/.test(password)) score++;
if (/[^A-Za-z0-9]/.test(password)) score++;

if (!password) return { label: "", color: "#ccc", width: "0%" };

if (score <= 2) return { label: "Weak", color: "#ef4444", width: "33%" };
if (score <= 4) return { label: "Medium", color: "#f59e0b", width: "66%" };
return { label: "Strong", color: "#22c55e", width: "100%" };
}

export default function LoginPage() {
const supabase = useMemo(() => getSupabase(), []);
const router = useRouter();

const [mode, setMode] = useState<"signin" | "signup">("signin");
const [email, setEmail] = useState("");
const [username, setUsername] = useState("");
const [password, setPassword] = useState("");
const [showPassword, setShowPassword] = useState(false);

const [message, setMessage] = useState("");
const [loading, setLoading] = useState(false);

useEffect(() => {
const checkUser = async () => {
const { data: { user } } = await supabase.auth.getUser();
if (user) router.replace("/");
};
void checkUser();
}, [router, supabase]);

async function ensureUserProfile(user: AuthUserLike, desiredUsername?: string) {
const { data: existing } = await supabase
.from("users")
.select("id, username")
.eq("id", user.id)
.maybeSingle();

const cleanUsername = normalizeUsernameForStorage(desiredUsername || "");

if (!existing) {
  await supabase.from("users").insert({
    id: user.id,
    email: user.email ?? null,
    username: cleanUsername || null,
    is_subscribed: false,
  });
  return;
}

if (!existing.username && cleanUsername) {
  await supabase
    .from("users")
    .update({ username: cleanUsername })
    .eq("id", user.id);
}

}

async function handleSubmit() {
setLoading(true);
setMessage("");

if (!email || !password) {
  setMessage("Email and password required.");
  setLoading(false);
  return;
}

if (mode === "signup") {
  const cleanUsername = normalizeUsernameForStorage(username);

  if (!cleanUsername) {
    setMessage("Username required.");
    setLoading(false);
    return;
  }

  if (password.length < 8) {
    setMessage("Password must be at least 8 characters.");
    setLoading(false);
    return;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: cleanUsername,
      },
    },
  });

  if (error) {
    setMessage(error.message);
    setLoading(false);
    return;
  }

  if (data.user && data.session) {
    await ensureUserProfile(data.user, cleanUsername);
    router.push("/");
    return;
  }

  setMessage("Account created! Please sign in.");
  setMode("signin");
  setLoading(false);
  return;
}

const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (error) {
  setMessage(error.message);
  setLoading(false);
  return;
}

if (data.user) {
  await ensureUserProfile(data.user, username);
}

router.push("/");

}

const strength = getPasswordStrength(password);

return (
<main style={{ padding: 24, color: "white" }}>
<h1>{mode === "signin" ? "Sign In" : "Create Account"}</h1>

  <div style={{ display: "grid", gap: 12, maxWidth: 400 }}>
    <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />

    {mode === "signup" && (
      <input value={username} onChange={(e) => setUsername(sanitizeUsernameInput(e.target.value))} placeholder="Username" />
    )}

    <div>
      <div style={{ position: "relative" }}>
        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          style={{ width: "100%", paddingRight: 70 }}
        />
        <button type="button" onClick={() => setShowPassword((p) => !p)}>
          {showPassword ? "Hide" : "Show"}
        </button>
      </div>

      {password && (
        <div style={{ marginTop: 6 }}>
          <div style={{ height: 8, background: "#ddd" }}>
            <div style={{ width: strength.width, background: strength.color, height: "100%" }} />
          </div>
          <div style={{ color: strength.color }}>{strength.label}</div>
        </div>
      )}
    </div>

    <button onClick={handleSubmit} disabled={loading}>
      {loading ? "Loading..." : mode === "signin" ? "Sign In" : "Create Account"}
    </button>

    <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
      Switch to {mode === "signin" ? "Sign Up" : "Sign In"}
    </button>

    {message && <div>{message}</div>}
  </div>
</main>

);
}