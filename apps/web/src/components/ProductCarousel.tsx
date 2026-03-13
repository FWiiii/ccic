import bannerImage from "../assets/static/upload/image/20260130/1769762711981592.jpg";

interface ProductCarouselProps {
  onPreview: (src: string) => void;
}

export function ProductCarousel({ onPreview }: ProductCarouselProps) {
  return (
    <div className="indexBanner">
      <div id="slide" style={{ overflow: "hidden", textAlign: "center" }}>
        <div className="swiper mySwiper">
          <div className="swiper-wrapper">
            <div className="swiper-slide" style={{ height: "270px" }}>
              <img
                src={bannerImage}
                style={{ height: "270px" }}
                onClick={() => onPreview(bannerImage)}
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
