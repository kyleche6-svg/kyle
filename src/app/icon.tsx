import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Replaces the default Next.js favicon with the real brand mark — three
// ascending bars plus a breakout line, same geometry as Logo.tsx, in the
// site's signature amber against near-black.
export default function Icon() {
  return new ImageResponse(
    (
      <svg width={32} height={32} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="14" width="4" height="8" rx="1" fill="#ff7a1a" opacity="0.55" />
        <rect x="8" y="9" width="4" height="13" rx="1" fill="#ff7a1a" opacity="0.75" />
        <rect x="14" y="5" width="4" height="17" rx="1" fill="#ff7a1a" />
        <path d="M2 12 L9 6 L14 9 L22 2" stroke="#ff7a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 2 H22 V7" stroke="#ff7a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    { ...size },
  );
}
