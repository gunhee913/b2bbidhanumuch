"use client";

import { Check } from "lucide-react";

export type SignupStep = "agreement" | "info" | "complete";

const STEPS: { id: SignupStep; label: string }[] = [
  { id: "agreement", label: "약정 동의" },
  { id: "info", label: "정보 입력" },
  { id: "complete", label: "신청 완료" },
];

interface Props {
  current: SignupStep;
}

export function SignupStepper({ current }: Props) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);

  return (
    <ol className="flex items-center justify-center gap-2">
      {STEPS.map((step, idx) => {
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <li key={step.id} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  isDone
                    ? "bg-sky-600 text-white"
                    : isCurrent
                      ? "bg-sky-600 text-white ring-4 ring-sky-100"
                      : "bg-slate-200 text-slate-500"
                }`}
              >
                {isDone ? <Check className="h-4 w-4" /> : idx + 1}
              </div>
              <span
                className={`text-sm ${
                  isCurrent
                    ? "font-semibold text-slate-900"
                    : isDone
                      ? "font-medium text-slate-700"
                      : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`h-px w-12 ${idx < currentIdx ? "bg-sky-600" : "bg-slate-200"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
