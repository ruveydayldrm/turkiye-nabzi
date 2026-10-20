import type { CategoryId } from "@/lib/types";

export interface DashboardState {
  day: number;
  lastDay: number;
  category: CategoryId;
  selected: string | null;
  /** Plates being compared; null when compare mode is off. */
  compare: string[] | null;
  playing: boolean;
}

export type DashboardAction =
  | { type: "setDay"; day: number }
  | { type: "tick" }
  | { type: "togglePlay" }
  | { type: "setCategory"; category: CategoryId }
  | { type: "select"; plate: string }
  | { type: "close" }
  | { type: "startCompare" }
  | { type: "exitCompare" };

export function initialState(dayCount: number): DashboardState {
  return {
    day: dayCount - 1,
    lastDay: dayCount - 1,
    category: "all",
    selected: null,
    compare: null,
    playing: false,
  };
}

export function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case "setDay":
      return { ...state, day: Math.max(0, Math.min(state.lastDay, action.day)), playing: false };
    case "tick":
      if (state.day >= state.lastDay) return { ...state, playing: false };
      return { ...state, day: state.day + 1 };
    case "togglePlay":
      if (state.playing) return { ...state, playing: false };
      return { ...state, playing: true, day: state.day >= state.lastDay ? 0 : state.day };
    case "setCategory":
      return { ...state, category: action.category };
    case "select": {
      if (!state.compare) return { ...state, selected: action.plate };
      if (state.compare.includes(action.plate)) return state;
      const [first] = state.compare;
      return { ...state, compare: first ? [first, action.plate] : [action.plate] };
    }
    case "close":
      return { ...state, selected: null, compare: null };
    case "startCompare":
      return { ...state, compare: state.selected ? [state.selected] : [] };
    case "exitCompare":
      return { ...state, compare: null };
  }
}
