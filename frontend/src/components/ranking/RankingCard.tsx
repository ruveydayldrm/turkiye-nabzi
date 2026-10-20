"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CardTitle, GlassCard } from "@/components/ui/GlassCard";
import { formatScore } from "@/lib/format";
import type { RankedProvince } from "@/lib/selectors";
import { sentimentColor } from "@/lib/sentiment";

interface RankingCardProps {
  title: string;
  eyebrow: string;
  entries: RankedProvince[];
  onSelect: (plate: string) => void;
}

export function RankingCard({ title, eyebrow, entries, onSelect }: RankingCardProps) {
  return (
    <GlassCard className="flex flex-col gap-3 p-5">
      <CardTitle eyebrow={eyebrow} title={title} />
      <ol className="flex flex-col gap-1">
        <AnimatePresence initial={false} mode="popLayout">
          {entries.map((entry) => {
            const color = sentimentColor(entry.score);
            return (
              <motion.li
                key={entry.province.plate}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <button
                  onClick={() => onSelect(entry.province.plate)}
                  className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors duration-200 hover:bg-white/5"
                >
                  <span className="w-5 text-right text-xs tabular-nums text-subtle">{entry.rank}</span>
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
                  <span className="min-w-0 flex-1 truncate text-sm text-fg/90 group-hover:text-fg">{entry.province.name}</span>
                  <span className="relative h-1 w-14 overflow-hidden rounded-full bg-white/6">
                    <motion.span
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ background: color }}
                      animate={{ width: `${Math.abs(entry.score) * 100}%` }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </span>
                  <span className="w-9 text-right font-display text-sm font-medium tabular-nums" style={{ color }}>
                    {formatScore(entry.score)}
                  </span>
                </button>
              </motion.li>
            );
          })}
        </AnimatePresence>
        {entries.length === 0 && <li className="px-2 py-4 text-sm text-subtle">Bu filtrede yeterli veri yok.</li>}
      </ol>
    </GlassCard>
  );
}
