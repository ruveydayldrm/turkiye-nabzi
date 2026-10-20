"use client";

import { motion } from "framer-motion";
import type { Keyword } from "@/lib/types";

const TINTS = ["#e9ebf5", "#b9b3ff", "#8fe8d2", "#c4c8d8", "#f5b971"];

/** Spreads heavy words across the cloud instead of clustering them at the start. */
function interleave(words: Keyword[]): Keyword[] {
  const sorted = [...words].sort((a, b) => b.weight - a.weight);
  const result: Keyword[] = [];
  sorted.forEach((word, i) => (i % 2 === 0 ? result.push(word) : result.unshift(word)));
  return result;
}

export function WordCloud({ keywords }: { keywords: Keyword[] }) {
  if (keywords.length === 0) return <p className="text-sm text-subtle">Henüz yeterli kelime yok.</p>;
  const max = Math.max(...keywords.map((k) => k.weight));
  const min = Math.min(...keywords.map((k) => k.weight));

  return (
    <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1.5 py-1">
      {interleave(keywords).map((keyword, i) => {
        const t = max === min ? 0.5 : Math.sqrt((keyword.weight - min) / (max - min));
        return (
          <motion.span
            key={keyword.text}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.45 + t * 0.55, scale: 1 }}
            transition={{ delay: i * 0.025, duration: 0.4 }}
            className="font-display leading-none tracking-tight"
            style={{ fontSize: `${12 + t * 16}px`, fontWeight: t > 0.6 ? 600 : 500, color: TINTS[i % TINTS.length] }}
          >
            {keyword.text}
          </motion.span>
        );
      })}
    </div>
  );
}
