"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/icons";

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const text = encodeURIComponent(`${title} — ${url}`);
  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={share} className="btn btn-outline btn-sm"><Icon.Share size={16} />{copied ? "Link copied" : "Share course"}</button>
      <a className="btn btn-outline btn-sm" href={`https://wa.me/?text=${text}`} target="_blank" rel="noopener">WhatsApp</a>
      <a className="btn btn-outline btn-sm" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener">Facebook</a>
    </div>
  );
}
