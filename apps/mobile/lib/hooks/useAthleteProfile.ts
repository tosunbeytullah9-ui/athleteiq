import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@athleteiq/db/types";

// Branş sporcuda TUTULMAZ, takımdan türetilir (teams.discipline tek kaynak —
// 044_position_vs_training_group.sql). athletes.position artık MEVKİ'dir.
export type AthleteProfile = Database["public"]["Tables"]["athletes"]["Row"] & {
  teams: { name: string; discipline: string | null } | null;
};

export function useAthleteProfile() {
  const [athlete, setAthlete] = useState<AthleteProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (mounted) setLoading(false);
        return;
      }

      const { data, error: err } = await supabase
        .from("athletes")
        .select("*, teams(name, discipline)")
        .eq("user_id", user.id)
        .single();

      if (mounted) {
        if (err) setError(err.message);
        else setAthlete(data);
        setLoading(false);
      }
    }

    fetchProfile();
    return () => {
      mounted = false;
    };
  }, []);

  return { athlete, loading, error };
}
