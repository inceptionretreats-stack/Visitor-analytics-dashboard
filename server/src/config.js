import 'dotenv/config';

// Parse a numeric env var, falling back ONLY when missing/invalid.
// (Using `Number(x) || default` would wrongly reject a legitimate 0.)
function num(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  port: num(process.env.PORT, 4000),
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  mongoUri: process.env.MONGODB_URI || '',

  // --- Face recognition / de-duplication ---
  // distance <= matchThreshold  => confident match (same person)
  matchThreshold: num(process.env.MATCH_THRESHOLD, 0.55),
  // matchThreshold < distance < newIdentityThreshold => ambiguous (ignored, no count)
  // distance >= newIdentityThreshold => candidate for a brand-new identity
  newIdentityThreshold: num(process.env.NEW_IDENTITY_THRESHOLD, 0.62),
  // how close an unmatched frame must be to merge into an existing candidate
  candidateMergeDistance: num(process.env.CANDIDATE_MERGE_DISTANCE, 0.55),
  // a new face must be confirmed across this many frames before it is counted
  confirmFrames: num(process.env.CONFIRM_FRAMES, 2),
  // drop a candidate that hasn't been seen for this long (single-frame glitches)
  candidateTtlSeconds: num(process.env.CANDIDATE_TTL_SECONDS, 8),
  // EMA blend floor so a long-lived centroid still tracks slow pose/lighting drift
  emaAlphaFloor: num(process.env.EMA_ALPHA_FLOOR, 0.05),

  // --- Sessions / presence ---
  // a matched person seen again after this gap counts as a NEW visit (return)
  sessionGapSeconds: num(process.env.SESSION_GAP_SECONDS, 120),
  // "present now" = identities seen within this window (must exceed emit interval)
  presenceWindowSeconds: num(process.env.PRESENCE_WINDOW_SECONDS, 10),

  // --- Rolling heatmap / footfall ---
  // in-memory visit log retention (rolling 24h heatmap reads from this)
  visitLogRetentionHours: num(process.env.VISIT_LOG_RETENTION_HOURS, 48),

  // --- Multi-face / broadcast ---
  maxFaces: num(process.env.MAX_FACES, 8),
  snapshotIntervalMs: num(process.env.SNAPSHOT_INTERVAL_MS, 2000),
};
