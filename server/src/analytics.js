import { config } from './config.js';
import { store } from './store.js';

/**
 * Euclidean distance between two equal-length embedding vectors.
 *   distance = sqrt( Σ (a[i] - b[i])^2 )
 * Smaller distance => more similar faces.
 */
export function euclideanDistance(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/** Closest stored visitor (by centroid) to `embedding`, skipping ids used this frame. */
function findBestMatch(embedding, usedIds) {
  let best = null;
  let bestDistance = Infinity;
  for (const visitor of store.getVisitors()) {
    if (usedIds && usedIds.has(visitor.id)) continue;
    const distance = euclideanDistance(embedding, visitor.embedding);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = visitor;
    }
  }
  return { best, bestDistance };
}

/**
 * Blend a descriptor into an identity's running-average centroid.
 * alpha = 1/(n+1) is a true cumulative mean early on (tightening the centroid fast),
 * floored at emaAlphaFloor so a long-lived identity still tracks slow pose/light drift.
 */
function updateCentroid(target, descriptor, countKey) {
  const n = target[countKey];
  const alpha = Math.max(config.emaAlphaFloor, 1 / (n + 1));
  for (let i = 0; i < target.embedding.length; i++) {
    target.embedding[i] = (1 - alpha) * target.embedding[i] + alpha * descriptor[i];
  }
  target[countKey] = n + 1;
}

// ---- Module state ----
let candidates = []; // [{ embedding, hits, firstTs, lastTs }] — unconfirmed faces
let visitLog = []; // [{ ts, visitorId }] — one entry per visit-start, time-ordered
const recentEvents = []; // newest first, capped
let totalDetections = 0; // debug only — never a headline stat
const MAX_RECENT = 12;

const short = (id) => String(id).slice(0, 8);
const finite = (d) => (Number.isFinite(d) ? Number(d.toFixed(3)) : null);

function pushEvent(event) {
  recentEvents.unshift(event);
  if (recentEvents.length > MAX_RECENT) recentEvents.pop();
}

function appendVisit(visitorId, now) {
  visitLog.push({ ts: now, visitorId });
  pruneVisitLog(now);
}

function pruneVisitLog(now) {
  const cutoff = now - config.visitLogRetentionHours * 3600_000;
  while (visitLog.length && visitLog[0].ts < cutoff) visitLog.shift();
}

function pruneCandidates(now) {
  const cutoff = now - config.candidateTtlSeconds * 1000;
  candidates = candidates.filter((c) => c.lastTs >= cutoff);
}

/** Start a new visit for an existing identity, or just refresh presence within the gap. */
async function attributeToVisitor(visitor, descriptor, dist, now, usedIds) {
  updateCentroid(visitor, descriptor, 'sampleCount');
  usedIds.add(visitor.id);
  const gapMs = now - visitor.lastSeen;
  if (gapMs >= config.sessionGapSeconds * 1000) {
    await store.recordVisit(visitor, now); // visitCount++, persists (visit-start only)
    appendVisit(visitor.id, now);
    const event = {
      type: 'return',
      visitorId: short(visitor.id),
      visitCount: visitor.visitCount,
      distance: finite(dist),
      at: now,
    };
    pushEvent(event);
    return event;
  }
  // Same continuing visit — keep presence fresh, do not count.
  visitor.lastSeen = now;
  return { type: 'present', visitorId: short(visitor.id), distance: finite(dist), at: now };
}

/**
 * Promote a confirmed candidate. B1 GUARD: before creating a brand-new identity,
 * re-match the candidate's BLENDED centroid against existing visitors. A known face
 * caught at a bad angle (which routed here) is attributed to its real identity instead
 * of forking into a duplicate. A new identity is created only if it still fails to match.
 */
async function promoteCandidate(cand, now, usedIds) {
  const { best, bestDistance } = findBestMatch(cand.embedding, usedIds);
  candidates = candidates.filter((c) => c !== cand);

  if (best && bestDistance <= config.newIdentityThreshold) {
    return attributeToVisitor(best, cand.embedding, bestDistance, now, usedIds);
  }

  const visitor = await store.addVisitor(cand.embedding, now);
  usedIds.add(visitor.id);
  appendVisit(visitor.id, now);
  const event = {
    type: 'new',
    visitorId: short(visitor.id),
    visitCount: 1,
    distance: finite(bestDistance),
    at: now,
  };
  pushEvent(event);
  return event;
}

