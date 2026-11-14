import { ImageResponse } from "next/og";

// Social share card (Facebook, WhatsApp, X, LinkedIn) in the client palette.
// Used by every page that doesn't define its own.
export const alt = "Online Skating School: roller skating classes in Dhaka for ages 3+";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", backgroundImage: "linear-gradient(135deg, #030407 0%, #030407 45%, #0F2246 78%, #1246A3 100%)", padding: "64px 72px", position: "relative", fontFamily: "sans-serif" }}>
        <div style={{ position: "absolute", left: 60, right: 60, top: 150, bottom: 40, border: "2px solid rgba(142,180,247,0.18)", borderRadius: 9999, display: "flex" }} />
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 10, background: "#D4FF24", display: "flex" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "#0B0D12", border: "2px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 34, height: 8, borderRadius: 8, background: "#D4FF24", transform: "rotate(-35deg)", display: "flex" }} />
          </div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "white" }}>
            Online Skating <span style={{ color: "#5A8EF0", marginLeft: 10 }}>School</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 800, color: "white", lineHeight: 1.02, letterSpacing: -3 }}>Where young champions</div>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 800, color: "#D4FF24", lineHeight: 1.02, letterSpacing: -3 }}>learn to glide.</div>
          <div style={{ display: "flex", fontSize: 30, color: "#B4B8C2", marginTop: 26 }}>Roller skating classes for ages 3+ · Dhaka, Bangladesh</div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {["Uttara", "Bashundhara", "Aftab Nagar", "Gulshan"].map((b) => (
            <div key={b} style={{ display: "flex", fontSize: 24, color: "white", padding: "10px 20px", borderRadius: 999, border: "2px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.04)" }}>{b}</div>
          ))}
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: "#030407", padding: "10px 22px", borderRadius: 999, background: "#D4FF24", marginLeft: "auto" }}>Admissions open</div>
        </div>
      </div>
    ),
    size,
  );
}
