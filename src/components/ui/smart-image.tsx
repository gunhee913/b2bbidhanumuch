'use client';

import { useState } from 'react';
import Image from 'next/image';

interface SmartImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean;
  fallbackSrc?: string;
  onClick?: () => void;
}

/**
 * Base64와 URL 이미지를 모두 지원하는 이미지 컴포넌트
 * - Base64: 일반 img 태그 사용
 * - URL: Next.js Image 컴포넌트 사용 (최적화)
 */
export function SmartImage({
  src,
  alt,
  width,
  height,
  fill,
  className,
  priority,
  fallbackSrc = 'https://picsum.photos/400/300',
  onClick,
}: SmartImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const isBase64 = src?.startsWith('data:');
  const isUrl = src?.startsWith('http');
  const imageSrc = error ? fallbackSrc : src;

  // Base64 이미지는 일반 img 태그 사용
  if (isBase64) {
    return (
      <img
        src={imageSrc}
        alt={alt}
        className={className}
        onClick={onClick}
        onError={() => setError(true)}
        style={fill ? { objectFit: 'cover', width: '100%', height: '100%' } : { width, height }}
      />
    );
  }

  // URL 이미지는 Next.js Image 사용 (최적화)
  if (isUrl) {
    if (fill) {
      return (
        <Image
          src={imageSrc}
          alt={alt}
          fill
          className={className}
          priority={priority}
          onClick={onClick}
          onError={() => setError(true)}
          onLoad={() => setLoaded(true)}
          sizes="(max-width: 768px) 100vw, 50vw"
          style={{ objectFit: 'cover' }}
        />
      );
    }

    return (
      <Image
        src={imageSrc}
        alt={alt}
        width={width || 400}
        height={height || 300}
        className={className}
        priority={priority}
        onClick={onClick}
        onError={() => setError(true)}
        onLoad={() => setLoaded(true)}
      />
    );
  }

  // 기타 (빈 문자열 등)
  return (
    <img
      src={fallbackSrc}
      alt={alt}
      className={className}
      onClick={onClick}
      style={fill ? { objectFit: 'cover', width: '100%', height: '100%' } : { width, height }}
    />
  );
}
