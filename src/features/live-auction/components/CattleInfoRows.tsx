"use client";

import { ExternalLink } from "lucide-react";
import { formatGradeLabel } from "../lib/grade";
import { formatWon, formatWonPerKg } from "../lib/masking";
import { buildTraceHref } from "./ListingInfoSection";
import { formatDate, formatTraceNo, InfoRow } from "./ListingSpecSheet";

/** 개체정보 다섯 줄이 읽는 값 · 모르는 값은 null (0 도 모르는 값으로 친다) */
export interface CattleInfoFacts {
  breed: string | null;
  gender: string | null;
  grade: string | null;
  marblingScore: number | null;
  monthAge: number | null;
  slaughterHouse: string | null;
  slaughterDate: string | null;
  slaughterNo: string | null;
  /** 경락단가 (원/kg) · 지육 한 마리 값이라 부위 낙찰단가와 다르다 */
  unitPrice: number | null;
  carcassWeight: number | null;
  /** 가공업체 · 상장업체를 그대로 쓴다 */
  companyName: string | null;
  processDate: string | null;
  processWeight: number | null;
  traceNo: string | null;
}

const positive = (n: number | null | undefined): number | null =>
  n != null && n > 0 ? n : null;

const join = (parts: (string | null)[]) =>
  parts.filter((v) => v && v !== "-").join(" · ");

/**
 * 공판장 이름 · 자료에는 「농협 음성」 과 「음성축산물공판장」 이 섞여 들어온다.
 * 거래처에 불러 주는 이름이라 「공판장」 으로 끝나게 맞춘다 (`농협 음성` → `농협 음성공판장`).
 */
const slaughterHouseLabel = (name: string | null): string | null =>
  !name || name.endsWith("공판장") ? name : `${name}공판장`;

/**
 * 개체정보 다섯 줄 · 배송지시(`DeliveryFocusPane`)와 경매결과(`HistoryInfoPane`)가 같이 쓴다.
 *
 * 개체(무슨 소냐) · 도축(어디서 언제) · 경매(얼마에) · 가공(누가 언제 몇 kg 으로) ·
 * 이력번호. 두 화면에서 쓰임은 달라도 묻는 것은 같아서, 줄 차례가 다르면 같은 값을
 * 매번 다른 데서 찾아야 한다. 부르는 쪽이 `<dl>` 로 감싼다.
 */
export function CattleInfoRows({ facts }: { facts: CattleInfoFacts }) {
  const monthAge = positive(facts.monthAge);
  const unitPrice = positive(facts.unitPrice);
  const carcassWeight = positive(facts.carcassWeight);
  const processWeight = positive(facts.processWeight);

  /* 총경락대금은 따로 담기지 않는다 · 경락단가가 지육 kg 값이라 도체중을 곱하면 나온다 */
  const auctionTotal =
    unitPrice && carcassWeight ? Math.round(unitPrice * carcassWeight) : null;

  const animalLine = join([
    facts.breed,
    facts.gender,
    formatGradeLabel(facts.grade, positive(facts.marblingScore)),
    monthAge ? `${monthAge}개월` : null,
  ]);
  const slaughterLine = join([
    slaughterHouseLabel(facts.slaughterHouse),
    formatDate(facts.slaughterDate),
    facts.slaughterNo ? `도체번호 ${facts.slaughterNo}` : null,
  ]);
  const auctionLine = join([
    unitPrice ? formatWonPerKg(unitPrice) : null,
    auctionTotal ? `총 ${formatWon(auctionTotal)}` : null,
  ]);
  const processLine = join([
    facts.companyName,
    formatDate(facts.processDate),
    processWeight ? `${processWeight}kg` : null,
  ]);

  return (
    <>
      <InfoRow label="개체정보" size="md">
        {animalLine || "-"}
      </InfoRow>
      <InfoRow label="도축정보" size="md">
        {slaughterLine || "-"}
      </InfoRow>
      <InfoRow label="경매정보" size="md">
        {auctionLine || "-"}
      </InfoRow>
      <InfoRow label="가공정보" size="md">
        {processLine || "-"}
      </InfoRow>
      <InfoRow label="이력번호" size="md">
        <TraceLink traceNo={facts.traceNo} />
      </InfoRow>
    </>
  );
}

/** 이력번호 · 누르면 축산물이력제 개체 조회가 새 탭으로 뜬다 */
function TraceLink({ traceNo }: { traceNo: string | null }) {
  if (!traceNo) return <>-</>;
  return (
    <a
      href={buildTraceHref(traceNo)}
      target="_blank"
      rel="noopener noreferrer"
      title="축산물이력제에서 조회"
      className="group inline-flex max-w-full items-center gap-1 tabular-nums underline-offset-2 hover:underline"
    >
      <span className="truncate">{formatTraceNo(traceNo)}</span>
      <ExternalLink
        className="h-3 w-3 shrink-0 text-content-faint transition-colors group-hover:text-content"
        aria-hidden
      />
    </a>
  );
}
