"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import NumberFlow from "@number-flow/react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  ChartLine,
  LayoutList,
  Smartphone,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchCompanyInfo } from "@/features/main/api";
import {
  findHouseByKey,
  HOUSE_QUERY_KEY,
  HOUSE_STORAGE_KEY,
  type HouseMeta,
} from "../constants";
import { useHouseStatus, type HouseStatus } from "../hooks/useHouseStatus";
import { EntryBrand, NH_LOGO_SRC } from "./EntryBrand";
import { HouseStatusChip } from "./HouseStatusChip";
import { LoginForm } from "./LoginForm";

const DIORAMA_SRC = "/entry/auction-diorama.png";
const DIORAMA_WIDTH = 600;
const SELECT_PATH = "/main";
const LOGIN_PATH = "/login";

type Step = "select" | "login";

/** 우 패널 단계 제목 위 머리말 · 선택·로그인 단계 공통 */
const STEP_EYEBROW = "text-[14px] font-medium leading-[1.25] text-slate-500";

/** 좌 패널 핵심 기능 · 2×2 · 입찰(장소·시간) → 상장정보 → 시세 → 낙찰 후 배송지시 */
const ENTRY_FEATURES: ReadonlyArray<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: Smartphone,
    title: "언제 어디서든 입찰",
    description: "공판장 방문 없이 PC·모바일로 입찰",
  },
  {
    icon: LayoutList,
    title: "상장정보 한눈에",
    description: "개체·등급·품질·중량을 한 화면에서 비교",
  },
  {
    icon: ChartLine,
    title: "부위별 시세·동향",
    description: "지난 낙찰가 흐름을 보고 입찰가 결정",
  },
  {
    icon: Truck,
    title: "낙찰 후 배송지시",
    description: "낙찰 부위를 거래처별로 배정해 바로 출고",
  },
];

/** 진입 스태거 · 60ms 간격 fade+up */
const STAGGER_CONTAINER: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const STAGGER_ITEM: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};
/** 단계 전환 · 나가는 패널 fade(140ms) → 들어오는 패널 fade+8px 상승(220ms) · 겹치지 않는다(mode="wait") */
const STEP_EXIT = {
  opacity: 0,
  transition: { duration: 0.14, ease: "easeIn" },
} as const;
const STEP_ENTER_INITIAL = { opacity: 0, y: 8 } as const;
const STEP_ENTER_ANIMATE = {
  opacity: 1,
  y: 0,
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
} as const;
/** 공판장 카드 로우 치수 */
const CARD_HEADER_CLASS = "flex h-[88px] items-center gap-3 pl-3 pr-4";
const CARD_ICON_SIZE = 60;

/**
 * 진입 플로우 · 공판장 선택 → 중도매인 로그인 · 한 화면 두 단계.
 *
 * 좌(흰색) · 브랜드 → 헤드카피 → 부분육 경매 디오라마(플로트) · 두 단계 공통.
 * 우(slate-50) · 단계에 따라 [공판장 카드 2×2] ↔ [로그인 카드].
 *   전환은 단순 크로스 스텝(fade out → fade in + 8px) · 레이아웃 모프 없음 · 두 패널이 동시에 그려지지 않는다.
 *   좌·우 패널은 lg 에서 뷰포트 높이에 고정(우측만 내부 스크롤) → 우측 내용 높이가 바뀌어도 좌측은 미동도 없다.
 *   ← 공판장 변경 / 브라우저 뒤로가기는 같은 전환의 역방향.
 *
 * 단계는 URL 로 결정한다(`/main` = 선택, `/login?house=` = 로그인). 카드 클릭은 `history.pushState` 로 URL 만 바꿔
 * 컴포넌트를 유지하므로 요소 간 애니메이션이 이어지고, 새로고침·직접 진입도 같은 화면이 뜬다.
 */
