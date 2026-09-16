import type {
  FitbitSleepLog,
  FitbitHeartRateDay,
  FitbitHrvDay,
  FitbitActivityLogEntry,
} from "./types";
import {
  FitbitSleepLogSchema,
  FitbitHeartRateDaySchema,
  FitbitHrvDaySchema,
  FitbitActivityLogEntrySchema,
} from "./types";
import { z } from "zod";

const BASE_URL = "https://api.fitbit.com";

export class FitbitClient {
  private async request<T>(accessToken: string, path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Fitbit API error ${res.status}: ${path} ${body}`);
    }
    return res.json() as Promise<T>;
  }

  // maks 100 gün aralık (dev.fitbit.com doğrulandı)
  async getSleepLogRange(
    accessToken: string,
    startDate: string,
    endDate: string
  ): Promise<FitbitSleepLog[]> {
    const data = await this.request<{ sleep: unknown[] }>(
      accessToken,
      `/1.2/user/-/sleep/date/${startDate}/${endDate}.json`
    );
    return z.array(FitbitSleepLogSchema).parse(data.sleep ?? []);
  }

  // period: "1d" | "7d" | "30d" | "1w" | "1m" — tek çağrıda aralık döner
  async getHeartRateRange(
    accessToken: string,
    date: string,
    period: "7d" | "30d" = "7d"
  ): Promise<FitbitHeartRateDay[]> {
    const data = await this.request<{ "activities-heart": unknown[] }>(
      accessToken,
      `/1/user/-/activities/heart/date/${date}/${period}.json`
    );
    return z.array(FitbitHeartRateDaySchema).parse(data["activities-heart"] ?? []);
  }

  // maks 30 gün aralık (dev.fitbit.com doğrulandı)
  async getHrvRange(
    accessToken: string,
    startDate: string,
    endDate: string
  ): Promise<FitbitHrvDay[]> {
    const data = await this.request<{ hrv: unknown[] }>(
      accessToken,
      `/1/user/-/hrv/date/${startDate}/${endDate}.json`
    );
    return z.array(FitbitHrvDaySchema).parse(data.hrv ?? []);
  }

  async getActivityLogList(
    accessToken: string,
    params: { beforeDate: string; sort: "asc" | "desc"; limit: number }
  ): Promise<FitbitActivityLogEntry[]> {
    const query = new URLSearchParams({
      beforeDate: params.beforeDate,
      sort: params.sort,
      limit: String(params.limit),
      offset: "0",
    });
    const data = await this.request<{ activities: unknown[] }>(
      accessToken,
      `/1/user/-/activities/list.json?${query}`
    );
    return z.array(FitbitActivityLogEntrySchema).parse(data.activities ?? []);
  }
}
