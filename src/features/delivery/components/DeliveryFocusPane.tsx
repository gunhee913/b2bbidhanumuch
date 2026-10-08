"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useDebounce, useMeasure } from "react-use";
import { Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { printImage } from "@/lib/print-image";
import type { JudgedSpecValues } from "@/features/live-auction/lib/judgedSpecs";
import {
  GradeStamp,
  MediaTabs,
  StageNote,
  ViewerStage,
  type MediaTab,
  type ViewerMedia,
} from "@/features/live-auction/components/ListingViewerDialog";
import {
  CattleInfoRows,
  type CattleInfoFacts,
} from "@/features/live-auction/components/CattleInfoRows";
import { formatGradeLabel } from "@/features/live-auction/lib/grade";
import { PaneGripHandle } from "@/features/live-auction/components/PaneGripHandle";
import { RoomStackSplitter } from "@/features/live-auction/components/RoomStackSplitter";
import { usePaneReorder } from "@/features/live-auction/hooks/usePaneReorder";
import {
  StagePlacementScope,
  type StagePlacementStore,
} from "@/features/live-auction/hooks/useStagePlacement";
import { STAGE_PLACEMENT_DEFAULT } from "@/features/live-auction/hooks/useRoomLayout";
import { useListingCerts } from "@/features/live-auction/hooks/useListingCerts";
import { SURFACE_SHELL_CLASS } from "@/features/live-auction/constants/surface";
import { OverlayScroll } from "@/components/ui/overlay-scroll";
import {
  DELIVERY_INFO_HEIGHT_DEFAULT,
  DELIVERY_INFO_MIN_HEIGHT,
  DELIVERY_STAGE_MIN_HEIGHT,
  useDeliveryPrefs,
} from "../hooks/useDeliveryPrefs";
import type { WinningPart } from "../types";

/**
 * 그림판 바탕 · 상세 방과 같은 먹색 (`PHOTO_STAGE_CLASS`).
 *
 * 흰 판 위에서는 단면 사진이 배경과 붙어 경계가 사라지고, 주변 밝기가 고기 색을
 * 실제와 다르게 보이게 한다. 테마와 상관없이 늘 어둡다.
 */
const PHOTO_STAGE_CLASS = "bg-[#1a1a1f]";

/** 두 카드 사이 틈 · 이 자리를 눈금(`RoomStackSplitter`)이 그대로 쓴다 */
const STACK_SPLITTER_HEIGHT = 8;

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
/** 배송지시 자료는 모르는 값을 0 · 빈 글자로 둔다 · 다섯 줄이 읽는 꼴로 맞춘다 */
const infoFactsOf = (p: WinningPart): CattleInfoFacts => ({
  breed: p.breed || null,
  gender: p.gender || null,
  grade: p.grade || null,
  marblingScore: p.marbling || null,
  monthAge: p.monthAge || null,
  slaughterHouse: p.slaughterHouse || null,
  slaughterDate: p.slaughterDate || null,
  slaughterNo: p.slaughterNo || null,
  unitPrice: p.unitPrice || null,
  carcassWeight: p.carcassWeight || null,
  companyName: p.companyName || null,
  processDate: p.processDate || null,
  processWeight: p.processWeight || null,
  traceNo: p.traceNo || null,
});

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
  /** 열을 좌우로 옮기는 손잡이 · 사진 카드 머리 오른쪽 끝에 붙는다 */
  headerAction?: ReactNode;
  /**
   * 사진 위 메모 쪽지 · 지금 짚은 **부위**에 붙는다.
   *
   * 읽고 쓰는 일은 바깥이 맡는다. 이 판은 사진을 그리는 곳이지 중도매인의 메모가
   * 어디에 어떻게 저장되는지 알아야 할 곳이 아니다.
   */
  note?: { body: string | null; onSave: (body: string) => void } | null;
}

