"use client";

import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import type { OrgExerciseCategory } from "@athleteiq/db/queries/exercises";

export const MOVEMENT_PATTERNS = [
  { value: "horizontal_push", label: "Horizontal Push" },
  { value: "vertical_push", label: "Vertical Push" },
  { value: "horizontal_pull", label: "Horizontal Pull" },
  { value: "vertical_pull", label: "Vertical Pull" },
  { value: "hip_hinge_bilateral", label: "Hip Hinge (Bilateral)" },
  { value: "hip_hinge_unilateral", label: "Hip Hinge (Unilateral)" },
  { value: "knee_dominant_bilateral", label: "Knee Dominant (Bilateral)" },
  { value: "knee_dominant_unilateral", label: "Knee Dominant (Unilateral)" },
  { value: "rotation", label: "Rotation" },
  { value: "anti_rotation", label: "Anti-Rotation" },
  { value: "jump_land", label: "Jump & Land" },
  { value: "locomotion", label: "Locomotion" },
  { value: "core_stability", label: "Core Stability" },
  { value: "loaded_carry", label: "Loaded Carry" },
  { value: "sport_specific", label: "Sport Specific" },
  { value: "mobility_flexibility", label: "Mobility & Flexibility" },
];

const LOAD_TYPES = [
  { value: "absolute_kg", label: "Mutlak Ağırlık (kg)" },
  { value: "bodyweight", label: "Vücut Ağırlığı" },
  { value: "percentage_1rm", label: "% 1RM" },
  { value: "rpe", label: "RPE" },
  { value: "duration_sec", label: "Süre (sn)" },
  { value: "distance_m", label: "Mesafe (m)" },
];

const DIFFICULTIES = [
  { value: "beginner", label: "Başlangıç" },
  { value: "intermediate", label: "Orta" },
  { value: "advanced", label: "İleri" },
];

export interface ExerciseFormData {
  name: string;
  name_tr: string;
  movement_pattern: string;
  custom_category_id: string;
  primary_muscles: string;
  secondary_muscles: string;
  equipment: string;
  sport_tags: string;
  load_type: string;
  is_unilateral: boolean;
  difficulty: string;
  instructions: string;
  coach_notes: string;
  demo_url: string;
}

interface Props {
  data: ExerciseFormData;
  onChange: (updates: Partial<ExerciseFormData>) => void;
  categories: OrgExerciseCategory[];
  scope?: "org" | "platform";
}

export function ExerciseFormFields({ data, onChange, categories, scope = "org" }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Egzersiz Adı (EN) *</Label>
          <Input
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Back Squat"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Egzersiz Adı (TR)</Label>
          <Input
            value={data.name_tr}
            onChange={(e) => onChange({ name_tr: e.target.value })}
            placeholder="Squat"
          />
        </div>
      </div>

      <div className={scope === "platform" ? "grid grid-cols-1" : "grid grid-cols-2 gap-3"}>
        <div className="space-y-1.5">
          <Label>Hareket Paterni{scope === "platform" ? " *" : ""}</Label>
          <select
            value={data.movement_pattern}
            onChange={(e) => onChange({ movement_pattern: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Seçin</option>
            {MOVEMENT_PATTERNS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        {scope === "org" && (
          <div className="space-y-1.5">
            <Label>Org Kategorisi</Label>
            <select
              value={data.custom_category_id}
              onChange={(e) => onChange({ custom_category_id: e.target.value })}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Seçin</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name_tr ?? c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Yük Tipi</Label>
          <select
            value={data.load_type}
            onChange={(e) => onChange({ load_type: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {LOAD_TYPES.map((lt) => (
              <option key={lt.value} value={lt.value}>{lt.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Zorluk</Label>
          <select
            value={data.difficulty}
            onChange={(e) => onChange({ difficulty: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Birincil Kaslar (virgülle ayırın)</Label>
        <Input
          value={data.primary_muscles}
          onChange={(e) => onChange({ primary_muscles: e.target.value })}
          placeholder="quadriceps, glutes, hamstrings"
        />
      </div>

      <div className="space-y-1.5">
        <Label>İkincil Kaslar (virgülle ayırın)</Label>
        <Input
          value={data.secondary_muscles}
          onChange={(e) => onChange({ secondary_muscles: e.target.value })}
          placeholder="core, lower_back"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Ekipman (virgülle ayırın)</Label>
          <Input
            value={data.equipment}
            onChange={(e) => onChange({ equipment: e.target.value })}
            placeholder="barbell, bench"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Spor Etiketleri (virgülle ayırın)</Label>
          <Input
            value={data.sport_tags}
            onChange={(e) => onChange({ sport_tags: e.target.value })}
            placeholder="gymnastics, all_sports"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_unilateral"
          checked={data.is_unilateral}
          onChange={(e) => onChange({ is_unilateral: e.target.checked })}
          className="accent-primary"
        />
        <Label htmlFor="is_unilateral">Tek taraflı egzersiz</Label>
      </div>

      <div className="space-y-1.5">
        <Label>Demo URL (YouTube, vb.)</Label>
        <Input
          value={data.demo_url}
          onChange={(e) => onChange({ demo_url: e.target.value })}
          placeholder="https://youtube.com/..."
        />
      </div>

      <div className="space-y-1.5">
        <Label>Talimatlar</Label>
        <textarea
          value={data.instructions}
          onChange={(e) => onChange({ instructions: e.target.value })}
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          placeholder="Egzersiz nasıl yapılır..."
        />
      </div>

      {scope === "org" && (
        <div className="space-y-1.5">
          <Label>Koç Notları</Label>
          <textarea
            value={data.coach_notes}
            onChange={(e) => onChange({ coach_notes: e.target.value })}
            rows={2}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            placeholder="Özel notlar..."
          />
        </div>
      )}
    </div>
  );
}

export function parseArrayField(val: string): string[] {
  return val.split(",").map((s) => s.trim()).filter(Boolean);
}
