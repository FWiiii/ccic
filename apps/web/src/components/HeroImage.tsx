import topBanner from "../assets/template/mu/static/picture/1697685869607904.jpg";

interface HeroImageProps {
  src?: string;
}

export function HeroImage({ src }: HeroImageProps) {
  const imageSrc = src || topBanner;

  return (
    <div style={{ width: "100%" }}>
      <img src={imageSrc} style={{ width: "95%", marginLeft: "2%" }} alt="" />
    </div>
  );
}
