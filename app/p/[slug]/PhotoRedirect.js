"use client";

import { useEffect } from "react";

/**
 * Sends real (JS-enabled) visitors back to the gallery, scrolled to this photo.
 *
 * Social crawlers (Slack, iMessage, X/Twitter, WhatsApp, Facebook, etc.) do NOT
 * execute JavaScript, so they never run this redirect — they stay on /p/[slug]
 * and read the per-photo Open Graph tags rendered by generateMetadata, which is
 * exactly what makes the shared link preview show the actual photo.
 */
export default function PhotoRedirect({ slug }) {
  useEffect(() => {
    window.location.replace(`/#${slug}`);
  }, [slug]);

  return null;
}
