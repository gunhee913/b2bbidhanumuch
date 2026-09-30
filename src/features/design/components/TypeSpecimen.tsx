"use client";

import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/brand/Wordmark";
import { SPECIMEN_ROWS, type FontCandidate } from "@/features/design/constants";

/** 토스인베스트 실측 등락색 · 기존 red-500/blue-600 보다 채도가 높다 */
const UP = "#F5445A";
const DOWN = "#4391FF";

/**
 * 글꼴 한 벌의 견본.
 *
 * 위에서 아래로 **큰 글자 → 표 → 낱글자** 순. 표를 가운데 둔 건 이 앱에서 글꼴이
 * 실제로 일하는 자리가 표이기 때문이다. 제목만 보고 고르면 13px 숫자가 깔렸을 때
 * 0/6/8 이 뭉치거나 한글 자폭이 들쭉날쭉한 걸 뒤늦게 발견한다.
 */
export function TypeSpecimen({
  font,
  tossRules,
  dark,
}: {
  font: FontCandidate;
  /** 자간 0 · 표 굵기 600 상한 · tabular-nums */
  tossRules: boolean;
  dark: boolean;
}) {
  const surface = dark ? "bg-[#1E1E23]" : "bg-white";
  const head = dark ? "text-white/40" : "text-slate-400";
  const body = dark ? "text-white/90" : "text-slate-900";
  const soft = dark ? "text-white/45" : "text-slate-500";
  const line = dark ? "border-white/[0.07]" : "border-slate-100";

  /** 토스 규칙을 끄면 지금 앱의 습관(음수 자간 · bold)으로 돌아간다 */
  const tracking = tossRules ? "0" : "-0.01em";
  const valueWeight = tossRules ? 600 : 700;

  return (
    <section
      className={cn("flex flex-col", surface)}
      style={{
        fontFamily: `var(${font.cssVar})`,
        letterSpacing: tracking,
      }}
    >
      <header className={cn("border-b px-5 py-4", line)}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className={cn("text-[17px] font-bold", body)}>{font.name}</h2>
          <span className={cn("text-[11px] font-medium tabular-nums", head)}>
            {font.license} · {font.weightMb.toFixed(1)}MB
          </span>
        </div>
        <p className={cn("mt-1 text-[12px] font-medium", soft)}>{font.note}</p>
      </header>

      {/* 워드마크 · 헤더에 실제로 박히는 크기 그대로 */}
      <div className={cn("flex items-center gap-6 border-b px-5 py-5", line)}>
        <Wordmark height={15} className={body} />
        <Wordmark height={28} className={body} />
      </div>

      {/* 큰 숫자 · 타이머·입찰가처럼 화면에서 제일 큰 글자 */}
      <div className={cn("border-b px-5 py-4", line)}>
        <p className={cn("text-[11px] font-medium", head)}>
          낙찰 예상 경락대금
        </p>
        <p
          className={cn("mt-1 text-[32px] leading-none tabular-nums", body)}
          style={{ fontWeight: tossRules ? 700 : 800 }}
        >
          1,178,000<span className={cn("pl-1 text-[16px]", soft)}>원</span>
        </p>
      </div>

      {/* 표 · 이 글꼴이 실제로 일하는 자리 */}
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr className={cn("border-b", line)}>
            {[
              ["접수번호", "text-left", "w-[26%]"],
              ["부위", "text-left", "w-[17%]"],
              ["등급", "text-left", "w-[14%]"],
              ["중량", "text-right", "w-[13%]"],
              ["최저단가", "text-right", "w-[15%]"],
              ["등락", "text-right", "w-[15%]"],
            ].map(([label, align, w]) => (
              <th
                key={label}
                className={cn(
                  "px-3 py-2 text-[11px] font-medium",
                  align,
                  w,
                  head,
                )}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SPECIMEN_ROWS.map((row) => {
            const rising = row.change.startsWith("+");
            const falling = row.change.startsWith("-");
            return (
              <tr key={row.listingNo} className={cn("border-b", line)}>
                <td
                  className={cn("px-3 py-[7px] text-[13px] tabular-nums", body)}
                  style={{ fontWeight: valueWeight }}
                >
                  {row.listingNo}
                </td>
                <td
                  className={cn("px-3 py-[7px] text-[13px]", body)}
                  style={{ fontWeight: valueWeight }}
                >
                  {row.part}
                </td>
                <td
                  className={cn(
                    "px-3 py-[7px] text-[12px] font-medium tabular-nums",
                    soft,
                  )}
                >
                  {row.grade}
                </td>
                <td
                  className={cn(
                    "px-3 py-[7px] text-right text-[12px] font-medium tabular-nums",
                    soft,
                  )}
                >
                  {row.weight}
                </td>
                <td
                  className={cn(
                    "px-3 py-[7px] text-right text-[13px] tabular-nums",
                    body,
                  )}
                  style={{ fontWeight: valueWeight }}
                >
                  {row.minPrice}
                </td>
                <td
                  className="px-3 py-[7px] text-right text-[13px] tabular-nums"
                  style={{
                    fontWeight: valueWeight,
                    color: rising ? UP : falling ? DOWN : undefined,
                  }}
                >
                  <span className={rising || falling ? "" : soft}>
                    {row.change}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* 낱글자 · 숫자 0/6/8/9 와 한글 받침이 뭉치는지 */}
      <div className={cn("mt-auto flex flex-col gap-2.5 px-5 py-4", line)}>
        <p className={cn("text-[18px] font-semibold tabular-nums", body)}>
          0123456789 · 1,234,567원 · 97,300원/kg
        </p>
        <p className={cn("text-[13px] font-medium leading-[1.5]", body)}>
          한우 거세 1++A(9) 30개월 · 등심 좌우 22.5kg · 음성 공판장 3회차 마감
          08:30
        </p>
        <p className={cn("text-[12px] font-medium leading-[1.5]", soft)}>
          회차가 마감되면 최고가 1건만 낙찰되고 나머지는 다음 회차로 넘어갑니다.
          낙찰 결과는 마감 직후 「내 입찰」에서 확인할 수 있습니다.
        </p>
      </div>
    </section>
  );
}
