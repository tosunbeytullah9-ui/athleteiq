import { cn } from "@/lib/utils";

/**
 * Bölüm arka planı: gerçek spor alanı fotoğrafı, gri tonlu, düşük opaklıkta ve
 * üst/alt kenarları zemine eriyen. Fotoğraf yoksa yalnızca saha çizgisi dokusu
 * kalır. İçerikle yarışmaması için opaklık bilinçli olarak düşük tutulur.
 */
export function SectionBg({
  src,
  position = "center",
  strength = "soft",
}: {
  src?: string;
  position?: string;
  strength?: "soft" | "medium";
}) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="landing-court absolute inset-0" />
      {src && (
        <div
          data-parallax="0.12"
          className={cn(
            "absolute -inset-y-[12%] inset-x-0 bg-cover grayscale",
            strength === "soft" ? "opacity-[0.16]" : "opacity-[0.24]"
          )}
          style={{ backgroundImage: `url(${src})`, backgroundPosition: position }}
        />
      )}
      {/* Paletin mavisiyle hafif tonlama + kenar erimesi */}
      <div className="absolute inset-0 bg-primary/[0.06] mix-blend-color" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
