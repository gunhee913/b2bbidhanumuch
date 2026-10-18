'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPinOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConsumerStore } from '../../types';

type KakaoMaps = any;

declare global {
  interface Window {
    kakao?: { maps: KakaoMaps };
  }
}

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? '';
const SDK_ID = 'kakao-map-sdk';
const SEOUL_CENTER = { lat: 37.5519, lng: 126.9918 };

let sdkPromise: Promise<KakaoMaps> | null = null;

/** 카카오맵 SDK 를 한 번만 넣는다 · 키가 없으면 바로 실패 */
function loadKakaoSdk(): Promise<KakaoMaps> {
  if (typeof window === 'undefined') return Promise.reject(new Error('ssr'));
  if (window.kakao?.maps?.Map) return Promise.resolve(window.kakao.maps);
  if (!KAKAO_KEY) return Promise.reject(new Error('missing-key'));
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    const ready = () => window.kakao!.maps.load(() => resolve(window.kakao!.maps));
    const existing = document.getElementById(SDK_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', ready);
      existing.addEventListener('error', () => reject(new Error('load-failed')));
      return;
    }
    const script = document.createElement('script');
    script.id = SDK_ID;
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false`;
    script.onload = ready;
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error('load-failed'));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

interface StoreMapProps {
  stores: ConsumerStore[];
  selectedId?: string | null;
  onSelect?: (store: ConsumerStore) => void;
  /** 매장 하나만 보여줄 때 확대 */
  zoomLevel?: number;
  className?: string;
}

type MapStatus = 'loading' | 'ready' | 'no-key' | 'error';

/**
 * 카카오맵 위에 매장 마커 · 고른 매장은 진한 마커로 바꾸고 그쪽으로 옮긴다.
 * 키가 없거나 로드가 실패하면 지도 자리에 안내만 남긴다 (매장 목록은 그대로 쓸 수 있게).
 */
export function StoreMap({ stores, selectedId = null, onSelect, zoomLevel, className }: StoreMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [status, setStatus] = useState<MapStatus>(KAKAO_KEY ? 'loading' : 'no-key');

  // 지도 생성 · 한 번만
  useEffect(() => {
    if (!KAKAO_KEY || !containerRef.current) return;
    let cancelled = false;
    loadKakaoSdk()
      .then((maps) => {
        if (cancelled || !containerRef.current) return;
        const first = stores[0];
        const center = new maps.LatLng(first?.lat ?? SEOUL_CENTER.lat, first?.lng ?? SEOUL_CENTER.lng);
        mapRef.current = new maps.Map(containerRef.current, { center, level: zoomLevel ?? 8 });
        setStatus('ready');
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setStatus(e.message === 'missing-key' ? 'no-key' : 'error');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 마커 동기화 · 매장 목록이 바뀔 때
  useEffect(() => {
    const maps = window.kakao?.maps;
    const map = mapRef.current;
    if (status !== 'ready' || !maps || !map) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current.clear();

    const bounds = new maps.LatLngBounds();
    stores.forEach((store) => {
      const pos = new maps.LatLng(store.lat, store.lng);
      const marker = new maps.Marker({ position: pos, map, title: store.name, clickable: true });
      maps.event.addListener(marker, 'click', () => onSelectRef.current?.(store));
      markersRef.current.set(store.id, marker);
      bounds.extend(pos);
    });

    if (stores.length > 1 && !selectedId) map.setBounds(bounds, 40);
    else if (stores.length === 1) {
      map.setCenter(new maps.LatLng(stores[0].lat, stores[0].lng));
      map.setLevel(zoomLevel ?? 4);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, stores]);

  // 선택 바뀌면 그쪽으로 · 선택 마커는 진하게(z-index)
  useEffect(() => {
    const maps = window.kakao?.maps;
    const map = mapRef.current;
    if (status !== 'ready' || !maps || !map || !selectedId) return;
    const store = stores.find((s) => s.id === selectedId);
    if (!store) return;
    markersRef.current.forEach((marker, id) => {
      marker.setZIndex(id === selectedId ? 10 : 1);
      marker.setOpacity(id === selectedId ? 1 : 0.55);
    });
    map.panTo(new maps.LatLng(store.lat, store.lng));
    if (map.getLevel() > 6) map.setLevel(6, { anchor: new maps.LatLng(store.lat, store.lng) });
  }, [status, selectedId, stores]);

  return (
    <div className={cn('relative overflow-hidden rounded-sm border border-line bg-surface-accent', className)}>
      <div ref={containerRef} className="absolute inset-0" />
      {status !== 'ready' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
          {status === 'loading' ? (
            <p className="text-[13px] text-content-soft">지도를 불러오는 중…</p>
          ) : (
            <>
              <MapPinOff className="h-6 w-6 text-content-faint" strokeWidth={1.8} />
              <p className="text-[13px] font-semibold text-content-mid">
                {status === 'no-key' ? '지도 키가 설정되지 않았어요' : '지도를 불러오지 못했어요'}
              </p>
              <p className="text-[12px] leading-snug text-content-faint">
                {status === 'no-key'
                  ? '.env.local 에 NEXT_PUBLIC_KAKAO_MAP_KEY 를 넣으면 카카오맵이 표시됩니다. 매장 목록과 예약은 그대로 쓸 수 있어요.'
                  : '잠시 후 다시 시도해 주세요. 매장 목록과 예약은 그대로 쓸 수 있어요.'}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** 카카오맵 길찾기 링크 · 앱/웹 모두 열린다 */
export const kakaoDirectionsUrl = (store: Pick<ConsumerStore, 'name' | 'lat' | 'lng'>) =>
  `https://map.kakao.com/link/to/${encodeURIComponent(store.name)},${store.lat},${store.lng}`;

export const kakaoMapUrl = (store: Pick<ConsumerStore, 'name' | 'lat' | 'lng'>) =>
  `https://map.kakao.com/link/map/${encodeURIComponent(store.name)},${store.lat},${store.lng}`;
