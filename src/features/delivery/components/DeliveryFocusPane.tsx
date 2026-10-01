"use client";

import { useMemo, useState } from "react";
import { useDebounce } from "react-use";
import { Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { printImage } from "@/lib/print-image";
import {
  isSpecEmpty,
  JUDGED_SPECS,
  type JudgedSpecValues,
} from "@/features/live-auction/lib/judgedSpecs";
import {
  ListingImageGallery,
  type GalleryDocument,
} from "@/features/live-auction/components/ListingImageGallery";
import {
  formatDate,
  formatTraceNo,
  InfoRow,
} from "@/features/live-auction/components/ListingSpecSheet";
import { useListingCerts } from "@/features/live-auction/hooks/useListingCerts";
import { OverlayScroll } from "@/components/ui/overlay-scroll";
import type { WinningPart } from "../types";

/**
 * 등급판정 일곱을 한 덩어리로 묶어 두는 폭 · 더 벌리면 낱개로 흩어진다.
 *
 * 이 값이 글자 크기의 기준이기도 하다 (`cqw` 는 이 상자 폭의 1%). 띠는 이 안에서
 * 판 폭을 따라 늘었다 줄고, 글자도 같이 따라간다.
 */
const SPEC_STRIP_MAX_WIDTH = 560;

/** 띠 한 칸의 바닥 폭 · 이보다 좁아지면 일곱이 두 줄로 접힌다 */
const SPEC_CELL_MIN_WIDTH = 68;

/**
 * 커서를 옮기는 동안은 증명서를 부르지 않는다.
 *
 * ↓ 를 눌러 쉰 줄을 훑으면 개체가 그만큼 바뀌는데, 줄마다 받아 오면 쓰지도 않을 요청이
 * 수십 개 날아간다. 손이 멈춘 뒤에 받아도 늦지 않다.
 */
const CERT_SETTLE_MS = 260;

/**
 * 배송지시 자료는 판정값이 0 이면 「안 적힘」 이다 · 경매장 자료형은 그 자리에 null 을 쓴다.
 * 같은 일곱을 그리는 데 두 규칙을 섞을 수 없어 여기서 한 번 맞춰 준다.
 */
const specValuesOf = (p: WinningPart): JudgedSpecValues => ({
  marblingScore: p.marbling || null,
  meatColor: p.meatColor || null,
  fatColor: p.fatColor || null,
  texture: p.texture || null,
  maturity: p.maturity || null,
  backFat: p.backFat || null,
  eyeMuscle: p.eyeMuscle || null,
});

export interface DeliveryFocusPaneProps {
  /** 커서가 짚은 줄의 부위 · 아직 아무것도 안 짚었으면 null */
  focused: WinningPart | null;
}

/**
 * 왼쪽 판 · 커서가 짚은 줄의 개체를 비춘다.
 *
 * 한 화면에 한 개체를 세우고 ←/→ 로 넘기는 상세 방과 다른 길을 택했다. 배송지시는
 * 하루 수십~수백 건을 흘려보내는 일이라 개체마다 화면을 갈아타면 넘기는 데만 손이
 * 다 간다. 표는 오늘치를 한 줄기로 두고, 사진이 커서를 따라오게 했다.
 *
 * 사진·증명서는 경매장과 같은 갤러리(`ListingImageGallery`)를 쓴다. 증명서가 사진
 * 뒤에 같은 줄로 붙어서, 보던 자리에서 손을 떼지 않고 등급판정·도축검사까지 넘길 수 있다.
 *
 * 아래 상세는 거래처가 되묻는 것들이다 — 이력번호·도축장·도축일은 송장과 원산지
 * 표시에 그대로 들어가고, 품종·성별·월령은 「무슨 소냐」 는 전화에 답하는 값이다.
 */
export function DeliveryFocusPane({ focused }: DeliveryFocusPaneProps) {
  const listingId = focused?.listingId ?? null;
  const [settledId, setSettledId] = useState<string | null>(null);
  useDebounce(() => setSettledId(listingId), CERT_SETTLE_MS, [listingId]);

  /*
   * 아직 손이 멈추지 않았으면 들고 있는 증명서는 **이전 개체** 것이다. 질의 열쇠가
   * `settledId` 라 그 사이 받아 둔 값이 그대로 남는데, 그걸 그리면 다른 소의 판정서가
   * 지금 소의 것처럼 보인다 — 어디로 보낼지 정하는 화면에서 가장 안 되는 일이다.
   */
  const inSync = settledId === listingId;
  const certs = useListingCerts(settledId, inSync);
  const gradeCert = inSync ? (certs.data?.gradeCert ?? null) : null;
  const slaughterCert = inSync ? (certs.data?.slaughterCert ?? null) : null;

  const documents = useMemo<GalleryDocument[]>(() => {
    const docs: GalleryDocument[] = [];
    if (gradeCert?.fileData)
      docs.push({
        id: "grade",
        label: "등급판정확인서",
        src: gradeCert.fileData,
      });
    if (slaughterCert?.fileData)
      docs.push({
        id: "slaughter",
        label: "도축검사증명서",
        src: slaughterCert.fileData,
      });
    return docs;
  }, [gradeCert, slaughterCert]);

  if (!focused) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-[12.5px] text-content-faint">
        낙찰 부위를 고르면 개체 정보가 여기 뜹니다
      </div>
    );
  }

  const values = specValuesOf(focused);

  const join = (parts: (string | null)[]) =>
    parts.filter((v) => v && v !== "-").join(" · ");

  const animalLine = join([
    focused.breed,
    focused.gender,
    focused.monthAge > 0 ? `${focused.monthAge}개월` : null,
  ]);
  const slaughterLine = join([
    focused.slaughterHouse,
    formatDate(focused.slaughterDate),
    focused.slaughterNo ? `No.${focused.slaughterNo}` : null,
  ]);
  const listingLine = join([
    focused.companyName,
    formatDate(focused.listingDate),
  ]);

  return (
    <OverlayScroll autoHideDelay={0} className="h-full min-h-0">
      <div className="flex flex-col gap-2 p-3">
        <ListingImageGallery
          images={focused.images ?? []}
          listingNo={focused.listingNo}
          documents={documents}
          aspect="photo"
          compactThumbs
        />

        {documents.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {gradeCert?.fileData ? (
              <PrintCertButton
                label="등급판정"
                src={gradeCert.fileData}
                fileType={gradeCert.fileType}
                title={`${focused.listingNo} 등급판정확인서`}
              />
            ) : null}
            {slaughterCert?.fileData ? (
              <PrintCertButton
                label="도축검사"
                src={slaughterCert.fileData}
                fileType={slaughterCert.fileType}
                title={`${focused.listingNo} 도축검사증명서`}
              />
            ) : null}
          </div>
        ) : null}

        {/*
         * 글자가 판 폭을 따라간다 (`cqw` = 이 상자 폭의 1%). 판을 좁히면 같이 줄고,
         * 넓히면 같이 큰다 — 자리만 남고 글자는 그대로인 띠는 읽으라고 만든 게 아니다.
         * 그래도 바닥은 둔다. 한 칸이 68px 아래로 내려가기 전에 두 줄로 접히므로,
         * 접힌 뒤에는 더 줄일 까닭이 없다.
         */}
        <div
          style={{
            maxWidth: SPEC_STRIP_MAX_WIDTH,
            containerType: "inline-size",
          }}
          className="mx-auto w-full"
        >
          <dl
            style={{
              gridTemplateColumns: `repeat(auto-fit,minmax(${SPEC_CELL_MIN_WIDTH}px,1fr))`,
            }}
            className="grid gap-x-2 gap-y-2.5 py-1"
          >
            {JUDGED_SPECS.map(({ label, key, unit }) => {
              const value = values[key];
              const empty = isSpecEmpty(value);
              return (
                <div key={label} className="flex flex-col items-center gap-1">
                  <dt
                    style={{ fontSize: "clamp(9.5px,2.2cqw,13px)" }}
                    className="font-medium leading-none text-content-faint"
                  >
                    {label}
                  </dt>
                  <dd
                    style={{ fontSize: "clamp(13px,3.3cqw,19px)" }}
                    className={cn(
                      "font-bold leading-none tabular-nums",
                      empty ? "text-content-ghost" : "text-content",
                    )}
                  >
                    {empty ? "-" : value}
                    {!empty && unit ? (
                      <span
                        style={{ fontSize: "clamp(8px,1.7cqw,10.5px)" }}
                        className="pl-px font-medium text-content-faint"
                      >
                        {unit}
                      </span>
                    ) : null}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>

        <dl className="flex flex-col gap-2 border-t border-line-soft px-0.5 pt-2.5">
          <InfoRow label="개체">{animalLine || "-"}</InfoRow>
          <InfoRow label="도체중">
            {focused.carcassWeight > 0 ? `${focused.carcassWeight}kg` : "-"}
          </InfoRow>
          <InfoRow label="도축">{slaughterLine || "-"}</InfoRow>
          <InfoRow label="상장">{listingLine || "-"}</InfoRow>
          <InfoRow label="이력">{formatTraceNo(focused.traceNo)}</InfoRow>
        </dl>
      </div>
    </OverlayScroll>
  );
}

function PrintCertButton({
  label,
  src,
  fileType,
  title,
}: {
  label: string;
  src: string;
  fileType?: string;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={() => printImage(src, title, fileType)}
      title={`${title} 인쇄`}
      className="inline-flex h-7 items-center gap-1 rounded border border-line bg-surface px-2 text-[11.5px] font-semibold text-content-mid transition-colors hover:border-content-ghost hover:text-content"
    >
      <Printer className="h-3.5 w-3.5" strokeWidth={2.25} />
      {label} 인쇄
    </button>
  );
}
