"use client";

import { useState } from "react";
import { Eye, EyeOff, GripVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import {
  createAnnualPlanMethod,
  getAnnualPlanMethods,
  updateAnnualPlanMethod,
} from "@athleteiq/db/queries/annual-plans";
import {
  annualPlanMethodSchema,
  DEFAULT_ANNUAL_PLAN_METHODS,
} from "@athleteiq/validators/annual-plan";
import type { Tables } from "@athleteiq/db/types";

type Method = Tables<"annual_plan_methods">;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  methods: Method[];
  onChange: (methods: Method[]) => void;
}

const FALLBACK_COLOR = "#64748b";

/**
 * Antrenman sistemi kütüphanesi — organizasyona özel satır başlıkları.
 *
 * SİLME SUNULMAZ (RLS silmeye izin verse de): annual_plan_cells.method_id
 * `on delete cascade` olduğu için bir sistemi silmek, o sistemin TÜM
 * planlardaki geçmiş hücrelerini de sessizce götürür. Bunun yerine
 * is_active=false — satır ızgaradan kalkar, veri durur, geri alınabilir.
 */
export function MethodsDialog({ open, onOpenChange, orgId, methods, onChange }: Props) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(FALLBACK_COLOR);
  const [isBusy, setIsBusy] = useState(false);

  async function reload() {
    const fresh = await getAnnualPlanMethods(createClient(), orgId, { includeInactive: true });
    onChange((fresh ?? []) as Method[]);
  }

  async function handleAdd() {
    const parsed = annualPlanMethodSchema.safeParse({
      name: newName,
      color: newColor,
      sort_order: methods.length,
      is_active: true,
    });
    if (!parsed.success) {
      toast({
        title: "Geçersiz",
        description: parsed.error.issues[0]?.message ?? "Sistem adı gerekli.",
        variant: "destructive",
      });
      return;
    }

    setIsBusy(true);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      await createAnnualPlanMethod(supabase, {
        org_id: orgId,
        name: parsed.data.name,
        color: parsed.data.color ?? null,
        sort_order: parsed.data.sort_order,
        created_by: userData.user?.id ?? null,
      });
      await reload();
      setNewName("");
      setNewColor(FALLBACK_COLOR);
      toast({ title: "Sistem eklendi", description: parsed.data.name });
    } catch (err) {
      const message =
        (err as { code?: string }).code === "23505"
          ? "Bu isimde bir sistem zaten var."
          : err instanceof Error
            ? err.message
            : "Sistem eklenemedi.";
      toast({ title: "Hata", description: message, variant: "destructive" });
    } finally {
      setIsBusy(false);
    }
  }

  async function handlePatch(method: Method, updates: Partial<Method>) {
    setIsBusy(true);
    try {
      await updateAnnualPlanMethod(createClient(), method.id, updates);
      await reload();
    } catch (err) {
      toast({
        title: "Hata",
        description: err instanceof Error ? err.message : "Güncellenemedi.",
        variant: "destructive",
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function handleMove(method: Method, direction: -1 | 1) {
    const ordered = [...methods].sort((a, b) => a.sort_order - b.sort_order);
    const index = ordered.findIndex((m) => m.id === method.id);
    const swapWith = ordered[index + direction];
    if (!swapWith) return;

    setIsBusy(true);
    try {
      const supabase = createClient();
      await updateAnnualPlanMethod(supabase, method.id, { sort_order: swapWith.sort_order });
      await updateAnnualPlanMethod(supabase, swapWith.id, { sort_order: method.sort_order });
      await reload();
    } catch (err) {
      toast({
        title: "Hata",
        description: err instanceof Error ? err.message : "Sıralama değiştirilemedi.",
        variant: "destructive",
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSeedDefaults() {
    setIsBusy(true);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const existingNames = new Set(methods.map((m) => m.name.toLocaleLowerCase("tr")));
      const missing = DEFAULT_ANNUAL_PLAN_METHODS.filter(
        (d) => !existingNames.has(d.name.toLocaleLowerCase("tr"))
      );

      if (missing.length === 0) {
        toast({ title: "Zaten ekli", description: "Varsayılan sistemlerin tümü mevcut." });
        return;
      }

      for (const [i, d] of missing.entries()) {
        await createAnnualPlanMethod(supabase, {
          org_id: orgId,
          name: d.name,
          color: d.color,
          sort_order: methods.length + i,
          created_by: userData.user?.id ?? null,
        });
      }
      await reload();
      toast({
        title: "Varsayılanlar eklendi",
        description: `${missing.length} sistem eklendi.`,
      });
    } catch (err) {
      toast({
        title: "Hata",
        description: err instanceof Error ? err.message : "Varsayılanlar eklenemedi.",
        variant: "destructive",
      });
    } finally {
      setIsBusy(false);
    }
  }

  const ordered = [...methods].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Antrenman Sistemleri</DialogTitle>
          <DialogDescription>
            Izgaranın satırları. Bu liste organizasyona özeldir ve tüm yıllık planlarda ortaktır.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          {ordered.map((m, i) => (
            <div
              key={m.id}
              className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${
                m.is_active ? "" : "opacity-50"
              }`}
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  onClick={() => handleMove(m, -1)}
                  disabled={isBusy || i === 0}
                  aria-label={`${m.name} yukarı taşı`}
                >
                  <GripVertical className="h-3 w-3 rotate-90" />
                </button>
              </div>
              <input
                type="color"
                value={m.color ?? FALLBACK_COLOR}
                onChange={(e) => handlePatch(m, { color: e.target.value })}
                disabled={isBusy}
                className="h-6 w-6 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                aria-label={`${m.name} rengi`}
              />
              <Input
                defaultValue={m.name}
                onBlur={(e) => {
                  const next = e.target.value.trim();
                  if (next && next !== m.name) handlePatch(m, { name: next });
                }}
                disabled={isBusy}
                className="h-8 flex-1 border-0 px-1 shadow-none focus-visible:ring-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handlePatch(m, { is_active: !m.is_active })}
                disabled={isBusy}
                title={m.is_active ? "Izgaradan gizle" : "Izgarada göster"}
                aria-label={m.is_active ? `${m.name} gizle` : `${m.name} göster`}
              >
                {m.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </Button>
            </div>
          ))}

          {ordered.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Henüz sistem yok.
            </p>
          )}
        </div>

        <div className="space-y-2 rounded-md border bg-muted/40 p-3">
          <Label htmlFor="new-method">Yeni sistem ekle</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="h-9 w-9 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
              aria-label="Yeni sistem rengi"
            />
            <Input
              id="new-method"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder="Örn: Kor Stabilizasyonu"
            />
            <Button onClick={handleAdd} disabled={isBusy}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Silme yerine göz simgesiyle gizleyin — silmek o sistemin tüm planlardaki geçmiş
            verisini de siler.
          </p>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" size="sm" onClick={handleSeedDefaults} disabled={isBusy}>
            Varsayılan sistemleri ekle
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
