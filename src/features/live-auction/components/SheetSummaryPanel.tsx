"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { formatGradeLabel } from "../lib/grade";
import { PartMarketChart } from "./PartMarketChart";
import type { LiveListing } from "../api";

/** 남는 폭이 모자라면 여기까지 좁힌다 */
export const SUMMARY_PANEL_MIN_WIDTH = 300;
/**
 * 요약이 더 넓어져도 쓸모가 없어지는 지점 · 사진 4:3 이 420px 높이가 되는 폭.
 *
 * 넓은 화면에서 남는 폭을 표와 3:1 로 나눠 갖는데, 여기서 멈추고 나머지는 표가
 * 가져간다. 더 키우면 사진만 커지고 그 아래 시세 차트는 나아지지 않는다.
 */
export const SUMMARY_PANEL_MAX_WIDTH = 560;
/**
 * 상장표가 한 글자도 잘리지 않는 폭 · 16열의 실측 합 + 반올림 여유.
 * 요약은 이 폭을 건드리지 않는 선에서만 자리를 얻는다 — 표가 먼저다.
 */
export const SHEET_TABLE_MIN_WIDTH = 980;
/** 표와 요약을 나란히 세울 수 있는 섹션 최소 폭 · 이보다 좁으면 요약을 숨긴다 */
export const SUMMARY_PANEL_MIN_ROOM =
  SHEET_TABLE_MIN_WIDTH + SUMMARY_PANEL_MIN_WIDTH + 6;
/** 가격선 + 아래 거래 건수 막대(3:1) · 막대가 읽히려면 이 정도는 있어야 한다 */
const CHART_HEIGHT = 232;

/**
 * 상장표 오른쪽 요약 · 커서가 머문 개체의 사진과 시세만 보여 준다.
 *
 * 표는 200행을 한눈에 견주는 자리라 열을 더 늘릴 수도, 행을 펼쳐 비교를 끊을 수도 없다.
 * 그래서 표는 그대로 두고 섹션 오른쪽 끝에 "지금 보고 있는 한 마리" 만 세워 둔다.
 * 숫자는 이미 행에 다 있으니 여기서는 행이 못 담는 것 — 사진과 시세 — 만 맡는다.
 */
export function SheetSummaryPanel({
  listing,
}: {
  listing: LiveListing | null;
}) {
  if (!listing) {
    return (
      <div className="flex flex-col gap-2 p-3">
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-surface-muted text-[12px] text-content-faint">
          개체에 커서를 올려 보세요
        </div>
      </div>
    );
  }

  const cover = listing.images[0] ?? null;

  return (
    <div className="flex flex-col gap-2 p-3">
      {/* 미리보기 · 누를 곳은 표의 행과 썸네일이고, 여기는 커서를 따라 보여 주기만 한다 */}
      <div className="relative block aspect-[4/3] w-full overflow-hidden rounded-lg bg-surface-accent">
        {cover ? (
          <Image
            src={cover}
            alt={`${listing.listingNo} 등심 단면`}
            fill
            sizes="360px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-content-ghost">
            <ImageOff className="h-6 w-6" strokeWidth={1.5} />
          </span>
        )}
        {/* 어느 개체인지 · 사진 위 한 줄 · 값은 표가 이미 말하고 있다 */}
        <span className="absolute inset-x-0 bottom-0 flex items-baseline gap-1.5 bg-gradient-to-t from-[#0f0f12]/75 to-transparent px-2.5 pb-1.5 pt-6 text-left">
          <span className="text-[13px] font-bold tabular-nums text-white">
            {listing.listingNo}
          </span>
          <span className="text-[11.5px] font-semibold text-white/75">
            {formatGradeLabel(listing.grade, listing.marblingScore)}
          </span>
        </span>
      </div>

      <PartMarketChart
        compact
        bordered={false}
        partName={null}
        listing={listing}
        height={CHART_HEIGHT}
      />
    </div>
  );
}
