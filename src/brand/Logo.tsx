/**
 * TrueCost Lab brand mark: a price tag whose hole is a "true" checkmark dot — the idea that
 * the honest number sits behind the sticker. Simple, geometric, readable at 16px.
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="tcmark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b7cf6" />
          <stop offset="1" stopColor="#1256c7" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="url(#tcmark)" />
      <path d="M9.5 8.5h7.2c.8 0 1.6.3 2.1.9l5.8 5.8a2 2 0 0 1 0 2.8l-6.6 6.6a2 2 0 0 1-2.8 0l-5.8-5.8a3 3 0 0 1-.9-2.1V10.5a2 2 0 0 1 2-2Z" fill="#fff" fillOpacity="0.96" />
      <circle cx="13" cy="12.2" r="1.7" fill="#1256c7" />
      <path d="m14.6 19.4 2 2 3.6-3.8" fill="none" stroke="#1256c7" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark({ withBy = true }: { withBy?: boolean }) {
  return (
    <span className="brand-wordmark">
      <span>TrueCost</span>
      <span className="lab">Lab</span>
      {withBy && <span className="brand-by hide-mobile">by Cents of Adventure</span>}
    </span>
  );
}
