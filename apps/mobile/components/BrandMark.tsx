import Svg, { Circle, Path, Rect } from "react-native-svg";
import { BRAND_COLOR } from "@athleteiq/validators/brand";

// Loadwell işareti — assets/brand/loadwell-icon.svg'nin aynısı, köşeleri yuvarlatılmış
// zeminle (uygulama içinde iOS maskesi yok). Geometri değişirse SVG kaynakları da değişir.

export function BrandMark({ size = 64 }: { size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Rect width={1024} height={1024} rx={1024 * 0.22} fill={BRAND_COLOR} />
      <Path
        d="M298 726 L298 630 L410 570 L510 610 L630 430 L730 330 L730 726 Z"
        fill="#ffffff"
        fillOpacity={0.18}
      />
      <Path
        d="M298 630 L410 570 L510 610 L630 430 L730 330"
        fill="none"
        stroke="#ffffff"
        strokeWidth={36}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M250 250 V774 H774"
        fill="none"
        stroke="#ffffff"
        strokeWidth={96}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={730} cy={330} r={30} fill="#24d665" />
    </Svg>
  );
}
