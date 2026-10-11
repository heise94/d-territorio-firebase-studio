import type { SVGProps } from "react";

/** Neutral, original mark for the mobile exhibitor. It intentionally carries no religious imagery. */
export function CampaignExhibitorIcon({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className} {...props}>
      <path d="M23 8h20l4 31H19L23 8Z" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M20 20h26M18 32h30M17 44h31" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M21 39 16 55h32l-4-16" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
      <circle cx="20" cy="56" r="5" fill="currentColor" />
      <circle cx="45" cy="56" r="5" fill="currentColor" />
    </svg>
  );
}
