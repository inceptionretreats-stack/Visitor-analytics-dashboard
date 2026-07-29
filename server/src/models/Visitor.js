import mongoose from 'mongoose';

/**
 * A Visitor is one unique identity recognised by the system.
 * We persist only the 128-dimensional face embedding (never raw images),
 * plus visit metadata used by the analytics engine.
 */
const visitorSchema = new mongoose.Schema(
  {
    // 128-d face descriptor — a running-average CENTROID, not a single frame
    embedding: { type: [Number], required: true },
    // number of confident frames blended into the centroid (for EMA averaging)
    sampleCount: { type: Number, default: 1 },
    visitCount: { type: Number, default: 1 },
    firstSeen: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now },
    // DEPRECATED: kept for backward-compat with old documents; no longer written.
    // The rolling-24h heatmap now comes from the in-memory visit log.
    hourHistogram: { type: [Number], default: undefined },
  },
  { timestamps: true }
);

export const Visitor = mongoose.model('Visitor', visitorSchema);
