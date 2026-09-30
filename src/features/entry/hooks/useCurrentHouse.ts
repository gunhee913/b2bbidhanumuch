"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { findHouseByKey, HOUSE_QUERY_KEY, HOUSE_STORAGE_KEY, type HouseMeta } from "../constants";

export interface CurrentHouse {
  /** 화면이 따라야 할 공판장 · 소속 > URL > 저장값 */
  house: HouseMeta | null;
  /** 로그인한 중도매인의 소속 공판장 · 있으면 다른 공판장으로 갈 수 없다 */
  dealerHouse: HouseMeta | null;
  /** URL(`?house=`) 또는 마지막 선택값 */
  urlHouse: HouseMeta | null;
}

/**
 * 지금 화면의 공판장.
 * 중도매인은 소속 공판장에 고정된다("음성은 음성만 입찰") · 소속이 지정돼 있으면 URL 값보다 우선.
 * 소속이 없으면(미지정 · 비로그인) 기존처럼 URL → localStorage 순.
 */
export function useCurrentHouse(): CurrentHouse {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [storedKey, setStoredKey] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setStoredKey(window.localStorage.getItem(HOUSE_STORAGE_KEY));
  }, [searchParams]);

  const dealerHouse = findHouseByKey(session?.dealer?.slaughterHouse ?? null);
  const urlHouse = findHouseByKey(searchParams.get(HOUSE_QUERY_KEY) ?? storedKey);

  return { house: dealerHouse ?? urlHouse, dealerHouse, urlHouse };
}
