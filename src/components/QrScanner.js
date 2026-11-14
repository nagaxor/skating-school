"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Icon } from "@/components/Icons";
import { cx } from "@/components/ui";

// Camera QR scanner (jsQR, works in every modern browser) + a text field for
// USB/Bluetooth scanner guns, which "type" the code and press Enter.
// Calls onCode(text) for every decoded code; de-duplication is the caller's job.
export default function QrScanner({ onCode, paused = false }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const pausedRef = useRef(paused);
  const [state, setState] = useState("idle"); // idle | starting | on | denied | unsupported
  const [typed, setTyped] = useState("");
  pausedRef.current = paused;

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setState((s) => (s === "on" || s === "starting" ? "idle" : s));
  }, []);

  const tick = useCallback(() => {
    rafRef.current = requestAnimationFrame(tick);
    const now = performance.now();
    if (now - lastRef.current < 120 || pausedRef.current) return; // ~8 fps is plenty and saves battery
    lastRef.current = now;
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || video.readyState < 2) return;
    const w = 480, h = Math.round((video.videoHeight / video.videoWidth) * 480) || 360;
    canvas.width = w; canvas.height = h;
    const g = canvas.getContext("2d", { willReadFrequently: true });
    g.drawImage(video, 0, 0, w, h);
    const code = jsQR(g.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
    if (code?.data) onCode(code.data);
  }, [onCode]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setState("unsupported"); return; }
    setState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false });
      streamRef.current = stream;
      const v = videoRef.current;
      v.srcObject = stream;
      await v.play();
      setState("on");
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      setState(e?.name === "NotAllowedError" ? "denied" : "unsupported");
    }
  }, [tick]);

  useEffect(() => stop, [stop]);

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-ink-950">
        <video ref={videoRef} playsInline muted className={`absolute inset-0 w-full h-full object-cover ${state === "on" ? "" : "opacity-0"}`} />
        <canvas ref={canvasRef} className="hidden" />
        {state === "on" ? (
          <>
            {/* viewfinder */}
            <div className="absolute inset-[16%] rounded-3xl ring-2 ring-white/20">
              {["top-0 left-0 border-t-4 border-l-4 rounded-tl-3xl", "top-0 right-0 border-t-4 border-r-4 rounded-tr-3xl", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl", "bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl"].map((c) => (
                <span key={c} className={`absolute w-10 h-10 border-lime-400 ${c}`} />
              ))}
              <span className="absolute inset-x-3 h-0.5 bg-lime-400 shadow-glow-lime animate-[scanLine_2.2s_ease-in-out_infinite]" />
            </div>
            <button onClick={stop} className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-xl bg-ink-950/70 text-white text-xs font-semibold px-3 py-2 backdrop-blur hover:bg-ink-950/90">
              <Icon.Power width={13} height={13} /> Stop camera
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-6">
            <span className="w-14 h-14 rounded-2xl bg-lime-400 text-ink-950 flex items-center justify-center"><Icon.Command width={24} height={24} /></span>
            <div className="font-display text-lg font-semibold mt-4">
              {state === "denied" ? "Camera permission denied" : state === "unsupported" ? "Camera not available" : "Scan student QR cards"}
            </div>
            <p className="text-[13px] text-ink-400 mt-1 max-w-xs">
              {state === "denied" ? "Allow camera access in the browser's address bar, then try again." : state === "unsupported" ? "Use a USB scanner or type the code below." : "Point the camera at a card. Each scan marks the student present for today."}
            </p>
            {state !== "unsupported" && (
              <button onClick={start} disabled={state === "starting"} className="mt-5 inline-flex items-center gap-2 bg-lime-400 text-ink-950 font-semibold px-5 py-3 rounded-xl hover:bg-lime-300 transition disabled:opacity-60">
                <Icon.Zap width={16} height={16} /> {state === "starting" ? "Starting…" : state === "denied" ? "Try again" : "Start camera"}
              </button>
            )}
          </div>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if (typed.trim()) { onCode(typed.trim()); setTyped(""); } }} className="flex gap-2">
        <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="USB scanner or type the card code (OSS1:…)" className={cx.input} aria-label="Scanned code" autoComplete="off" spellCheck={false} />
        <button type="submit" className={cx.btnSecondary}>Mark</button>
      </form>
    </div>
  );
}
