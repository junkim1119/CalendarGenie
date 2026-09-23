"use client";

import { CATEGORY_INFO } from "@/lib/colors";
import { CATEGORIES, type Category } from "@/lib/types";

export default function Legend({ hidden, onToggle }: { hidden: Category[]; onToggle: (c: Category) => void }) {
  return (
    <div className="legend">
      {CATEGORIES.map((c) => (
        <button
          key={c}
          type="button"
          className={`chip ${hidden.includes(c) ? "off" : ""}`}
          onClick={() => onToggle(c)}
          title={hidden.includes(c) ? "Show" : "Hide"}
        >
          <span className="dot" style={{ background: CATEGORY_INFO[c].color }} />
          {CATEGORY_INFO[c].label}
        </button>
      ))}
    </div>
  );
}
