import React from "react";

export type GradePreset =
  | "cinematic"
  | "anime"
  | "minimal"
  | "corporate"
  | "energetic"
  | "emotional"
  | "none";

const GRADES: Record<GradePreset, React.CSSProperties> = {
  none: {},
  cinematic: { filter: "contrast(1.1) saturate(0.85) brightness(0.95) sepia(0.08)" },
  anime:     { filter: "contrast(1.15) saturate(1.6) brightness(1.02) hue-rotate(5deg)" },
  minimal:   { filter: "contrast(1.05) saturate(0.6) brightness(1.03)" },
  corporate: { filter: "contrast(1.08) saturate(0.9) brightness(1.01)" },
  energetic: { filter: "contrast(1.25) saturate(1.5) brightness(1.05)" },
  emotional: { filter: "contrast(1.05) saturate(0.75) brightness(0.92)" },
};

interface ColorGradeProps {
  grade: GradePreset;
  children: React.ReactNode;
}

export const ColorGrade: React.FC<ColorGradeProps> = ({ grade, children }) => (
  <div style={{ width: "100%", height: "100%", position: "relative", ...GRADES[grade] }}>
    {children}
  </div>
);
