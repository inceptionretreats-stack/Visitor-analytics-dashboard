import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore.js';
import { loadModels, detectFaces, faceapi } from '../face/faceApi.js';
import { emitFaces } from '../socket.js';
import { DETECTION_INTERVAL_MS, EMIT_INTERVAL_MS } from '../config.js';

export default function CameraFeed() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const lastEmitRef = useRef(0);
  const loopRef = useRef(null);
  const [faceCount, setFaceCount] = useState(0);

  const modelStatus = useStore((s) => s.modelStatus);
  const cameraStatus = useStore((s) => s.cameraStatus);
  const facePresent = useStore((s) => s.facePresent);

  const setModelStatus = useStore((s) => s.setModelStatus);
  const setCameraStatus = useStore((s) => s.setCameraStatus);
  const setDetecting = useStore((s) => s.setDetecting);
  const setFacePresent = useStore((s) => s.setFacePresent);

  useEffect(() => {
    let stream = null;
    let cancelled = false;

    async function start() {
      // 1) Load AI models (served from /public/models).
      try {
        setModelStatus('loading');
        await loadModels();
        if (cancelled) return;
        setModelStatus('ready');
      } catch (err) {
        console.error('Model load failed:', err);
        setModelStatus('error');
        return;
      }

      // 2) Request the webcam (requires localhost or HTTPS).
      try {
        setCameraStatus('starting');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        setCameraStatus('live');
      } catch (err) {
        console.error('Camera error:', err);
        setCameraStatus(err?.name === 'NotAllowedError' ? 'denied' : 'error');
        return;
      }

      // 3) Start the single-flight detection loop.
      setDetecting(true);
      scheduleNext(0);
    }

    // Run detections ONE AT A TIME. face-api / TensorFlow inference is not
    // re-entrant — if a new cycle starts before the previous finishes (which
    // happens once descriptors are computed every frame), the calls collide and
    // the detector stalls. So we always wait for a cycle to finish, then schedule
    // the next. A thrown error never kills the loop.
    async function runDetectionSafe() {
      if (cancelled) return;
      try {
        await runDetection();
      } catch (err) {
        console.warn('detection cycle error (continuing):', err?.message || err);
      }
      scheduleNext(DETECTION_INTERVAL_MS);
    }

    function scheduleNext(delay) {
      if (cancelled) return;
      loopRef.current = setTimeout(runDetectionSafe, delay);
    }

    async function runDetection() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || video.readyState < 2 || !canvas) return;

      const displaySize = { width: video.clientWidth, height: video.clientHeight };
      if (displaySize.width === 0) return;
      faceapi.matchDimensions(canvas, displaySize);

      const results = await detectFaces(video); // array (multi-face)
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      setFaceCount(results.length);
      setFacePresent(results.length > 0);
      if (!results.length) return;

      // Draw a soft indigo box + landmarks for every detected face.
      const resized = faceapi.resizeResults(results, displaySize);
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(79,70,229,0.6)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = 'rgba(79,70,229,0.85)';
      resized.forEach((r) => {
        const box = r.detection.box;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        ctx.shadowBlur = 0;
        r.landmarks.positions.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.shadowBlur = 8;
      });
      ctx.shadowBlur = 0;

      // Throttle how often we forward the descriptors to the backend.
      const now = Date.now();
      if (now - lastEmitRef.current >= EMIT_INTERVAL_MS) {
        lastEmitRef.current = now;
        emitFaces(results.map((r) => r.descriptor));
      }
    }

    start();

    return () => {
      cancelled = true;
      if (loopRef.current) clearTimeout(loopRef.current);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      setDetecting(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusLabel = () => {
    if (modelStatus === 'loading') return 'Loading AI models…';
    if (modelStatus === 'error') return 'Model load failed';
    if (cameraStatus === 'starting') return 'Starting camera…';
    if (cameraStatus === 'denied') return 'Camera permission denied';
    if (cameraStatus === 'error') return 'Camera unavailable';
    if (cameraStatus === 'live')
      return facePresent ? `${faceCount} face${faceCount > 1 ? 's' : ''} detected` : 'Scanning…';
    return 'Initialising…';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card card-hover relative overflow-hidden p-3"
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-soft text-xs">📷</span>
          <h2 className="panel-title">Live Feed</h2>
        </div>
        <span
          className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
            facePresent ? 'bg-brand-soft text-brand' : 'bg-subtle text-slate-500'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              cameraStatus === 'live' ? 'bg-brand' : 'bg-amber'
            } ${facePresent ? 'animate-pulse' : ''}`}
          />
          {statusLabel()}
        </span>
      </div>

      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-900">
        <video
          ref={videoRef}
          className="h-full w-full -scale-x-100 object-cover"
          muted
          playsInline
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100"
        />

        {/* Corner reticles */}
        <div className="pointer-events-none absolute inset-2.5 rounded-lg">
          <span className="absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2 border-brand/70" />
          <span className="absolute right-0 top-0 h-4 w-4 border-r-2 border-t-2 border-brand/70" />
          <span className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-brand/70" />
          <span className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-brand/70" />
        </div>

        {/* Subtle scan sweep when live */}
        {cameraStatus === 'live' && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="animate-scan absolute left-2 right-2 top-0 h-8 bg-gradient-to-b from-transparent via-brand/15 to-transparent" />
          </div>
        )}

        {/* Overlay messages when not live */}
        {cameraStatus !== 'live' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/70 text-center">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            <p className="max-w-[80%] text-sm text-white/80">{statusLabel()}</p>
            {cameraStatus === 'denied' && (
              <p className="max-w-[85%] text-xs text-white/50">
                Allow camera access in your browser and reload. The camera requires
                http://localhost or HTTPS.
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
