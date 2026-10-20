import provinceList from "@/data/provinces.json";
import type { Province } from "./types";

export const PROVINCES = provinceList as Province[];

export const PROVINCES_BY_PLATE: ReadonlyMap<string, Province> = new Map(
  PROVINCES.map((province) => [province.plate, province]),
);

export function provinceName(plate: string): string {
  return PROVINCES_BY_PLATE.get(plate)?.name ?? plate;
}
