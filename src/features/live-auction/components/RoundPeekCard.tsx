"use client";

import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { RoundCountdownDial, type RoundPhase } from "./RoundCountdownDial";

export interface RoundPeekCardProps {
  phase: RoundPhase;
  open: boolean;
  /** 카드 위에 마우스가 올라가 있는 동안은 저절로 닫히지 않게 */
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  /** 눌러서 사이드 메뉴를 펼친다 */
  onClick: () => void;
}

/**
 * 접힌 레일에서 잠깐 튀어나오는 경매 시간 카드.
 *
 * 패널과 같은 링을 그대로 쓴다 — 접었을 때 보는 시계와 펼쳤을 때 보는 시계가 다르면
 * 남은 시간을 두 번 읽게 된다. 레일 왼쪽에 떠서 본문을 밀지 않고 잠시 덮기만 한다.
 */
export function RoundPeekCard({
  phase,
  open,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: RoundPeekCardProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="status"
          aria-label="경매 시간"
          /* 레일 왼쪽에 붙는다 · 자리 기준은 화면이 아니라 도크 틀(`PAGE_SHELL_CLASS`) */
          className="pointer-events-auto absolute right-[60px] top-2 z-20"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <button
            type="button"
            onClick={onClick}
            className={cn(
              "flex w-[172px] flex-col items-center gap-2 rounded-xl border border-line bg-surface px-4 py-4",
              "shadow-[0_12px_32px_-8px_rgb(0_0_0/0.22),0_2px_8px_-4px_rgb(0_0_0/0.12)]",
              "transition-colors hover:bg-surface-muted",
            )}
          >
            <span className="text-[10.5px] font-bold tracking-tight text-content-faint">
              경매 시간
            </span>
            <RoundCountdownDial phase={phase} size={96} />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
