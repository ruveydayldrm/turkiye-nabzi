import { moodIndex } from "./sentiment";
import type { CategoryId, Dataset } from "./types";

export interface NationalMood {
  index: number;
  /** Day-over-day change of the mood index, in percent. */
  change: number;
  articles: number;
}

export function nationalMood(dataset: Dataset, dayIndex = dataset.days.length - 1, category: CategoryId = "all"): NationalMood {
  const series = dataset.national[category];
  const index = moodIndex(series.raw[dayIndex]);
  const previous = dayIndex > 0 ? moodIndex(series.raw[dayIndex - 1]) : index;
  return {
    index,
    change: previous > 0 ? ((index - previous) / previous) * 100 : 0,
    articles: series.n[dayIndex],
  };
}
