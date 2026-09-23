import type { Category } from "./types";

export const CATEGORY_INFO: Record<Category, { label: string; color: string; icsColor: string }> = {
  social: { label: "Social", color: "#2563eb", icsColor: "blue" },
  class: { label: "Class", color: "#16a34a", icsColor: "green" },
  other: { label: "Other", color: "#ea580c", icsColor: "orange" },
};
