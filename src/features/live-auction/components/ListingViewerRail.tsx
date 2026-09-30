"use client";

import { ExternalLink } from "lucide-react";
import { useMeasure } from "react-use";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { LiveListing } from "../api";
import { GRADE_FILTER_OPTIONS, formatGradeLabel } from "../lib/grade";
import { toPartGroupName } from "../lib/partGrouping";
import { buildTraceHref } from "./ListingInfoSection";
import { JUDGMENT_HINTS, formatDate, formatTraceNo } from "./ListingSpecSheet";
import { PartMarketChart } from "./PartMarketChart";
import { ViewerBidDock } from "./ViewerBidDock";
import type { SheetBidding } from "./SheetParts";

const NUMBER_FORMATTER = new Intl.NumberFormat("ko-KR");

/** 축약형 차트의 머리말(부위 선택 + 현재가)이 쓰는 세로 · 남은 높이를 캔버스에 넘기려고 뺀다 */
const CHART_CHROME_HEIGHT = 96;
/** 캔버스 최소 높이 · 시간축이 28px 을 먼저 가져가 이보다 낮추면 선이 눌린다 */
const MIN_CANVAS_HEIGHT = 170;

/**
 * 육질등급 색 · 1++ 는 금색, 1+ 는 하늘색, 나머지는 흰색.
 * 품종·성별과 한 줄에 묶여도 색 하나로 등급만 도드라진다.
 */
const GRADE_TONE: Record<string, string> = {
  "1++": "text-amber-300",
  "1+": "text-sky-300",
};
const GRADE_TONE_FALLBACK = "text-white/85";

/**
 * 개체 뷰어 오른쪽 레일 · 다크.
 *
 * 순서는 **무엇을 보고 값을 매기는가** 를 따른다.
 *
 *  ① 접수번호 — 사진이 어느 개체의 것인지 묶어 주는 라벨 · 개체를 넘길 때 기준점
 *  ② 육량등급 A — 도체중·등지방·등심면적. 이 셋이 육량지수 공식의 입력값 그 자체다
 *  ③ 육질등급 1++ — 근내지방도가 정하고 육색·지방색·조직감·성숙도가 거든다
 *  ④ 부위 시세 — 실제로 값을 써넣는 근거 · 부위를 바꿔 가며 본다
 *  ⑤ 경락단가·도축·가공·이력 — 참고 지표와 출처
 *
 * 등급과 그 근거를 붙여 놓는 게 핵심이다. 결론(A)만 위에 띄우고 근거(등지방·등심면적)를
 * 맨 아래 각주로 내리면 "왜 A인지" 를 읽을 수 없다.
 *
 * 바탕이 어두운 건 취향이 아니다. 육색·지방색을 눈으로 재는 화면에서 사진 옆에 흰 벽을
 * 세우면 눈이 흰색에 순응해 적색이 실제보다 어둡게 보인다.
 */
