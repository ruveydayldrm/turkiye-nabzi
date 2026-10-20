"use client";

import { motion } from "framer-motion";
import { formatNumber, formatScore } from "@/lib/format";
import type { ProvinceValue } from "@/lib/selectors";
import { sentimentColor, sentimentGradient } from "@/lib/sentiment";

interface MapTooltipProps {
  name: string;
  plate: string;
  value: ProvinceValue | undefined;
  x: number;
  y: number;
  containerWidth: number;
  minArticles: number;
}

const TOOLTIP_WIDTH = 220;

export function MapTooltip({ name, plate, value, x, y, containerWidth, minArticles }: MapTooltipProps) {
  const flip = x + TOOLTIP_WIDTH + 24 > containerWidth;
  const left = flip ? x - TOOLTIP_WIDTH - 16 : x + 18;
  const sufficient = value?.sufficient ?? false;
  const score = value?.score ?? 0;

  return (
    <motion.div
      className="pointer-events-none absolute z-20"
      style={{ width: TOOLTIP_WIDTH }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1, left, top: y - 12 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ opacity: { duration: 0.15 }, scale: { duration: 0.15 }, left: { duration: 0.08 }, top: { duration: 0.08 } }}
    >
      <div className="rounded-2xl border border-white/12 bg-ink-900/85 p-3.5 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.8)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2">
          <span className="font-display text-[15px] font-semibold tracking-tight text-fg">{name}</span>
          <span className="rounded-md bg-white/6 px-1.5 py-0.5 font-mono text-[10px] text-muted">{plate}</span>
        </div>
        {sufficient ? (
          <>
            <div className="mt-2.5 flex items-end justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-subtle">Duygu skoru</div>
                <div className="font-display text-2xl font-semibold tabular-nums leading-tight" style={{ color: sentimentColor(score) }}>
                  {formatScore(score)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.14em] text-subtle">Haber</div>
                <div className="text-sm font-medium tabular-nums text-fg">{formatNumber(value?.count ?? 0)}</div>
              </div>
            </div>
            <div className="relative mt-3 h-1 rounded-full" style={{ background: sentimentGradient() }}>
              <span
                className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink-950 bg-white"
                style={{ left: `${((score + 1) / 2) * 100}%` }}
              />
            </div>
          </>
        ) : (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted">
            <span className="hatch h-3 w-4 rounded-[3px] border border-white/10" />
            Yetersiz veri · {formatNumber(value?.count ?? 0)} / {minArticles} haber
          </div>
        )}
      </div>
    </motion.div>
  );
}
