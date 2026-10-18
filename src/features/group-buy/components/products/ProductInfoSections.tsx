'use client';

import { useState } from 'react';
import { FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CattleSummary, CertificateFile, ConsumerProduct } from '../../types';
import { formatDate, formatTraceNo, gradeWithMarbling } from '../../lib/format';
import { formatKg } from '../../lib/slots';
import { useProductCerts } from '../../hooks';
import { Skeleton } from '../primitives';

interface InfoRow {
  label: string;
  value: string;
}

const EMPTY = '-';
const SECTION = 'rounded-sm border border-line bg-surface p-5';
const SECTION_TITLE = 'text-[15px] font-bold text-content';

const numberOr = (n: number | null | undefined, unit = '') => (n == null ? EMPTY : `${n.toLocaleString()}${unit}`);

/** 품질정보 · 등급판정 항목 전부 · 없으면 "-" */
export function qualityRows(c: CattleSummary): InfoRow[] {
  return [
    { label: '등급', value: gradeWithMarbling(c.grade, c.marblingScore) || EMPTY },
    { label: '근내지방도', value: numberOr(c.marblingScore, '번') },
    { label: '육색', value: numberOr(c.meatColor, '번') },
    { label: '지방색', value: numberOr(c.fatColor, '번') },
    { label: '조직감', value: numberOr(c.texture) },
    { label: '성숙도', value: numberOr(c.maturity) },
    { label: '등지방 두께', value: numberOr(c.backFat, 'mm') },
    { label: '배최장근 단면적', value: numberOr(c.eyeMuscle, 'cm²') },
    { label: '성별 · 월령', value: [c.gender, c.monthAge ? `${c.monthAge}개월` : null].filter(Boolean).join(' · ') || EMPTY },
    { label: '이력번호', value: formatTraceNo(c.traceNo) },
  ];
}

export function slaughterRows(c: CattleSummary): InfoRow[] {
  return [
    { label: '도축장', value: c.slaughterHouse ?? EMPTY },
    { label: '도축일', value: formatDate(c.slaughterDate) },
    { label: '도축번호', value: c.slaughterNo ?? EMPTY },
    { label: '도체중', value: numberOr(c.carcassWeight, 'kg') },
    { label: '출하', value: c.companyName ?? EMPTY },
    { label: '상장번호', value: c.listingNo || EMPTY },
  ];
}

export function processRows(p: ConsumerProduct): InfoRow[] {
  const c = p.cattle;
  return [
    { label: '가공일', value: formatDate(c.processDate) },
    { label: '가공중량', value: numberOr(c.processWeight, 'kg') },
    { label: '이 부위 중량', value: formatKg(p.partWeight) },
    { label: '소분', value: `${p.slotCount}구좌 · ${p.zones.map((z) => z.label).join('·')}` },
    { label: '포장', value: '위치별 소분 · 진공 포장 · 냉장' },
    { label: '손질 옵션', value: '근막 제거 + 썰어 받기 (택배만)' },
  ];
}

