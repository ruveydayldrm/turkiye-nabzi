export const CATEGORY_IDS = [
  "all",
  "ekonomi",
  "spor",
  "asayis",
  "kultur-sanat",
  "egitim",
  "saglik",
  "hava-cevre",
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];
export type NewsCategoryId = Exclude<CategoryId, "all">;

export type RegionId =
  | "marmara"
  | "ege"
  | "akdeniz"
  | "ic-anadolu"
  | "karadeniz"
  | "dogu"
  | "guneydogu";

export interface Province {
  plate: string;
  name: string;
  region: RegionId;
  /** Population in thousands. */
  population: number;
}

/** Per-day values aligned with `Dataset.days`, computed over a trailing `windowDays` window. */
export interface ProvinceSeries {
  /** Sentiment relative to the national mean, in [-1, 1]. */
  s: number[];
  /** Article count inside the window. */
  n: number[];
}

/** Per-day national aggregates aligned with `Dataset.days`. */
export interface NationalSeries {
  /** Mean absolute sentiment of the day's articles, in [-1, 1]. */
  raw: number[];
  /** Article count of the day. */
  n: number[];
}

export interface Dataset {
  generatedAt: string;
  isDemo: boolean;
  /** ISO dates (YYYY-MM-DD), ascending. */
  days: string[];
  windowDays: number;
  /** Provinces below this article count are shown as "insufficient data". */
  minArticles: number;
  national: Record<CategoryId, NationalSeries>;
  provinces: Record<string, Record<CategoryId, ProvinceSeries>>;
}

export interface Headline {
  title: string;
  url: string;
  source: string;
  category: NewsCategoryId;
  sentiment: number;
  publishedAt: string;
}

export interface Keyword {
  text: string;
  weight: number;
}

export interface ProvinceDetail {
  plate: string;
  generatedAt: string;
  headlines: Headline[];
  keywords: Keyword[];
  /** LLM-generated summary; null when no LLM is configured or data is too thin. */
  highlights: string | null;
}