/**
 * 왼쪽 열 · 커서가 짚은 줄의 개체를 비춘다.
 *
 * 한 화면에 한 개체를 세우고 ←/→ 로 넘기는 상세 방과 다른 길을 택했다. 배송지시는
 * 하루 수십~수백 건을 흘려보내는 일이라 개체마다 화면을 갈아타면 넘기는 데만 손이
 * 다 간다. 표는 오늘치를 한 줄기로 두고, 사진이 커서를 따라오게 했다.
 *
 * 사진과 개체정보는 **따로 선 두 장의 카드**다 (상세 방 사진↔시세와 같은 틀). 한 상자
 * 안을 선 하나로 가르면 그 선이 어디에도 붙지 않은 군더더기로 읽히는데, 카드를 둘로
 * 떼면 사이 틈 자체가 경계가 되고 그 틈이 그대로 눈금이 된다 — 끌어서 비율을 바꾸고
 * 손잡이로 위아래를 맞바꾼다.
 *
 * 판정 일곱과 메모는 사진 **위**에 겹으로 얹는다 (상세 방과 같은 겹). 마블링을
 * 들여다보다 점수를 되짚으려고 눈이 아래 카드까지 내려갔다 오면 보던 자리를 잃는다 —
 * 일곱 값은 다름 아닌 이 사진에 대한 판정사의 답이라 같은 자리에 있어야 한다. 겹은
 * 끌어서 옮기고 모서리를 잡아 키운다. 자리는 경매장과 따로 담는다 (`StagePlacementScope`).
 *
 * 그림판은 상세 방(`ViewerMediaPane`)과 같은 짜임이다 — 썸네일을 왼쪽에 세로로
 * 세우고 사진·증명서를 한 줄로 잇는다. 단면 사진은 거의 정사각이라 늘 높이에 먼저
 * 갇히고 가로로는 판의 절반이 남는다. 아래에 깔면 그 60px 를 높이에서 빼앗아 그림이
 * 그만큼 작아지지만, 옆에 세우면 남는 폭을 쓰는 것이라 공짜다.
 *
 * 아래 상세는 거래처가 되묻는 것들을 다섯 묶음으로 적는다 — 개체(무슨 소냐) ·
 * 도축(어디서 언제) · 경매(얼마에) · 가공(누가 언제 몇 kg 으로) · 이력번호. 도축과
 * 이력번호는 송장과 원산지 표시에 그대로 들어가, 이력번호는 눌러서 이력제로 바로 간다.
 */
