"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@athleteiq/ui/components/button";
import { Input } from "@athleteiq/ui/components/input";
import { Label } from "@athleteiq/ui/components/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { orgUpdateErrorMessage } from "@/lib/org-errors";
import { updateOrganization } from "@athleteiq/db/queries/organizations";
import {
  ORG_PLANS,
  updateOrgSchema,
  updateOrgSlugPlanSchema,
} from "@athleteiq/validators/organization";

const PLAN_LABELS: Record<(typeof ORG_PLANS)[number], string> = {
  free: "Ücretsiz",
  pro: "Pro",
  enterprise: "Kurumsal",
};

interface Props {
  org: { id: string; name: string; slug: string; plan: string; logo_url: string };
  /** profiles satırı sayısı — > 0 ise slug DB'de de kilitli (protect_org_admin_fields). */
  userCount: number;
}

export function EditOrganizationForm({ org, userCount }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: org.name,
    logo_url: org.logo_url,
    slug: org.slug,
    plan: org.plan,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const slugLocked = userCount > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setSubmitError(null);

    const base = updateOrgSchema.safeParse({ name: form.name, logo_url: form.logo_url });
    const slugPlan = updateOrgSlugPlanSchema.safeParse({ slug: form.slug, plan: form.plan });
    if (!base.success || !slugPlan.success) {
      const errs: Record<string, string> = {};
      for (const issue of [...(base.error?.issues ?? []), ...(slugPlan.error?.issues ?? [])]) {
        errs[String(issue.path[0])] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setIsSaving(true);
    try {
      await updateOrganization(createClient(), org.id, {
        name: base.data.name.trim(),
        logo_url: base.data.logo_url || null,
        plan: slugPlan.data.plan,
        ...(slugLocked ? {} : { slug: slugPlan.data.slug }),
      });
      toast({ title: "Organizasyon güncellendi" });
      router.refresh();
    } catch (err: unknown) {
      setSubmitError(orgUpdateErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="org-name">Organizasyon Adı *</Label>
          <Input
            id="org-name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="org-logo">Logo URL</Label>
          <Input
            id="org-logo"
            value={form.logo_url}
            onChange={(e) => setForm((prev) => ({ ...prev, logo_url: e.target.value }))}
            placeholder="https://..."
          />
          {fieldErrors.logo_url && <p className="text-xs text-destructive">{fieldErrors.logo_url}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="org-slug">Slug</Label>
          <Input
            id="org-slug"
            value={form.slug}
            readOnly={slugLocked}
            className={slugLocked ? "bg-muted/40 font-mono text-xs" : "font-mono"}
            onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">
            {slugLocked
              ? `Bu organizasyonda ${userCount} kullanıcı var; giriş kimlikleri (kullanıcı adı@${org.slug}) slug'a bağlı olduğu için değiştirilemez.`
              : `Henüz kullanıcı yok; giriş kimlikleri kullanıcı adı@${form.slug || "slug"} olacak.`}
          </p>
          {fieldErrors.slug && <p className="text-xs text-destructive">{fieldErrors.slug}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="org-plan">Plan</Label>
          <select
            id="org-plan"
            value={form.plan}
            onChange={(e) => setForm((prev) => ({ ...prev, plan: e.target.value }))}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {ORG_PLANS.map((p) => (
              <option key={p} value={p}>
                {PLAN_LABELS[p]}
              </option>
            ))}
          </select>
          {fieldErrors.plan && <p className="text-xs text-destructive">{fieldErrors.plan}</p>}
        </div>
      </div>

      {submitError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{submitError}</p>
      )}

      <Button type="submit" disabled={isSaving} size="sm">
        {isSaving ? "Kaydediliyor..." : "Kaydet"}
      </Button>
    </form>
  );
}
