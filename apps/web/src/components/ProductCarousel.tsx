import { useEffect, useMemo, useRef, useState } from "react";
import bannerImage from "../assets/static/upload/image/20260130/1769762711981592.jpg";
import { normalizeImageUrls } from "../utils/normalizeImageUrls";

interface ProductCarouselProps {
  images?: string[];
  onPreview: (src: string) => void;
}

export function ProductCarousel({ images, onPreview }: ProductCarouselProps) {
  const normalizedImages = useMemo(() => {
    const list = normalizeImageUrls(images);
    return list.length > 0 ? list : [bannerImage];
  }, [images]);

  const [activeIndex, setActiveIndex] = useState(0);
  const previousImagesRef = useRef<string[] | null>(null);

  useEffect(() => {
    const previousImages = previousImagesRef.current;
    const hasChanged =
      !previousImages ||
      previousImages.length !== normalizedImages.length ||
      previousImages.some((item, index) => item !== normalizedImages[index]);

    if (hasChanged) {
      setActiveIndex(0);
      previousImagesRef.current = normalizedImages;
    }
  }, [normalizedImages]);

  const currentImage = normalizedImages[Math.min(activeIndex, normalizedImages.length - 1)] ?? bannerImage;

  return (
    <div className="indexBanner">
      <div id="slide" style={{ overflow: "hidden", textAlign: "center" }}>
        <div className="swiper mySwiper">
          <div className="swiper-wrapper">
            <div className="swiper-slide" style={{ height: "270px" }}>
              <img
                src={currentImage}
                style={{ height: "270px" }}
                onClick={() => onPreview(currentImage)}
                alt=""
              />
            </div>
          </div>

          <div className="swiper-pagination">
            {normalizedImages.map((item, index) => (
              <span
                key={`${item}-${index}`}
                className={`swiper-pagination-bullet ${index === activeIndex ? "swiper-pagination-bullet-active" : ""}`}
                onClick={() => setActiveIndex(index)}
              ></span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