export function DeliveryFocusPane({
  focused,
  headerAction,
  note = null,
}: DeliveryFocusPaneProps) {
  const listingId = focused?.listingId ?? null;
  const [settledId, setSettledId] = useState<string | null>(null);
  useDebounce(() => setSettledId(listingId), CERT_SETTLE_MS, [listingId]);

  const [mediaIdx, setMediaIdx] = useState(0);
  const [prevListing, setPrevListing] = useState<string | null>(null);
  if (prevListing !== listingId) {
    /* 개체가 바뀌면 첫 장부터 · 3번째 사진을 보던 채로 넘어가면 없는 칸을 가리킨다 */
    setPrevListing(listingId);
    setMediaIdx(0);
  }

  const infoHeight = useDeliveryPrefs((s) => s.infoHeight);
  const setInfoHeight = useDeliveryPrefs((s) => s.setInfoHeight);
  const resetInfoHeight = useDeliveryPrefs((s) => s.resetInfoHeight);
  const rowOrder = useDeliveryPrefs((s) => s.paneRowOrder);
  const swapRowOrder = useDeliveryPrefs((s) => s.swapPaneRowOrder);

  const stagePlacement = useDeliveryPrefs((s) => s.stage);
  const setStagePlacement = useDeliveryPrefs((s) => s.setStagePlacement);
  const resetStagePlacement = useDeliveryPrefs((s) => s.resetStagePlacement);
  const placementStore = useMemo<StagePlacementStore>(
    () => ({
      get: (slot) => stagePlacement[slot] ?? STAGE_PLACEMENT_DEFAULT[slot],
      set: setStagePlacement,
      reset: resetStagePlacement,
    }),
    [stagePlacement, setStagePlacement, resetStagePlacement],
  );

  const [rootRef, { height: columnHeight }] = useMeasure<HTMLDivElement>();
  /* 개체정보가 더 자라면 그림판이 썸네일 레일보다 짧아진다 */
  const maxInfoHeight = Math.max(
    DELIVERY_INFO_MIN_HEIGHT,
    columnHeight - STACK_SPLITTER_HEIGHT - DELIVERY_STAGE_MIN_HEIGHT,
  );

  /* 겹 자리를 비율로 담으니 무대 크기를 알아야 px 로 편다 */
  const [stageRef, stage] = useMeasure<HTMLDivElement>();

  const stack = usePaneReorder({
    axis: "y",
    order: rowOrder,
    gap: STACK_SPLITTER_HEIGHT,
    onSwap: swapRowOrder,
  });

  /*
   * 아직 손이 멈추지 않았으면 들고 있는 증명서는 **이전 개체** 것이다. 질의 열쇠가
   * `settledId` 라 그 사이 받아 둔 값이 그대로 남는데, 그걸 그리면 다른 소의 판정서가
   * 지금 소의 것처럼 보인다 — 어디로 보낼지 정하는 화면에서 가장 안 되는 일이다.
   */
  const inSync = settledId === listingId;
  const hasAnyCert = !!focused?.hasGradeCert || !!focused?.hasSlaughterCert;
  const certs = useListingCerts(settledId, inSync && hasAnyCert);
  const gradeCert = inSync ? (certs.data?.gradeCert ?? null) : null;
  const slaughterCert = inSync ? (certs.data?.slaughterCert ?? null) : null;

  const { media, tabs } = useMemo(() => {
    const items: ViewerMedia[] = (focused?.images ?? []).map((src, i) => ({
      kind: "photo",
      src,
      label: (focused?.images?.length ?? 0) > 1 ? `사진 ${i + 1}` : "사진",
    }));
    const tabList: MediaTab[] = items.map((item, i) => ({
      label: item.label,
      kind: "photo",
      src: item.kind === "photo" ? item.src : null,
      mediaIdx: i,
    }));
    if (tabList.length === 0) {
      tabList.push({ label: "사진", kind: "photo", src: null, mediaIdx: null });
    }

    /* 없는 증명서도 자리를 지킨다 · 빈 칸이 「미등록」 을 말해 준다 */
    const addDoc = (
      label: string,
      short: string,
      has: boolean,
      src: string | null,
    ) => {
      if (!has) {
        tabList.push({ label, short, kind: "doc", src: null, mediaIdx: null });
        return;
      }
      tabList.push({ label, short, kind: "doc", src, mediaIdx: items.length });
      items.push({ kind: "doc", src, label });
    };
    addDoc(
      "등급판정확인서",
      "등급판정",
      !!focused?.hasGradeCert,
      gradeCert?.fileData ?? null,
    );
    addDoc(
      "도축검사증명서",
      "도축검사",
      !!focused?.hasSlaughterCert,
      slaughterCert?.fileData ?? null,
    );

    return { media: items, tabs: tabList };
  }, [focused, gradeCert, slaughterCert]);

  if (!focused) {
    /* 짚은 줄이 없으면 가를 것도 없다 · 카드 한 장으로 둔다 */
    return (
      <div
        className={cn("flex min-h-0 flex-1 flex-col", SURFACE_SHELL_CLASS)}
        ref={rootRef}
      >
        <StageHeader action={headerAction} />
        <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center text-[12.5px] text-content-faint">
          낙찰 부위를 고르면 개체 정보가 여기 뜹니다
        </div>
      </div>
    );
  }

  const safeIdx = Math.min(mediaIdx, Math.max(0, media.length - 1));
  const current = media[safeIdx] ?? null;
  const values = specValuesOf(focused);

  const stageCard = (
    <section
      key="stage"
      ref={stack.registerPane("stage")}
      style={stack.paneStyle("stage")}
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        SURFACE_SHELL_CLASS,
        stack.dragging === "stage" &&
          "relative z-30 shadow-2xl ring-1 ring-content-soft",
        stack.dragging &&
          stack.dragging !== "stage" &&
          "transition-transform duration-200",
      )}
    >
      <StageHeader action={headerAction} part={focused} />
      <div className={cn("flex min-h-0 flex-1 gap-3 p-3", PHOTO_STAGE_CLASS)}>
        <MediaTabs
          tabs={tabs}
          activeIdx={media.length > 0 ? safeIdx : null}
          onSelect={setMediaIdx}
        />
        {/*
         * 겹을 끌어다 놓는 무대 · `overflow-hidden` 은 안전장치다. 겹은 무대 안에
         * 들어오도록 가두지만 셈이 반 픽셀이라도 어긋나면 그 폭이 바깥 스크롤 영역으로
         * 올라가 엉뚱한 조상에 스크롤바를 만든다. 여기서 끊으면 위로 번지지 않는다.
         */}
        <div
          ref={stageRef}
          className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
        >
          <ViewerStage listingNo={focused.listingNo} item={current} />
          {/* 증명서 스캔본에는 얹지 않는다 · 흰 종이라 가릴 것이 있고, 값은 그 안에 이미 적혀 있다 */}
          {current?.kind === "photo" ? (
            <GradeStamp
              heading={{
                grade: focused.grade,
                marblingScore: focused.marbling > 0 ? focused.marbling : null,
                listingNo: focused.listingNo,
                companyName: focused.companyName,
              }}
              values={values}
              stageWidth={stage.width}
              stageHeight={stage.height}
            />
          ) : null}
          {note && current?.kind === "photo" ? (
            <StageNote
              partId={focused.partId}
              partLabel={`${focused.partName} · ${focused.listingNo}`}
              body={note.body}
              onSave={note.onSave}
              stageWidth={stage.width}
              stageHeight={stage.height}
            />
          ) : null}
        </div>
      </div>
    </section>
  );

  const infoCard = (
    <section
      key="info"
      ref={stack.registerPane("info")}
      style={{ height: infoHeight, ...stack.paneStyle("info") }}
      className={cn(
        "flex shrink-0 flex-col",
        SURFACE_SHELL_CLASS,
        stack.dragging === "info" &&
          "relative z-30 shadow-2xl ring-1 ring-content-soft",
        stack.dragging &&
          stack.dragging !== "info" &&
          "transition-transform duration-200",
      )}
    >
      {/*
       * 인쇄 단추가 늘 같은 자리에 산다. 증명서가 있을 때만 띄우면 커서를 옮길 때마다
       * 아래 글이 28px 씩 오르내려 읽던 줄을 놓친다.
       */}
      <header className="flex shrink-0 items-center gap-1.5 border-b border-line-soft px-3 py-1">
        <span className="shrink-0 text-[12px] font-bold text-content-mid">
          개체정보
        </span>
        <span className="ml-auto flex items-center gap-1.5">
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
        </span>
        <PaneGripHandle
          label="개체정보"
          axis="y"
          tone="card"
          dragging={stack.dragging === "info"}
          className="-mr-1"
          {...stack.handleProps("info")}
        />
      </header>

      <OverlayScroll autoHideDelay={0} className="min-h-0 flex-1">
        <dl className="flex flex-col gap-2 px-3 py-2.5">
          <CattleInfoRows facts={infoFactsOf(focused)} />
        </dl>
      </OverlayScroll>
    </section>
  );

  const cards = { stage: stageCard, info: infoCard };

  return (
    <StagePlacementScope store={placementStore}>
      <div ref={rootRef} className="flex min-h-0 flex-1 flex-col">
        {cards[rowOrder[0]]}
        <RoomStackSplitter
          height={infoHeight}
          sizedBelow={rowOrder[1] === "info"}
          defaultHeight={DELIVERY_INFO_HEIGHT_DEFAULT}
          label="사진과 개체정보 사이 높이"
          onResize={(px) => setInfoHeight(px, maxInfoHeight)}
          onReset={resetInfoHeight}
        />
        {cards[rowOrder[1]]}
      </div>
    </StagePlacementScope>
  );
}

