// Sunucu tarafı çıkış: hem Supabase oturumunu hem httpOnly aiq_* cookie'lerini
// temizler (bkz. app/auth/logout route.ts). Ardından hard navigation ile
// middleware'in temiz bir istekte yeniden çalışması sağlanır. finally ile
// fetch hata verse bile kullanıcı login'e yönlendirilir. header.tsx ve
// profile-client.tsx arasında paylaşılır.
export async function signOut(): Promise<void> {
  try {
    await fetch("/auth/logout", { method: "POST" });
  } catch (e) {
    console.error(e);
  } finally {
    window.location.href = "/login";
  }
}
