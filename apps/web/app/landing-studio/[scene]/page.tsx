import { notFound } from "next/navigation";
import { ReplicaScene } from "@/components/landing/replicas";
import { isReplicaSceneName } from "@/components/landing/replicas/scene-names";

/**
 * Landing görsellerini kaydetmek için replika sahneleri (scripts/landing/record-replicas.mjs).
 * Yalnızca LANDING_STUDIO=1 ile çalışan yerel bir sunucuda açılır; prod'da 404.
 */
export const dynamic = "force-dynamic";

export default async function LandingStudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ scene: string }>;
  searchParams: Promise<{ scale?: string }>;
}) {
  const { scene } = await params;
  if (process.env.LANDING_STUDIO !== "1" || !isReplicaSceneName(scene)) notFound();
  // Sabit boyutlu (telefon) sahneleri yüksek çözünürlükte kaydetmek için büyütme.
  const scale = Math.min(3, Math.max(1, Number((await searchParams).scale) || 1));
  if (scale === 1) return <ReplicaScene name={scene} />;
  return (
    <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0" }}>
      <ReplicaScene name={scene} />
    </div>
  );
}
