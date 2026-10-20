"use client";

import { motion } from "framer-motion";
import { TrendChart } from "@/components/detail/TrendChart";
import { CATEGORY_LABELS } from "@/lib/categories";
import { formatNumber, formatScore } from "@/lib/format";
import { provinceName } from "@/lib/provinces";
import { provinceTrend, provinceValue } from "@/lib/selectors";
import type { CategoryId, Dataset } from "@/lib/types";

export const COMPARE_COLORS = ["#ffffff", "#f5b971"] as const;

interface CompareViewProps {
  dataset: Dataset;
  plates: string[];
  category: CategoryId;
  day: number;
}

export function CompareView({ dataset, plates, category, day }: CompareViewProps) {
  if (plates.length < 2) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 p-5 text-sm leading-relaxed text-muted">
        {plates[0] ? (
          <>
            <span className="font-medium text-fg">{provinceName(plates[0])}</span> seçildi. Karşılaştırmak için haritadan ikinci
            bir il seç.
          </>
        ) : (
          "Karşılaştırmak için haritadan iki il seç."
        )}
      </div>
    );
  }

  const values = plates.map((plate) => provinceValue(dataset, plate, category, day));
  const diff = values[0].sufficient && values[1].sufficient ? values[0].score - values[1].score : null;

  return (
    <motion.div className="flex flex-col gap-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="grid grid-cols-2 gap-3">
        {plates.map((plate, i) => (
          <div key={plate} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: COMPARE_COLORS[i] }} />
              {provinceName(plate)}
            </div>
            <div className="mt-2 font-display text-3xl font-semibold tabular-nums">
              {values[i].sufficient ? formatScore(values[i].score) : "—"}
            </div>
            <div className="text-[11px] text-subtle">{formatNumber(values[i].count)} haber</div>
          </div>
        ))}
      </div>

      {diff !== null && (
        <p className="text-sm text-muted">
          {CATEGORY_LABELS[category]} haberlerinde <span className="text-fg">{provinceName(diff >= 0 ? plates[0] : plates[1])}</span>,{" "}
          <span className="text-fg">{provinceName(diff >= 0 ? plates[1] : plates[0])}</span> iline göre{" "}
          <span className="font-medium text-fg tabular-nums">{Math.abs(Math.round(diff * 100))} puan</span> daha olumlu.
        </p>
      )}

      <TrendChart
        height={220}
        activeDay={dataset.days[day]}
        series={plates.map((plate, i) => ({
          key: `p${plate}`,
          label: provinceName(plate),
          color: COMPARE_COLORS[i],
          points: provinceTrend(dataset, plate, category),
        }))}
      />
    </motion.div>
  );
}
