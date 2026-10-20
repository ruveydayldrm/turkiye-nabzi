"use client";

import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { CompareView } from "@/components/detail/CompareView";
import { CategoryBreakdown } from "@/components/detail/CategoryBreakdown";
import { HeadlineList } from "@/components/detail/HeadlineList";
import { TrendChart } from "@/components/detail/TrendChart";
import { WordCloud } from "@/components/detail/WordCloud";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Skeleton } from "@/components/ui/GlassCard";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useProvinceDetail } from "@/hooks/useProvinceDetail";
import { CATEGORY_LABELS } from "@/lib/categories";
import { formatNumber } from "@/lib/format";
import { PROVINCES_BY_PLATE } from "@/lib/provinces";
import { REGION_LABELS } from "@/lib/regions";
import { categoryBreakdown, provinceTrend, provinceValue, rankProvinces } from "@/lib/selectors";
import { sentimentColor } from "@/lib/sentiment";
import type { CategoryId, Dataset } from "@/lib/types";

interface DetailPanelProps {
  dataset: Dataset;
  plate: string | null;
  compare: string[] | null;
  category: CategoryId;
  day: number;
  onClose: () => void;
  onStartCompare: () => void;
  onExitCompare: () => void;
}

export function DetailPanel(props: DetailPanelProps) {
  const { plate, compare, onClose } = props;
  const desktop = useMediaQuery("(min-width: 1024px)", true);
  const open = plate !== null || compare !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {!desktop && (
            <motion.div
              key="scrim"
              className="fixed inset-0 z-40 bg-ink-950/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
          )}
          <motion.aside
            key={desktop ? "drawer" : "sheet"}
            role="dialog"
            aria-modal={!desktop}
            aria-label="İl detayı"
            className={
              desktop
                ? "glass panel-surface fixed bottom-4 right-4 top-4 z-50 flex w-[440px] flex-col"
                : "glass panel-surface fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-b-none!"
            }
            initial={desktop ? { x: "110%" } : { y: "100%" }}
            animate={desktop ? { x: 0 } : { y: 0 }}
            exit={desktop ? { x: "110%" } : { y: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 32 }}
            drag={desktop ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            {!desktop && <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-white/20" />}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-4 sm:px-6">
              {compare ? <CompareContent {...props} plates={compare} /> : plate && <ProvinceContent {...props} plate={plate} />}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-line pt-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-subtle">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      aria-label="Kapat"
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 text-muted transition-colors hover:bg-white/5 hover:text-fg"
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
        <path d="m3.5 3.5 9 9m0-9-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </button>
  );
}

function ProvinceContent({ dataset, plate, category, day, onClose, onStartCompare }: DetailPanelProps & { plate: string }) {
  const province = PROVINCES_BY_PLATE.get(plate);
  const { detail, loading } = useProvinceDetail(plate);
  if (!province) return null;

  const value = provinceValue(dataset, plate, category, day);
  const ranking = rankProvinces(dataset, category, day);
  const rank = ranking.find((entry) => entry.province.plate === plate)?.rank;
  const color = value.sufficient ? sentimentColor(value.score) : "#5d6480";

  return (
    <motion.div
      key={plate}
      className="flex flex-col gap-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-subtle">
            <span className="rounded-md bg-white/6 px-1.5 py-0.5 font-mono text-muted">{plate}</span>
            <span>{REGION_LABELS[province.region]}</span>
          </div>
          <h2 className="mt-1.5 font-display text-3xl font-semibold tracking-tight">{province.name}</h2>
        </div>
        <CloseButton onClose={onClose} />
      </header>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <div className="text-[10px] uppercase tracking-[0.14em] text-subtle">Skor</div>
          {value.sufficient ? (
            <AnimatedNumber value={value.score * 100} signed className="font-display text-4xl font-semibold leading-tight" />
          ) : (
            <div className="font-display text-4xl font-semibold leading-tight text-subtle">—</div>
          )}
          <div className="mt-1 h-0.5 w-10 rounded-full" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-subtle">Haber · {dataset.windowDays} gün</div>
          <AnimatedNumber value={value.count} className="font-display text-2xl font-medium leading-tight" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-subtle">Sıra</div>
          <div className="font-display text-2xl font-medium leading-tight tabular-nums">
            {rank ? `${rank}` : "—"}
            <span className="text-sm text-subtle"> / {ranking.length}</span>
          </div>
        </div>
      </div>

      <button
        onClick={onStartCompare}
        className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-sm text-fg/90 transition-colors hover:bg-white/[0.07]"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
          <path d="M2 11h9m0 0-2.5-2.5M11 11l-2.5 2.5M14 5H5m0 0 2.5-2.5M5 5l2.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Başka bir ille karşılaştır
      </button>

      {(loading || detail?.highlights) && (
        <div className="relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/12 via-transparent to-positive/8 p-4">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
              <path d="M8 1.5 9.4 6.6 14.5 8l-5.1 1.4L8 14.5 6.6 9.4 1.5 8l5.1-1.4z" fill="currentColor" />
            </svg>
            Bugün öne çıkanlar
            <span className="ml-auto rounded-full bg-accent/15 px-2 py-0.5 text-[9px] tracking-[0.12em]">AI özeti</span>
          </div>
          {loading ? <Skeleton className="h-12 w-full" /> : <p className="text-sm leading-relaxed text-fg/85">{detail?.highlights}</p>}
        </div>
      )}

      <Section title="30 günlük trend" aside={<span className="text-[11px] text-subtle">{CATEGORY_LABELS[category]}</span>}>
        <TrendChart
          series={[{ key: "score", label: province.name, points: provinceTrend(dataset, plate, category) }]}
          activeDay={dataset.days[day]}
        />
      </Section>

      <Section title="Kategori dağılımı" aside={<span className="text-[11px] text-subtle">son {dataset.windowDays} gün</span>}>
        <CategoryBreakdown rows={categoryBreakdown(dataset, plate, day)} />
      </Section>

      <Section title="En sık geçen kelimeler">
        {loading ? <Skeleton className="h-24 w-full" /> : <WordCloud keywords={detail?.keywords ?? []} />}
      </Section>

      <Section title="Son haberler">
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <HeadlineList headlines={detail?.headlines ?? []} />
        )}
      </Section>

      <p className="text-center text-[11px] text-subtle">
        {formatNumber(dataset.national[category].n[day])} haber · Skorlar Türkiye ortalamasına göre görecelidir
      </p>
    </motion.div>
  );
}

function CompareContent({ dataset, plates, category, day, onClose, onExitCompare }: DetailPanelProps & { plates: string[] }) {
  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-subtle">Karşılaştırma modu</div>
          <h2 className="mt-1.5 font-display text-2xl font-semibold tracking-tight">İl karşılaştırma</h2>
        </div>
        <CloseButton onClose={onClose} />
      </header>
      <CompareView dataset={dataset} plates={plates} category={category} day={day} />
      <button onClick={onExitCompare} className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline">
        Karşılaştırmadan çık
      </button>
    </div>
  );
}
