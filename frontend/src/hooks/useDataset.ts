"use client";

import { useEffect, useState } from "react";
import { dataSource } from "@/lib/data/source";
import type { Dataset } from "@/lib/types";

export type DatasetState =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "ready"; dataset: Dataset };

export function useDataset(): DatasetState {
  const [state, setState] = useState<DatasetState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    dataSource
      .getDataset(controller.signal)
      .then((dataset) => setState({ status: "ready", dataset }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", error: error instanceof Error ? error : new Error(String(error)) });
      });
    return () => controller.abort();
  }, []);

  return state;
}
