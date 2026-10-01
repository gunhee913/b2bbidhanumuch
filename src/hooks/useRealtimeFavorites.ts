"use client";

import { useRealtimeTable } from "./useRealtimeTable";

interface UseRealtimeFavoritesOptions {
  onFavChange?: () => void;
  enabled?: boolean;
}

export function useRealtimeFavorites({
  onFavChange,
  enabled = true,
}: UseRealtimeFavoritesOptions) {
  useRealtimeTable({
    table: "dealer_favorites",
    onChange: onFavChange,
    enabled,
  });
}
