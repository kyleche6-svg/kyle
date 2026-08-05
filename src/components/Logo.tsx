export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="2" y="14" width="4" height="8" rx="1" fill="var(--accent)" opacity="0.55" />
      <rect x="8" y="9" width="4" height="13" rx="1" fill="var(--accent)" opacity="0.75" />
      <rect x="14" y="5" width="4" height="17" rx="1" fill="var(--accent)" />
      <path
        d="M2 12 L9 6 L14 9 L22 2"
        stroke="var(--accent)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M17 2 H22 V7" stroke="var(--accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
