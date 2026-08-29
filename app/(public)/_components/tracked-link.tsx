"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";

type TrackedLinkProps = ComponentPropsWithoutRef<"a"> & { listingId: string };

// Fires the click-tracking POST on click, then lets the browser navigate via
// the real `href` normally — verified against outbid.lol's own /api/clicks
// call, which does the same (a plain fetch, not sendBeacon; safe here since
// these links open in a new tab, so the current page never unloads).
export const TrackedLink = forwardRef<HTMLAnchorElement, TrackedLinkProps>(function TrackedLink(
  { listingId, onClick, ...props },
  ref,
) {
  return (
    <a
      {...props}
      ref={ref}
      onClick={(event) => {
        fetch(`/api/listings/${listingId}/click`, { method: "POST" }).catch(() => {});
        onClick?.(event);
      }}
    />
  );
});
