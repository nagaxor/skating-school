"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { LogoMark } from "@/components/Brand";
import { Avatar } from "@/components/ui";

// Renders a QR payload ("OSS1:<token>") as an SVG string. Generated in the
// browser, so the token never goes to a third-party QR service.
export function useQrSvg(payload, size = 220) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    if (!payload) return;
    let alive = true;
    QRCode.toString(payload, { type: "svg", errorCorrectionLevel: "M", margin: 1, width: size, color: { dark: "#030407", light: "#FFFFFF" } })
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(""));
    return () => { alive = false; };
  }, [payload, size]);
  return svg;
}

// Printable ID-card style attendance card (≈ 54×86 mm when printed).
export default function QrCard({ card, compact = false }) {
  const svg = useQrSvg(card?.payload, compact ? 160 : 220);
  return (
    <div className={`qr-card mx-auto bg-white text-ink-950 rounded-2xl overflow-hidden ring-1 ring-ink-900/10 shadow-lift ${compact ? "w-[220px]" : "w-[280px]"}`}>
      <div className="bg-ink-950 text-white px-4 py-3 flex items-center gap-2.5">
        <LogoMark size={26} />
        <div className="leading-tight">
          <div className="text-[12px] font-semibold">Online Skating School</div>
          <div className="text-[10px] text-lime-400 font-semibold uppercase tracking-[0.12em]">Attendance card</div>
        </div>
      </div>
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <Avatar name={card?.name || ""} initials={card?.avatar} src={card?.photo} size={compact ? 36 : 44} />
        <div className="min-w-0">
          <div className={`font-display font-semibold truncate ${compact ? "text-[14px]" : "text-[16px]"}`}>{card?.name}</div>
          <div className="text-[11.5px] text-ink-500 truncate">{card?.program}{card?.club ? ` · ${card.club}` : ""}</div>
        </div>
      </div>
      <div className="px-4 pb-4">
        <div className="aspect-square rounded-xl ring-1 ring-ink-900/10 p-2 bg-white flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
          dangerouslySetInnerHTML={{ __html: svg }} aria-label={`QR code for ${card?.name}`} role="img" />
        <div className="text-[10px] text-ink-400 text-center mt-2">Show this at the rink to mark attendance</div>
      </div>
    </div>
  );
}
