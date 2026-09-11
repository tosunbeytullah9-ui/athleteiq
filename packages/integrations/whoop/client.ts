import type {
  WHOOPRecovery,
  WHOOPSleep,
  WHOOPCycle,
  WHOOPWorkout,
  WHOOPProfile,
  WHOOPTokens,
} from "./types";
import { refreshToken } from "./oauth";

const BASE_URL = "https://api.prod.whoop.com/developer/v2";
const MAX_RETRIES = 2;

interface TokenStore {
  getToken(athleteId: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }>;
  saveTokens(athleteId: string, tokens: WHOOPTokens): Promise<void>;
}

interface Page<T> {
  records: T[];
  next_token?: string;
}

export class WHOOPClient {
  constructor(
    private readonly tokenStore: TokenStore,
    private readonly clientId: string,
    private readonly clientSecret: string
  ) {}

  private async getValidToken(athleteId: string): Promise<string> {
    const stored = await this.tokenStore.getToken(athleteId);

    // 5 dakika erken yenile
    const expiresAt = new Date(stored.expiresAt);
    const refreshThreshold = new Date(Date.now() + 5 * 60 * 1000);

    if (expiresAt < refreshThreshold) {
      const newTokens = await refreshToken(
        stored.refreshToken,
        this.clientId,
        this.clientSecret
      );
      await this.tokenStore.saveTokens(athleteId, newTokens);
      return newTokens.access_token;
    }

    return stored.accessToken;
  }

  private async request<T>(
    athleteId: string,
    path: string,
    params?: Record<string, string>,
    attempt = 0
  ): Promise<T> {
    const token = await this.getValidToken(athleteId);
    const url = new URL(`${BASE_URL}${path}`);

    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    // 429: X-RateLimit-Reset saniye cinsinden bekleme süresini verir.
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const resetSeconds = Number(res.headers.get("X-RateLimit-Reset") ?? "1");
      const waitMs = Math.min(Math.max(resetSeconds, 1), 30) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return this.request<T>(athleteId, path, params, attempt + 1);
    }

    if (!res.ok) {
      throw new Error(`WHOOP API error ${res.status}: ${path}`);
    }

    return res.json() as Promise<T>;
  }

  async getRecoveryList(
    athleteId: string,
    params: { start?: string; end?: string; limit?: string; nextToken?: string } = {}
  ) {
    return this.request<Page<WHOOPRecovery>>(athleteId, "/recovery", {
      ...(params.start ? { start: params.start } : {}),
      ...(params.end ? { end: params.end } : {}),
      ...(params.limit ? { limit: params.limit } : {}),
      ...(params.nextToken ? { nextToken: params.nextToken } : {}),
    });
  }

  async getSleepList(
    athleteId: string,
    params: { start?: string; end?: string; limit?: string; nextToken?: string } = {}
  ) {
    return this.request<Page<WHOOPSleep>>(athleteId, "/activity/sleep", {
      ...(params.start ? { start: params.start } : {}),
      ...(params.end ? { end: params.end } : {}),
      ...(params.limit ? { limit: params.limit } : {}),
      ...(params.nextToken ? { nextToken: params.nextToken } : {}),
    });
  }

  async getCycleList(
    athleteId: string,
    params: { start?: string; end?: string; limit?: string; nextToken?: string } = {}
  ) {
    return this.request<Page<WHOOPCycle>>(athleteId, "/cycle", {
      ...(params.start ? { start: params.start } : {}),
      ...(params.end ? { end: params.end } : {}),
      ...(params.limit ? { limit: params.limit } : {}),
      ...(params.nextToken ? { nextToken: params.nextToken } : {}),
    });
  }

  async getWorkoutList(
    athleteId: string,
    params: { start?: string; end?: string; limit?: string; nextToken?: string } = {}
  ) {
    return this.request<Page<WHOOPWorkout>>(athleteId, "/activity/workout", {
      ...(params.start ? { start: params.start } : {}),
      ...(params.end ? { end: params.end } : {}),
      ...(params.limit ? { limit: params.limit } : {}),
      ...(params.nextToken ? { nextToken: params.nextToken } : {}),
    });
  }

  // Belirli bir cycle'ın recovery'si — webhook'tan gelen cycle_id ile
  // tek bir kaydı hedeflemek istendiğinde /recovery listesini taramaktan
  // daha ucuzdur.
  async getRecoveryForCycle(athleteId: string, cycleId: number) {
    return this.request<WHOOPRecovery>(athleteId, `/cycle/${cycleId}/recovery`);
  }

  async getProfile(athleteId: string) {
    return this.request<WHOOPProfile>(athleteId, "/user/profile/basic");
  }
}
