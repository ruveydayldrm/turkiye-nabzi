export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden>
        <defs>
          <linearGradient id="logo-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2ee6b8" />
            <stop offset="55%" stopColor="#8b7cff" />
            <stop offset="100%" stopColor="#ff6b6b" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="38" height="38" rx="11" fill="url(#logo-fill)" opacity="0.16" />
        <rect x="1.5" y="1.5" width="37" height="37" rx="10.5" fill="none" stroke="url(#logo-fill)" strokeOpacity="0.55" />
        <path
          d="M7 21h6l3-7 5 14 4-10 2 3h6"
          fill="none"
          stroke="url(#logo-fill)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="leading-tight">
        <div className="font-display text-lg font-semibold tracking-tight text-fg">Türkiye Nabzı</div>
        <div className="text-xs text-muted">İllere göre haber duygu haritası</div>
      </div>
    </div>
  );
}
