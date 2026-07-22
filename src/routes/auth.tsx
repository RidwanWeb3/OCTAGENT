import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import mascot from "@/assets/octagen-mascot.png.asset.json";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Access · OCTAGEN" },
      { name: "description", content: "Authenticate into the OCTAGEN AI operating system." },
      { property: "og:title", content: "Access · OCTAGEN" },
      { property: "og:description", content: "Enter the OCTAGEN AI operating system." },
      { property: "og:type", content: "website" },
    ],
  }),
});

function AuthPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) nav({ to: "/" });
  }, [user, nav]);

  async function google() {
    setErr(null); setBusy(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) setErr(r.error.message ?? "Google sign-in failed");
    setBusy(false);
  }

  return (
    <div className="dark min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 neural-grid opacity-30 pointer-events-none" />
      <div className="absolute inset-0" style={{ background: "radial-gradient(600px circle at 50% 30%, oklch(0.86 0.28 138 / 0.15), transparent 60%)" }} />
      <div className="relative glass rounded-3xl p-10 max-w-md w-full">
        <div className="flex flex-col items-center text-center">
          <img src={mascot.url} alt="OCTAGEN" className="w-16 h-16 mb-4 drop-shadow-[0_0_20px_oklch(0.86_0.28_138_/_0.6)]" />
          <div className="text-[10px] font-mono tracking-[0.3em] text-neon uppercase mb-2">Octa-Core Access</div>
          <h1 className="text-3xl font-bold tracking-tight">Enter OCTAGEN</h1>
          <p className="text-sm text-muted-foreground mt-2">Authenticate to unlock the AI Terminal & analysis engines.</p>
        </div>

        <button
          onClick={google}
          disabled={busy}
          className="mt-8 w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl bg-neon text-primary-foreground font-semibold tracking-wide hover:animate-pulse-neon transition disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#fff" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/></svg>
            Continue with Google
        </button>

        {err && <div className="mt-4 text-xs text-destructive font-mono text-center">{err}</div>}

        <div className="mt-6 flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          <div className="flex-1 h-px bg-border" /> Or email <div className="flex-1 h-px bg-border" />
        </div>
        <EmailAuth />
      </div>
    </div>
  );
}

function EmailAuth() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setMsg(null); setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        setMsg("Check your email to confirm your account.");
      }
    } catch (e: any) { setErr(e.message ?? "Failed"); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@domain.com" className="w-full bg-background/50 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-neon/50" />
      <input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="w-full bg-background/50 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-neon/50" />
      <button disabled={busy} className="w-full py-2.5 rounded-lg glass hover:border-neon/50 text-sm font-semibold tracking-wide transition disabled:opacity-50">
        {busy ? "..." : mode === "in" ? "Sign in" : "Create account"}
      </button>
      <button type="button" onClick={()=>{setMode(mode==="in"?"up":"in");setErr(null);setMsg(null);}} className="w-full text-xs text-muted-foreground hover:text-foreground">
        {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
      </button>
      {msg && <div className="text-xs text-neon font-mono text-center">{msg}</div>}
      {err && <div className="text-xs text-destructive font-mono text-center">{err}</div>}
    </form>
  );
}
