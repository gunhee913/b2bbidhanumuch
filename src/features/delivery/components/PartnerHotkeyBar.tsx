"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Partner } from "../types";
import { PARTNER_SLOT_COUNT } from "../hooks/usePartnerPins";
import { PARTNER_CLEAR_KEY } from "../hooks/usePartnerHotkeys";
import { PartnerCombobox } from "./PartnerCombobox";

export interface PartnerHotkeyBarProps {
  partners: Partner[];
  /** 자리마다 거래처 id · 길이는 `PARTNER_SLOT_COUNT` */
  pinned: (string | null)[];
  onPin: (slot: number, partnerId: string | null) => void;
  /** 자리 걸기가 서버에서 막힌 까닭 · 띠는 이미 되돌아간 뒤라 말로 알려야 한다 */
  pinError?: string | null;
}

/**
 * 화면 아래 숫자 띠 · 어느 숫자가 어느 거래처인지 늘 적혀 있다.
 *
 * 등급 단축키는 칩에 「1++(9)」 라고 적혀 있어 숫자를 몰라도 눈으로 찾을 수 있지만,
 * 거래처 이름에는 아무 단서가 없다. 띠를 띄워 두지 않으면 아홉 자리를 외운 사람만
 * 쓸 수 있는 기능이 된다 — 그러면 아무도 안 쓴다.
 *
 * 자리는 쓴 횟수로 자동 정렬하지 않는다. 까닭은 `useDeliveryPrefs` 에 적어 뒀다.
 */
export function PartnerHotkeyBar({
  partners,
  pinned,
  onPin,
  pinError,
}: PartnerHotkeyBarProps) {
  const [editing, setEditing] = useState(false);
  const nameById = new Map(partners.map((p) => [p.id, p.name]));
  const slots = Array.from({ length: PARTNER_SLOT_COUNT }, (_, i) => i);

  if (editing) {
    return (
      <div className="border-t border-line bg-surface-muted px-3 py-2.5">
        <div className="flex items-center justify-between pb-2">
          <h3 className="text-[12px] font-bold text-content">
            숫자 키에 거래처 걸기
          </h3>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="inline-flex h-6 items-center gap-1 rounded bg-inverse px-2.5 text-[11.5px] font-bold text-inverse-content transition-opacity hover:opacity-90"
          >
            완료
          </button>
        </div>
        {pinError ? (
          <p className="pb-1.5 text-[11.5px] font-semibold text-lost">
            {pinError}
          </p>
        ) : null}
        <ul className="grid grid-cols-3 gap-x-3 gap-y-1.5">
          {slots.map((slot) => (
            <li key={slot} className="flex items-center gap-1.5">
              <kbd className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-line bg-surface text-[11px] font-bold tabular-nums text-content-mid">
                {slot + 1}
              </kbd>
              <span className="min-w-0 flex-1">
                <PartnerCombobox
                  partners={partners}
                  value={pinned[slot] ?? null}
                  onChange={(id) => onPin(slot, id)}
                  placeholder="비어 있음"
                />
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 border-t border-line bg-surface-muted px-3 py-1.5">
      <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
        {slots.map((slot) => {
          const id = pinned[slot] ?? null;
          /* 담당에서 빠진 거래처는 걸려 있어도 빈 자리로 본다 (`DeliveryRoom` 도 같은 판정) */
          const name = id ? (nameById.get(id) ?? null) : null;
          return (
            <li key={slot} className="flex shrink-0 items-center gap-1">
              <kbd
                className={cn(
                  "flex h-[18px] w-[18px] items-center justify-center rounded border text-[10.5px] font-bold tabular-nums",
                  name
                    ? "border-line bg-surface text-content-mid"
                    : "border-line-soft text-content-ghost",
                )}
              >
                {slot + 1}
              </kbd>
              <span
                className={cn(
                  "text-[11.5px]",
                  name
                    ? "font-semibold text-content-mid"
                    : "text-content-ghost",
                )}
              >
                {name ?? "—"}
              </span>
            </li>
          );
        })}
        <li className="flex shrink-0 items-center gap-1">
          <kbd className="flex h-[18px] items-center justify-center rounded border border-line bg-surface px-1 text-[10.5px] font-bold tabular-nums text-content-mid">
            {PARTNER_CLEAR_KEY}
          </kbd>
          <span className="inline-flex items-center gap-0.5 text-[11.5px] text-content-soft">
            <X className="h-3 w-3" strokeWidth={2.5} aria-hidden />
            배정 해제
          </span>
        </li>
      </ul>
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="숫자 키에 걸 거래처 고르기"
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-content-ghost transition-colors hover:bg-surface-accent hover:text-content"
      >
        <Pencil className="h-3 w-3" strokeWidth={2.25} />
      </button>
    </div>
  );
}
