import * as faceapi from '@vladmandic/face-api';
import { MODELS_URL, MAX_FACES } from '../config.js';

let loadingPromise = null;

/**
 * Load the three model bundles we need:
 *  - TinyFaceDetector  (fast face detection / bounding boxes)
 *  - FaceLandmark68    (alignment, required before recognition)
 *  - FaceRecognition   (produces the 128-d embedding)
 *
 * Idempotent — repeated calls share the same in-flight promise.
 */
export function loadModels() {
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL);
  })();
  return loadingPromise;
}

// Tuned for real-time multi-face webcam use. inputSize must be a multiple of 32.
// 320 detects smaller / further / partially-turned faces (e.g. a second person)
// far more reliably than 224; the slightly lower score threshold helps too.
const detectorOptions = new faceapi.TinyFaceDetectorOptions({
  inputSize: 320,
  scoreThreshold: 0.45,
});

/**
 * Detect ALL faces in a video element (to track a crowd) and return each with
 * its landmarks + 128-d descriptor. Sorted largest-first and capped at MAX_FACES
 * to bound CPU / socket payload on weaker machines.
 */
export async function detectFaces(videoEl) {
  const results = await faceapi
    .detectAllFaces(videoEl, detectorOptions)
    .withFaceLandmarks()
    .withFaceDescriptors();
  if (!results.length) return [];
  const area = (r) => r.detection.box.width * r.detection.box.height;
  return results.sort((a, b) => area(b) - area(a)).slice(0, MAX_FACES);
}

export { faceapi };
