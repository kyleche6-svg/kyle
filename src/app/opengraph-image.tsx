import { ImageResponse } from "next/og";

export const alt = "DollarWatch — Terminal-grade market intelligence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BAR_HEIGHTS = [70, 100, 88, 130, 250, 180, 130, 210];

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#07070a",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -80,
            width: 620,
            height: 620,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,122,26,0.35) 0%, rgba(255,122,26,0) 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            display: "flex",
            alignItems: "flex-end",
            gap: 14,
            opacity: 0.5,
          }}
        >
          {BAR_HEIGHTS.map((h, i) => (
            <div
              key={i}
              style={{
                width: 54,
                height: h,
                borderRadius: "6px 6px 0 0",
                background: "linear-gradient(180deg, #ff7a1a 0%, rgba(255,122,26,0.15) 100%)",
                display: "flex",
              }}
            />
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width={56} height={56} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="14" width="4" height="8" rx="1" fill="#ff7a1a" opacity="0.55" />
            <rect x="8" y="9" width="4" height="13" rx="1" fill="#ff7a1a" opacity="0.75" />
            <rect x="14" y="5" width="4" height="17" rx="1" fill="#ff7a1a" />
            <path d="M2 12 L9 6 L14 9 L22 2" stroke="#ff7a1a" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M17 2 H22 V7" stroke="#ff7a1a" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ display: "flex", fontSize: 42, fontWeight: 700, color: "#f7f5f2" }}>DollarWatch</div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 68,
            fontWeight: 700,
            color: "#f7f5f2",
            marginTop: 40,
            lineHeight: 1.05,
          }}
        >
          <div style={{ display: "flex" }}>Terminal-grade</div>
          <div style={{ display: "flex" }}>market intelligence.</div>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#928f9c", marginTop: 28, maxWidth: 700 }}>
          Real data, always attributed — not financial advice.
        </div>
      </div>
    ),
    { ...size },
  );
}
