import React from "react";
import topBanner from "../assets/template/mu/static/picture/1697685869607904.jpg";

export function HeroImage() {
  return (
    <div style={{ width: "100%" }}>
      <img src={topBanner.src} style={{ width: "95%", marginLeft: "2%" }} alt="" />
    </div>
  );
}
