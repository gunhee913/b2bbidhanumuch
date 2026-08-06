"use client";

import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";

interface Props {
  applicantName?: string;
}

export function CompleteStep({ applicantName }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <CheckCircle2 className="h-9 w-9" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900">
        매참인 신청이 접수되었습니다
      </h2>
      <p className="mt-3 text-sm text-slate-600">
        {applicantName ? `${applicantName}님, ` : ""}거래인 약정에 대한 전자
        동의가 정상적으로 접수되었습니다.
      </p>

      <div className="mx-auto mt-8 max-w-md rounded-lg border border-slate-200 bg-slate-50 p-5 text-left">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Clock className="h-4 w-4 text-sky-600" />
          다음 절차 안내
        </div>
        <ul className="space-y-2 text-xs leading-relaxed text-slate-600">
          <li>1. 관리자가 신청 내역과 사업자 정보를 확인합니다.</li>
          <li>
            2. 필요 시 등록하신 휴대번호로 담당자가 별도로 연락드립니다.
          </li>
          <li>
            3. 승인 후 안내에 따라 로그인하시면 부분육 경매에 참여하실 수
            있습니다.
          </li>
        </ul>
      </div>

      <div className="mt-8 flex items-center justify-center gap-3">
        <Link
          href="/main"
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          홈으로
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
        >
          로그인 페이지
        </Link>
      </div>
    </div>
  );
}
