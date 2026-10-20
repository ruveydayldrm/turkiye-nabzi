"use client";

import clsx from "clsx";
import { motion } from "framer-motion";
import { formatDay } from "@/lib/format";
import { sentimentColor } from "@/lib/sentiment";
import type { NationalSeries } from "@/lib/types";

interface TimeSliderProps {
  days: string[];
  day: number;
  national: NationalSeries;
  playing: boolean;
  onChange: (day: number) => void;
  onTogglePlay: () => void;
}

function PlayIcon({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
      {playing ? (
        <g fill="currentColor">
          <rect x="5" y="4" width="3.5" height="12" rx="1" />
          <rect x="11.5" y="4" width="3.5" height="12" rx="1" />
        </g>
      ) : (
        <path d="M6.5 4.2v11.6a.8.8 0 0 0 1.2.7l9.4-5.8a.8.8 0 0 0 0-1.4L7.7 3.5a.8.8 0 0 0-1.2.7Z" fill="currentColor" />
      )}
    </svg>
  );
}

export function TimeSlider({ days, day, national, playing, onChange, onTogglePlay }: TimeSliderProps) {
  const maxCount = Math.max(...national.n);
  const observed = national.raw.filter((_, i) => national.n[i] > 0);
  const meanRaw = observed.length ? observed.reduce((acc, raw) => acc + raw, 0) / observed.length : 0;

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={onTogglePlay}
        aria-label={playing ? "Duraklat" : "Oynat"}
        className="group relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fg text-ink-950 shadow-[0_0_30px_rgb(233_235_245/0.2)] transition-transform duration-300 hover:scale-105 active:scale-95"
      >
        {playing && <span className="absolute inset-0 rounded-full border border-fg/50 [animation:live-ping_1.6s_ease-out_infinite]" />}
        <PlayIcon playing={playing} />
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-subtle tabular-nums">{formatDay(days[0])}</span>
          <motion.span
            key={days[day]}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-sm font-medium text-fg"
          >
            {formatDay(days[day], { day: "numeric", month: "long", weekday: "long" })}
            {day === days.length - 1 && <span className="ml-2 text-positive">· bugün</span>}
          </motion.span>
          <span className="text-subtle tabular-nums">{formatDay(days.at(-1)!)}</span>
        </div>

        <div className="relative h-12">
          <div className="absolute inset-0 flex items-end gap-[3px]">
            {days.map((date, i) => {
              const color = national.n[i] > 0 ? sentimentColor((national.raw[i] - meanRaw) / 0.08) : "rgb(255 255 255 / 0.08)";
              const active = i === day;
              return (
                <div key={date} className="relative flex h-full flex-1 items-end">
                  <div
                    className={clsx("w-full rounded-[3px] transition-all duration-500", i > day && "opacity-35")}
                    style={{
                      height: `${30 + (national.n[i] / maxCount) * 70}%`,
                      background: active ? color : `color-mix(in oklab, ${color} 55%, transparent)`,
                      boxShadow: active ? `0 0 16px ${color}` : undefined,
                    }}
                  />
                </div>
              );
            })}
          </div>
          <input
            type="range"
            min={0}
            max={days.length - 1}
            value={day}
            onChange={(event) => onChange(Number(event.target.value))}
            aria-label="Gün seçimi"
            aria-valuetext={formatDay(days[day], { day: "numeric", month: "long" })}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
      </div>
    </div>
  );
}
