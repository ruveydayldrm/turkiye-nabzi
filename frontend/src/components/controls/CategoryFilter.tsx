"use client";

import clsx from "clsx";
import { motion } from "framer-motion";
import { CATEGORY_LABELS } from "@/lib/categories";
import { CATEGORY_IDS, type CategoryId } from "@/lib/types";

interface CategoryFilterProps {
  value: CategoryId;
  onChange: (category: CategoryId) => void;
}

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <div
      role="tablist"
      aria-label="Kategori"
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {CATEGORY_IDS.map((category) => {
        const active = category === value;
        return (
          <button
            key={category}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(category)}
            className={clsx(
              "relative shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-300",
              active ? "text-ink-950" : "text-muted hover:text-fg",
            )}
          >
            {active && (
              <motion.span
                layoutId="category-pill"
                className="absolute inset-0 rounded-full bg-fg shadow-[0_0_24px_rgb(233_235_245/0.25)]"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative">{CATEGORY_LABELS[category]}</span>
          </button>
        );
      })}
    </div>
  );
}
