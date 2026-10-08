"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { GradeListingTable } from "./GradeListingTable";

export interface GradeBriefPeekCardProps {
  /** yyyy-MM-dd · 오늘 경매일 */
  date: string;
  open: boolean;
  onClose: () => void;
}

/**
 * 오늘의 상장 · 경매장에 들어오면 레일에서 한 번 튀어나오는 등급 매트릭스.
 *
 * 상장표는 개체를 한 줄씩 세우므로 "오늘 1++ 가 몇 두인지" 는 끝까지 훑어야 겨우 잡힌다.
 * 나갈지 말지는 그 숫자로 갈리는 일이라 표를 읽기 전에 한 장으로 먼저 보여준다.
 *
 * 창을 띄우지 않고 레일 옆에 뜬다 — 본문을 가리는 판을 세우면 닫아야 할 일이 되고,
 * 경매장에 들어온 첫 동작이 "닫기" 가 되는 건 좋지 않다. 같은 표가 일정 탭에 늘 있으므로
 * 닫은 뒤에도 보러 갈 곳은 남아 있다.
 */
export function GradeBriefPeekCard({
  date,
  open,
  onClose,
}: GradeBriefPeekCardProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="status"
          aria-label="오늘의 상장"
          /* 레일 왼쪽에 붙는다 · 자리 기준은 화면이 아니라 도크 틀(`PAGE_SHELL_CLASS`) */
          className="pointer-events-auto absolute right-[60px] top-[104px] z-20 w-[268px]"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <div className="relative rounded-xl border border-line bg-surface shadow-[0_12px_32px_-8px_rgb(0_0_0/0.22),0_2px_8px_-4px_rgb(0_0_0/0.12)]">
            <button
              type="button"
              onClick={onClose}
              aria-label="오늘의 상장 닫기"
              className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-content-soft transition-colors hover:bg-surface-accent hover:text-content"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            {/* 위쪽 여백은 닫기 버튼 자리 · 표 머리글이 X 밑으로 내려앉게 한다 */}
            <GradeListingTable date={date} className="pb-3 pt-9" />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
