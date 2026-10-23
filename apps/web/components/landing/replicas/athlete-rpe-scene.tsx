"use client";

import { useState } from "react";
import { CheckSquare, Square, X } from "lucide-react";
import { MobileHeader, MobileScreen } from "./mobile-screen";

/** program/[day].tsx + SessionFeedbackSheet.tsx'in kayıt için kopyası. */

const RPE_LABELS: Record<number, string> = {
  1: "Çok çok kolay",
  2: "Kolay",
  3: "Orta",
  4: "Biraz zor",
  5: "Zor",
  6: "Oldukça zor",
  7: "Çok zor",
  8: "Çok çok zor",
  9: "Neredeyse maksimum",
  10: "Maksimum",
};
const STATUSES = ["Yaptım", "Eksik", "Yapmadım"];
const PAIN_AREAS = ["Omuz", "Sırt", "Bel", "Kalça", "Diz", "Ayak bileği"];

function rpeColor(n: number, selected: boolean) {
  if (!selected) return "bg-gray-100";
  if (n <= 3) return "bg-emerald-600";
  if (n <= 6) return "bg-amber-500";
  if (n <= 8) return "bg-orange-600";
  return "bg-red-600";
}

const EXERCISES = [
  ["Back Squat", "3 × 5", "%75–80 · ≈ 90–95 kg"],
  ["Romanian Deadlift", "3 × 8", "%65 · ≈ 72,5 kg"],
  ["Bulgarian Split Squat", "3 × 8/8", "16 kg dambıl"],
  ["Nordic Hamstring Curl", "3 × 5", "Vücut ağırlığı"],
];

export function AthleteRpeScene() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(0);
  const [rpe, setRpe] = useState<number | null>(null);
  const [duration, setDuration] = useState("70");
  const [pain, setPain] = useState(false);
  const [area, setArea] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const minutes = Number(duration) || 0;

  const sheet = open ? (
    <div className="absolute inset-0 z-30 flex flex-col justify-end bg-black/40">
      <div className="aiq-sheet-in max-h-[88%] overflow-hidden rounded-t-3xl bg-gray-50">
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          <div>
            <p className="text-lg font-bold">Antrenmanı Değerlendir</p>
            <p className="mt-0.5 text-sm text-gray-500">Kuvvet — Alt Ekstremite</p>
          </div>
          <X className="h-6 w-6 text-gray-400" />
        </div>
        <div className="px-5">
          <p className="mb-2 font-semibold">Durum</p>
          <div className="mb-5 flex gap-2">
            {STATUSES.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(i)}
                className={`flex-1 rounded-xl py-3 text-sm font-semibold ${status === i ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-700"}`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="mb-1 font-semibold">Ne kadar zorlandın? (RPE)</p>
          <p className="mb-2 text-xs text-gray-500">Antrenmanın TAMAMINI düşünerek seç.</p>
          <div className="mb-1 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                type="button"
                data-demo={`rpe-${n}`}
                onClick={() => setRpe(n)}
                className={`flex aspect-square w-[17%] items-center justify-center rounded-xl text-base font-bold ${rpeColor(n, rpe === n)} ${rpe === n ? "text-white" : "text-gray-700"}`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mb-4 h-5 text-sm text-gray-500">{rpe != null ? RPE_LABELS[rpe] : ""}</p>
          <p className="mb-1 font-semibold">Gerçek süre (dk)</p>
          <p className="mb-2 text-xs text-gray-500">Planlanan 70 dk — farklıysa düzelt.</p>
          <input
            data-demo="duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base outline-none"
          />
          <p className="mb-4 mt-1.5 h-4 text-xs text-gray-400">
            {rpe != null && minutes > 0 ? `Antrenman yükü: ${rpe} × ${minutes} = ${rpe * minutes} AU` : ""}
          </p>
          <button
            type="button"
            data-demo="pain"
            onClick={() => setPain((v) => !v)}
            className={`mb-2 flex w-full items-center rounded-xl px-4 py-3 ${pain ? "border border-red-300 bg-red-50" : "border border-gray-200 bg-white"}`}
          >
            {pain ? <CheckSquare className="h-5 w-5 text-red-600" /> : <Square className="h-5 w-5 text-gray-400" />}
            <span className={`ml-3 text-base ${pain ? "font-semibold text-red-700" : "text-gray-700"}`}>
              Ağrı / rahatsızlık yaşadım
            </span>
          </button>
          {pain && (
            <div className="mb-3 flex flex-wrap gap-2">
              {PAIN_AREAS.map((a) => (
                <button
                  key={a}
                  type="button"
                  data-demo={`area-${a}`}
                  onClick={() => setArea(a)}
                  className={`rounded-full px-3 py-2 text-sm ${area === a ? "bg-red-600 text-white" : "border border-gray-200 bg-white text-gray-700"}`}
                >
                  {a}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="mt-2 border-t border-gray-200 bg-white px-5 pb-8 pt-3">
          <button
            type="button"
            data-demo="submit"
            onClick={() => {
              setOpen(false);
              setSaved(true);
            }}
            className={`w-full rounded-xl py-4 text-base font-bold text-white ${rpe == null ? "bg-gray-300" : "bg-blue-700"}`}
          >
            Gönder
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <MobileScreen active="program" overlay={sheet}>
      <MobileHeader title="Pazartesi" subtitle="Hazırlık Bloğu · Hafta 3" />
      <div className="space-y-3 p-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-bold">Kuvvet — Alt Ekstremite</p>
              <p className="text-xs text-gray-500">70 dk · Kuvvet</p>
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">Bugün</span>
          </div>
          <div className="mt-3 divide-y divide-gray-100">
            {EXERCISES.map(([n, s, l]) => (
              <div key={n} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-semibold">{n}</p>
                  <p className="text-xs text-gray-500">{l}</p>
                </div>
                <span className="text-sm font-bold tabular-nums text-gray-700">{s}</span>
              </div>
            ))}
          </div>
          {saved ? (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">{STATUSES[status]}</span>
                {rpe != null && (
                  <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">RPE {rpe}</span>
                )}
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">{minutes} dk</span>
                {pain && (
                  <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">Ağrı · {area ?? "—"}</span>
                )}
              </div>
              <p className="text-xs text-gray-400">Koçuna iletildi. Yanıtı burada göreceksin.</p>
            </div>
          ) : (
            <button
              type="button"
              data-demo="open-feedback"
              onClick={() => setOpen(true)}
              className="mt-3 w-full rounded-xl bg-blue-700 py-3 text-sm font-bold text-white"
            >
              Antrenmanı Değerlendir
            </button>
          )}
        </div>
        <div className="rounded-2xl bg-white p-4 opacity-70 shadow-sm">
          <p className="text-sm font-semibold">Mobilite — Kalça & Ayak Bileği</p>
          <p className="text-xs text-gray-500">20 dk · Toparlanma</p>
        </div>
      </div>
    </MobileScreen>
  );
}
