import { cn } from "@/lib/utils";

/** Masaüstü ekran görüntüleri için sade tarayıcı çerçevesi. */
export function BrowserFrame({
  url,
  children,
  className,
}: {
  url: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-white/10 bg-[hsl(222_39%_9%)] shadow-[0_40px_120px_-30px_rgb(0_0_0/0.8)] ring-1 ring-black/40",
        className
      )}
    >
      <div className="flex h-9 items-center gap-3 border-b border-white/5 px-3.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        </span>
        <span className="mx-auto max-w-[60%] truncate rounded-md bg-white/5 px-3 py-0.5 text-center font-mono text-[11px] text-white/45">
          {url}
        </span>
        <span className="w-10" aria-hidden />
      </div>
      <div className="bg-white">{children}</div>
    </div>
  );
}

/** Telefon çerçevesi (saf CSS) — içerik 390×844 oranında. */
export function PhoneFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[300px] rounded-[2.9rem] bg-[hsl(222_20%_14%)] p-[10px] shadow-[0_40px_100px_-30px_rgb(0_0_0/0.85)] ring-1 ring-white/10",
        className
      )}
    >
      <div className="relative aspect-[390/844] overflow-hidden rounded-[2.25rem] bg-black">
        {children}
        <span
          aria-hidden
          className="absolute left-1/2 top-2.5 h-[22px] w-[86px] -translate-x-1/2 rounded-full bg-black"
        />
      </div>
    </div>
  );
}
