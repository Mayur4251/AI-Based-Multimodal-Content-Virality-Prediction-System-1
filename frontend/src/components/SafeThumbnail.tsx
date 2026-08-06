import React, { useState } from "react";

interface SafeThumbnailProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackIconClassName?: string;
}

const FALLBACK_STOCK_IMAGES = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=400&q=80"
];

export function getFallbackImage(seed: string = "default"): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % FALLBACK_STOCK_IMAGES.length;
  return FALLBACK_STOCK_IMAGES[index];
}

export function SafeThumbnail({
  src,
  alt = "",
  className = "w-10 h-10 rounded-md object-cover border border-zinc-700/80 bg-zinc-950"
}: SafeThumbnailProps) {
  const [hasError, setHasError] = useState(false);
  const [secondError, setSecondError] = useState(false);

  // Validate image URL string
  const isString = typeof src === "string" && src.trim().length > 0;
  const isCorrupted = isString && (src.includes("[base64_payload]") || src.includes("[Image"));
  const isValidProtocol =
    isString &&
    !isCorrupted &&
    (src.startsWith("http://") ||
      src.startsWith("https://") ||
      src.startsWith("data:image/") ||
      src.startsWith("blob:"));

  const fallbackUrl = getFallbackImage(src || alt || "default");

  if (!isValidProtocol || hasError) {
    return (
      <img
        src={secondError ? FALLBACK_STOCK_IMAGES[0] : fallbackUrl}
        alt={alt || "Visual Asset"}
        crossOrigin="anonymous"
        onError={() => setSecondError(true)}
        className={className}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt || "Visual Asset"}
      crossOrigin="anonymous"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}

// Helper utility to compress images into compact data URLs (< 15KB)
export function createCompactThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        } else {
          resolve(e.target?.result as string || "");
        }
      };
      img.onerror = () => {
        resolve(e.target?.result as string || "");
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
