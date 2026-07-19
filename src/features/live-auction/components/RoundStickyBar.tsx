"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useDealerPermission } from "../hooks/useDealerPermission";
import {
  SLAUGHTER_HOUSE_SLUGS,
  type SlaughterHouseSlug,
} from "@/constants/slaughterHouseSlugs";
import { cn } from "@/lib/utils";

export interface RoundStickyBarProps {
  activeSlug: SlaughterHouseSlug;
}

export function RoundStickyBar({ activeSlug }: RoundStickyBarProps) {
  return (
    <div className="sticky top-[64px] z-30 w-full border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-[48px] max-w-[1240px] items-stretch px-8">
        <SlaughterHouseTabs activeSlug={activeSlug} />
      </div>
    </div>
  );
}

function SlaughterHouseTabs({
  activeSlug,
}: {
  activeSlug: SlaughterHouseSlug;
}) {
  const permission = useDealerPermission();
  return (
    <nav className="flex items-stretch">
      <ul className="flex items-stretch">
        {SLAUGHTER_HOUSE_SLUGS.map(({ slug, short, name }) => {
          const isActive = slug === activeSlug;
          const isRestricted =
            permission.isAuthenticated &&
            permission.isDealer &&
            !permission.isSlaughterHouseAuthorized(slug);
          return (
            <li key={slug} className="flex items-stretch">
              <Link
                href={`/auction/live/${slug}`}
                title={
                  isRestricted ? `${name} · 권한이 없어 관전만 가능` : name
                }
                className={cn(
                  "relative inline-flex items-center gap-1.5 px-5 text-sm font-bold transition-colors",
                  isActive
                    ? "text-slate-900"
                    : "text-slate-400 hover:text-slate-700",
                )}
              >
                {isRestricted ? (
                  <Lock
                    className={cn(
                      "h-3 w-3",
                      isActive ? "text-slate-500" : "text-slate-300",
                    )}
                  />
                ) : null}
                <span>{short}</span>
                {isActive ? (
                  <span
                    className="absolute inset-x-3 bottom-0 h-[2px] bg-slate-900"
                    aria-hidden
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