export function ListingViewerRail({
  listing,
  partGroup,
  onPartGroupChange,
  gradeKey,
  onGradeKeyChange,
  bidding,
  canBid = false,
  blockReason,
}: {
  listing: LiveListing;
  /** 시세 차트가 그릴 부위 · 좌/우를 합친 그룹명 */
  partGroup: string;
  onPartGroupChange: (partGroup: string) => void;
  /** 시세 차트가 그릴 등급 · `1++(9)` 형식 · 개체 등급과 달라도 된다 */
  gradeKey: string;
  onGradeKeyChange: (gradeKey: string) => void;
  /** 하단 입찰 독 · 없으면 독을 걸지 않는다 (읽기 전용으로 여는 경우) */
  bidding?: SheetBidding;
  canBid?: boolean;
  blockReason?: string;
}) {
  const { quality, yieldGrade } = splitGrade(listing.grade);

  /** 품종·성별·등급·월령 한 줄 · 등급만 색으로 도드라지게 노드로 섞는다 */
  const metaNodes: React.ReactNode[] = [
    listing.breed,
    listing.gender,
    listing.grade ? (
      <span
        className={cn("font-bold", GRADE_TONE[quality] ?? GRADE_TONE_FALLBACK)}
      >
        {formatGradeLabel(listing.grade, listing.marblingScore)}
      </span>
    ) : null,
    listing.monthAge != null ? `${listing.monthAge}개월` : null,
  ].filter(Boolean);

  const slaughterLine =
    [
      listing.slaughterHouse,
      formatDate(listing.slaughterDate),
      listing.slaughterNo ? `No.${listing.slaughterNo}` : null,
    ]
      .filter((v) => v && v !== "-")
      .join(" · ") || "-";

  const processLine =
    [listing.companyName, formatDate(listing.processDate)]
      .filter((v) => v && v !== "-")
      .join(" · ") || "-";

  return (
    <aside className="flex w-[520px] shrink-0 flex-col bg-[#17171c]">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {/* ① 접수번호 · 개체를 넘겨 가며 보는 화면에서 "지금 어느 개체인가" 가 먼저다 */}
        <div className="px-5 pb-4 pt-5">
          <p className="text-[11px] font-medium text-white/35">접수번호</p>
          <p className="mt-1.5 truncate text-[30px] font-bold leading-none tabular-nums tracking-[-0.02em] text-white">
            {listing.listingNo}
          </p>
          <p className="mt-3 flex flex-wrap items-center text-[12px] font-medium text-white/45">
            {metaNodes.map((node, i) => (
              <span key={i} className="flex items-center">
                {i > 0 ? <span className="px-1.5 text-white/20">·</span> : null}
                {node}
              </span>
            ))}
          </p>
        </div>

        {/* ② 육질등급 · 근내지방도가 등급을 정하고 나머지 넷이 결격 여부를 본다 */}
        <RailSection>
          <GradeCaption label="육질등급" grade={quality} />
          <div className="grid grid-cols-5 gap-1">
            <MetricCell label="근내지방" value={listing.marblingScore} />
            <MetricCell label="육색" value={listing.meatColor} />
            <MetricCell label="지방색" value={listing.fatColor} />
            <MetricCell label="조직감" value={listing.texture} />
            <MetricCell label="성숙도" value={listing.maturity} />
          </div>
        </RailSection>

        {/* ③ 육량등급 · 이 셋이 육량지수 공식의 입력값이다 */}
        <RailSection>
          <GradeCaption label="육량등급" grade={yieldGrade} />
          <div className="grid grid-cols-3 gap-1">
            <MetricCell
              label="도체중"
              value={listing.carcassWeight}
              unit="kg"
            />
            <MetricCell label="등지방" value={listing.backFat} unit="mm" />
            <MetricCell label="등심면적" value={listing.eyeMuscle} unit="cm²" />
          </div>
        </RailSection>

        {/* ④ 부위 시세 · 실제로 값을 써넣는 근거 · 남는 세로를 차트가 흡수한다 */}
        <PriceTrendSection
          listing={listing}
          partGroup={partGroup}
          onPartGroupChange={onPartGroupChange}
          gradeKey={gradeKey}
          onGradeKeyChange={onGradeKeyChange}
        />

        {/* ⑤ 참고 지표와 출처 · 경락단가는 지육 한 마리 값이라 부위 입찰의 근거는 아니다 */}
        <div className="border-t border-white/[0.07] px-5 py-4">
          <dl className="flex flex-col gap-2.5">
            <RailRow label="경락단가">
              {listing.unitPrice ? (
                <span className="tabular-nums">
                  {NUMBER_FORMATTER.format(Math.round(listing.unitPrice))}
                  <span className="pl-0.5 font-medium text-white/40">
                    원/kg
                  </span>
                  {listing.carcassWeight ? (
                    <span className="pl-2 font-medium text-white/40">
                      총{" "}
                      {NUMBER_FORMATTER.format(
                        Math.round(listing.unitPrice * listing.carcassWeight),
                      )}
                      원
                    </span>
                  ) : null}
                </span>
              ) : (
                "-"
              )}
            </RailRow>
            <RailRow label="도축">{slaughterLine}</RailRow>
            <RailRow label="가공">{processLine}</RailRow>
            {listing.processWeight ? (
              <RailRow label="가공중량">{`${listing.processWeight}kg`}</RailRow>
            ) : null}
            <RailRow label="이력">
              <span className="flex min-w-0 items-center justify-between gap-2">
                <span className="truncate tabular-nums">
                  {formatTraceNo(listing.traceNo)}
                </span>
                <a
                  href={buildTraceHref(listing.traceNo)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-sky-400 underline decoration-sky-400/30 underline-offset-2 hover:decoration-sky-400"
                >
                  이력조회
                  <ExternalLink className="h-3 w-3" />
                </a>
              </span>
            </RailRow>
          </dl>
        </div>
      </div>

      {/* ⑥ 입찰 · 사진과 등급을 본 그 자리에서 바로 써넣는다 · 스크롤과 무관하게 바닥에 붙는다 */}
      {bidding ? (
        <ViewerBidDock
          listing={listing}
          partGroup={partGroup}
          bidding={bidding}
          canBid={canBid}
          blockReason={blockReason}
        />
      ) : null}
    </aside>
  );
}

function RailSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-t border-white/[0.07] px-5 py-4">{children}</div>
  );
}

