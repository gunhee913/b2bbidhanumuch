"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { FileText, ImageOff } from "lucide-react";
import { useMeasure } from "react-use";
import { cn } from "@/lib/utils";
import { GradeStamp } from "./ListingViewerDialog";
import { PartMarketChart } from "./PartMarketChart";
import {
  StagePlacementScope,
  type StagePlacementStore,
} from "../hooks/useStagePlacement";
import { STAGE_PLACEMENT_DEFAULT } from "../hooks/useRoomLayout";
import { useSheetSummaryPrefs } from "../hooks/useSheetSummaryPrefs";
import { useListingCerts } from "../hooks/useListingCerts";
import { isTypingInto } from "../lib/keyboard";
import type { ListingCertsResponse, LiveListing } from "../api";

/** 시세선만 · 건수 막대를 뺐다 (`showVolume`) · 부위·등급·현재가는 차트 왼쪽 위에 얹힌다 */
const CHART_HEIGHT = 180;
/**
 * 사진 높이 상한 · 요약 카드가 한 화면 세로 안에 다 들어오게 한다.
 *
 * 297 은 사진 위(머리 48 · 여백 12 · 테두리 1 · 카드 안 12)와 사진 아래(차트 · 여백 ≈ 218 ·
 * 바닥 여백 12 · 테두리 1)의 합 — 세로가 모자라면 사진만 위아래를 조금 덜어 낸다.
 * 시세 머리는 차트 안에 얹혀 따로 세로를 쓰지 않는다. 필터 줄은 상장표 카드에만 있어
 * 여기서는 빼지 않는다. 썸네일 줄은 늘 서므로 그 높이(`THUMB_STRIP_HEIGHT`)도 뺀다.
 */
const PHOTO_CHROME_HEIGHT = 297;
/** 사진 가로 바닥 · 4:3 이라 세로 180 · 이보다 작으면 곁눈질로 마블링이 안 읽힌다 */
const PHOTO_MIN_WIDTH = 240;
/** 썸네일 한 칸 높이 48 + 사진과의 틈 8 */
const THUMB_STRIP_HEIGHT = 56;

/** 사진 아래 줄에서 넘겨 보는 한 장 · 개체 사진 · 증명서 스캔본 */
type SummaryMedia =
  | { kind: "photo"; src: string | null; label: string }
  | { kind: "doc"; src: string | null; label: string; short: string };

/**
 * 상장표 오른쪽 요약 · 커서가 머문 개체의 사진과 시세만 보여 준다.
 *
 * 표는 200행을 한눈에 견주는 자리라 열을 더 늘릴 수도, 행을 펼쳐 비교를 끊을 수도 없다.
 * 그래서 표는 그대로 두고 섹션 오른쪽 끝에 "지금 보고 있는 한 마리" 만 세워 둔다.
 *
 * 판정 일곱은 사진 **위**에 얹는다 — 개체 상세 방과 같은 각인(`GradeStamp`)이라 끌어서
 * 옮기고, 모서리를 잡아 키우고, 두 번 누르면 처음 자리로 돌아간다. 사진 아래 띠로 두면
 * 단면을 보다 점수를 되짚으려고 눈이 사진 밖으로 나갔다 와야 했다.
 *
 * 사진이 없는 개체(대부분이다)에도 각인은 빈 판 위에 그대로 선다. 사진이 없다고 판정까지
 * 숨기면 요약에서 등급 · 근내지방을 볼 길이 없어진다.
 *
 * 사진 아래에는 썸네일 줄이 늘 선다(한 장뿐이어도) · 여러 장이면 ←/→ 로 넘긴다.
 * 증명서는 사진 뒤에 붙는다 · 표의 ↑/↓ 가 개체를 옮기는 동안 ←/→ 는 그 개체 안의 장을 옮긴다.
 */
