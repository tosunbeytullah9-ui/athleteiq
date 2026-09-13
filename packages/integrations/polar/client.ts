import type { PolarNightlyRecharge, PolarSleepResult } from "./types";
import { PolarNightlyRechargeSchema, PolarSleepResultSchema } from "./types";
import { z } from "zod";

// GERÇEK swagger.yaml (www.polar.com/accesslink-api/swagger.yaml, 2026-09-13'te
// indirilip doğrulandı) — nightly-recharge/sleep AYRI bir "v4 Dynamic API"de
// DEĞİL, klasik AccessLink v3'ün bir parçası ("/v3/users/sleep",
// "/v3/users/nightly-recharge"). Önceki taslak (ve bir sonraki hatalı "düzeltme"
// denemesi) "/v4/data/..." kullanıyordu — bu path hiç var olmadığından Tomcat
// seviyesinde çıplak bir 401 dönüyordu (JSON hata gövdesi bile yok, path'in
// mevcut olmadığının işareti). Ayrıca bu iki endpoint tarih aralığı parametresi
// (`from`/`to`) KABUL ETMİYOR — otomatik olarak son 28 günü döndürüyor.
const BASE_URL = "https://www.polaraccesslink.com/v3";

export class PolarClient {
  private async request<T>(accessToken: string, path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Polar API error ${res.status}: ${path} ${body}`);
    }

    return res.json() as Promise<T>;
  }

  // wrapper key "recharges" (bkz. swagger.yaml #/components/schemas/recharges)
  async getNightlyRechargeResults(accessToken: string): Promise<PolarNightlyRecharge[]> {
    const data = await this.request<{ recharges: unknown[] }>(
      accessToken,
      "/users/nightly-recharge"
    );
    return z.array(PolarNightlyRechargeSchema).parse(data["recharges"] ?? []);
  }

  // wrapper key "nights" (bkz. swagger.yaml #/components/schemas/nights)
  async getSleepResults(accessToken: string): Promise<PolarSleepResult[]> {
    const data = await this.request<{ nights: unknown[] }>(accessToken, "/users/sleep");
    return z.array(PolarSleepResultSchema).parse(data["nights"] ?? []);
  }
}
