import type { Dataset, ProvinceDetail } from "@/lib/types";

export interface DataSource {
  getDataset(signal?: AbortSignal): Promise<Dataset>;
  getProvinceDetail(plate: string, signal?: AbortSignal): Promise<ProvinceDetail>;
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`${url} → ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

function staticSource(baseUrl: string): DataSource {
  return {
    getDataset: (signal) => fetchJson(`${baseUrl}/dataset.json`, signal),
    getProvinceDetail: (plate, signal) => fetchJson(`${baseUrl}/provinces/${plate}.json`, signal),
  };
}

function apiSource(baseUrl: string): DataSource {
  return {
    getDataset: (signal) => fetchJson(`${baseUrl}/api/dataset`, signal),
    getProvinceDetail: (plate, signal) => fetchJson(`${baseUrl}/api/provinces/${plate}`, signal),
  };
}

export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export const dataSource: DataSource = isDemoMode ? staticSource("/demo") : apiSource(apiUrl);
