import { MoodIndicator } from "@/components/layout/MoodIndicator";
import { GlassCard, Skeleton } from "@/components/ui/GlassCard";
import { Logo } from "@/components/ui/Logo";
import { formatDateTime } from "@/lib/format";
import type { NationalMood } from "@/lib/mood";

interface TopBarProps {
  mood: NationalMood | null;
  moodLabel: string | null;
  updatedAt: string | null;
  isDemo: boolean;
}

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full rounded-full bg-positive [animation:live-ping_2.4s_cubic-bezier(0,0,0.2,1)_infinite]" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-positive" />
    </span>
  );
}

export function TopBar({ mood, moodLabel, updatedAt, isDemo }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6 lg:px-8">
      <GlassCard className="mx-auto grid max-w-[1600px] grid-cols-[1fr_auto] items-center gap-x-6 gap-y-4 px-5 py-4 md:grid-cols-[1fr_auto_1fr]">
        <Logo />

        <div className="col-span-2 row-start-2 border-t border-line pt-4 md:col-span-1 md:col-start-2 md:row-start-1 md:border-0 md:pt-0">
          {mood ? <MoodIndicator mood={mood} label={moodLabel ?? ""} /> : <Skeleton className="h-14 w-64" />}
        </div>

        <div className="flex flex-col items-end gap-1.5 justify-self-end text-right">
          {isDemo && (
            <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
              Demo veri
            </span>
          )}
          <div className="flex items-center gap-2 text-xs text-muted">
            <LiveDot />
            <span className="hidden sm:inline">Son güncelleme</span>
            <span className="tabular-nums text-fg/80">{updatedAt ? formatDateTime(updatedAt) : "—"}</span>
          </div>
        </div>
      </GlassCard>
    </header>
  );
}