export function EntryFlow() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const step: Step = pathname === LOGIN_PATH ? "login" : "select";

  // 이미 중도매인으로 로그인된 상태 · 공판장만 고르면 바로 경매장으로 (로그인 폼을 다시 보이지 않는다)
  const { data: session } = useSession();
  const isDealer = !!session?.dealer?.id || !!session?.employee?.dealerId;
  // 소속 공판장이 지정된 중도매인은 어떤 카드를 눌러도 소속 공판장으로 간다
  const dealerHouse = findHouseByKey(session?.dealer?.slaughterHouse ?? null);

  const houseParam = searchParams.get(HOUSE_QUERY_KEY);
  const [rememberedKey, setRememberedKey] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setRememberedKey(window.localStorage.getItem(HOUSE_STORAGE_KEY));
  }, [step]);
  const house = findHouseByKey(houseParam ?? rememberedKey);

  const { statuses, isLoading } = useHouseStatus();
  const houseStatus = house
    ? (statuses.find((s) => s.meta.key === house.key) ?? null)
    : null;

  const callbackUrl =
    searchParams.get("callbackUrl") ??
    (dealerHouse
      ? `/auction/live?${HOUSE_QUERY_KEY}=${encodeURIComponent(dealerHouse.key)}`
      : house
        ? `/auction/live?${HOUSE_QUERY_KEY}=${encodeURIComponent(house.key)}`
        : "/auction/live");

  // 로그인 상태로 `/login` 에 직접 들어온 경우(북마크·뒤로가기) → 경매장으로
  useEffect(() => {
    if (step === "login" && isDealer) router.replace(callbackUrl);
  }, [step, isDealer, callbackUrl, router]);

  // 선택 화면에서 pushState 로 넘어왔으면 ← 는 history.back() (브라우저 뒤로가기와 같은 스택)
  const pushedFromSelectRef = useRef(false);
  const pick = (status: HouseStatus) => {
    if (typeof window === "undefined") return;
    if (isDealer) {
      const target = dealerHouse ?? status.meta;
      window.localStorage.setItem(HOUSE_STORAGE_KEY, target.key);
      router.push(
        `/auction/live?${HOUSE_QUERY_KEY}=${encodeURIComponent(target.key)}`,
      );
      return;
    }
    window.localStorage.setItem(HOUSE_STORAGE_KEY, status.meta.key);
    pushedFromSelectRef.current = true;
    window.history.pushState(
      null,
      "",
      `${LOGIN_PATH}?${HOUSE_QUERY_KEY}=${encodeURIComponent(status.meta.key)}`,
    );
  };

  const backToSelect = () => {
    if (typeof window === "undefined") return;
    if (pushedFromSelectRef.current) {
      pushedFromSelectRef.current = false;
      window.history.back();
      return;
    }
    window.history.pushState(null, "", SELECT_PATH);
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-white text-slate-900 lg:h-screen lg:grid-cols-2">
      <LeftPanel />

      {/* 우측만 스크롤 · 내용 높이 변화가 페이지 높이(=좌측 배치)에 영향을 주지 않는다 */}
      <section className="relative flex flex-col border-slate-200 bg-slate-50 px-10 py-8 lg:overflow-y-auto lg:border-l lg:px-16 lg:py-10">
        <TopBar statuses={statuses} loading={isLoading} />

        <div className="flex flex-1 flex-col justify-center py-8">
          <AnimatePresence mode="wait" initial={false}>
            {step === "select" ? (
              <SelectPanel
                key="select"
                statuses={statuses}
                loading={isLoading}
                onPick={pick}
              />
            ) : (
              <LoginPanel
                key="login"
                house={house}
                houseStatus={houseStatus}
                callbackUrl={callbackUrl}
                initialError={searchParams.get("error")}
                onBack={backToSelect}
              />
            )}
          </AnimatePresence>
        </div>

        <EntryFooter />
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  좌 패널 · 브랜드 + 헤드카피 + 디오라마                               */
/* ------------------------------------------------------------------ */

function LeftPanel() {
  return (
    <motion.section
      variants={STAGGER_CONTAINER}
      initial="hidden"
      animate="show"
      className="flex flex-col px-10 py-8 lg:h-screen lg:px-16 lg:py-10"
    >
      {/*
       * 로고 · 헤드라인 · 기능안내 · 디오라마 · 하단 문구가 모두 한 컬럼 안에 있다.
       * 컬럼을 가운데 정렬 레이어 하나로 올려 세로 기준선을 하나로 맞춘다
       * (전에는 로고·하단이 패딩선, 본문이 컬럼선이라 왼쪽 끝이 어긋나 있었다).
       */}
      <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col">
        <motion.div variants={STAGGER_ITEM}>
          <EntryBrand />
        </motion.div>

        <div className="flex flex-1 flex-col justify-center py-8">
          <motion.h1
            variants={STAGGER_ITEM}
            className="break-keep text-left text-[32px] font-bold leading-[1.32] tracking-[-0.02em] text-slate-900 xl:text-[36px]"
          >
            부분육 경매,
            <br />
            이제{" "}
            <span className="bg-gradient-to-t from-amber-300 from-[34%] to-transparent to-[34%] px-0.5">
              온라인으로.
            </span>
          </motion.h1>

          {/* 2열 칸에서는 긴 설명이 두 줄로 접힌다 · 좌우 칸 제목 선을 맞추려고 위 정렬 */}
          <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5">
            {ENTRY_FEATURES.map(({ icon: Icon, title, description }) => (
              <motion.li
                key={title}
                variants={STAGGER_ITEM}
                className="flex items-start gap-3.5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-[0_2px_10px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/[0.04]">
                  <Icon
                    className="h-[18px] w-[18px] text-amber-500"
                    strokeWidth={2.25}
                    aria-hidden
                  />
                </span>
                <span className="flex min-w-0 flex-col gap-1.5 pt-1">
                  <span className="text-[14px] font-semibold leading-[1.25] text-slate-900">
                    {title}
                  </span>
                  <span className="break-keep text-[13px] leading-[1.5] text-slate-500">
                    {description}
                  </span>
                </span>
              </motion.li>
            ))}
          </ul>

          {/* 컬럼 폭을 그대로 채운다 · 왼쪽 선은 헤드라인, 오른쪽 선은 기능안내와 맞는다 */}
          <motion.div variants={STAGGER_ITEM} className="mt-6 w-full">
            <Diorama />
          </motion.div>
        </div>

        <motion.p
          variants={STAGGER_ITEM}
          className="text-[11px] leading-[1.25] text-slate-500"
        >
          농협경제지주 · 부분육 온라인경매
        </motion.p>
      </div>
    </motion.section>
  );
}

/** 부분육 경매 전 과정 디오라마 · 진입 스태거만 받고 그 뒤로는 움직이지 않는다 */
function Diorama() {
  return (
    <Image
      src={DIORAMA_SRC}
      alt=""
      width={DIORAMA_WIDTH}
      height={Math.round(DIORAMA_WIDTH * 0.75)}
      priority
      draggable={false}
      aria-hidden
      className="pointer-events-none w-full select-none"
    />
  );
}

/* ------------------------------------------------------------------ */
/*  우 패널 하단 · 고객센터 + 약관                                        */
/* ------------------------------------------------------------------ */

const SUPPORT_FALLBACK = { phone: "02-2080-6480", hours: "09:00 - 18:00" };

/**
 * 로그인 문제(비밀번호·번호 변경)가 생기는 자리에 해결 수단을 둔다.
 * 번호·운영시간은 푸터와 같은 관리자 회사정보를 쓴다.
 */
function EntryFooter() {
  const { data: info } = useQuery({
    queryKey: ["main", "company-info"],
    queryFn: fetchCompanyInfo,
    staleTime: 5 * 60_000,
  });
  const phone = info?.phone?.trim() || SUPPORT_FALLBACK.phone;
  const hours = info?.businessHours?.trim() || SUPPORT_FALLBACK.hours;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[11px] leading-[1.25] text-slate-500">
      <p className="flex items-center gap-2">
        <span>고객센터</span>
        <a
          href={`tel:${phone.replace(/[^0-9+]/g, "")}`}
          className="text-[12px] font-semibold tabular-nums text-slate-700 transition-colors hover:text-slate-900"
        >
          {phone}
        </a>
        <span className="h-2.5 w-px bg-slate-300" aria-hidden />
        <span>{hours}</span>
      </p>
      <div className="flex items-center gap-4">
        <Link href="/terms" className="hover:text-slate-600">
          이용약관
        </Link>
        <Link href="/privacy" className="hover:text-slate-600">
          개인정보처리방침
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  우 패널 공통 · 상단 오늘 두수                                         */
/* ------------------------------------------------------------------ */

function TopBar({
  statuses,
  loading,
}: {
  statuses: HouseStatus[];
  loading: boolean;
}) {
  const today = new Date();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="flex items-center justify-end gap-2 text-[12px] leading-[1.25] tabular-nums text-slate-500"
    >
      <span>{format(today, "M월 d일 (E)", { locale: ko })}</span>
      {statuses.map((status) => (
        <span key={status.meta.key} className="flex items-center gap-2">
          <span className="h-3 w-px bg-slate-300" aria-hidden />
          <span>
            {status.meta.key}{" "}
            <span
              className={cn(
                "font-semibold",
                status.kind === "live" ? "text-sky-700" : "text-slate-700",
              )}
            >
              <CountUp value={loading ? null : status.listingCount} />두
            </span>
          </span>
        </span>
      ))}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  1단계 · 공판장 선택                                                  */
/* ------------------------------------------------------------------ */

function SelectPanel({
  statuses,
  loading,
  onPick,
}: {
  statuses: HouseStatus[];
  loading: boolean;
  onPick: (status: HouseStatus) => void;
}) {
  return (
    <motion.div
      initial={STEP_ENTER_INITIAL}
      animate={STEP_ENTER_ANIMATE}
      exit={STEP_EXIT}
      className="w-full"
    >
      {/* 인사는 머리말로 물리고 행동 문장만 제목 · 강조색·형광펜은 좌측 헤드라인에만 */}
      <p className={STEP_EYEBROW}>안녕하세요</p>
      <h2 className="mt-2 break-keep text-[24px] font-bold leading-[1.35] tracking-[-0.02em] text-slate-900 xl:text-[26px]">
        소속 공판장을 선택해 주세요.
      </h2>

      <div aria-label="공판장 선택" className="mt-8 grid grid-cols-2 gap-4">
        {statuses.map((status) => (
          <HouseCard
            key={status.meta.key}
            status={status}
            loading={loading}
            onPick={() => onPick(status)}
          />
        ))}
      </div>

      <p className="mt-6 text-[13px] leading-[1.5] text-slate-500">
        로그인 없이 둘러보기 가능하며, 입찰은 로그인 후 가능합니다.
      </p>
    </motion.div>
  );
}

/**
 * 공판장 카드 · 심플 로우 · [건물] [농협로고 + 이름] [진행중 칩] [→]
 * 진행중 카드만 slate-900 테두리 + 상단 스트랩.
 */
function HouseCard({
  status,
  loading,
  onPick,
}: {
  status: HouseStatus;
  loading: boolean;
  onPick: () => void;
}) {
  const isOff = status.kind === "off";
  const isLive = status.kind === "live";
  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={`${status.meta.fullName} 선택`}
      className={cn(
        "group relative overflow-hidden rounded-[2px] border bg-white text-left transition-[border-color,box-shadow,transform] duration-200",
        CARD_HEADER_CLASS,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50",
        isLive
          ? "border-slate-900 shadow-[0_2px_10px_rgba(15,23,42,0.08)] hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(15,23,42,0.1)]"
          : isOff
            ? "border-slate-200 hover:border-slate-400"
            : "border-slate-200 hover:-translate-y-px hover:border-slate-900 hover:shadow-[0_2px_8px_rgba(15,23,42,0.06)]",
      )}
    >
      {isLive ? (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[3px] bg-slate-900"
        />
      ) : null}

      <HouseIdentity house={status.meta} muted={isOff} />

      <span className="ml-auto flex shrink-0 items-center gap-2">
        {loading ? (
          <span
            className="inline-block h-5 w-14 animate-pulse rounded-[2px] bg-slate-100"
            aria-hidden
          />
        ) : (
          <HouseStatusChip status={status} />
        )}
        <ArrowRight
          className={cn(
            "h-4 w-4 transition-all group-hover:translate-x-0.5",
            isLive
              ? "text-slate-900"
              : "text-slate-300 group-hover:text-slate-900",
          )}
          strokeWidth={2}
          aria-hidden
        />
      </span>
    </button>
  );
}

/**
 * 공판장 아이덴티티 · [건물 아이콘] [농협 로고 + 정식 명칭].
 */
function HouseIdentity({
  house,
  muted = false,
}: {
  house: HouseMeta;
  muted?: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span
        className={cn("relative shrink-0", muted && "opacity-60")}
        style={{ width: CARD_ICON_SIZE, height: CARD_ICON_SIZE }}
        aria-hidden
      >
        <Image
          src={house.icon}
          alt=""
          fill
          sizes={`${CARD_ICON_SIZE}px`}
          className="object-contain"
        />
      </span>
      <span
        className={cn(
          "flex min-w-0 items-center gap-1.5 break-keep text-[16px] font-semibold leading-[1.25] tracking-[-0.01em]",
          muted ? "text-slate-500" : "text-slate-900",
        )}
      >
        <span
          className={cn("relative h-4 w-4 shrink-0", muted && "opacity-70")}
          aria-hidden
        >
          <Image
            src={NH_LOGO_SRC}
            alt=""
            fill
            sizes="16px"
            className="object-contain"
            unoptimized
          />
        </span>
        <span className="truncate">{house.fullName}</span>
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  2단계 · 로그인                                                       */
/* ------------------------------------------------------------------ */

function LoginPanel({
  house,
  houseStatus,
  callbackUrl,
  initialError,
  onBack,
}: {
  house: HouseMeta | null;
  houseStatus: HouseStatus | null;
  callbackUrl: string;
  initialError: string | null;
  onBack: () => void;
}) {
  const isOff = houseStatus?.kind === "off";
  return (
    <motion.div
      initial={STEP_ENTER_INITIAL}
      animate={STEP_ENTER_ANIMATE}
      exit={STEP_EXIT}
      className="w-full max-w-[400px]"
    >
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-[2px] py-1 pr-2 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
        공판장 변경
      </button>

      {/* 제목 · [농협 로고 + 공판장명] 자체가 제목 · 역할(중도매인/매참인)을 특정하는 문구는 두지 않는다 */}
      <p className={cn(STEP_EYEBROW, "mt-6")}>로그인</p>
      <h2 className="mt-2 flex items-center gap-2.5">
        <span
          className={cn("relative h-6 w-6 shrink-0", isOff && "opacity-70")}
          aria-hidden
        >
          <Image
            src={NH_LOGO_SRC}
            alt=""
            fill
            sizes="24px"
            className="object-contain"
            unoptimized
          />
        </span>
        <span
          className={cn(
            "text-[24px] font-bold leading-[1.25] tracking-[-0.02em]",
            isOff ? "text-slate-500" : "text-slate-900",
          )}
        >
          {house ? house.fullName : "부분육 온라인경매"}
        </span>
        {houseStatus ? <HouseStatusChip status={houseStatus} /> : null}
      </h2>

      <div className="mt-8">
        <LoginForm callbackUrl={callbackUrl} initialError={initialError} />
      </div>

      {/* 보조 액션 한 줄 · 위계 동일 · 구분점으로 분리 */}
      <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-slate-500">
        <span
          className="cursor-not-allowed text-slate-400"
          title="준비 중입니다"
        >
          비밀번호 찾기
        </span>
        <span className="h-3 w-px bg-slate-300" aria-hidden />
        <Link
          href={callbackUrl}
          className="group inline-flex items-center gap-1 transition-colors hover:text-slate-900"
        >
          로그인 없이 둘러보기
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            strokeWidth={2.25}
            aria-hidden
          />
        </Link>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  공통                                                                 */
/* ------------------------------------------------------------------ */

/** 값이 도착하면 0 → 값으로 NumberFlow 카운트업 · 로딩 중엔 스켈레톤 */
function CountUp({ value }: { value: number | null }) {
  const shown = useCountUpValue(value);
  if (value === null) {
    return (
      <span className="inline-block h-3 w-6 animate-pulse rounded-[2px] bg-slate-200 align-middle" />
    );
  }
  return <NumberFlow value={shown} />;
}

function useCountUpValue(value: number | null): number {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (value === null) return;
    const id = window.setTimeout(() => setShown(value), 200);
    return () => window.clearTimeout(id);
  }, [value]);
  return shown;
}
