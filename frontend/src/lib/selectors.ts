import { PROVINCES } from "./provinces";
import type { CategoryId, Dataset, NewsCategoryId, Province } from "./types";
import { CATEGORY_IDS } from "./types";

export interface ProvinceValue {
  score: number;
  count: number;
  sufficient: boolean;
}

export function provinceValue(dataset: Dataset, plate: string, category: CategoryId, day: number): ProvinceValue {
  const series = dataset.provinces[plate]?.[category];
  if (!series) return { score: 0, count: 0, sufficient: false };
  const count = series.n[day] ?? 0;
  return { score: series.s[day] ?? 0, count, sufficient: count >= dataset.minArticles };
}

export interface RankedProvince extends ProvinceValue {
  province: Province;
  rank: number;
}

/** Provinces with enough data, most positive first. */
export function rankProvinces(dataset: Dataset, category: CategoryId, day: number): RankedProvince[] {
  return PROVINCES.map((province) => ({ province, ...provinceValue(dataset, province.plate, category, day) }))
    .filter((entry) => entry.sufficient)
    .sort((a, b) => b.score - a.score)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

export interface TrendPoint {
  day: string;
  score: number | null;
  count: number;
}

export function provinceTrend(dataset: Dataset, plate: string, category: CategoryId): TrendPoint[] {
  const series = dataset.provinces[plate]?.[category];
  return dataset.days.map((day, i) => {
    const count = series?.n[i] ?? 0;
    return {
      day,
      count,
      score: series && count >= dataset.minArticles ? Math.round(series.s[i] * 100) : null,
    };
  });
}

export interface CategoryShare {
  category: NewsCategoryId;
  count: number;
  share: number;
  score: number;
}

export function categoryBreakdown(dataset: Dataset, plate: string, day: number): CategoryShare[] {
  const newsCategories = CATEGORY_IDS.filter((c): c is NewsCategoryId => c !== "all");
  const rows = newsCategories.map((category) => {
    const series = dataset.provinces[plate]?.[category];
    return { category, count: series?.n[day] ?? 0, score: series?.s[day] ?? 0 };
  });
  const total = rows.reduce((acc, row) => acc + row.count, 0);
  return rows
    .map((row) => ({ ...row, share: total > 0 ? row.count / total : 0 }))
    .sort((a, b) => b.count - a.count);
}
