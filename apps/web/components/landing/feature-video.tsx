"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Sessiz, satır içi ürün videosu. Yalnızca ekrandayken oynar, ekrandan çıkınca
 * durur; reduced-motion açıksa kendiliğinden oynamaz, kontrol çubuğu gösterir.
 */
export function FeatureVideo({
  sources,
  label,
  className,
  loop = true,
  onEnded,
}: {
  sources: { mp4: string; webm: string; poster: string };
  label: string;
  className?: string;
  loop?: boolean;
  onEnded?: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduced = useRef(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced.current) {
      video.controls = true;
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          video.play().catch(() => {
            /* otomatik oynatma engellendi — poster kalır */
          });
        } else {
          video.pause();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(video);
    return () => io.disconnect();
  }, [sources.mp4]);

  return (
    <video
      ref={ref}
      key={sources.mp4}
      className={cn("block h-auto w-full", className)}
      poster={sources.poster}
      muted
      playsInline
      loop={loop}
      preload="none"
      aria-label={label}
      onEnded={onEnded}
    >
      <source src={sources.webm} type="video/webm" />
      <source src={sources.mp4} type="video/mp4" />
    </video>
  );
}
