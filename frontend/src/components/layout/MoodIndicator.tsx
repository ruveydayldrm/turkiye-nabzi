"use client";

import clsx from "clsx";
import { motion } from "framer-motion";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { formatNumber, formatPercentChange } from "@/lib/format";
import type { NationalMood } from "@/lib/mood";
import { moodToScore, sentimentColor } from "@/lib/sentiment";

function MoodGauge({ score }: { score: number }) {
  const angle = ((score + 1) / 2) * 180;
  const color = sentimentColor(score);
  return (
    <svg viewBox="0 0 56 32" className="h-8 w-14 shrink-0" aria-hidden>
      <defs>
        <linearGradient id="mood-arc" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={sentimentColor(-1)} />
          <stop offset="50%" stopColor={sentimentColor(0)} />
          <stop offset="100%" stopColor={sentimentColor(1)} />
        </linearGradient>
      </defs>
      <path d="M6 28 A22 22 0 0 1 50 28" fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="4" strokeLinecap="round" />
      <path d="M6 28 A22 22 0 0 1 50 28" fill="none" stroke="url(#mood-arc)" strokeOpacity="0.85" strokeWidth="2" strokeLinecap="round" />
      <motion.g
        initial={{ rotate: 0 }}
        animate={{ rotate: angle }}
        transition={{ type: "spring", stiffness: 60, damping: 14, delay: 0.2 }}
        style={{ transformBox: "view-box", originX: 0.5, originY: 0.875 }}
      >
        <line x1="28" y1="28" x2="11" y2="28" stroke="rgb(233 235 245 / 0.55)" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="6" cy="28" r="3.6" fill={color} stroke="#05070f" strokeWidth="1.5" />
      </motion.g>
      <circle cx="28" cy="28" r="2" fill="rgb(233 235 245 / 0.7)" />
    </svg>
  );
}

function ChangeBadge({ change }: { change: number }) {
  const rounded = Math.round(change * 10) / 10;
  const tone = rounded > 0 ? "positive" : rounded < 0 ? "negative" : "neutral";
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
        tone === "positive" && "bg-positive/10 text-positive",
        tone === "negative" && "bg-negative/10 text-negative",
        tone === "neutral" && "bg-white/5 text-muted",
      )}
    >
      {tone !== "neutral" && (
        <svg viewBox="0 0 10 10" className={clsx("h-2.5 w-2.5", tone === "negative" && "rotate-180")} aria-hidden>
          <path d="M5 1.5 9 7.5H1z" fill="currentColor" />
        </svg>
      )}
      {formatPercentChange(rounded)}
    </span>
  );
}

export function MoodIndicator({ mood, label }: { mood: NationalMood; label: string }) {
  const score = moodToScore(mood.index);
  return (
    <div className="flex items-center gap-4">
      <MoodGauge score={score} />
      <div className="flex flex-col">
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-subtle">{label}</span>
        <div className="flex items-baseline gap-2.5">
          <AnimatedNumber
            value={mood.index}
            fractionDigits={1}
            className="font-display text-3xl font-semibold leading-none tracking-tight"
          />
          <span className="text-xs text-subtle">/ 100</span>
          <ChangeBadge change={mood.change} />
        </div>
        <span className="mt-1 text-[11px] text-subtle">
          önceki güne göre · {formatNumber(mood.articles)} haber
        </span>
      </div>
    </div>
  );
}
