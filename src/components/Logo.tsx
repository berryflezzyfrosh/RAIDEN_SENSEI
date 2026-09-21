export function Logo({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="RΛIDΞN 亗 Sensei logo"
    >
      <defs>
        <linearGradient id="raiden-logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00e5ff" />
          <stop offset="50%" stopColor="#ff2e7e" />
          <stop offset="100%" stopColor="#ffb800" />
        </linearGradient>
        <filter id="raiden-logo-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <polygon
        points="60,8 104,32 104,88 60,112 16,88 16,32"
        fill="none"
        stroke="url(#raiden-logo-grad)"
        strokeWidth="3"
        filter="url(#raiden-logo-glow)"
      />
      <polygon
        points="60,22 90,38 90,82 60,98 30,82 30,38"
        fill="none"
        stroke="url(#raiden-logo-grad)"
        strokeWidth="1.5"
        opacity="0.5"
      />
      <text
        x="60"
        y="58"
        textAnchor="middle"
        fontFamily="Orbitron, sans-serif"
        fontSize="22"
        fontWeight="900"
        fill="url(#raiden-logo-grad)"
        filter="url(#raiden-logo-glow)"
      >
        RΛIDΞN
      </text>
      <text
        x="60"
        y="78"
        textAnchor="middle"
        fontFamily="Orbitron, sans-serif"
        fontSize="14"
        fontWeight="700"
        fill="#00e5ff"
        opacity="0.9"
      >
        亗 SENSEI
      </text>
    </svg>
  );
}
