import type { SensitivityValues } from '@/types';

// Renders a professional esports-style sensitivity card to a canvas and returns it.
export function renderSensitivityCard(opts: {
  values: SensitivityValues;
  preset: string;
  confidence: number;
  device: string;
  username: string;
  isPremium: boolean;
}): HTMLCanvasElement {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#1a1a1a');
  bg.addColorStop(0.5, '#0f0f0f');
  bg.addColorStop(1, '#1a1a1a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Orange accent shapes
  ctx.fillStyle = 'rgba(255,106,0,0.15)';
  ctx.beginPath();
  ctx.arc(W - 100, 200, 300, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,154,58,0.08)';
  ctx.beginPath();
  ctx.arc(100, H - 200, 250, 0, Math.PI * 2);
  ctx.fill();

  // Grid lines
  ctx.strokeStyle = 'rgba(255,106,0,0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 60) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Top bar
  const topGrad = ctx.createLinearGradient(0, 0, W, 0);
  topGrad.addColorStop(0, '#ff6a00');
  topGrad.addColorStop(1, '#ff9a3a');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, 8);

  // Logo box
  ctx.fillStyle = '#ff6a00';
  roundRect(ctx, 60, 60, 90, 90, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  roundRect(ctx, 60, 60, 90, 90, 20);
  ctx.stroke();
  // Crosshair icon
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(105, 80); ctx.lineTo(105, 130);
  ctx.moveTo(80, 105); ctx.lineTo(130, 105);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(105, 105, 16, 0, Math.PI * 2);
  ctx.stroke();

  // Brand text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px Sora, sans-serif';
  ctx.fillText('RΛIDΞN', 170, 115);
  ctx.fillStyle = '#ff8c3a';
  ctx.fillText('亗', 390, 115);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '20px Inter, sans-serif';
  ctx.fillText('Esports sensitivity lab', 170, 145);

  // Premium badge
  if (opts.isPremium) {
    const badgeGrad = ctx.createLinearGradient(W - 260, 70, W - 60, 110);
    badgeGrad.addColorStop(0, '#fbbf24');
    badgeGrad.addColorStop(1, '#ff6a00');
    ctx.fillStyle = badgeGrad;
    roundRect(ctx, W - 260, 70, 200, 50, 25);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Sora, sans-serif';
    ctx.fillText('PREMIUM', W - 245, 103);
  }

  // Username
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '22px Inter, sans-serif';
  ctx.fillText('PLAYER', 60, 230);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Sora, sans-serif';
  const uname = opts.username.length > 28 ? opts.username.slice(0, 28) + '...' : opts.username;
  ctx.fillText(uname, 60, 280);

  // Preset + confidence
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '20px Inter, sans-serif';
  ctx.fillText('PRESET', 60, 340);
  ctx.fillStyle = '#ff8c3a';
  ctx.font = 'bold 36px Sora, sans-serif';
  ctx.fillText(opts.preset.toUpperCase(), 60, 385);

  // Confidence circle
  drawConfidenceRing(ctx, W - 140, 360, 70, opts.confidence);

  // Divider
  ctx.strokeStyle = 'rgba(255,106,0,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, 440); ctx.lineTo(W - 60, 440);
  ctx.stroke();

  // Sensitivity rows
  const rows: { label: string; value: number }[] = [
    { label: 'General', value: opts.values.general },
    { label: 'Red Dot', value: opts.values.red_dot },
    { label: '2x Scope', value: opts.values.scope_2x },
    { label: '4x Scope', value: opts.values.scope_4x },
    { label: 'Sniper Scope', value: opts.values.sniper_scope },
    { label: 'Free Look', value: opts.values.free_look },
  ];
  let y = 510;
  for (const r of rows) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '24px Inter, sans-serif';
    ctx.fillText(r.label, 80, y);
    // Bar background
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, 360, y - 26, 560, 32, 16);
    ctx.fill();
    // Bar fill
    const barGrad = ctx.createLinearGradient(360, 0, 920, 0);
    barGrad.addColorStop(0, '#ff8c3a');
    barGrad.addColorStop(1, '#ff6a00');
    ctx.fillStyle = barGrad;
    const barW = Math.max(20, (r.value / 200) * 560);
    roundRect(ctx, 360, y - 26, barW, 32, 16);
    ctx.fill();
    // Value
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Sora, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(String(r.value), W - 80, y);
    ctx.textAlign = 'left';
    y += 100;
  }

  // Device info
  ctx.strokeStyle = 'rgba(255,106,0,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, y + 20); ctx.lineTo(W - 60, y + 20);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '18px Inter, sans-serif';
  ctx.fillText('DEVICE', 60, y + 60);
  ctx.fillStyle = '#ffffff';
  ctx.font = '22px Inter, sans-serif';
  const dev = opts.device.length > 60 ? opts.device.slice(0, 60) + '...' : opts.device;
  ctx.fillText(dev, 60, y + 90);

  // Footer
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '18px Inter, sans-serif';
  ctx.fillText(new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }), 60, H - 70);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ff8c3a';
  ctx.font = 'bold 20px Sora, sans-serif';
  ctx.fillText('Your Device. Your Sensitivity. Your Game.', W - 60, H - 70);
  ctx.textAlign = 'left';

  return canvas;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawConfidenceRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, pct: number) {
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  grad.addColorStop(0, '#ff8c3a');
  grad.addColorStop(1, '#ff6a00');
  ctx.strokeStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (pct / 100) * Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Sora, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${pct}%`, cx, cy + 10);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '14px Inter, sans-serif';
  ctx.fillText('CONFIDENCE', cx - 55, cy + r + 25);
}
