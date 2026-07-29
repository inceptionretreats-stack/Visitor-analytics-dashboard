import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { config } from './config.js';
import { Visitor } from './models/Visitor.js';

/**
 * Storage abstraction with a write-through cache.
 *
 * The in-memory `visitors` array is ALWAYS the source of truth used for
 * fast face matching. When a MongoDB connection is configured, every change
 * is also persisted there (and existing visitors are loaded on startup),
 * so the app survives restarts. Without Mongo it runs fully in-memory.
 */
class Store {
  constructor() {
    this.visitors = [];
    this.usingMongo = false;
  }

  async init() {
    if (!config.mongoUri) {
      console.log('[store] No MONGODB_URI set — using in-memory store.');
      return;
    }
    try {
      await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
      this.usingMongo = true;
      const docs = await Visitor.find().lean();
      this.visitors = docs.map((d) => ({
        id: String(d._id),
        embedding: d.embedding,
        sampleCount: d.sampleCount || 1,
        visitCount: d.visitCount,
        firstSeen: new Date(d.firstSeen).getTime(),
        lastSeen: new Date(d.lastSeen).getTime(),
      }));
      console.log(`[store] Connected to MongoDB — loaded ${this.visitors.length} visitor(s).`);
    } catch (err) {
      this.usingMongo = false;
      console.warn(
        `[store] MongoDB connection failed (${err.message}). Falling back to in-memory store.`
      );
    }
  }

  getVisitors() {
    return this.visitors;
  }

  // Create a new identity seeded with a (blended) centroid embedding.
  async addVisitor(centroid, now) {
    const visitor = {
      id: randomUUID(),
      embedding: centroid.slice(),
      sampleCount: 1,
      visitCount: 1,
      firstSeen: now,
      lastSeen: now,
    };

    if (this.usingMongo) {
      try {
        const doc = await Visitor.create({
          embedding: visitor.embedding,
          sampleCount: 1,
          visitCount: 1,
          firstSeen: new Date(now),
          lastSeen: new Date(now),
        });
        visitor.id = String(doc._id);
      } catch (err) {
        console.warn('[store] Failed to persist new visitor:', err.message);
      }
    }

    this.visitors.push(visitor);
    return visitor;
  }

  // Record a NEW visit (return) for an existing identity. Persisted on visit-start
  // only — continued-presence frames update the in-memory centroid without a DB write.
  async recordVisit(visitor, now) {
    visitor.visitCount += 1;
    visitor.lastSeen = now;

    if (this.usingMongo) {
      try {
        await Visitor.updateOne(
          { _id: visitor.id },
          {
            $set: {
              lastSeen: new Date(now),
              embedding: visitor.embedding,
              sampleCount: visitor.sampleCount,
            },
            $inc: { visitCount: 1 },
          }
        );
      } catch (err) {
        console.warn('[store] Failed to persist returning visit:', err.message);
      }
    }
    return visitor;
  }

  async reset() {
    this.visitors = [];
    if (this.usingMongo) {
      try {
        await Visitor.deleteMany({});
      } catch (err) {
        console.warn('[store] Failed to clear visitors:', err.message);
      }
    }
  }
}

export const store = new Store();
