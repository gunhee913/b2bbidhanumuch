import { SLAUGHTER_HOUSES, type SlaughterHouse } from "./slaughterHouses";

/**
 * URL 슬러그 ↔ 공판장 표시 이름 매핑.
 * `/auction/live/[slug]` 라우팅에서 공판장을 식별하기 위한 단일 소스.
 */
export const SLAUGHTER_HOUSE_SLUGS = [
  { slug: "eumseong", name: "농협 음성", short: "음성" },
  { slug: "bucheon", name: "농협 부천", short: "부천" },
  { slug: "goryeong", name: "농협 고령", short: "고령" },
  { slug: "naju", name: "농협 나주", short: "나주" },
] as const;

export type SlaughterHouseSlug =
  (typeof SLAUGHTER_HOUSE_SLUGS)[number]["slug"];

const NAME_TO_SLUG = new Map<string, SlaughterHouseSlug>(
  SLAUGHTER_HOUSE_SLUGS.map((s) => [s.name, s.slug]),
);
const SLUG_TO_NAME = new Map<SlaughterHouseSlug, SlaughterHouse>(
  SLAUGHTER_HOUSE_SLUGS.map(
    (s) => [s.slug, s.name as SlaughterHouse] as const,
  ),
);
const SLUG_TO_SHORT = new Map<SlaughterHouseSlug, string>(
  SLAUGHTER_HOUSE_SLUGS.map((s) => [s.slug, s.short]),
);

export function isSlaughterHouseSlug(
  value: string | undefined | null,
): value is SlaughterHouseSlug {
  if (!value) return false;
  return SLUG_TO_NAME.has(value as SlaughterHouseSlug);
}

export function slugToName(
  slug: SlaughterHouseSlug,
): SlaughterHouse {
  return SLUG_TO_NAME.get(slug) as SlaughterHouse;
}

export function nameToSlug(
  name: string,
): SlaughterHouseSlug | null {
  return NAME_TO_SLUG.get(name) ?? null;
}

export function slugToShort(slug: SlaughterHouseSlug): string {
  return SLUG_TO_SHORT.get(slug) ?? slug;
}

/** 모든 공판장 슬러그 (표시 순서 보존) */
export const ALL_SLAUGHTER_HOUSE_SLUGS: readonly SlaughterHouseSlug[] =
  SLAUGHTER_HOUSE_SLUGS.map((s) => s.slug);

// SLAUGHTER_HOUSES 순서와 SLUGS 순서가 일치해야 하는 제약을 컴파일 타임에 검증한다.
const _order: readonly SlaughterHouse[] = SLAUGHTER_HOUSE_SLUGS.map(
  (s) => s.name as SlaughterHouse,
);
if (
  process.env.NODE_ENV !== "production" &&
  typeof window === "undefined" &&
  _order.length !== SLAUGHTER_HOUSES.length
) {
  console.warn(
    "[slaughterHouseSlugs] SLAUGHTER_HOUSES 와 SLAUGHTER_HOUSE_SLUGS 순서/길이가 다릅니다.",
  );
}
