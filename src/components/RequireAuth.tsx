import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  if (loading) {
    return (
      <div className="dark min-h-screen flex items-center justify-center">
        <div className="text-xs font-mono tracking-[0.3em] text-muted-foreground animate-pulse">AUTHENTICATING…</div>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="dark min-h-screen flex items-center justify-center">
        <div className="text-xs font-mono tracking-[0.3em] text-neon animate-pulse">REDIRECTING TO SIGN-IN…</div>
      </div>
    );
  }
  return <>{children}</>;
}
