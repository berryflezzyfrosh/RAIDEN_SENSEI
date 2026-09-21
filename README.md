# RΛIDΞN 亗 Sensei

> Your Device. Your Sensitivity. Your Game.

A device-specific Free Fire sensitivity engine that analyzes your hardware and generates optimized sensitivity recommendations. Built with React, TypeScript, Vite, and Tailwind CSS. Deployable to GitHub Pages.

## Features

- **Device Analysis** — Automatically detects OS, browser, screen resolution, pixel ratio, touch support, CPU cores, memory, and more
- **Sensitivity Engine** — A real mathematical engine that calculates sensitivity values from device characteristics and play style (not random numbers)
- **Play Style Presets** — Balanced, Aggressive, Headshot-Focused, Drag Shot, Close Range, Long Range, Sniper, Custom
- **Configuration Analysis** — Confidence score showing how closely the config matches your device
- **Image Generator** — Download a professional esports-style PNG of your sensitivity configuration (Canvas-based, no external API)
- **Share** — Web Share API support with fallback to copy link
- **Redeem Codes** — Aggregated from legitimate public sources with status tracking (NEW / ACTIVE / EXPIRED)
- **Local Storage** — Saves your last generated sensitivity and inputs (no personal data collected)
- **Responsive** — Mobile-first design optimized for Android, iPhone, tablet, and desktop
- **Accessible** — Keyboard navigation, ARIA labels, visible focus states, reduced-motion support

## Folder Structure

```
raiden-sensei/
├── .github/
│   └── workflows/
│       ├── deploy.yml              # GitHub Pages deployment
│       └── update-redeem-codes.yml # Scheduled redeem code updates
├── public/
│   ├── favicon.svg
│   └── data/
│       └── redeem-codes.json       # Redeem code data (auto-updated)
├── scripts/
│   └── fetch-redeem-codes.mjs      # GitHub Action script for code aggregation
├── src/
│   ├── components/
│   │   ├── About.tsx
│   │   ├── DeviceAnalysis.tsx
│   │   ├── Features.tsx
│   │   ├── Footer.tsx
│   │   ├── Generator.tsx
│   │   ├── Hero.tsx
│   │   ├── LoadingScreen.tsx
│   │   ├── Logo.tsx
│   │   ├── Navbar.tsx
│   │   ├── ParticleBackground.tsx
│   │   ├── RedeemCodes.tsx
│   │   └── ResultCard.tsx
│   ├── lib/
│   │   ├── deviceDetection.ts      # Browser device detection
│   │   ├── imageGenerator.ts       # Canvas-based PNG generator
│   │   ├── redeemCodes.ts           # Fetch redeem code data
│   │   ├── sensitivityEngine.ts    # Core sensitivity calculation engine
│   │   ├── storage.ts              # localStorage helpers
│   │   └── types.ts                # TypeScript types and constants
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## Run Locally

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:5173`.

## Build

```bash
npm run build
```

Output is generated in `dist/`. The `vite.config.ts` uses `base: './'` for relative paths, which is required for GitHub Pages.

## Deploy to GitHub Pages

### Automatic (GitHub Actions)

1. Push the project to a GitHub repository.
2. Go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. The `deploy.yml` workflow will automatically build and deploy on every push to `main`.

### Manual

```bash
npm run build
# Upload the contents of dist/ to GitHub Pages
```

## How the Sensitivity Engine Works

The engine in `src/lib/sensitivityEngine.ts` calculates sensitivity values using:

1. **Device performance tier** — Scored from CPU cores, memory, screen resolution, pixel ratio, touch support, and connection type (Low / Mid / High / Ultra)
2. **Screen factor** — Larger screens get slightly lower general sensitivity
3. **Refresh rate factor** — Higher refresh rates allow slightly higher sensitivity
4. **DPI factor** — Higher DPI slightly reduces sensitivity for precision
5. **RAM factor** — More RAM allows higher sensitivity ceiling
6. **FPS factor** — Higher FPS targets allow slightly higher sensitivity
7. **Touch factor** — Touch devices get full sensitivity, non-touch get reduced
8. **Play style multipliers** — Each play style adjusts general, scope, sniper, free look, and fire button values
9. **Device seed** — A hash of device identity adds consistent variation so two different devices get different results, but the same device with the same inputs always gets the same output

The output includes: General, Red Dot, 2X Scope, 4X Scope, Sniper Scope, Free Look, Fire Button Size, DPI recommendation, FPS recommendation, Graphics recommendation, Aim Style, and Drag Style.

**Important:** These are recommendations, not guarantees. No setting guarantees headshots.

## How Redeem Code Data Works

1. `public/data/redeem-codes.json` contains the current code data
2. The GitHub Action `update-redeem-codes.yml` runs every 6 hours
3. It calls `scripts/fetch-redeem-codes.mjs` which fetches from approved public sources
4. New sources can be added to the `SOURCES` array in the script
5. The frontend reads the JSON file and displays codes with their status
6. **No codes are fabricated.** If no legitimate codes are available, the list is empty.

To add a new source, edit `scripts/fetch-redeem-codes.mjs` and add to the `SOURCES` array:
```js
const SOURCES = [
  { name: 'My Source', url: 'https://example.com/codes', type: 'json' },
];
```

## Security Considerations

- **No API keys** in frontend code — all configuration is in the GitHub Actions environment
- **No scraping** that bypasses CAPTCHAs, login walls, or robots.txt
- **No fake data** — empty states are shown when data is unavailable
- **No tracking** — localStorage only stores user preferences and last result
- **Input validation** — all user inputs are validated and sanitized
- **CSP-ready** — no inline scripts, no eval, no external script injection
- **Safe URLs** — all external links use `rel="noopener noreferrer"`

## Disclaimer

RΛIDΞN 亗 Sensei is not affiliated with or endorsed by Garena or Free Fire. All generated settings are recommendations based on available device information. No sensitivity setting guarantees headshots.

## License

MIT
