"use client";

import type { FeatureCollection, Geometry } from "geojson";
import { useEffect, useState } from "react";

export interface ProvinceProperties {
  plate: string;
  name: string;
}

export type ProvinceCollection = FeatureCollection<Geometry, ProvinceProperties>;

let cached: Promise<ProvinceCollection> | null = null;

function loadShapes(): Promise<ProvinceCollection> {
  cached ??= fetch("/geo/turkey-provinces.json").then((response) => {
    if (!response.ok) throw new Error(`Harita verisi yüklenemedi (${response.status})`);
    return response.json() as Promise<ProvinceCollection>;
  });
  return cached;
}

export function useProvinceShapes(): ProvinceCollection | null {
  const [shapes, setShapes] = useState<ProvinceCollection | null>(null);
  useEffect(() => {
    let active = true;
    loadShapes()
      .then((collection) => active && setShapes(collection))
      .catch(() => {
        cached = null;
      });
    return () => {
      active = false;
    };
  }, []);
  return shapes;
}
