import { CATEGORY_LABELS } from "@/lib/categories";
import { formatDateTime } from "@/lib/format";
import { sentimentColor } from "@/lib/sentiment";
import type { Headline } from "@/lib/types";

export function HeadlineList({ headlines }: { headlines: Headline[] }) {
  if (headlines.length === 0) return <p className="text-sm text-subtle">Son 24 saatte haber bulunamadı.</p>;
  return (
    <ul className="flex flex-col divide-y divide-white/5">
      {headlines.map((headline) => (
        <li key={headline.url}>
          <a
            href={headline.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex gap-3 py-3 transition-colors duration-200"
          >
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{ background: sentimentColor(headline.sentiment) }}
              title={`Duygu: ${Math.round(headline.sentiment * 100)}`}
            />
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-sm leading-snug text-fg/90 group-hover:text-fg group-hover:underline group-hover:decoration-white/30 group-hover:underline-offset-4">
                {headline.title}
              </span>
              <span className="text-[11px] text-subtle">
                {headline.source} · {CATEGORY_LABELS[headline.category]} · {formatDateTime(headline.publishedAt)}
              </span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
