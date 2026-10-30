import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { PRODUCT_NAME, SITE_URL } from "@/lib/brand";

export const metadata: Metadata = {
  title: { default: PRODUCT_NAME, template: `%s — ${PRODUCT_NAME}` },
  description: "Spor kurumları için antrenman ve sporcu izleme platformu",
  metadataBase: new URL(SITE_URL),
  applicationName: PRODUCT_NAME,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
