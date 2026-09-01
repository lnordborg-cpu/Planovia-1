import React from "react";
import { getClassColor } from "@/lib/constants";

export const ClassDot = ({ colorId, size = 10 }) => {
  const c = getClassColor(colorId);
  if (!c) return null;
  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: c.bg, border: `1.5px solid ${c.text}` }}
      aria-hidden="true"
    />
  );
};
