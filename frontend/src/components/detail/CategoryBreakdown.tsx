"use client";

import { motion } from "framer-motion";
import { CATEGORY_LABELS } from "@/lib/categories";
import { formatNumber } from "@/lib/format";
import type { CategoryShare } from "@/lib/selectors";
import { sentimentColor } from "@/lib/sentiment";

export function CategoryBreakdown({ rows }: { rows: CategoryShare[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((row, i) => (
        <li key={row.category} className="grid grid-cols-[92px_1fr_36px] items-center gap-3 text-xs">
          <span className="truncate text-muted">{CATEGORY_LABELS[row.category]}</span>
          <span className="relative h-2 overflow-hidden rounded-full bg-white/5">
            <motion.span
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: sentimentColor(row.score) }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(row.share * 100, row.count > 0 ? 2 : 0)}%` }}
              transition={{ duration: 0.8, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
            />
          </span>
          <span className="text-right tabular-nums text-fg/80">{formatNumber(row.count)}</span>
        </li>
      ))}
    </ul>
  );
}
