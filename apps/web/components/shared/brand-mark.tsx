import { cn } from "@/lib/utils";

// Loadwell işareti — apps/mobile/assets/brand/loadwell-favicon.svg'nin inline hali
// (yuvarlatılmış #1d4ed8 zemin). Boyut className ile verilir; varsayılan olarak
// dekoratiftir (yanında ürün adı yazılı), tek başına kullanılırsa `title` verin.

export function BrandMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 1024 1024"
      className={cn("h-8 w-8 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <rect width="1024" height="1024" rx="228" fill="#1d4ed8" />
      <path
        d="M298 726 L298 630 L410 570 L510 610 L630 430 L730 330 L730 726 Z"
        fill="#ffffff"
        fillOpacity="0.18"
      />
      <path
        d="M298 630 L410 570 L510 610 L630 430 L730 330"
        fill="none"
        stroke="#ffffff"
        strokeWidth="36"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M250 250 V774 H774"
        fill="none"
        stroke="#ffffff"
        strokeWidth="96"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="730" cy="330" r="30" fill="#24d665" />
    </svg>
  );
}
