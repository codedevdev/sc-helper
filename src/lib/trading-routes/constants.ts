/** Quantum travel speed used for distance-based estimates (Gm/s). */
export const QT_SPEED_GM_PER_SEC = 0.06;

/** Fallback QT minutes when orbit distance is unknown. */
export const QT_FALLBACK_SAME_ORBIT_MIN = 3;
export const QT_FALLBACK_SAME_SYSTEM_MIN = 8;
export const QT_FALLBACK_CROSS_SYSTEM_MIN = 15;

/** Heuristic Gm when orbit API has no entry (typical intra-system hop). */
export const HEURISTIC_SAME_SYSTEM_GM = 38;

/** Heuristic Gm for cross-system when pair not in SYSTEM_PAIR_GM. */
export const HEURISTIC_CROSS_SYSTEM_GM = 60;

/** Known cross-system pairs (originSystemId-destSystemId → Gm). */
export const SYSTEM_PAIR_GM: Record<string, number> = {
  // Stanton (1) ↔ Pyro (2) — approximate until orbit API fills in
  "1-2": 60,
  "2-1": 60,
};

/** Top buy/sell offers per commodity when pairing routes. */
export const TOP_OFFERS_PER_LEG = 5;

/** Loop planner leg bounds and search limits. */
export const MIN_LOOP_LEGS = 3;
export const MAX_LOOP_LEGS = 7;
export const MAX_LOOP_CANDIDATES = 5_000;

export const DEFAULT_MAX_LOOP_RESULTS = 30;
export const MAX_LOOP_EXPLORED_NODES = 50_000;
export const TOP_LOOP_START_TERMINALS = 10;
export const TOP_LOOP_START_TERMINALS_HEAVY = 3;

export const HEAVY_LOOP_EDGE_THRESHOLD = 5_000;

/** Use Web Worker or chunked scoring when candidate/price count exceeds this. */
export const HEAVY_CANDIDATE_THRESHOLD = 10_000;

/** Fixed unload and overhead minutes (simplified model). */
export const UNLOAD_MINUTES = 2;
export const ROUTE_OVERHEAD_MINUTES = 3;

/** Default max container size when terminal reports 0. */
export const DEFAULT_MAX_CONTAINER_SIZE = 16;