/** 섹션 머리말 · 등급 글자를 라벨에 붙여 아래 수치가 그 등급의 근거임을 드러낸다 */
function GradeCaption({
  label,
  grade,
}: {
  label: string;
  grade: string | null;
}) {
  return (
    <p className="mb-3 flex items-baseline gap-1.5">
      <span className="text-[11px] font-medium text-white/35">{label}</span>
      <span className="text-[13px] font-bold leading-none text-white/85">
        {grade ?? "-"}
      </span>
    </p>
  );
}

function RailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <dt className="w-16 shrink-0 text-[11px] font-medium text-white/35">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 truncate text-[12px] font-semibold text-white/85">
        {children}
      </dd>
    </div>
  );
}

/** 판정 한 칸 · 라벨 → 숫자(+단위) 세로 정렬 · 라벨 hover 시 판정 기준 */
function MetricCell({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null | undefined;
  unit?: string;
}) {
  const hint = JUDGMENT_HINTS[label];

  const labelNode = (
    <span className="truncate text-[10px] font-medium leading-none text-white/35 decoration-dotted underline-offset-2 hover:underline">
      {label}
    </span>
  );

  return (
    <div className="flex min-w-0 flex-col items-center gap-2">
      {hint ? (
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <span className="cursor-help">{labelNode}</span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px] px-2.5 py-1.5">
            <p className="text-[11px] font-bold">
              {label}{" "}
              <span className="font-medium text-primary-foreground/55">
                {hint.range}
              </span>
            </p>
            <p className="mt-0.5 text-[11px] font-medium leading-snug text-primary-foreground/80">
              {hint.reading}
            </p>
          </TooltipContent>
        </Tooltip>
      ) : (
        labelNode
      )}
      <span className="flex items-baseline gap-0.5">
        <span
          className={cn(
            "text-[24px] font-bold leading-none tabular-nums",
            value == null ? "text-white/20" : "text-white",
          )}
        >
          {value ?? "-"}
        </span>
        {unit ? (
          <span className="text-[10px] font-medium leading-none text-white/35">
            {unit}
          </span>
        ) : null}
      </span>
    </div>
  );
}

