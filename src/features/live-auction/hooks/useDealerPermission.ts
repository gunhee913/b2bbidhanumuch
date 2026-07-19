"use client";

import { useSession } from "next-auth/react";
import { useMemo } from "react";
import {
  ALL_SLAUGHTER_HOUSE_SLUGS,
  nameToSlug,
  type SlaughterHouseSlug,
} from "@/constants/slaughterHouseSlugs";
import type { SlaughterHouse } from "@/constants/slaughterHouses";

export type DealerPermissionState =
  | { kind: "guest" }
  | { kind: "non-dealer" }
  | { kind: "dealer"; dealerId: string; authorizedSlugs: SlaughterHouseSlug[] };

export interface DealerPermission {
  state: DealerPermissionState;
  isAuthenticated: boolean;
  isDealer: boolean;
  dealerId: string | null;
  authorizedSlugs: SlaughterHouseSlug[];
  isSlaughterHouseAuthorized: (slug: SlaughterHouseSlug) => boolean;
  isNameAuthorized: (name: SlaughterHouse | string) => boolean;
}

/**
 * 현재 세션의 중도매인 여부와 공판장 권한을 반환.
 *
 * NOTE: 세션 JWT 에 `authorizedSlaughterHouses` 클레임이 아직 추가되어 있지 않으므로,
 * MVP 에서는 딜러로 로그인한 사용자는 모든 공판장(4개) 권한을 갖는 것으로 fallback 한다.
 * 실제 매핑 테이블/세션 확장 후 이 fallback 을 제거해 실제 값을 사용하면 된다.
 */
export function useDealerPermission(): DealerPermission {
  const { data: session, status } = useSession();

  return useMemo<DealerPermission>(() => {
    const isAuthenticated = status === "authenticated" && !!session;

    if (!isAuthenticated) {
      return {
        state: { kind: "guest" },
        isAuthenticated: false,
        isDealer: false,
        dealerId: null,
        authorizedSlugs: [],
        isSlaughterHouseAuthorized: () => false,
        isNameAuthorized: () => false,
      };
    }

    const dealer = session?.dealer;
    const employee = session?.employee;
    const dealerId = dealer?.id || employee?.dealerId || null;
    const isDealer = session?.user?.userType === "dealer_user" && !!dealerId;

    if (!isDealer) {
      return {
        state: { kind: "non-dealer" },
        isAuthenticated: true,
        isDealer: false,
        dealerId: null,
        authorizedSlugs: [],
        isSlaughterHouseAuthorized: () => false,
        isNameAuthorized: () => false,
      };
    }

    // 세션에 authorizedSlaughterHouses 가 실려있으면 그것을 사용.
    // (현재 스키마엔 없으므로 4개 모두 허용하는 fallback 을 사용한다.)
    const rawAuthorized: unknown = (
      session as unknown as {
        authorizedSlaughterHouses?: string[];
      }
    )?.authorizedSlaughterHouses;

    let authorizedSlugs: SlaughterHouseSlug[];
    if (Array.isArray(rawAuthorized) && rawAuthorized.length > 0) {
      const derived = rawAuthorized
        .map((name) => nameToSlug(String(name)))
        .filter((s): s is SlaughterHouseSlug => s !== null);
      authorizedSlugs = derived.length
        ? derived
        : [...ALL_SLAUGHTER_HOUSE_SLUGS];
    } else {
      authorizedSlugs = [...ALL_SLAUGHTER_HOUSE_SLUGS];
    }

    const slugSet = new Set(authorizedSlugs);

    return {
      state: {
        kind: "dealer",
        dealerId: dealerId as string,
        authorizedSlugs,
      },
      isAuthenticated: true,
      isDealer: true,
      dealerId,
      authorizedSlugs,
      isSlaughterHouseAuthorized: (slug) => slugSet.has(slug),
      isNameAuthorized: (name) => {
        const slug = nameToSlug(name);
        return slug ? slugSet.has(slug) : false;
      },
    };
  }, [session, status]);
}
