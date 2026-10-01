"use client";
import type { AnchorHTMLAttributes, ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import { trackEvent, type AnalyticsEvent } from "@/lib/analytics";

// An outbound link (Google profile, Google review form, email) that reports the click after consent.
// Server components render it like a plain <a>.
export function TrackedLink({ event, placement, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { event: AnalyticsEvent; placement: string }) {
  return <a {...props} onClick={clickEvent => { trackEvent(event, { placement }); onClick?.(clickEvent); }} />;
}

// The same for links inside the site: keeps the locale prefix and client navigation of the i18n Link.
export function TrackedNavLink({ event, placement, onClick, ...props }: ComponentProps<typeof Link> & { event: AnalyticsEvent; placement: string }) {
  return <Link {...props} onClick={clickEvent => { trackEvent(event, { placement }); onClick?.(clickEvent); }} />;
}