export function SheetSummaryPanel({
  listing,
}: {
  listing: LiveListing | null;
}) {
  const stagePlacement = useSheetSummaryPrefs((s) => s.stage);
  const setStagePlacement = useSheetSummaryPrefs((s) => s.setStagePlacement);
  const resetStagePlacement = useSheetSummaryPrefs(
    (s) => s.resetStagePlacement,
  );
  const placementStore = useMemo<StagePlacementStore>(
    () => ({
      get: (slot) => stagePlacement[slot] ?? STAGE_PLACEMENT_DEFAULT[slot],
      set: setStagePlacement,
      reset: resetStagePlacement,
    }),
    [stagePlacement, setStagePlacement, resetStagePlacement],
  );
  /* 각인 자리를 비율로 담으니 무대(사진 상자) 크기를 알아야 px 로 편다 */
  const [stageRef, stage] = useMeasure<HTMLDivElement>();

  /* 증명서 파일은 목록 API 에 없다(유무 플래그만) · 있는 개체를 비출 때만 받아 온다 */
  const hasAnyCert =
    !!listing && (listing.hasGradeCert || listing.hasSlaughterCert);
  const { data: certs } = useListingCerts(listing?.id ?? null, hasAnyCert);
  const media = useMemo<SummaryMedia[]>(
    () => (listing ? buildSummaryMedia(listing, certs ?? null) : []),
    [listing, certs],
  );

  /* 개체가 바뀌면 첫 장부터 · 3번째 사진을 보던 채로 넘어가면 없는 칸을 가리킨다 */
  const [mediaIdx, setMediaIdx] = useState(0);
  const [prevListingId, setPrevListingId] = useState<string | null>(null);
  const listingId = listing?.id ?? null;
  if (prevListingId !== listingId) {
    setPrevListingId(listingId);
    setMediaIdx(0);
  }
  const safeIdx = Math.min(mediaIdx, Math.max(0, media.length - 1));
  const current = media[safeIdx] ?? null;

  useArrowKeys(media.length > 1, media.length, setMediaIdx);

  if (!listing) {
    return (
      <div className="flex flex-col gap-2 p-3">
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-surface-muted text-[12px] text-content-faint">
          개체에 커서를 올려 보세요
        </div>
      </div>
    );
  }

  const isDoc = current?.kind === "doc";
  const photoMaxHeight = `calc(100vh - ${PHOTO_CHROME_HEIGHT + THUMB_STRIP_HEIGHT}px)`;
  /*
   * 4:3 을 언제나 지킨다 · 세로가 모자라면 높이를 자르는 대신 **폭을 줄여** 가운데 세운다.
   * `max-height` 로 누르면 상자만 납작해져 사진이 다른 비율로 잘려 보였다.
   */
  const photoWidth = `min(100%, max(${PHOTO_MIN_WIDTH}px, calc(${photoMaxHeight} * 4 / 3)))`;

  return (
    <div className="flex flex-col gap-2 p-3">
      {/*
       * 미리보기 · 누를 곳은 표의 행과 썸네일이고, 여기는 커서를 따라 보여 주기만 한다.
       * 여백을 두르지 않는다 · 재는 상자에 패딩이 있으면 각인이 그만큼 밖으로 샌다.
       * 사진도 증명서도 잘라 내지 않고(contain) 통째로 담는다 · 상자만 4:3 으로 고정.
       */}
      <div
        ref={stageRef}
        style={{ width: photoWidth }}
        className={cn(
          "relative mx-auto block aspect-[4/3] overflow-hidden rounded-lg",
          isDoc ? "bg-surface-muted" : "bg-surface-accent",
        )}
      >
        {current?.src ? (
          <Image
            src={current.src}
            alt={`${listing.listingNo} ${current.label}`}
            fill
            sizes="760px"
            /* 늘 통째로 · 4:3 상자에서 벗어나는 비율은 위아래가 비지, 잘리진 않는다 — 단면은 잘리면 판정을 못 한다 */
            className="object-contain"
            unoptimized
          />
        ) : isDoc ? (
          <span className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-content-faint">
            <FileText
              className="h-8 w-8 animate-pulse-soft"
              strokeWidth={1.5}
            />
            <span className="text-[11px] font-medium">
              {current.label} 불러오는 중
            </span>
          </span>
        ) : (
          <span className="flex h-full w-full items-center justify-center text-content-ghost">
            <ImageOff className="h-6 w-6" strokeWidth={1.5} />
          </span>
        )}
        {isDoc ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            <FileText className="h-3 w-3" strokeWidth={2.25} />
            {current.label}
          </span>
        ) : null}
        {isDoc ? null : (
          /* 증명서 스캔본에는 찍지 않는다 · 흰 종이라 가릴 것이 있고, 등급은 그 안에 이미 적혀 있다 */
          <StagePlacementScope store={placementStore}>
            <GradeStamp
              heading={{
                grade: listing.grade,
                marblingScore: listing.marblingScore,
                listingNo: listing.listingNo,
                companyName: listing.companyName,
              }}
              values={listing}
              stageWidth={stage.width}
              stageHeight={stage.height}
            />
          </StagePlacementScope>
        )}
      </div>

      {/* 한 장뿐이어도 띠는 선다 · 「사진이 이것뿐」 임이 보이고, 개체를 넘길 때 띠가 생겼다 사라지며 차트가 들썩이지 않는다 */}
      <SummaryThumbs
        media={media}
        activeIdx={safeIdx}
        listingNo={listing.listingNo}
        onSelect={setMediaIdx}
      />

      <PartMarketChart
        compact
        minimal
        showVolume={false}
        bordered={false}
        partName={null}
        listing={listing}
        height={CHART_HEIGHT}
      />
    </div>
  );
}

/**
 * 넘겨 볼 장 목록 · 개체 사진(메인페이지 대표 사진들) → 등급판정확인서 → 도축검사증명서.
 *
 * 사진이 없어도 첫 칸은 「사진」 빈 판으로 둔다 · 각인이 설 자리다. 증명서를 첫 칸에 세우면
 * 사진 없는 개체(대부분이다)에서 판정 일곱이 사라진다. 없는 증명서는 칸을 만들지 않는다 —
 * 상세 방은 「미등록」 자리를 지키지만, 곁눈질 자리에서는 있는 것만 보이는 쪽이 조용하다.
 *
 * **부위 사진과 업체 대표이미지는 여기 세우지 않는다.** 상장표는 개체를 고르는 자리라
 * 요약도 개체 단위다. 부위마다 어떤 사진이 걸리는지는 상세 방(부위 표 1열 · 사진 판)이
 * 말한다 — 여기에 부위 열여섯을 늘어놓으면 띠가 길어져 개체 사진 몇 장을 넘기는 손이 느려지고,
 * 대표이미지가 섞이면서 「이 소의 사진」 과 「그냥 그 부위의 사진」 이 한 줄에 서 버렸다.
 */