/** 2열 정의 목록 · 값은 오른쪽 정렬 */
function InfoTable({ rows }: { rows: InfoRow[] }) {
  return (
    <dl className="mt-4 grid grid-cols-2 gap-x-8">
      {rows.map((r) => (
        <div key={r.label} className="flex items-baseline justify-between gap-4 border-b border-line-soft py-2.5">
          <dt className="shrink-0 text-[13px] text-content-faint">{r.label}</dt>
          <dd className={cn('text-right text-[13.5px] font-semibold tabular-nums', r.value === EMPTY ? 'text-content-ghost' : 'text-content')}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** 품질 · 도축 · 가공 정보 세 묶음 */
export function ProductInfoSections({ product }: { product: ConsumerProduct }) {
  const sections: { title: string; description: string; rows: InfoRow[] }[] = [
    { title: '품질정보', description: '축산물품질평가원 등급판정 기준 · 이력번호로 사육·도축·판정 이력을 확인할 수 있습니다.', rows: qualityRows(product.cattle) },
    { title: '도축정보', description: '공판장 상장 자료 그대로 표시합니다.', rows: slaughterRows(product.cattle) },
    { title: '가공정보', description: '모집이 마감되면 위치별로 소분·진공 포장해 냉장으로 보내드립니다.', rows: processRows(product) },
  ];
  return (
    <>
      {sections.map((s) => (
        <section key={s.title} className={SECTION}>
          <h2 className={SECTION_TITLE}>{s.title}</h2>
          <p className="mt-1 text-[12.5px] text-content-faint">{s.description}</p>
          <InfoTable rows={s.rows} />
        </section>
      ))}
    </>
  );
}

const CERT_SLOTS: { key: 'gradeCert' | 'slaughterCert'; title: string; hasKey: 'hasGradeCert' | 'hasSlaughterCert' }[] = [
  { key: 'gradeCert', title: '등급판정확인서', hasKey: 'hasGradeCert' },
  { key: 'slaughterCert', title: '도축검사증명서', hasKey: 'hasSlaughterCert' },
];

const isPdf = (f: CertificateFile) => f.fileType?.includes('pdf') || /\.pdf$/i.test(f.fileName);

/** 증명서 · 경매 플랫폼에 등록된 스캔본 · 등록 안 됐으면 빈 칸 */
export function CertificateSection({ product }: { product: ConsumerProduct }) {
  const anyRegistered = product.cattle.hasGradeCert || product.cattle.hasSlaughterCert;
  const { data, isLoading } = useProductCerts(anyRegistered ? product.id : null);
  const [enlarged, setEnlarged] = useState<CertificateFile | null>(null);

  return (
    <section className={SECTION}>
      <h2 className={SECTION_TITLE}>증명서</h2>
      <p className="mt-1 text-[12.5px] text-content-faint">부분육 온라인 경매 플랫폼에 등록된 원본을 그대로 보여드립니다.</p>
      <div className="mt-4 grid grid-cols-2 gap-4">
        {CERT_SLOTS.map((slot) => {
          const registered = product.cattle[slot.hasKey];
          const file = data?.[slot.key] ?? null;
          return (
            <div key={slot.key}>
              <p className="mb-2 text-[13px] font-semibold text-content-mid">{slot.title}</p>
              {!registered ? (
                <div className="flex aspect-[3/4] items-center justify-center rounded-sm border border-dashed border-line bg-surface-accent/40 text-[13px] text-content-ghost">미등록</div>
              ) : isLoading || !file ? (
                <Skeleton className="aspect-[3/4] rounded-sm" />
              ) : isPdf(file) ? (
                <a
                  href={file.fileData}
                  target="_blank"
                  rel="noreferrer"
                  className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-sm border border-line bg-surface-accent/40 text-[13px] font-semibold text-content hover:bg-surface-accent"
                >
                  <FileText className="h-8 w-8 text-content-faint" />
                  PDF 열기
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setEnlarged(file)}
                  className="group relative block aspect-[3/4] w-full overflow-hidden rounded-sm border border-line bg-surface-accent/40"
                  aria-label={`${slot.title} 크게 보기`}
                >
                  {/* data URL 이라 next/image 를 쓰지 않는다 */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={file.fileData} alt={slot.title} className="h-full w-full object-contain transition-transform group-hover:scale-[1.02]" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {enlarged ? (
        <div role="dialog" aria-modal="true" aria-label="증명서 크게 보기" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onClick={() => setEnlarged(null)}>
          <button type="button" onClick={() => setEnlarged(null)} aria-label="닫기" className="absolute right-5 top-5 rounded-full bg-white/90 p-2 text-content hover:bg-white">
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enlarged.fileData} alt={enlarged.fileName} className="max-h-full max-w-full rounded-sm bg-white object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      ) : null}
    </section>
  );
}

/** 상세설명 · 관리자가 쓴 글 · 줄바꿈 그대로 · 없으면 빈 칸 */
export function ProductDescription({ description }: { description: string | null }) {
  return (
    <section className={SECTION}>
      <h2 className={SECTION_TITLE}>상세설명</h2>
      {description ? (
        <p className="mt-4 whitespace-pre-line text-[14.5px] leading-[1.8] text-content-mid">{description}</p>
      ) : (
        <p className="mt-4 rounded-sm border border-dashed border-line bg-surface-accent/40 px-4 py-8 text-center text-[13px] text-content-ghost">아직 등록된 상세설명이 없습니다.</p>
      )}
    </section>
  );
}

/** 표 아래 위치 안내 한 줄 · 상단 목 쪽 · 중단 … */
export function ZoneGuide({ product }: { product: ConsumerProduct }) {
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-1 text-[12.5px] text-content-soft">
      {product.zones.map((z) => (
        <li key={z.slotNo}>
          <b className="font-semibold text-content-mid">{z.label}</b> {z.description}
        </li>
      ))}
    </ul>
  );
}
