import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  BRAND_COLOR,
  IOS_BUNDLE_ID,
  MOBILE_SCHEME,
  PRIVACY_URL,
  PRODUCT_NAME,
  SITE_URL,
  SUPPORT_URL,
} from "./brand";

// app.json saf TS paketine import edilmez (mobil derlemesinin dışında bir dosya);
// marka sabitleriyle sessizce ayrışmasın diye diskten okunup karşılaştırılır.
type AppJson = {
  expo: {
    name: string;
    slug: string;
    scheme: string;
    ios: { bundleIdentifier: string };
    android: { package: string };
    plugins: unknown[];
  };
};

const appJsonPath = fileURLToPath(new URL("../../apps/mobile/app.json", import.meta.url));
const { expo } = JSON.parse(readFileSync(appJsonPath, "utf8")) as AppJson;

describe("brand constants ↔ apps/mobile/app.json", () => {
  it("app name matches PRODUCT_NAME", () => {
    expect(expo.name).toBe(PRODUCT_NAME);
  });

  it("deep link scheme matches MOBILE_SCHEME", () => {
    expect(expo.scheme).toBe(MOBILE_SCHEME);
  });

  it("iOS bundle ID and Android package match IOS_BUNDLE_ID", () => {
    expect(expo.ios.bundleIdentifier).toBe(IOS_BUNDLE_ID);
    expect(expo.android.package).toBe(IOS_BUNDLE_ID);
  });

  it("splash background matches BRAND_COLOR", () => {
    const splash = expo.plugins.find(
      (p): p is [string, { backgroundColor?: string }] =>
        Array.isArray(p) && p[0] === "expo-splash-screen"
    );
    expect(splash?.[1].backgroundColor?.toLowerCase()).toBe(BRAND_COLOR.toLowerCase());
  });
});

describe("public URLs", () => {
  it("privacy and support pages live under SITE_URL", () => {
    expect(PRIVACY_URL).toBe(`${SITE_URL}/privacy`);
    expect(SUPPORT_URL).toBe(`${SITE_URL}/support`);
    expect(SITE_URL.startsWith("https://")).toBe(true);
  });
});
