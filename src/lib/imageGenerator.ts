import type { SensitivityResult } from './types';

const SVG_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#00e5ff"/>
      <stop offset="50%" stop-color="#ff2e7e"/>
      <stop offset="100%" stop-color="#ffb800"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <polygon points="60,8 104,32 104,88 60,112 16,88 16,32" fill="none" stroke="url(#g1)" stroke-width="3" filter="url(#glow)"/>
  <polygon points="60,22 90,38 90,82 60,98 30,82 30,38" fill="none" stroke="url(#g1)" stroke-width="1.5" opacity="0.5"/>
  <text x="60" y="58" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="url(#g1)" filter="url(#glow)">RΛIDΞN</text>
  <text x="60" y="78" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="#00e5ff" opacity="0.9">亗 SENSEI</text>
</svg>`;

const LOGO_DATA_URL = 'data:image/svg+xml;base64,' + svgToBase64(SVG_LOGO);

function svgToBase64(svg: string): string {
  const bytes = new TextEncoder().encode(svg);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export async function generateSensitivityImage(result: SensitivityResult): Promise<string> {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#0a0a14');
  bgGrad.addColorStop(0.5, '#0d0d18');
  bgGrad.addColorStop(1, '#07070d');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle grid
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 50) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 50) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Top accent line
  const topGrad = ctx.createLinearGradient(0, 0, W, 0);
  topGrad.addColorStop(0, 'transparent');
  topGrad.addColorStop(0.3, '#00e5ff');
  topGrad.addColorStop(0.7, '#ff2e7e');
  topGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, 4);

  // Logo
  await drawLogo(ctx, W / 2, 110);

  // Brand
  ctx.font = 'bold 44px Arial, sans-serif';
  ctx.fillStyle = '#00e5ff';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0, 229, 255, 0.4)';
  ctx.shadowBlur = 15;
  ctx.fillText('RΛIDΞN 亗 SENSEI', W / 2, 210);
  ctx.shadowBlur = 0;

  // Tagline
  ctx.font = '18px Arial, sans-serif';
  ctx.fillStyle = '#8a8aa0';
  ctx.fillText('Your Device. Your Sensitivity. Your Game.', W / 2, 242);

  // Divider
  const divGrad = ctx.createLinearGradient(120, 0, W - 120, 0);
  divGrad.addColorStop(0, 'transparent');
  divGrad.addColorStop(0.5, 'rgba(0, 229, 255, 0.5)');
  divGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(120, 270);
  ctx.lineTo(W - 120, 270);
  ctx.stroke();

  // Device & Profile card
  let y = 310;
  drawInfoRow(ctx, 80, y, W - 80, 'DEVICE', result.deviceName, '#ff2e7e');
  y += 50;
  drawInfoRow(ctx, 80, y, W - 80, 'PROFILE', `${result.profile} Performance`, '#00ff9d');
  y += 50;
  drawInfoRow(ctx, 80, y, W - 80, 'PLAY STYLE', result.recommendedStyle, '#00e5ff');

  // Section: Sensitivity
  y += 70;
  drawSectionHeader(ctx, W / 2, y, 'SENSITIVITY CONFIGURATION');
  y += 20;

  const sensValues: [string, number, string][] = [
    ['GENERAL', result.general, '#00e5ff'],
    ['RED DOT', result.redDot, '#ff2e7e'],
    ['2X SCOPE', result.scope2x, '#00ff9d'],
    ['4X SCOPE', result.scope4x, '#ffb800'],
    ['SNIPER SCOPE', result.sniper, '#ff3b5c'],
    ['FREE LOOK', result.freeLook, '#00e5ff'],
  ];

  for (const [label, value, color] of sensValues) {
    y += 52;
    // Label
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillStyle = '#e8e8f0';
    ctx.textAlign = 'left';
    ctx.fillText(label, 80, y);

    // Bar
    ctx.fillStyle = 'rgba(30, 30, 48, 0.8)';
    roundRect(ctx, 300, y - 16, 580, 18, 4);
    ctx.fill();

    ctx.fillStyle = color;
    const barWidth = Math.max(4, (value / 100) * 580);
    roundRect(ctx, 300, y - 16, barWidth, 18, 4);
    ctx.fill();

    // Value
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'right';
    ctx.fillText(String(value), W - 80, y);
  }

  // Section: Additional Config
  y += 60;
  drawSectionHeader(ctx, W / 2, y, 'ADDITIONAL CONFIG');
  y += 20;

  const configs: [string, string][] = [
    ['FIRE BUTTON', `${result.fireButtonSize}%`],
    ['DPI', `${result.dpiRecommendation}`],
    ['FPS', `${result.fpsRecommendation}`],
    ['GRAPHICS', result.graphicsRecommendation],
    ['AIM STYLE', result.aimStyle],
    ['DRAG STYLE', result.dragStyle],
  ];

  for (const [label, value] of configs) {
    y += 42;
    ctx.font = 'bold 15px Arial, sans-serif';
    ctx.fillStyle = '#8a8aa0';
    ctx.textAlign = 'left';
    ctx.fillText(label, 80, y);
    ctx.font = '19px Arial, sans-serif';
    ctx.fillStyle = '#00e5ff';
    ctx.textAlign = 'right';
    ctx.fillText(value, W - 80, y);
  }

  // Confidence badge
  y += 60;
  ctx.fillStyle = 'rgba(0, 229, 255, 0.08)';
  roundRect(ctx, 80, y, W - 160, 56, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
  ctx.lineWidth = 1;
  roundRect(ctx, 80, y, W - 160, 56, 10);
  ctx.stroke();
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.fillStyle = '#00e5ff';
  ctx.textAlign = 'left';
  ctx.fillText('CONFIDENCE', 100, y + 36);
  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = '#00ff9d';
  ctx.textAlign = 'right';
  ctx.fillText(`${result.confidence}%`, W - 100, y + 36);

  // Explanation
  y += 80;
  ctx.font = '14px Arial, sans-serif';
  ctx.fillStyle = '#7a7a90';
  ctx.textAlign = 'center';
  wrapText(ctx, result.explanation, W / 2, y, W - 160, 22);

  // Disclaimer
  y += 60;
  ctx.font = '12px Arial, sans-serif';
  ctx.fillStyle = '#5a5a70';
  ctx.textAlign = 'center';
  wrapText(ctx, 'Recommendations based on device info. Not affiliated with Garena or Free Fire. No setting guarantees headshots.', W / 2, y, W - 160, 18);

  // Footer
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
  ctx.textAlign = 'center';
  ctx.fillText('© 2026 RΛIDΞN 亗 SENSEI', W / 2, H - 40);

  // Bottom accent
  const botGrad = ctx.createLinearGradient(0, 0, W, 0);
  botGrad.addColorStop(0, 'transparent');
  botGrad.addColorStop(0.3, '#ff2e7e');
  botGrad.addColorStop(0.7, '#00e5ff');
  botGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, H - 4, W, 4);

  return canvas.toDataURL('image/png');
}

function drawLogo(ctx: CanvasRenderingContext2D, cx: number, cy: number): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, cx - 55, cy - 55, 110, 110);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = LOGO_DATA_URL;
  });
}

function drawInfoRow(ctx: CanvasRenderingContext2D, x: number, y: number, x2: number, label: string, value: string, color: string) {
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y);
  ctx.font = '20px Arial, sans-serif';
  ctx.fillStyle = '#e8e8f0';
  ctx.textAlign = 'right';
  ctx.fillText(value, x2, y);
}

function drawSectionHeader(ctx: CanvasRenderingContext2D, cx: number, y: number, text: string) {
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.fillStyle = '#00e5ff';
  ctx.textAlign = 'center';
  ctx.fillText(text, cx, y);
  // Underline
  const tw = ctx.measureText(text).width;
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - tw / 2 - 10, y + 8);
  ctx.lineTo(cx + tw / 2 + 10, y + 8);
  ctx.stroke();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, cx: number, startY: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  let y = startY;
  for (const line of lines) {
    ctx.fillText(line, cx, y);
    y += lineHeight;
  }
}
