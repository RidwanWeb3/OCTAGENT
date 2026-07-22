import background from "@/assets/web-background.png";

type SiteBackdropProps = {
  variant?: "landing" | "subtle";
};

export function SiteBackdrop({ variant = "subtle" }: SiteBackdropProps) {
  return (
    <div aria-hidden="true" className={`site-backdrop site-backdrop--${variant}`}>
      <div
        className="site-backdrop__image"
        style={{ backgroundImage: `url(${background})` }}
      />
      <div className="site-backdrop__veil" />
      <div className="site-backdrop__mist site-backdrop__mist--one" />
      <div className="site-backdrop__mist site-backdrop__mist--two" />
      <div className="site-backdrop__beam" />
      <div className="site-backdrop__grid" />
    </div>
  );
}
