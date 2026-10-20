"use client";

import { useEffect, useState } from "react";
import { dataSource } from "@/lib/data/source";
import type { ProvinceDetail } from "@/lib/types";

const cache = new Map<string, Promise<ProvinceDetail>>();

function loadDetail(plate: string): Promise<ProvinceDetail> {
  let request = cache.get(plate);
  if (!request) {
    request = dataSource.getProvinceDetail(plate);
    request.catch(() => cache.delete(plate));
    cache.set(plate, request);
  }
  return request;
}

type Loaded = { plate: string; detail: ProvinceDetail | null; failed: boolean };

export function useProvinceDetail(plate: string | null) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!plate) return;
    let active = true;
    loadDetail(plate)
      .then((detail) => active && setLoaded({ plate, detail, failed: false }))
      .catch(() => active && setLoaded({ plate, detail: null, failed: true }));
    return () => {
      active = false;
    };
  }, [plate]);

  const current = loaded && loaded.plate === plate ? loaded : null;
  return {
    detail: current?.detail ?? null,
    loading: plate !== null && current === null,
    failed: current?.failed ?? false,
  };
}
