'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Loader2,
  Search,
  X,
  Mail,
  Phone,
  Building2,
  MapPin,
  User,
  FileText,
  MessageSquare,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  useAdminDealerApplication,
  useAdminDealerApplications,
  usePatchAdminDealerApplication,
} from '@/features/dealer-applications/hooks';
import {
  HANDLE_STATUS_LABELS,
  type HandleStatus,
} from '@/features/dealer-applications/types';
import {
  BUSINESS_TYPE_OPTIONS,
  DISTRIBUTION_CHANNEL_OPTIONS,
  MONTHLY_VOLUME_OPTIONS,
  SLAUGHTER_HOUSE_OPTIONS,
} from '@/features/signup/schema';

const STATUS_TABS: { value: HandleStatus | 'all'; label: string; tone: string }[] = [
  { value: 'all', label: '전체', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'unread', label: '미확인', tone: 'bg-rose-50 text-rose-700 border-rose-200' },
  { value: 'viewed', label: '확인함', tone: 'bg-sky-50 text-sky-700 border-sky-200' },
  { value: 'contacted', label: '연락완료', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'onhold', label: '보류', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'done', label: '처리완료', tone: 'bg-slate-100 text-slate-500 border-slate-200' },
];

const STATUS_BADGE_TONE: Record<HandleStatus, string> = {
  unread: 'bg-rose-50 text-rose-700 border-rose-200',
  viewed: 'bg-sky-50 text-sky-700 border-sky-200',
  contacted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  onhold: 'bg-amber-50 text-amber-700 border-amber-200',
  done: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function DealerApplicationsPage() {
  const [status, setStatus] = useState<HandleStatus | 'all'>('all');
  const [keyword, setKeyword] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useAdminDealerApplications({
    status,
    keyword: keyword.trim() || undefined,
    from: from || undefined,
    to: to || undefined,
  });

  const applications = data?.applications ?? [];
  const statusCounts = data?.statusCounts;

  const totalUnread = statusCounts?.unread ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">매참인 신청 관리</h1>
            <p className="mt-1 text-sm text-slate-500">
              신규 신청 내역을 확인하고 처리 상태를 관리합니다.
            </p>
          </div>
          {totalUnread > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
              <span className="font-semibold">미확인 {totalUnread}건</span>이
              대기 중입니다.
            </div>
          )}
        </div>

        {/* 상태 탭 */}
        <div className="rounded-lg border border-slate-200 bg-white p-2">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_TABS.map((tab) => {
              const active = status === tab.value;
              const count =
                tab.value === 'all'
                  ? data?.total ?? 0
                  : statusCounts?.[tab.value] ?? 0;
              return (
                <button
                  key={tab.value}
                  onClick={() => setStatus(tab.value)}
                  className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition ${
                    active
                      ? 'border-sky-500 bg-sky-50 font-semibold text-sky-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`inline-flex min-w-[20px] justify-center rounded-full px-1.5 text-[11px] font-semibold ${
                      active ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 필터 */}
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">기간</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-700"
              />
              <span className="text-xs text-slate-400">~</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-700"
              />
              {(from || to) && (
                <button
                  onClick={() => {
                    setFrom('');
                    setTo('');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  초기화
                </button>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="이름 · 휴대번호 · 상호 · 사업자번호"
                  className="w-72 rounded-md border border-slate-200 py-1.5 pl-8 pr-3 text-sm text-slate-700 placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 리스트 */}
        <div className="rounded-lg border border-slate-200 bg-white">
          {isLoading ? (
            <div className="flex items-center justify-center py-24 text-slate-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 불러오는 중
            </div>
          ) : applications.length === 0 ? (
            <div className="py-24 text-center text-sm text-slate-400">
              조회된 신청 내역이 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">접수 일시</th>
                    <th className="px-4 py-3 text-left">신청자</th>
                    <th className="px-4 py-3 text-left">휴대번호</th>
                    <th className="px-4 py-3 text-left">상호</th>
                    <th className="px-4 py-3 text-left">대표자</th>
                    <th className="px-4 py-3 text-left">사업자번호</th>
                    <th className="px-4 py-3 text-center">상태</th>
                    <th className="px-4 py-3 text-center">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {applications.map((app) => (
                    <tr
                      key={app.id}
                      className={`transition ${
                        app.handleStatus === 'unread' ? 'bg-rose-50/40' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600 tabular-nums">
                        {format(new Date(app.createdAt), 'yy.MM.dd HH:mm', {
                          locale: ko,
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {app.applicantName}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700 tabular-nums">
                        {app.phone}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {app.businessName}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {app.representativeName}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700 tabular-nums">
                        {app.businessNo}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE_TONE[app.handleStatus]}`}
                        >
                          {HANDLE_STATUS_LABELS[app.handleStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedId(app.id)}
                          className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-sky-400 hover:text-sky-700"
                        >
                          상세
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedId && (
        <DetailModal id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </AdminLayout>
  );
}

function DetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useAdminDealerApplication(id);
  const { mutate: patch, isPending } = usePatchAdminDealerApplication();

  const [note, setNote] = useState<string>('');
  const [noteInit, setNoteInit] = useState(false);

  useEffect(() => {
    if (data && !noteInit) {
      setNote(data.adminNote ?? '');
      setNoteInit(true);
    }
  }, [data, noteInit]);

  const updateStatus = (status: HandleStatus) => {
    patch({ id, patch: { handleStatus: status } });
  };

  const saveNote = () => {
    patch({ id, patch: { adminNote: note } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">신청 상세</h2>
            {data && (
              <p className="mt-0.5 text-xs text-slate-500">
                접수 · {format(new Date(data.createdAt), 'yyyy.MM.dd HH:mm:ss')}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 바디 */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading || !data ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 불러오는 중
            </div>
          ) : (
            <div className="space-y-6">
              {/* 처리 상태 컨트롤 */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 text-xs font-semibold text-slate-600">
                  처리 상태
                </p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_TABS.filter((t) => t.value !== 'all').map((t) => {
                    const active = data.handleStatus === t.value;
                    return (
                      <button
                        key={t.value}
                        onClick={() => updateStatus(t.value as HandleStatus)}
                        disabled={isPending}
                        className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                          active
                            ? `${STATUS_BADGE_TONE[t.value as HandleStatus]} ring-2 ring-offset-1`
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
                {data.handledAt && (
                  <p className="mt-2 text-[11px] text-slate-500">
                    마지막 변경 ·{' '}
                    {format(new Date(data.handledAt), 'yyyy.MM.dd HH:mm:ss')}
                    {data.handledBy ? ` (${data.handledBy})` : ''}
                  </p>
                )}
              </div>

              {/* 개인 정보 */}
              <Section title="개인 정보" icon={User}>
                <InfoRow icon={User} label="이름" value={data.applicantName} />
                <InfoRow icon={Phone} label="휴대번호" value={data.phone} tabular />
                <InfoRow
                  icon={Mail}
                  label="이메일"
                  value={data.email || '—'}
                />
              </Section>

              {/* 사업자 정보 */}
              <Section title="사업자 정보" icon={Building2}>
                <InfoRow
                  label="사업 형태"
                  value={
                    BUSINESS_TYPE_OPTIONS.find(
                      (o) => o.value === data.businessType,
                    )?.label ?? data.businessType
                  }
                />
                <InfoRow label="상호(사업장명)" value={data.businessName} />
                <InfoRow
                  label="사업자등록번호"
                  value={data.businessNo}
                  tabular
                />
                <InfoRow label="대표자명" value={data.representativeName} />
                <InfoRow icon={MapPin} label="사업장 주소" value={data.address} />
              </Section>

              {/* 거래 희망 */}
              <Section title="거래 희망 사항" icon={FileText}>
                <TagRow
                  label="거래 희망 공판장"
                  values={data.preferredSlaughterHouses.map(
                    (v) =>
                      SLAUGHTER_HOUSE_OPTIONS.find((o) => o.value === v)?.label ??
                      v,
                  )}
                />
                <TagRow label="주요 필요 부위" values={data.preferredParts} />
                <TagRow label="관심 등급대" values={data.preferredGrades} />
                <InfoRow
                  label="예상 월 거래량"
                  value={
                    MONTHLY_VOLUME_OPTIONS.find(
                      (o) => o.value === data.expectedMonthlyVolume,
                    )?.label ??
                    (data.expectedMonthlyVolume || '—')
                  }
                />
                <TagRow
                  label="유통 채널"
                  values={data.distributionChannels.map(
                    (v) =>
                      DISTRIBUTION_CHANNEL_OPTIONS.find((o) => o.value === v)
                        ?.label ?? v,
                  )}
                />
                {data.inquiry && (
                  <div className="pt-2">
                    <p className="mb-1 text-xs font-semibold text-slate-600">
                      문의 사항
                    </p>
                    <p className="whitespace-pre-line rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
                      {data.inquiry}
                    </p>
                  </div>
                )}
              </Section>

              {/* 약정 동의 이력 */}
              <Section title="약정 동의 이력" icon={FileText}>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <AgreementItem label="서비스 이용약관" agreed={data.agreedService} required />
                  <AgreementItem label="개인정보 수집·이용" agreed={data.agreedPrivacy} required />
                  <AgreementItem label="거래인 약정 (전자 약정)" agreed={data.agreedTrade} required />
                  <AgreementItem label="마케팅 정보 수신" agreed={data.agreedMarketing} />
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  동의 시각 · {format(new Date(data.agreedAt), 'yyyy.MM.dd HH:mm:ss')}
                  {data.agreedIp ? ` · IP ${data.agreedIp}` : ''}
                </p>
              </Section>

              {/* 관리자 메모 */}
              <Section title="관리자 메모" icon={MessageSquare}>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="내부 관리용 메모를 입력하세요. (다른 관리자와 공유됩니다)"
                  rows={4}
                  className="w-full rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={saveNote}
                    disabled={isPending || note === (data.adminNote ?? '')}
                    className="rounded-md bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:bg-slate-300"
                  >
                    메모 저장
                  </button>
                </div>
              </Section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Detail sub components
// ============================================
function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
        <Icon className="h-4 w-4 text-sky-700" />
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="space-y-2 px-4 py-3">{children}</div>
    </section>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  tabular,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tabular?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <div className="w-32 shrink-0 text-xs font-semibold text-slate-500">
        {Icon && <Icon className="mr-1 inline h-3.5 w-3.5" />}
        {label}
      </div>
      <div className={`flex-1 text-slate-800 ${tabular ? 'tabular-nums' : ''}`}>
        {value}
      </div>
    </div>
  );
}

function TagRow({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-32 shrink-0 pt-0.5 text-xs font-semibold text-slate-500">
        {label}
      </div>
      <div className="flex-1">
        {values.length === 0 ? (
          <span className="text-sm text-slate-400">—</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {values.map((v) => (
              <span
                key={v}
                className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-medium text-sky-700"
              >
                {v}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AgreementItem({
  label,
  agreed,
  required,
}: {
  label: string;
  agreed: boolean;
  required?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
      <span
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
          agreed
            ? 'bg-emerald-500 text-white'
            : 'bg-slate-300 text-white'
        }`}
      >
        {agreed ? '✓' : '·'}
      </span>
      <span className="text-slate-700">{label}</span>
      {required && (
        <span className="ml-auto text-[10px] font-semibold text-rose-600">
          필수
        </span>
      )}
    </div>
  );
}
