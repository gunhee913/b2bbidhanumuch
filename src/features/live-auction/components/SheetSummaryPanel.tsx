"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatGradeLabel } from "../lib/grade";
import { isSpecEmpty, JUDGED_SPECS } from "../lib/judgedSpecs";
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
        {/*
         * 사진 위 한 줄 · 상세 방 각인(`GradeStamp`)과 같은 차례·같은 굵기다.
         *
         * 등급이 가장 굵다. 어느 개체인지는 짚고 있는 행이 이미 말하고 있고, 사진에
         * 대고 묻는 것은 「몇 등급이냐」 하나다 — 단면을 들여다보다 등급을 되짚으려고
         * 열여섯 칸짜리 표를 거슬러 가지 않아도 되게 같은 자리에 둔다.
         */}
        <span className="absolute inset-x-0 bottom-0 flex items-baseline gap-2 bg-gradient-to-t from-[#0f0f12]/80 to-transparent px-2.5 pb-1.5 pt-7 text-left">
          <span className="shrink-0 text-[17px] font-bold leading-none tabular-nums text-white">
            {formatGradeLabel(listing.grade, listing.marblingScore)}
          </span>
          <span className="shrink-0 text-[12px] font-medium leading-none tabular-nums text-white/60">
            {listing.listingNo}
          </span>
          {listing.companyName ? (
            <span className="min-w-0 truncate text-[12px] font-medium leading-none text-white/60">
              {listing.companyName}
            </span>
          ) : null}
        </span>
      </div>

      <JudgedSpecStrip listing={listing} />

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

/**
 * 일곱을 한 덩어리로 묶어 두는 폭 · 칸 사이가 30px 쯤에서 멈춘다.
 *
 * 패널은 560px 까지 넓어지는데 그 폭에 맞춰 늘리면 칸 사이가 56px 로 벌어져, 한
 * 덩어리로 훑으라고 붙여 둔 일곱이 낱개로 흩어진다. 넓어진 몫은 띠가 쓰지 않고
 * 사진과 차트가 가져간다.
 */
const SPEC_STRIP_MAX_WIDTH = 380;

/**
 * 판정 일곱 · 사진 바로 밑.
 *
 * 상세 방처럼 사진 **위**에 얹지 않는다. 거기는 무대가 크지만 여기 사진은 좁은
 * 패널에서 276×207px 뿐이라, 두 줄짜리 상자를 덮으면 단면 아래 1/4 이 가린다 —
 * 마블링 보라고 둔 사진이다. 밑으로 내리면 세로 34px 만 쓰고, 흰 글씨에 그늘을
 * 깔지 않아도 돼 밝은 모드에서 더 또렷하다.
 *
 * 표에도 같은 일곱 열이 있지만 거기로 눈을 보내려면 열여섯 칸을 거슬러 가야 한다.
 * ↑/↓ 로 훑는 동안 눈은 이 패널에 붙어 있어서, 왼쪽을 봐야 한다면 키보드 이동이
 * 반쯤 헛돈다.
 */
function JudgedSpecStrip({ listing }: { listing: LiveListing }) {
  return (
    <dl
      style={{ maxWidth: SPEC_STRIP_MAX_WIDTH }}
      className="mx-auto flex w-full items-end justify-between gap-x-2 py-0.5"
    >
      {JUDGED_SPECS.map(({ label, key, unit }) => {
        const value = listing[key];
        const empty = isSpecEmpty(value);
        return (
          <div key={label} className="flex flex-col items-center gap-1">
            <dt className="text-[9.5px] font-medium leading-none text-content-faint">
              {label}
            </dt>
            <dd
              className={cn(
                "text-[12px] font-bold leading-none tabular-nums",
                empty ? "text-content-ghost" : "text-content",
              )}
            >
              {empty ? "-" : value}
              {!empty && unit ? (
                <span className="pl-px text-[8.8px] font-medium text-content-faint">
                  {unit}
                </span>
              ) : null}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
