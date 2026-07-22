import background from "@/assets/web-background.png";
import { useEffect, useRef } from "react";

type SiteBackdropProps = {
  variant?: "landing" | "subtle";
};

export function SiteBackdrop({ variant = "subtle" }: SiteBackdropProps) {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;

    const intensity = variant === "landing" ? 1 : 0.35;
    let raf = 0;
    let nx = 0;
    let ny = 0;
    let cx = 0.5;
    let cy = 0.5;

    const commit = () => {
      raf = 0;
      el.style.setProperty("--sb-x", String(nx * intensity));
      el.style.setProperty("--sb-y", String(ny * intensity));
      el.style.setProperty("--sb-cx", `${Math.round(cx * 100)}%`);
      el.style.setProperty("--sb-cy", `${Math.round(cy * 100)}%`);
    };

    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(commit);
    };

    const onMove = (e: PointerEvent) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      cx = Math.min(1, Math.max(0, e.clientX / w));
      cy = Math.min(1, Math.max(0, e.clientY / h));
      nx = (cx - 0.5) * 2;
      ny = (cy - 0.5) * 2;
      schedule();
    };

    const onLeave = () => {
      nx = 0;
      ny = 0;
      cx = 0.5;
      cy = 0.5;
      schedule();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("blur", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("blur", onLeave);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [variant]);

  return (
    <div ref={elRef} aria-hidden="true" className={`site-backdrop site-backdrop--${variant}`}>
      <div
        className="site-backdrop__image"
        style={{ backgroundImage: `url(${background})` }}
      />
      <div className="site-backdrop__veil" />
      <div className="site-backdrop__mist site-backdrop__mist--one" />
      <div className="site-backdrop__mist site-backdrop__mist--two" />
      <div className="site-backdrop__beam" />
      <div className="site-backdrop__grid" />
      <div className="site-backdrop__cursor" />
    </div>
  );
}
