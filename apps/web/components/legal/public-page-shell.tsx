import Link from "next/link";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { BrandMark } from "@/components/shared/brand-mark";
import { LEGAL_NAME, PRODUCT_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

// /privacy ve /support için ortak, oturumsuz erişilen sayfa kabuğu (Parti 18C).
// Landing'in aksine her zaman koyu değil — kullanıcının tema tercihini izler.

const NAV_LINKS = [
  { href: "/privacy", label: "Gizlilik" },
  { href: "/support", label: "Destek" },
] as const;

export function PublicPageShell({
  current,
  children,
}: {
  current: (typeof NAV_LINKS)[number]["href"];
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <BrandMark className="h-7 w-7" />
            {PRODUCT_NAME}
          </Link>
          <nav className="ml-auto flex items-center gap-4 text-sm">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={l.href === current ? "page" : undefined}
                className={cn(
                  "transition-colors hover:text-foreground",
                  l.href === current ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {l.label}
              </Link>
            ))}
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        {children}
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {LEGAL_NAME} · {PRODUCT_NAME}
          </p>
          <div className="flex gap-5">
            <Link href="/" className="hover:text-foreground">
              Ana sayfa
            </Link>
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-10 space-y-2">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

/** Başlıklı metin bölümü; `id` sayfa içi bağlantılar için. */
export function TextSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 border-t py-8 first:border-t-0 first:pt-0">
      <h2 className="mb-4 text-lg font-semibold tracking-tight">{title}</h2>
      <div className="space-y-4 text-[15px] leading-7 text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5">
        {children}
      </div>
    </section>
  );
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  const className = "font-medium text-primary underline underline-offset-2 hover:no-underline";
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
