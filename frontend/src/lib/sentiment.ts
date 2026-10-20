import { interpolateLab } from "d3-interpolate";
import { scaleLinear } from "d3-scale";

export const SENTIMENT_COLORS = {
  negative: "#ff6b6b",
  negativeSoft: "#c97a82",
  neutral: "#7a7696",
  positiveSoft: "#4fa8a0",
  positive: "#2ee6b8",
} as const;

const STOPS = [-1, -0.45, 0, 0.45, 1];

const scale = scaleLinear<string>()
  .domain(STOPS)
  .range([
    SENTIMENT_COLORS.negative,
    SENTIMENT_COLORS.negativeSoft,
    SENTIMENT_COLORS.neutral,
    SENTIMENT_COLORS.positiveSoft,
    SENTIMENT_COLORS.positive,
  ])
  .interpolate(interpolateLab)
  .clamp(true);

export function sentimentColor(score: number): string {
  return scale(score);
}

/** CSS gradient matching the map scale, for legends and gauges. */
export function sentimentGradient(direction = "to right"): string {
  const steps = Array.from({ length: 11 }, (_, i) => -1 + i * 0.2);
  return `linear-gradient(${direction}, ${steps.map((s) => sentimentColor(s)).join(", ")})`;
}

/** Maps a raw national sentiment in [-1, 1] to a 0–100 mood index. */
export function moodIndex(raw: number): number {
  return (raw + 1) * 50;
}

/** Maps a mood index to a [-1, 1] position on the colour scale, centred on a typical news day. */
export function moodToScore(index: number, typical = 46, spread = 8): number {
  return Math.max(-1, Math.min(1, (index - typical) / spread));
}

export type SentimentTone = "negative" | "neutral" | "positive";

export function sentimentTone(score: number, threshold = 0.15): SentimentTone {
  if (score > threshold) return "positive";
  if (score < -threshold) return "negative";
  return "neutral";
}
