import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, RefreshCw, CheckCircle2, AlertCircle, Scan, Lightbulb, Focus } from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import { PremiumLock } from '@/components/PremiumLock';
import { useAuth } from '@/hooks/useAuth';

export function FacePage() {
  const { isPremium } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'live' | 'error' | 'denied'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [analysis, setAnalysis] = useState<FaceAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const startCamera = async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus('live');
    } catch (err) {
      const e = err as DOMException;
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setStatus('denied');
        setErrorMsg('Camera permission was denied. Please allow camera access in your browser settings.');
      } else if (e.name === 'NotFoundError') {
        setStatus('error');
        setErrorMsg('No camera device found.');
      } else {
        setStatus('error');
        setErrorMsg(e.message || 'Could not access camera.');
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus('idle');
    setAnalysis(null);
  };

  useEffect(() => () => stopCamera(), []);

  const analyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setAnalyzing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Basic face detection via brightness center + skin-tone heuristic (no external deps).
    // This is intentionally lightweight — we don't claim medical/biometric analysis.
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = lightweightFaceDetect(data);
    setAnalysis(result);
    setAnalyzing(false);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <header className="text-center mb-8 animate-fade-up">
        <Badge color="orange">Face & Camera Analysis</Badge>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl font-bold text-neutral-900">
          Camera <span className="text-gradient-orange">framing check</span>
        </h1>
        <p className="mt-2 text-neutral-500 max-w-xl mx-auto text-sm">
          Basic on-device analysis of face presence, position, and framing. No image leaves your device.
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5 animate-fade-up">
          <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-neutral-900">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
            {status === 'idle' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 gap-3">
                <Camera size={48} />
                <p className="text-sm">Camera is off</p>
                <Button size="sm" onClick={startCamera}><Camera size={14} /> Start camera</Button>
              </div>
            )}
            {status === 'loading' && (
              <div className="absolute inset-0 flex items-center justify-center text-neutral-300">
                <RefreshCw size={32} className="animate-spin" />
              </div>
            )}
            {(status === 'live') && analysis && (
              <FaceOverlay analysis={analysis} canvasWidth={canvasRef.current?.width ?? 640} canvasHeight={canvasRef.current?.height ?? 480} />
            )}
            {status === 'denied' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-red-300 gap-2 p-6 text-center">
                <CameraOff size={40} />
                <p className="text-sm">{errorMsg}</p>
              </div>
            )}
            {status === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-red-300 gap-2 p-6 text-center">
                <AlertCircle size={40} />
                <p className="text-sm">{errorMsg}</p>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            {status === 'live' ? (
              <>
                <Button full size="sm" onClick={analyze} loading={analyzing}>
                  <Scan size={14} /> {analyzing ? 'Analyzing...' : 'Analyze frame'}
                </Button>
                <Button variant="outline" size="sm" onClick={stopCamera}>Stop</Button>
              </>
            ) : status === 'idle' ? (
              <Button full size="sm" onClick={startCamera}><Camera size={14} /> Start camera</Button>
            ) : null}
          </div>
          <p className="mt-3 text-xs text-neutral-400">
            We only process frames locally in your browser. Nothing is uploaded.
          </p>
        </Card>

        <div className="space-y-4 animate-fade-up">
          <Card className="p-5">
            <h2 className="font-display font-bold text-neutral-900 mb-3">What we analyze</h2>
            <ul className="space-y-2.5 text-sm text-neutral-700">
              <Item icon={<Scan size={16} />} text="Whether a face is present in the frame" />
              <Item icon={<CheckCircle2 size={16} />} text="Approximate face position and bounding box" />
              <Item icon={<Focus size={16} />} text="Basic framing and centering" />
              <Item icon={<Lightbulb size={16} />} text="Overall lighting brightness" />
            </ul>
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800">
              We do <strong>not</strong> detect identity, emotion, age, or medical information. This is a basic framing aid.
            </div>
          </Card>

          {analysis && (
            <Card className="p-5 animate-scale-in">
              <h3 className="font-display font-bold text-neutral-900 mb-3">Results</h3>
              <div className="space-y-2.5 text-sm">
                <ResultRow label="Face detected" value={analysis.facePresent ? 'Yes' : 'No'} ok={analysis.facePresent} />
                <ResultRow label="Position" value={analysis.facePresent ? `${analysis.position}` : '—'} />
                <ResultRow label="Centering" value={analysis.centering} ok={analysis.centering === 'Good'} />
                <ResultRow label="Brightness" value={analysis.brightness} ok={analysis.brightness === 'Good'} />
                <ResultRow label="Confidence" value={`${analysis.confidence}%`} />
              </div>
            </Card>
          )}

          {!isPremium && (
            <PremiumLock
              title="Advanced face & camera analysis"
              description="Premium adds facial landmark estimation, head orientation, eye-position checks, and image sharpness scoring."
              features={['Facial landmark estimation', 'Head orientation (pitch/yaw/roll)', 'Eye-position check', 'Image sharpness scoring']}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface FaceAnalysis {
  facePresent: boolean;
  position: string;
  centering: 'Good' | 'Off-center' | '—';
  brightness: 'Good' | 'Low' | 'High';
  confidence: number;
  bbox: { x: number; y: number; w: number; h: number } | null;
}

function lightweightFaceDetect(img: ImageData): FaceAnalysis {
  const { data, width, height } = img;
  // Compute average brightness and detect a skin-tone blob center
  let sumBright = 0;
  let skinPixels = 0;
  let sumX = 0, sumY = 0;
  let minX = width, minY = height, maxX = 0, maxY = 0;

  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      sumBright += (r + g + b) / 3;
      // Simple skin-tone heuristic
      const isSkin =
        r > 60 && g > 30 && b > 15 &&
        r > g && r > b &&
        r - Math.min(g, b) > 15 &&
        Math.abs(r - g) > 10;
      if (isSkin) {
        skinPixels++;
        sumX += x; sumY += y;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  const sampled = Math.ceil(width / 4) * Math.ceil(height / 4);
  const avgBright = sumBright / sampled;
  const facePresent = skinPixels > sampled * 0.01;
  const cx = facePresent ? sumX / skinPixels : width / 2;
  const cy = facePresent ? sumY / skinPixels : height / 2;

  const offsetX = Math.abs(cx - width / 2) / (width / 2);
  const offsetY = Math.abs(cy - height / 2) / (height / 2);
  const centering: FaceAnalysis['centering'] = facePresent
    ? offsetX < 0.15 && offsetY < 0.15 ? 'Good' : 'Off-center'
    : '—';

  let brightness: FaceAnalysis['brightness'] = 'Good';
  if (avgBright < 70) brightness = 'Low';
  else if (avgBright > 210) brightness = 'High';

  const confidence = facePresent
    ? Math.min(95, 50 + Math.round((skinPixels / sampled) * 200))
    : 20;

  return {
    facePresent,
    position: facePresent ? `x:${Math.round(cx)}, y:${Math.round(cy)}` : '—',
    centering,
    brightness,
    confidence,
    bbox: facePresent ? { x: minX, y: minY, w: maxX - minX, h: maxY - minY } : null,
  };
}

function FaceOverlay({ analysis, canvasWidth, canvasHeight }: { analysis: FaceAnalysis; canvasWidth: number; canvasHeight: number }) {
  if (!analysis.bbox) return null;
  const sx = 100 / canvasWidth;
  const sy = 100 / canvasHeight;
  const b = analysis.bbox;
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div
        className="absolute border-2 border-orange-400 rounded"
        style={{
          left: `${b.x * sx}%`,
          top: `${b.y * sy}%`,
          width: `${b.w * sx}%`,
          height: `${b.h * sy}%`,
        }}
      />
      <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
        {analysis.facePresent ? 'Face detected' : 'No face'}
      </div>
    </div>
  );
}

function Item({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="text-orange-500 mt-0.5">{icon}</span>
      <span>{text}</span>
    </li>
  );
}

function ResultRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
      <span className="text-neutral-500">{label}</span>
      <span className={`font-semibold inline-flex items-center gap-1 ${ok ? 'text-emerald-600' : 'text-neutral-900'}`}>
        {ok && <CheckCircle2 size={14} />} {value}
      </span>
    </div>
  );
}
