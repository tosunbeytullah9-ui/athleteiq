// Sporcu ana ekranlarındaki (web dashboard + mobil program sekmesi) saate göre
// selamlama. timeZone verilmezse cihazın yerel saati kullanılır (mobil); web
// "Europe/Istanbul" verir — sayfa sunucuda (Vercel, UTC) da render edildiği için
// yerel saat kullanılsaydı sunucu ile tarayıcı farklı selamlama üretip
// hydration uyuşmazlığına yol açardı.
export type TimeGreeting = "Günaydın" | "İyi günler" | "İyi akşamlar" | "İyi geceler";

export function getGreetingForHour(hour: number): TimeGreeting {
  if (hour >= 5 && hour < 12) return "Günaydın";
  if (hour >= 12 && hour < 18) return "İyi günler";
  if (hour >= 18 && hour < 22) return "İyi akşamlar";
  return "İyi geceler";
}

export function getTimeGreeting(date: Date = new Date(), timeZone?: string): TimeGreeting {
  if (!timeZone) return getGreetingForHour(date.getHours());
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(date),
  );
  return getGreetingForHour(hour);
}
