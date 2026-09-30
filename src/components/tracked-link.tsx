"use client";
import type { AnchorHTMLAttributes } from "react";
import { trackEvent, type AnalyticsEvent } from "@/lib/analytics";

// An outbound link (Google profile, Google review form, email) that reports the click after consent.
// Server components render it like a plain <a>.
export function TrackedLink({ event, placement, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { event: AnalyticsEvent; placement: string }) {
  return <a {...props} onClick={clickEvent => { trackEvent(event, { placement }); onClick?.(clickEvent); }} />;
}
