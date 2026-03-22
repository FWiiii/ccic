"use client";

import React, { type TouchEvent, useEffect, useMemo, useRef, useState } from "react";
import { normalizeImageUrls } from "../utils/normalizeImageUrls";

interface ProductCarouselProps {
  images?: string[];
  onPreview: (src: string) => void;
  isLoading?: boolean;
}

const AUTO_PLAY_INTERVAL_MS = 3500;
const SWIPE_THRESHOLD_PX = 40;

export function ProductCarousel({ images, onPreview, isLoading = false }: ProductCarouselProps) {
  const normalizedImages = useMemo(() => normalizeImageUrls(images), [images]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [loadedState, setLoadedState] = useState<Record<number, boolean>>({});
  const previousImagesRef = useRef<string[] | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchDeltaXRef = useRef(0);

  useEffect(() => {
    const previousImages = previousImagesRef.current;
    const hasChanged =
      !previousImages ||
      previousImages.length !== normalizedImages.length ||
      previousImages.some((item, index) => item !== normalizedImages[index]);

    if (hasChanged) {
      setActiveIndex(0);
      setLoadedState({});
      previousImagesRef.current = normalizedImages;
    }
  }, [normalizedImages]);

  useEffect(() => {
    if (normalizedImages.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % normalizedImages.length);
    }, AUTO_PLAY_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [normalizedImages.length]);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (normalizedImages.length <= 1) {
      return;
    }

    touchStartXRef.current = event.touches[0]?.clientX ?? null;
    touchDeltaXRef.current = 0;
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null) {
      return;
    }

    const currentX = event.touches[0]?.clientX;
    if (typeof currentX === "number") {
      touchDeltaXRef.current = currentX - touchStartXRef.current;
    }
  };

  const handleTouchEnd = () => {
    if (normalizedImages.length <= 1) {
      return;
    }

    const deltaX = touchDeltaXRef.current;
    if (deltaX <= -SWIPE_THRESHOLD_PX) {
      setActiveIndex((prev) => (prev + 1) % normalizedImages.length);
    } else if (deltaX >= SWIPE_THRESHOLD_PX) {
      setActiveIndex((prev) => (prev - 1 + normalizedImages.length) % normalizedImages.length);
    }

    touchStartXRef.current = null;
    touchDeltaXRef.current = 0;
  };

  const markImageLoaded = (index: number) => {
    setLoadedState((prev) => {
      if (prev[index]) {
        return prev;
      }

      return {
        ...prev,
        [index]: true,
      };
    });
  };

  return (
    <div className="indexBanner">
      <div id="slide" style={{ overflow: "hidden", textAlign: "center" }}>
        <div className="swiper mySwiper" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          <div
            className="swiper-wrapper"
            style={{
              transform: `translate3d(-${activeIndex * 100}%, 0, 0)`,
              transition: normalizedImages.length > 1 ? "transform 300ms ease" : "none",
            }}
          >
            {normalizedImages.length > 0 ? (
              normalizedImages.map((item, index) => (
                <div key={`${item}-${index}`} className="swiper-slide" style={{ height: "270px" }}>
                  <div className={`app-carousel-image-shell ${loadedState[index] ? "is-ready" : "is-loading"}`}>
                    <img
                      src={item}
                      style={{ height: "270px" }}
                      onClick={() => onPreview(item)}
                      onLoad={() => markImageLoaded(index)}
                      onError={() => markImageLoaded(index)}
                      className="app-carousel-image"
                      loading={index === 0 ? "eager" : "lazy"}
                      decoding="async"
                      alt=""
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="swiper-slide" style={{ height: "270px", display: "grid", placeItems: "center" }}>
                {isLoading ? (
                  <div className="app-carousel-image-shell is-loading app-carousel-image-shell--empty" aria-hidden="true"></div>
                ) : (
                  <span style={{ color: "#999", fontSize: "14px" }}>暂无轮播图</span>
                )}
              </div>
            )}
          </div>

          {normalizedImages.length > 1 ? (
            <div className="swiper-pagination">
              {normalizedImages.map((item, index) => (
                <span
                  key={`${item}-${index}`}
                  className={`swiper-pagination-bullet ${index === activeIndex ? "swiper-pagination-bullet-active" : ""}`}
                  onClick={() => setActiveIndex(index)}
                ></span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
