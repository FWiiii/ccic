import type { MediaAsset } from "@ccic/shared-types";
import bannerImage from "../assets/static/upload/image/20260130/1769762711981592.jpg";

interface ProductCarouselProps {
  images?: MediaAsset[];
  onPreview: (src: string) => void;
}

export function ProductCarousel({ images, onPreview }: ProductCarouselProps) {
  const firstImage = images?.[0]?.url || bannerImage;

  return (
    <div className="indexBanner">
      <div id="slide" style={{ overflow: "hidden", textAlign: "center" }}>
        <div className="swiper mySwiper">
          <div className="swiper-wrapper">
            <div className="swiper-slide" style={{ height: "270px" }}>
              <img
                src={firstImage}
                style={{ height: "270px" }}
                onClick={() => onPreview(firstImage)}
                alt=""
              />
            </div>
          </div>

          <div className="swiper-pagination">
            <span className="swiper-pagination-bullet swiper-pagination-bullet-active"></span>
          </div>
        </div>
      </div>
    </div>
  );
}