function buildSummaryMedia(
  listing: LiveListing,
  certs: ListingCertsResponse | null,
): SummaryMedia[] {
  const photos: SummaryMedia[] =
    listing.images.length > 0
      ? listing.images.map((src, i) => ({
          kind: "photo",
          src,
          label: listing.images.length > 1 ? `사진 ${i + 1}` : "사진",
        }))
      : [{ kind: "photo", src: null, label: "사진" }];
  const docs: SummaryMedia[] = [];
  if (listing.hasGradeCert) {
    docs.push({
      kind: "doc",
      src: certs?.gradeCert?.fileData ?? null,
      label: "등급판정확인서",
      short: "등급판정",
    });
  }
  if (listing.hasSlaughterCert) {
    docs.push({
      kind: "doc",
      src: certs?.slaughterCert?.fileData ?? null,
      label: "도축검사증명서",
      short: "도축검사",
    });
  }
  return [...photos, ...docs];
}

/**
 * ←/→ 로 장을 넘긴다 · 끝에서 더 누르면 반대쪽 끝으로 돈다.
 *
 * 표의 ↑/↓ (`useSheetCursor`)와 같은 자리에서 듣되 가로만 맡는다. 글을 쓰는 중이거나
 * 라이트박스 같은 대화상자가 떠 있으면 그쪽 일이라 비켜 선다.
 */
function useArrowKeys(
  enabled: boolean,
  count: number,
  setIdx: (update: (prev: number) => number) => void,
) {
  const ref = useRef({ enabled, count });
  ref.current = { enabled, count };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { enabled, count } = ref.current;
      if (!enabled || count < 2) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (isTypingInto(document.activeElement)) return;
      if (document.querySelector("[aria-modal='true']")) return;
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      setIdx((prev) => (Math.min(prev, count - 1) + dir + count) % count);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setIdx]);
}

/**
 * 사진 아래 가로 썸네일 줄 · 사진은 줄여 그리고, 부위 사진·증명서는 그 위에 짧은 이름 띠.
 * 부위 사진이 많으면 줄이 패널보다 길어진다 · 옆으로 구르고 막대는 보이지 않는다.
 */
function SummaryThumbs({
  media,
  activeIdx,
  listingNo,
  onSelect,
}: {
  media: SummaryMedia[];
  activeIdx: number;
  listingNo: string;
  onSelect: (idx: number) => void;
}) {
  /*
   * 고른 칸을 띠 안으로 굴린다 · ←/→ 로 넘기면 띠는 가만히 있고 고른 칸만 오른쪽으로
   * 나가 버려, 지금 몇째 장인지 띠에서 알 길이 없었다. `nearest` 라 이미 보이는 칸은
   * 건드리지 않고, `block: "nearest"` 라 바깥 세로 스크롤도 끌지 않는다.
   */
  const activeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      inline: "nearest",
      block: "nearest",
    });
  }, [activeIdx]);

  return (
    /*
     * 안쪽 2px 여백 + 바깥 -2px · 가로로 구르는 상자는 세로도 함께 자르므로(overflow-x 만
     * 켤 수 없다) 고른 칸의 2px 테두리(ring-2)가 위아래로 잘려 나갔다. 여백만큼 안으로
     * 들여 그리고 같은 만큼 바깥으로 물려 줄 높이는 그대로 둔다.
     */
    <div
      role="tablist"
      aria-label="사진·증명서"
      className="-m-0.5 flex items-center gap-1.5 overflow-x-auto p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {media.map((item, idx) => {
        const active = idx === activeIdx;
        return (
          <button
            key={`${item.kind}-${idx}`}
            ref={active ? activeRef : undefined}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={item.label}
            title={item.label}
            onClick={() => onSelect(idx)}
            className={cn(
              "relative h-12 w-12 shrink-0 overflow-hidden rounded bg-surface-muted ring-1 transition-opacity",
              active
                ? "opacity-100 ring-2 ring-content"
                : "opacity-60 ring-line hover:opacity-100",
            )}
          >
            {item.src ? (
              <Image
                src={item.src}
                alt={`${listingNo} ${item.label}`}
                fill
                sizes="48px"
                className="object-contain"
                unoptimized
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-content-faint">
                {item.kind === "doc" ? (
                  <FileText className="h-4 w-4" strokeWidth={1.75} />
                ) : (
                  <ImageOff className="h-4 w-4" strokeWidth={1.75} />
                )}
              </span>
            )}
            {item.kind === "photo" ? null : (
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/65 px-1 py-[2px] text-center text-[8px] font-semibold leading-none tracking-tight text-white">
                {item.short}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