/**
 * 사진 카드 머리 · 등급 각인과 열 손잡이가 한 줄에 선다.
 *
 * 각인이 사진 위가 아니라 여기 있다. 증명서를 보는 동안 갤러리가 왼쪽 위에
 * 「등급판정확인서」 라벨을 띄우는데, 각인을 얹어 두면 둘이 같은 자리에서 겹친다.
 */
function StageHeader({
  part,
  action,
}: {
  part?: WinningPart;
  action?: ReactNode;
}) {
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-line-soft px-3 py-1.5">
      {part ? (
        <>
          <span className="shrink-0 text-[13px] font-bold tabular-nums text-content">
            {formatGradeLabel(
              part.grade,
              part.marbling > 0 ? part.marbling : null,
            )}
          </span>
          <span className="shrink-0 text-[12px] font-medium tabular-nums text-content-faint">
            {part.listingNo}
          </span>
          {part.companyName ? (
            <span className="min-w-0 truncate text-[12px] font-medium text-content-faint">
              {part.companyName}
            </span>
          ) : null}
        </>
      ) : (
        <span className="text-[12px] font-bold text-content-mid">개체</span>
      )}
      <span className="ml-auto flex items-center">{action}</span>
    </header>
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
      className="inline-flex h-6 items-center gap-1 rounded border border-line bg-surface px-1.5 text-[11px] font-semibold text-content-mid transition-colors hover:border-content-ghost hover:text-content"
    >
      <Printer className="h-3 w-3" strokeWidth={2.25} />
      {label} 인쇄
    </button>
  );
}
