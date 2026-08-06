"use client";

import { useMemo, useState } from "react";
import {
  AGREEMENT_BODY,
  AGREEMENT_ITEMS,
  type AgreementId,
} from "@/features/signup/schema";
import { FileSignature } from "lucide-react";

interface Props {
  onNext: (agreements: Record<AgreementId, boolean>) => void;
}

export function AgreementStep({ onNext }: Props) {
  const [checked, setChecked] = useState<Record<AgreementId, boolean>>({
    service: false,
    privacy: false,
    trade: false,
    marketing: false,
  });

  const requiredIds = useMemo(
    () => AGREEMENT_ITEMS.filter((i) => i.required).map((i) => i.id),
    [],
  );

  const allRequiredChecked = requiredIds.every((id) => checked[id]);
  const allChecked = AGREEMENT_ITEMS.every((i) => checked[i.id]);

  const toggle = (id: AgreementId) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAll = () => {
    const next = !allChecked;
    setChecked({
      service: next,
      privacy: next,
      trade: next,
      marketing: next,
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-sky-700" />
          <h2 className="text-lg font-semibold text-slate-900">
            거래인 약정서 (전자 약정)
          </h2>
        </div>
        <p className="mb-4 text-sm text-slate-600">
          아래 약정서를 확인한 후 동의 체크박스에 표시해 주세요. 매참인 신청과
          동시에 본 약정이 전자적으로 체결됩니다.
        </p>
        <div className="max-h-80 overflow-y-auto whitespace-pre-line rounded-lg border border-slate-200 bg-slate-50 p-5 text-xs leading-relaxed text-slate-700">
          {AGREEMENT_BODY}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="flex cursor-pointer items-center gap-3 border-b border-slate-100 pb-4">
          <input
            type="checkbox"
            className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-200"
            checked={allChecked}
            onChange={toggleAll}
          />
          <span className="text-sm font-semibold text-slate-900">
            모든 약관에 동의합니다
          </span>
          <span className="ml-auto text-xs text-slate-500">
            (필수 및 선택 항목 전체 동의)
          </span>
        </label>
        <ul className="mt-4 space-y-3">
          {AGREEMENT_ITEMS.map((item) => (
            <li key={item.id}>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-200"
                  checked={checked[item.id]}
                  onChange={() => toggle(item.id)}
                />
                <span className="text-sm text-slate-700">{item.label}</span>
                <span
                  className={`ml-auto text-xs font-semibold ${
                    item.required ? "text-rose-600" : "text-slate-400"
                  }`}
                >
                  {item.required ? "필수" : "선택"}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {allRequiredChecked
            ? "필수 항목에 모두 동의하셨습니다. 다음 단계로 진행할 수 있습니다."
            : "다음 단계로 진행하려면 필수 항목에 모두 동의해야 합니다."}
        </p>
        <button
          type="button"
          onClick={() => onNext(checked)}
          disabled={!allRequiredChecked}
          className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:bg-slate-300"
        >
          다음 단계로 <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}