/** Route an unmatched descriptor into the candidate buffer; promote once confirmed. */
async function bufferCandidate(descriptor, now, usedIds) {
  let nearest = null;
  let nearestDist = Infinity;
  for (const c of candidates) {
    const d = euclideanDistance(descriptor, c.embedding);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = c;
    }
  }

  let cand;
  if (nearest && nearestDist <= config.candidateMergeDistance) {
    updateCentroid(nearest, descriptor, 'hits'); // blend (hits doubles as sample count)
    nearest.lastTs = now;
    cand = nearest;
  } else {
    cand = { embedding: descriptor.slice(), hits: 1, firstTs: now, lastTs: now };
    candidates.push(cand);
  }

  if (cand.hits >= config.confirmFrames) return promoteCandidate(cand, now, usedIds);
  return { type: 'pending', at: now }; // not counted yet
}

/**
 * Process one face descriptor. Three-zone decision:
 *   ZONE 1  dist <= matchThreshold        -> confident match (count session / presence)
 *   ZONE 2  dist <  newIdentityThreshold  -> ambiguous (refresh presence only, no count)
 *   ZONE 3  otherwise / no visitors       -> candidate buffer (needs confirmFrames)
 */
async function processDescriptor(descriptor, now, usedIds) {
  if (!Array.isArray(descriptor) || descriptor.length === 0) return { type: 'invalid' };
  totalDetections += 1;

  const { best, bestDistance } = findBestMatch(descriptor, usedIds);

  if (best && bestDistance <= config.matchThreshold) {
    return attributeToVisitor(best, descriptor, bestDistance, now, usedIds);
  }
  if (best && bestDistance < config.newIdentityThreshold) {
    best.lastSeen = now; // keep present, but don't blend or count an ambiguous frame
    usedIds.add(best.id);
    return { type: 'uncertain', visitorId: short(best.id), distance: finite(bestDistance), at: now };
  }
  return bufferCandidate(descriptor, now, usedIds);
}

/**
 * Process one frame of faces (multi-face). A single shared `usedIds` set ensures two
 * face blobs in the same frame can't both be attributed to the same stored identity.
 */
export async function processFrame(faces, now = Date.now()) {
  pruneCandidates(now);
  const usedIds = new Set();
  const results = [];
  for (const face of faces || []) {
    results.push(await processDescriptor(face?.descriptor, now, usedIds));
  }
  return results;
}

/** Distinct people seen within the presence window. */
function countPresentNow(now) {
  const cutoff = now - config.presenceWindowSeconds * 1000;
  return store.getVisitors().filter((v) => v.lastSeen >= cutoff).length;
}

/** 24 rolling hourly slots ending at the current hour. */
function buildTimeline(now) {
  const top = new Date(now);
  top.setMinutes(0, 0, 0);
  const currentHourStart = top.getTime();
  const slots = [];
  for (let i = 23; i >= 0; i--) {
    const start = currentHourStart - i * 3600_000;
    const end = start + 3600_000;
    const ids = new Set();
    let visits = 0;
    for (const e of visitLog) {
      if (e.ts >= start && e.ts < end) {
        ids.add(e.visitorId);
        visits += 1;
      }
    }
    const label = `${String(new Date(start).getHours()).padStart(2, '0')}:00`;
    slots.push({
      hourLabel: label,
      startTs: start,
      count: ids.size, // distinct people who arrived this hour -> heatmap
      visits, // raw visit-starts this hour -> footfall chart
      isCurrent: start === currentHourStart,
    });
  }
  return slots;
}

/** Full analytics snapshot broadcast to all dashboard clients. */
export function buildSnapshot() {
  const now = Date.now();
  const visitors = store.getVisitors();
  const uniqueVisitors = visitors.length;
  const returningVisitors = visitors.filter((v) => v.visitCount > 1).length;
  const totalVisits = visitors.reduce((sum, v) => sum + v.visitCount, 0);

  const topVisitors = [...visitors]
    .sort((a, b) => b.visitCount - a.visitCount)
    .slice(0, 5)
    .map((v) => ({ id: short(v.id), visitCount: v.visitCount, lastSeen: v.lastSeen }));

  return {
    totals: {
      uniqueVisitors,
      returningVisitors,
      newVisitors: uniqueVisitors - returningVisitors,
      totalVisits,
      presentNow: countPresentNow(now),
    },
    timeline: buildTimeline(now),
    topVisitors,
    recentEvents: [...recentEvents],
    updatedAt: now,
    debug: {
      totalDetections,
      candidates: candidates.length,
      store: store.usingMongo ? 'mongodb' : 'in-memory',
    },
  };
}

export async function resetAnalytics() {
  totalDetections = 0;
  recentEvents.length = 0;
  candidates = [];
  visitLog = [];
  await store.reset();
}