/**
 * 시세 · 부위별 탭과 같은 `PartMarketChart` 의 축약형.
 *
 * 부위별 탭은 시세를 파고드는 화면이라 기간·집계·등급·오버레이 토글 14개가 제값을 하지만,
 * 여기는 사진을 보다 "이 부위 요즘 얼마지" 한 번 곁눈질하는 자리다. 조작부와 2x2 통계,
 * 거래량 막대를 걷어내고 부위 선택 / 현재가 / 선만 남긴다 — 자세히 볼 사람은 부위별 탭으로 간다.
 */
function PriceTrendSection({
  listing,
  partGroup,
  onPartGroupChange,
  gradeKey,
  onGradeKeyChange,
}: {
  listing: LiveListing;
  partGroup: string;
  onPartGroupChange: (partGroup: string) => void;
  gradeKey: string;
  onGradeKeyChange: (gradeKey: string) => void;
}) {
  const [boxRef, { height: boxHeight }] = useMeasure<HTMLDivElement>();

  /** 이 개체가 내놓은 부위 · 좌/우는 한 항목으로 합친다 (`등심(좌)`, `등심(우)` → `등심`) */
  const options = [
    ...new Set(listing.parts.map((p) => toPartGroupName(p.partName))),
  ].filter(Boolean);

  /** 고른 부위의 최저단가 · 차트 기준선으로 얹어 "지금 값이 어디쯤" 을 보여 준다 */
  const referencePrice = (() => {
    const prices = listing.parts
      .filter((p) => toPartGroupName(p.partName) === partGroup)
      .map((p) => p.minPrice)
      .filter((v): v is number => v != null);
    return prices.length
      ? { value: Math.min(...prices), label: "최저단가" }
      : null;
  })();

  return (
    <div
      ref={boxRef}
      className="flex min-h-[266px] flex-1 flex-col border-t border-white/[0.07]"
    >
      <PartMarketChart
        partName={partGroup}
        listing={listing}
        bordered={false}
        theme="dark"
        compact
        headerLeft={
          <span className="text-[11px] font-medium text-white/35">시세</span>
        }
        headerRight={
          <div className="flex items-center gap-1.5">
            <RailSelect
              label="시세를 볼 부위"
              value={partGroup}
              options={options}
              onChange={onPartGroupChange}
            />
            <RailSelect
              label="시세를 볼 등급"
              value={gradeKey}
              options={[...GRADE_FILTER_OPTIONS]}
              onChange={onGradeKeyChange}
            />
          </div>
        }
        gradeOverride={gradeKey}
        height={Math.max(
          MIN_CANVAS_HEIGHT,
          Math.round(boxHeight) - CHART_CHROME_HEIGHT,
        )}
        referencePrice={referencePrice}
      />
    </div>
  );
}

/**
 * 차트 헤더 필터 · 부위(좌/우 합쳐 17개)와 등급(7개) 둘 다 pill 로 늘어놓으면 줄이 넘쳐 드롭다운으로 둔다.
 * 개체를 넘겨도 고른 값은 그대로라 `101 등심 → 102 등심` 으로 같은 조건을 이어서 본다.
 */
function RailSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={label}
        className="h-7 w-auto gap-1.5 border-0 bg-white/[0.07] px-2.5 text-[12px] font-bold text-white hover:bg-white/[0.12] focus:ring-0 focus:ring-offset-0"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-[320px]">
        {options.map((option) => (
          <SelectItem key={option} value={option} className="text-[13px]">
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** `"1++A"` → `{ quality: "1++", yieldGrade: "A" }` · 등급 배지에서 크기를 달리 주려고 가른다 */
function splitGrade(grade: string): {
  quality: string;
  yieldGrade: "A" | "B" | "C" | null;
} {
  const match = grade?.trim().match(/^(1\+\+|1\+|1|2|3)\s*([ABC])?$/);
  if (!match) return { quality: grade || "-", yieldGrade: null };
  return {
    quality: match[1],
    yieldGrade: (match[2] as "A" | "B" | "C" | undefined) ?? null,
  };
}
