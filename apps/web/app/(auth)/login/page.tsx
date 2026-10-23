import { LandingPage } from "@/components/landing/landing-page";

// /login, landing sayfasının kendisidir — giriş formu #giris bölümünde.
// Middleware'in /login?next=... yönlendirmeleri bu sayede değişmeden çalışır.
export default function LoginPage() {
  return <LandingPage />;
}
