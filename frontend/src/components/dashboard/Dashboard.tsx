"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useReducer } from "react";
import { CategoryFilter } from "@/components/controls/CategoryFilter";
import { TimeSlider } from "@/components/controls/TimeSlider";
import { dashboardReducer, initialState } from "@/components/dashboard/state";
import { DetailPanel } from "@/components/detail/DetailPanel";
import { TopBar } from "@/components/layout/TopBar";
import { TurkeyMap } from "@/components/map/TurkeyMap";
import { RankingCard } from "@/components/ranking/RankingCard";
import { CardTitle, GlassCard, Skeleton } from "@/components/ui/GlassCard";
import { SentimentLegend } from "@/components/ui/SentimentLegend";
import { useDataset } from "@/hooks/useDataset";
import { useProvinceShapes } from "@/hooks/useProvinceShapes";
import { CATEGORY_LABELS } from "@/lib/categories";
import { isDemoMode } from "@/lib/data/source";
import { formatDay } from "@/lib/format";
import { nationalMood } from "@/lib/mood";
import { rankProvinces } from "@/lib/selectors";
import type { Dataset } from "@/lib/types";

const PLAYBACK_INTERVAL_MS = 650;

const reveal = {
  hidden: { opacity: 0, y: 16 },
  visible: (order: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const, delay: 0.08 * order },
  }),
};

export function Dashboard() {
  const state = useDataset();

  if (state.status === "ready") return <DashboardView dataset={state.dataset} />;

  return (
    <>
      <TopBar mood={null} moodLabel={null} updatedAt={null} isDemo={isDemoMode} />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 sm:px-6 lg:px-8">
        {state.status === "error" ? (
          <GlassCard className="flex flex-col gap-2 p-8">
            <CardTitle eyebrow="Bağlantı hatası" title="Veriler yüklenemedi" />
            <p className="max-w-xl text-sm text-muted">
              API&apos;ye ulaşılamadı. Backend&apos;i başlatın ya da <code className="text-fg">NEXT_PUBLIC_DEMO_MODE=true</code>{" "}
              ile demo modunda çalıştırın.
            </p>
            <p className="font-mono text-xs text-subtle">{state.error.message}</p>
          </GlassCard>
        ) : (
          <GlassCard className="p-5">
            <Skeleton className="aspect-[2.2/1] w-full rounded-[28px]" />
          </GlassCard>
        )}
      </main>
    </>
  );
}

function DashboardView({ dataset }: { dataset: Dataset }) {
  const [state, dispatch] = useReducer(dashboardReducer, dataset.days.length, initialState);
  const shapes = useProvinceShapes();
  const { day, category, selected, compare, playing } = state;

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => dispatch({ type: "tick" }), PLAYBACK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [playing]);

  const ranking = useMemo(() => rankProvinces(dataset, category, day), [dataset, category, day]);
  const select = useCallback((plate: string) => dispatch({ type: "select", plate }), []);
  const close = useCallback(() => dispatch({ type: "close" }), []);
  const isToday = day === state.lastDay;

  return (
    <>
      <TopBar
        mood={nationalMood(dataset, day)}
        moodLabel={isToday ? "Türkiye'nin bugünkü ruh hali" : `Türkiye'nin ruh hali · ${formatDay(dataset.days[day])}`}
        updatedAt={dataset.generatedAt}
        isDemo={dataset.isDemo}
      />

      <main className="mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-1 gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
        <motion.section custom={0} variants={reveal} initial="hidden" animate="visible" className="min-w-0">
          <GlassCard className="flex flex-col gap-4 p-4 sm:p-6">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <CardTitle
                eyebrow={`81 il · son ${dataset.windowDays} gün`}
                title={category === "all" ? "Duygu haritası" : `Duygu haritası · ${CATEGORY_LABELS[category]}`}
              />
              <CategoryFilter value={category} onChange={(next) => dispatch({ type: "setCategory", category: next })} />
            </div>

            <div className="relative flex min-h-[220px] items-center justify-center py-2 sm:py-6">
              <div className="pointer-events-none absolute inset-x-[10%] top-1/2 h-2/3 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(139_124_255/0.10),transparent)]" />
              {shapes ? (
                <TurkeyMap
                  shapes={shapes}
                  dataset={dataset}
                  category={category}
                  day={day}
                  selected={selected}
                  compare={compare}
                  onSelect={select}
                />
              ) : (
                <Skeleton className="aspect-[2.2/1] w-full rounded-[28px]" />
              )}
              {compare && (
                <div className="absolute left-1/2 top-0 -translate-x-1/2 rounded-full border border-[#f5b971]/30 bg-ink-900/80 px-3 py-1 text-xs text-[#f5b971] backdrop-blur">
                  Karşılaştırma modu · {compare.length}/2 il seçildi
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <SentimentLegend minArticles={dataset.minArticles} />
              <span className="hidden text-[11px] text-subtle sm:block">Detay için bir ile tıkla</span>
            </div>

            <div className="border-t border-line pt-5">
              <TimeSlider
                days={dataset.days}
                day={day}
                national={dataset.national[category]}
                playing={playing}
                onChange={(next) => dispatch({ type: "setDay", day: next })}
                onTogglePlay={() => dispatch({ type: "togglePlay" })}
              />
            </div>
          </GlassCard>
        </motion.section>

        <aside className="flex flex-col gap-5">
          <motion.div custom={1} variants={reveal} initial="hidden" animate="visible">
            <RankingCard eyebrow="Sıralama" title="En olumlu 5 il" entries={ranking.slice(0, 5)} onSelect={select} />
          </motion.div>
          <motion.div custom={2} variants={reveal} initial="hidden" animate="visible">
            <RankingCard eyebrow="Sıralama" title="En olumsuz 5 il" entries={ranking.slice(-5).reverse()} onSelect={select} />
          </motion.div>
        </aside>
      </main>

      <footer className="mx-auto w-full max-w-[1600px] px-4 pb-6 text-[11px] text-subtle sm:px-6 lg:px-8">
        Skorlar, ilin haber tonunun Türkiye ortalamasından ne kadar saptığını gösterir (−100 … +100).
        {dataset.isDemo && " Bu sayfa demo modunda, sentetik verilerle çalışıyor."}
      </footer>

      <DetailPanel
        dataset={dataset}
        plate={selected}
        compare={compare}
        category={category}
        day={day}
        onClose={close}
        onStartCompare={() => dispatch({ type: "startCompare" })}
        onExitCompare={() => dispatch({ type: "exitCompare" })}
      />
    </>
  );
}
