"use client";

import { useEffect, useMemo, useState } from "react";
import { Hash, Keyboard, Pencil, Search, Trash2, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { OverlayScroll } from "@/components/ui/overlay-scroll";
import {
  SideDockShell,
  type SideDockTabDef,
} from "@/features/side-dock/components/SideDockShell";
import { ThemeRailButton } from "@/features/side-dock/components/ThemeRailButton";
import { RoundRail } from "@/features/side-dock/components/RoundRail";
import { useRoundPulse } from "@/features/side-dock/hooks/useRoundPulse";
import {
  PanelEmpty,
  PanelSectionHead,
} from "@/features/side-dock/components/SideDockPanelParts";
import { isTypingInto } from "@/features/live-auction/lib/keyboard";
import type { NoteRow } from "@/features/live-auction/hooks/useAuctionNotes";
import type { Partner, WinningPart } from "../types";
import { PARTNER_SLOT_COUNT } from "../hooks/usePartnerPins";
import { PARTNER_CLEAR_KEY } from "../hooks/usePartnerHotkeys";
import {
  useDeliveryDock,
  type DeliveryDockTab,
} from "../hooks/useDeliveryDock";
import { PartnerCombobox } from "./PartnerCombobox";

export interface DeliverySideDockProps {
  partners: Partner[];
  /** 자리마다 거래처 id · 길이는 `PARTNER_SLOT_COUNT` */
  pinned: (string | null)[];
  onPin: (slot: number, partnerId: string | null) => void;
  pinError: string | null;
  /** 화면에 올라온 낙찰분 · 거래처마다 몇 건이 걸려 있는지 세는 데 쓴다 */
  parts: WinningPart[];
  /** 부위 id → 지금 걸린 거래처 id (저장분에 고치는 중인 것을 덮어쓴 결과) */
  effective: Map<string, string | null>;
  /** 커서가 짚은 줄 · 목록에서 거래처를 눌렀을 때 꽂을 자리 */
  cursorPartId: string | null;
  onAssign: (partId: string, partnerId: string | null) => void;
  /** 마감이 지나 못 고치는 줄인가 · 목록의 「지정」 을 숨긴다 */
  cursorLocked: boolean;
  notes: NoteRow[];
  /** 그 메모를 적어 둔 줄로 간다 · 지금 기간 밖이면 날짜까지 옮기는 건 받는 쪽 몫 */
  onJumpToPart: (partId: string, activeDate: string) => void;
  onDeleteNote: (partId: string, activeDate: string) => void;
}

/**
 * 배송지시 오른쪽 사이드 메뉴 · 경매장과 같은 껍데기(`SideDockShell`)를 쓴다.
 *
 * 여기 들어오는 것들의 공통점은 **늘 필요하지는 않은데 찾으러 가기는 번거로운 것**이다.
 * 거래처 주소·연락처는 열에 한 번 보지만 못 찾으면 작업이 멈추고, 숫자 자리는 처음
 * 한 번 걸고 나면 안 건드리지만 띠 안의 연필 아이콘으로 숨겨 두면 걸 수 있는 줄도
 * 모른다. 둘 다 본문을 차지할 만큼은 아니고 없으면 곤란한 것들이라 레일 뒤가 맞다.
 */
export function DeliverySideDock({
  partners,
  pinned,
  onPin,
  pinError,
  parts,
  effective,
  cursorPartId,
  onAssign,
  cursorLocked,
  notes,
  onJumpToPart,
  onDeleteNote,
}: DeliverySideDockProps) {
  const roundPhase = useRoundPulse();
  const open = useDeliveryDock((s) => s.open);
  const tab = useDeliveryDock((s) => s.tab);
  const toggleTab = useDeliveryDock((s) => s.toggleTab);
  const setOpen = useDeliveryDock((s) => s.setOpen);

  /*
   * `?` 로 단축키 목록 · 경매장과 같은 키다. 어디서든 통하는 관례라 따로 알려 줄
   * 것이 없는 유일한 키라서, 두 화면에서 다르게 두면 그 하나뿐인 이점이 사라진다.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "?" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingInto(document.activeElement)) return;
      e.preventDefault();
      toggleTab("shortcuts");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleTab]);

  /* 거래처마다 지금 몇 건이 걸려 있나 · 목록에서 「얘한테 쏠렸네」 가 바로 보여야 한다 */
  const countByPartner = useMemo(() => {
    const map = new Map<string, number>();
    for (const part of parts) {
      const id = effective.get(part.partId);
      if (!id) continue;
      map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
  }, [parts, effective]);

  const slotByPartner = useMemo(() => {
    const map = new Map<string, number>();
    pinned.forEach((id, slot) => {
      if (id && !map.has(id)) map.set(id, slot + 1);
    });
    return map;
  }, [pinned]);

  const tabs: SideDockTabDef<DeliveryDockTab>[] = [
    {
      key: "partners",
      label: "거래처",
      icon: Users,
      /*
       * 배지를 달지 않는다 · 레일 배지는 「이 칸을 열면 몇 개가 있나」 로 읽힌다.
       *
       * 여기 미정 건수를 달아 뒀더니 바로 아래 메모 배지(메모 3개)와 나란히 서면서
       * 거래처가 그만큼 있다는 말이 됐다. 미정 수는 표 머리줄이 「미정 5」 로 이미
       * 말하고 있고, 거기가 세는 대상 옆이라 제자리다.
       */
      render: () => (
        <PartnersPanel
          partners={partners}
          countByPartner={countByPartner}
          slotByPartner={slotByPartner}
          canAssign={!!cursorPartId && !cursorLocked}
          onPick={(partnerId) => {
            if (cursorPartId) onAssign(cursorPartId, partnerId);
          }}
        />
      ),
    },
    {
      key: "pins",
      /* 아래 레일 칸이 「단축키」(키 목록)라 여기는 그 키로 무엇을 하는지로 가른다 */
      label: "빠른지정",
      icon: Hash,
      render: () => (
        <PinsPanel
          partners={partners}
          pinned={pinned}
          onPin={onPin}
          pinError={pinError}
        />
      ),
    },
    {
      key: "notes",
      label: "메모",
      icon: Pencil,
      badge: notes.length,
      render: () => (
        <NotesPanel
          notes={notes}
          onJump={onJumpToPart}
          onDelete={onDeleteNote}
        />
      ),
    },
    {
      key: "shortcuts",
      label: "단축키",
      icon: Keyboard,
      footer: true,
      render: () => <ShortcutsPanel />,
    },
  ];

  return (
    <SideDockShell
      id="delivery-side-panel"
      label="배송지시 사이드 메뉴"
      open={open}
      tab={tab}
      tabs={tabs}
      onToggleTab={toggleTab}
      onSetOpen={setOpen}
      /* 회차 · 네 화면 공통으로 레일 맨 위 · 여기도 열 패널은 없고 보여 주기만 한다 */
      railTop={<RoundRail phase={roundPhase} />}
      railFooter={<ThemeRailButton />}
    />
  );
}

/**
 * 담당 거래처 목록 · 이름으로 찾고, 주소·연락처를 편다.
 *
 * 숫자 자리는 아홉 개뿐인데 담당은 그보다 많을 수 있다. 열 번째 거래처를 쓰려면
 * 표의 고르개를 열어 글자를 쳐야 하는데, 그 고르개는 줄 안에 있어 좁다 — 여기서는
 * 주소까지 보고 고를 수 있다.
 */
function PartnersPanel({
  partners,
  countByPartner,
  slotByPartner,
  canAssign,
  onPick,
}: {
  partners: Partner[];
  countByPartner: Map<string, number>;
  slotByPartner: Map<string, number>;
  canAssign: boolean;
  onPick: (partnerId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? partners.filter((p) =>
        `${p.name} ${p.partnerNo} ${p.representative} ${p.address}`
          .toLowerCase()
          .includes(needle),
      )
    : partners;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelSectionHead label="거래처 목록" count={partners.length} unit="곳" />

      <div className="shrink-0 px-4 pb-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-content-ghost"
            strokeWidth={2.25}
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름 · 번호 · 주소"
            aria-label="거래처 찾기"
            className="h-7 w-full rounded-md border border-line bg-surface pl-7 pr-7 text-[12px] text-content outline-none placeholder:text-content-ghost focus:border-content-ghost"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="찾기 지우기"
              className="absolute right-1 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-content-ghost transition-colors hover:bg-surface-accent hover:text-content"
            >
              <X className="h-3 w-3" strokeWidth={2.5} />
            </button>
          ) : null}
        </div>
      </div>

      {shown.length === 0 ? (
        <PanelEmpty
          text={
            partners.length === 0
              ? "담당으로 걸린 거래처가 없어요"
              : "찾는 거래처가 없어요"
          }
        />
      ) : (
        <OverlayScroll autoHideDelay={0} className="min-h-0 flex-1">
          <ul className="px-2 pb-1">
            {shown.map((partner) => {
              const count = countByPartner.get(partner.id) ?? 0;
              const slot = slotByPartner.get(partner.id);
              return (
                <li
                  key={partner.id}
                  className="group rounded-lg px-2 py-2 transition-colors hover:bg-surface-accent"
                >
                  <div className="flex items-center gap-1.5">
                    {slot ? (
                      <kbd className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] bg-surface-strong text-[10.5px] font-medium tabular-nums text-content-mid">
                        {slot}
                      </kbd>
                    ) : null}
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-content">
                      {partner.name}
                    </span>
                    {count > 0 ? (
                      <span className="shrink-0 text-[12px] font-medium tabular-nums text-content-faint">
                        {count}건
                      </span>
                    ) : null}
                    {canAssign ? (
                      /* 줄 전체를 누름단추로 두지 않는다 · 주소를 읽으려다 배정이 바뀌면 곤란하다 */
                      <button
                        type="button"
                        onClick={() => onPick(partner.id)}
                        title="커서가 짚은 줄에 지정"
                        className="hidden h-[18px] shrink-0 items-center rounded-[4px] bg-inverse px-1.5 text-[11px] font-semibold text-inverse-content transition-opacity hover:opacity-90 group-hover:inline-flex"
                      >
                        지정
                      </button>
                    ) : null}
                  </div>
                  <p className="truncate pt-0.5 text-[12px] tabular-nums text-content-soft">
                    {[partner.partnerNo, partner.representative, partner.phone]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {partner.address ? (
                    <p className="truncate text-[12px] text-content-faint">
                      {partner.address}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </OverlayScroll>
      )}
    </div>
  );
}

/**
 * 숫자 자리 걸기 · 전에는 띠 오른쪽 끝 연필 아이콘 뒤에 있었다.
 *
 * 연필을 누르면 띠가 통째로 고르개 아홉 개짜리 판으로 바뀌어 표 아래가 솟았다 —
 * 걸고 있는 동안에는 정작 표가 가려졌다. 여기로 옮기면 왼쪽 표를 보면서 건다.
 */
function PinsPanel({
  partners,
  pinned,
  onPin,
  pinError,
}: {
  partners: Partner[];
  pinned: (string | null)[];
  onPin: (slot: number, partnerId: string | null) => void;
  pinError: string | null;
}) {
  const filled = pinned.filter(Boolean).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelSectionHead
        label="거래처 단축키 설정"
        count={filled}
        unit={`/${PARTNER_SLOT_COUNT}`}
      />

      {pinError ? (
        <p className="shrink-0 px-4 pb-1.5 text-[12px] font-semibold text-lost">
          {pinError}
        </p>
      ) : null}

      <OverlayScroll autoHideDelay={0} className="min-h-0 flex-1">
        <ul className="space-y-1.5 px-4 pb-3 pt-1">
          {Array.from({ length: PARTNER_SLOT_COUNT }, (_, slot) => (
            <li key={slot} className="flex items-center gap-1.5">
              <kbd className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] bg-surface-strong text-[12px] font-medium tabular-nums text-content-mid">
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
      </OverlayScroll>
    </div>
  );
}

/**
 * 지금껏 적어 둔 메모 전부 · 누르면 그 줄로 가고, 휴지통으로 지운다.
 *
 * 표에서는 모서리 자국으로 「여기 뭔가 있다」 만 보인다. 무엇을 적었는지 훑으려면
 * 쉰 줄에 커서를 하나씩 올려 봐야 하는데, 그럴 바엔 한 자리에 모아 두는 게 낫다.
 *
 * 조회기간으로 자르지 않는다. 지금 표에 없는 날의 메모도 누르면 **그 날짜로 조회를
 * 옮겨서** 간다 — 적어 둔 말을 찾아 눌렀는데 막혀 있으면, 날짜를 손으로 맞춰 다시
 * 눌러야 한다. 그 손이 곧 이 목록이 대신해 줄 수 있는 일이다.
 */
function NotesPanel({
  notes,
  onJump,
  onDelete,
}: {
  notes: NoteRow[];
  onJump: (partId: string, activeDate: string) => void;
  onDelete: (partId: string, activeDate: string) => void;
}) {
  /* 최근 적은 날이 위로 · 날짜 문자열이 `yyyy-MM-dd` 라 사전순이 곧 날짜순이다 */
  const partNotes = useMemo(
    () =>
      notes
        .filter((n) => n.targetType === "part" && n.body)
        .sort((a, b) => b.activeDate.localeCompare(a.activeDate)),
    [notes],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelSectionHead label="메모" count={partNotes.length} unit="개" />
      {partNotes.length === 0 ? (
        <PanelEmpty text="사진 위 쪽지에 적으면 여기 모여요" />
      ) : (
        <OverlayScroll autoHideDelay={0} className="min-h-0 flex-1">
          <ul className="px-2 pb-1">
            {partNotes.map((note) => (
              <li key={`${note.activeDate}:${note.targetId}`}>
                <div className="group flex items-start gap-1 rounded-lg px-2 py-2 transition-colors hover:bg-surface-accent">
                  <button
                    type="button"
                    onClick={() => onJump(note.targetId, note.activeDate)}
                    title={`${note.activeDate} 로 가기`}
                    className="min-w-0 flex-1 text-left"
                  >
                    {/* 적어 둔 말이 먼저 · 경매장 메모 패널과 같은 결 */}
                    <p className="whitespace-pre-wrap break-words text-[12.5px] leading-[1.45] text-content">
                      {note.body}
                    </p>
                    <p className="mt-1 text-[11.5px] tabular-nums text-content-faint">
                      {note.activeDate}
                    </p>
                  </button>

                  {/* 적은 자리까지 돌아가지 않고 여기서 바로 지운다 */}
                  <button
                    type="button"
                    onClick={() => onDelete(note.targetId, note.activeDate)}
                    aria-label={`${note.activeDate} 메모 지우기`}
                    title="메모 지우기"
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-content-ghost opacity-0 transition-opacity hover:bg-surface-strong hover:text-content focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </OverlayScroll>
      )}
    </div>
  );
}

const SHORTCUT_GROUPS: { title: string; keys: [string, string][] }[] = [
  {
    title: "줄 옮기기",
    /* 한 화면씩(PgUp PgDn)·맨 끝(Home End)은 적혀만 있고 듣지 않던 키라 뺐다 */
    keys: [["↑ ↓", "위아래 줄"]],
  },
  {
    title: "단축키 사용",
    keys: [
      [`1 ~ ${PARTNER_SLOT_COUNT}`, "걸어 둔 거래처 · 꽂고 다음 줄로"],
      [PARTNER_CLEAR_KEY, "이 줄 배정 해제"],
    ],
  },
  {
    title: "그 밖에",
    keys: [
      ["M", "짚은 줄에 메모"],
      ["?", "이 목록 열고 닫기"],
    ],
  },
];

function ShortcutsPanel() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PanelSectionHead label="단축키" count={0} unit="" />
      <OverlayScroll autoHideDelay={0} className="min-h-0 flex-1">
        <div className="px-4 pb-3">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.title} className="pb-3 pt-1.5">
              <h3 className="mb-1.5 text-[12px] font-bold text-content">
                {group.title}
              </h3>
              <ul>
                {group.keys.map(([key, desc]) => (
                  <li
                    key={key}
                    className="flex items-center justify-between gap-2 py-[3px]"
                  >
                    <span className="min-w-0 flex-1 truncate text-[12px] text-content-mid">
                      {desc}
                    </span>
                    {/* 키는 오른끝에 세로로 맞춘다 · 훑을 때 눈이 한 줄로 내려간다 */}
                    <kbd className="shrink-0 rounded-[4px] bg-surface-strong px-1.5 py-0.5 text-[10.5px] font-medium leading-[14px] tabular-nums text-content-mid">
                      {key}
                    </kbd>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </OverlayScroll>
    </div>
  );
}
