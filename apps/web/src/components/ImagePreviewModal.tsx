"use client";

import React from "react";

interface ImagePreviewModalProps {
  src: string | null;
  onClose: () => void;
}

export function ImagePreviewModal({ src, onClose }: ImagePreviewModalProps) {
  if (!src) {
    return null;
  }

  return (
    <div className="logoshow app-image-preview" style={{ display: "block" }} onClick={onClose}>
      <img className="app-image-preview-image" src={src} alt="preview" />
    </div>
  );
}
