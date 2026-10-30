# App Review Notes — Loadwell

> Paste the section below into App Store Connect → App Review Information →
> Notes. Replace `[PASSWORD]` before submitting. The password
> is the current `LANDING_DEMO_PASSWORD` used for the latest demo seed — it is
> never stored in this repository. See `submission-checklist.md`.

---

## About the app

Loadwell is an athlete monitoring and training management app. Sports
organizations (federations, clubs and universities) use it to plan training
for their athletes and to track readiness, training load and competitions.

Accounts are created by the organization for its own athletes and coaches.
There is no in-app sign-up, which is why we are providing demo accounts. Both
accounts belong to a fictional "Demo Kulübü" (Demo Club) organization and
contain only fictional data.

## How to sign in

The login field takes **username@organization**, not an email address.

| Role | Login | Password |
|---|---|---|
| Athlete | `defne.arslan@demo` | `[PASSWORD]` |
| Coach | `koc.demo@demo` | `[PASSWORD]` |

## What to look at

**Athlete account (`defne.arslan@demo`)**

1. **Program** tab: the athlete's training program for the current week. Tap
   any highlighted day to see its exercises, sets and loads.
2. On a day screen, scroll below a session. Past sessions show the athlete's
   own feedback (effort rating, duration, note) and the coach's reply.
   **Antrenmanı Değerlendir** (Rate session) opens the feedback form.
3. On the Program tab, tap the **Sabah Değerlendirmesi** (Morning check-in)
   card to fill in today's 5-question wellness survey. Recent days are listed
   below the form.
4. **Recovery** tab: daily recovery, HRV, resting heart rate, sleep and strain
   from the athlete's wearable (sample WHOOP data is preloaded).
5. **Yarışmalar** (Competitions) tab: upcoming and past competitions.
6. **Profil** (Profile) tab: personal details, the wearable connection and
   account deletion.

**Coach account (`koc.demo@demo`)**

1. **Sporcularım** (My Athletes) tab: the coach's team roster.
2. Tap an athlete (for example *Defne Arslan*) to open their program,
   recovery data and competitions.
3. **Profil** (Profile) tab: organization info, sign out, privacy policy and
   support links (**Yardım** / Help) and account deletion.

## Account deletion (Guideline 5.1.1(v))

Profile → **Hesabımı Sil** (Delete my account). The request goes to the
organization's administrator and is processed within 30 days. While the
request is pending, the user can cancel it from the same screen.

Note for the demo accounts: the demo organization has no administrator, so a
deletion request made during review stays pending. It is cleared the next time
we reset the demo data.

## Privacy policy and support

Profile → **Yardım** (Help) → **Gizlilik Politikası** (Privacy Policy) opens
https://loadwell.app/privacy and **Destek** (Support) opens
https://loadwell.app/support, on both the athlete and the coach account.

## WHOOP (optional)

Connecting a wearable is optional and requires the user's own WHOOP account
and device. The demo athlete has sample WHOOP data preloaded. If you tap
**Bağlantıyı Kes** (Disconnect) on the Profile tab, the sample connection is
deactivated and the Recovery tab will show "not connected". Reconnecting
requires a real WHOOP account.

## Purchases

There are no in-app purchases, no paid content and no links to external
payment. Nothing is sold or unlocked inside the app.

## Region and language

The app is available in Turkey only. The interface is in Turkish.
