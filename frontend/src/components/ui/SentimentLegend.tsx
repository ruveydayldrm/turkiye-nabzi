import clsx from "clsx";
import { sentimentGradient } from "@/lib/sentiment";

export function SentimentLegend({ minArticles, className }: { minArticles: number; className?: string }) {
  return (
    <div className={clsx("flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted", className)}>
      <div className="flex items-center gap-2.5">
        <span>Olumsuz</span>
        <span className="h-1.5 w-32 rounded-full sm:w-40" style={{ background: sentimentGradient() }} />
        <span>Olumlu</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="hatch h-3 w-5 rounded-[4px] border border-white/10" />
        <span>Yetersiz veri (&lt;{minArticles} haber)</span>
      </div>
    </div>
  );
}
