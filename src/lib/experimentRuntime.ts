/**
 * A/B Experiment Runtime — deterministic variant selection
 * Uses a hash of experiment_id + visitor fingerprint to consistently assign variants.
 */

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getVisitorId(): string {
  const key = 'gos_visitor_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID?.() || Math.random().toString(36).substring(2) + Date.now().toString(36);
    try { localStorage.setItem(key, id); } catch {}
  }
  return id;
}

export interface ExperimentConfig {
  id: string;
  status: string;
  winner_id: string | null;
  traffic_split: Record<string, number>; // variant_id -> percentage
}

/**
 * Select a variant deterministically based on experiment config and visitor.
 * Returns the selected variant_id, or null if experiment is not active.
 */
export function selectVariant(experiment: ExperimentConfig): string | null {
  // If winner declared, always return winner
  if (experiment.winner_id) {
    return experiment.winner_id;
  }

  // Only running experiments do traffic splitting
  if (experiment.status !== 'running') {
    return null;
  }

  const split = experiment.traffic_split || {};
  const variantIds = Object.keys(split);
  if (variantIds.length === 0) return null;
  if (variantIds.length === 1) return variantIds[0];

  // Deterministic hash: same visitor always gets same variant for this experiment
  const visitorId = getVisitorId();
  const hash = simpleHash(`${experiment.id}:${visitorId}`);
  const bucket = hash % 100; // 0-99

  // Build cumulative ranges from traffic_split
  let cumulative = 0;
  for (const vid of variantIds) {
    cumulative += split[vid] || 0;
    if (bucket < cumulative) {
      return vid;
    }
  }

  // Fallback to last variant
  return variantIds[variantIds.length - 1];
}
