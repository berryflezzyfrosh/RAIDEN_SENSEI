import type { SensitivityResult } from './types';

function toBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

const LOGO_DATA_URL =
  'data:image/svg+xml;base64,' +
  toBase64Utf8(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
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
  <text x="60" y="58" text-anchor="middle" font-family="Orbitron, sans-serif" font-size="22" font-weight="900" fill="url(#g1)" filter="url(#glow)">RΛIDΞN</text>
  <text x="60" y="78" text-anchor="middle" font-family="Orbitron, sans-serif" font-size="14" font-weight="700" fill="#00e5ff" opacity="0.9">亗 SENSEI</text>
</svg>`);

export async function generateSensitivityImage(result: SensitivityResult): Promise<string> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#07070d');
  bgGrad.addColorStop(0.5, '#0d0d18');
  bgGrad.addColorStop(1, '#07070d');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Grid pattern
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Border frame
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
  ctx.lineWidth = 3;
  ctx.strokeRect(30, 30, W - 60, H - 60);

  // Inner accent border
  ctx.strokeStyle = 'rgba(255, 46, 126, 0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  // Logo
  await drawLogo(ctx, W / 2, 120);

  // Title
  ctx.font = 'bold 42px Orbitron, sans-serif';
  ctx.fillStyle = '#00e5ff';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0, 229, 255, 0.5)';
  ctx.shadowBlur = 20;
  ctx.fillText('RΛIDΞN 亗 SENSEI', W / 2, 230);
  ctx.shadowBlur = 0;

  // Subtitle
  ctx.font = '18px Rajdhani, sans-serif';
  ctx.fillStyle = '#8a8aa0';
  ctx.fillText('Your Device. Your Sensitivity. Your Game.', W / 2, 260);

  // Divider
  const divGrad = ctx.createLinearGradient(100, 0, W - 100, 0);
  divGrad.addColorStop(0, 'transparent');
  divGrad.addColorStop(0.5, '#00e5ff');
  divGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(100, 285);
  ctx.lineTo(W - 100, 285);
  ctx.stroke();

  // Device info
  let y = 330;
  ctx.font = 'bold 16px Orbitron, sans-serif';
  ctx.fillStyle = '#ff2e7e';
  ctx.textAlign = 'left';
  ctx.fillText('DEVICE', 80, y);
  ctx.font = '20px Rajdhani, sans-serif';
  ctx.fillStyle = '#e8e8f0';
  ctx.textAlign = 'right';
  ctx.fillText(result.deviceName, W - 80, y);

  y += 35;
  ctx.font = 'bold 16px Orbitron, sans-serif';
  ctx.fillStyle = '#ff2e7e';
  ctx.textAlign = 'left';
  ctx.fillText('PROFILE', 80, y);
  ctx.font = '20px Rajdhani, sans-serif';
  ctx.fillStyle = '#00ff9d';
  ctx.textAlign = 'right';
  ctx.fillText(result.profile + ' Performance', W - 80, y);

  y += 40;
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, y);
  ctx.lineTo(W - 80, y);
  ctx.stroke();

  // Sensitivity values
  y += 30;
  ctx.font = 'bold 20px Orbitron, sans-serif';
  ctx.fillStyle = '#00e5ff';
  ctx.textAlign = 'center';
  ctx.fillText('SENSITIVITY CONFIGURATION', W / 2, y);

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
    y += 45;
    ctx.font = 'bold 18px Orbitron, sans-serif';
    ctx.fillStyle = '#e8e8f0';
    ctx.textAlign = 'left';
    ctx.fillText(label, 80, y);

    // Bar background
    ctx.fillStyle = 'rgba(30, 30, 48, 0.8)';
    ctx.fillRect(320, y - 14, 500, 16);
    // Bar fill
    ctx.fillStyle = color;
    ctx.fillRect(320, y - 14, (value / 100) * 500, 16);

    ctx.font = 'bold 22px JetBrains Mono, monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'right';
    ctx.fillText(String(value), W - 80, y);
  }

  y += 40;
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, y);
  ctx.lineTo(W - 80, y);
  ctx.stroke();

  // Additional config
  y += 30;
  ctx.font = 'bold 20px Orbitron, sans-serif';
  ctx.fillStyle = '#00e5ff';
  ctx.textAlign = 'center';
  ctx.fillText('ADDITIONAL CONFIG', W / 2, y);

  const configs: [string, string][] = [
    ['FIRE BUTTON', `${result.fireButtonSize}%`],
    ['DPI', `${result.dpiRecommendation}`],
    ['FPS', `${result.fpsRecommendation}`],
    ['GRAPHICS', result.graphicsRecommendation],
    ['AIM STYLE', result.aimStyle],
    ['DRAG STYLE', result.dragStyle],
  ];

  for (const [label, value] of configs) {
    y += 38;
    ctx.font = 'bold 16px Orbitron, sans-serif';
    ctx.fillStyle = '#8a8aa0';
    ctx.textAlign = 'left';
    ctx.fillText(label, 80, y);
    ctx.font = '20px Rajdhani, sans-serif';
    ctx.fillStyle = '#00e5ff';
    ctx.textAlign = 'right';
    ctx.fillText(value, W - 80, y);
  }

  // Confidence badge
  y += 50;
  ctx.fillStyle = 'rgba(0, 229, 255, 0.1)';
  ctx.fillRect(80, y, W - 160, 50);
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(80, y, W - 160, 50);
  ctx.font = 'bold 16px Orbitron, sans-serif';
  ctx.fillStyle = '#00e5ff';
  ctx.textAlign = 'left';
  ctx.fillText('CONFIDENCE', 100, y + 32);
  ctx.font = 'bold 20px JetBrains Mono, monospace';
  ctx.fillStyle = '#00ff9d';
  ctx.textAlign = 'right';
  ctx.fillText(`${result.confidence}%`, W - 100, y + 32);

  // Disclaimer
  y += 80;
  ctx.font = '13px Rajdhani, sans-serif';
  ctx.fillStyle = '#5a5a70';
  ctx.textAlign = 'center';
  ctx.fillText('These settings are recommendations based on available device information.', W / 2, y);
  y += 20;
  ctx.fillText('Not affiliated with or endorsed by Garena or Free Fire.', W / 2, y);
  y += 20;
  ctx.fillText('No setting guarantees headshots. Adjust to your preference.', W / 2, y);

  // Footer
  y = H - 50;
  ctx.font = 'bold 14px Orbitron, sans-serif';
  ctx.fillStyle = 'rgba(0, 229, 255, 0.5)';
  ctx.textAlign = 'center';
  ctx.fillText('© 2026 RΛIDΞN 亗 SENSEI', W / 2, y);

  return canvas.toDataURL('image/png');
}

function drawLogo(ctx: CanvasRenderingContext2D, cx: number, cy: number): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, cx - 50, cy - 50, 100, 100);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = LOGO_DATA_URL;
  });
}
