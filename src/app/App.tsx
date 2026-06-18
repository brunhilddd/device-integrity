import { useState, useEffect, useRef, useCallback } from "react";
import video1 from "../imports/vlipsy-grave-encounters-jump-scare-NK8ds1S2.mp4";
import video2 from "../imports/vlipsy-the-truth-about-mother-jump-scare-FbIubLPa.mp4";
import video3 from "../imports/vlipsy-grave-encounters-jump-scare-SSUkColU.mp4";

const HORROR_VIDEOS = [video1, video2, video3];

type Screen = "landing" | "scanning" | "suspense" | "horror" | "reveal";
type HorrorPhase = "none" | "flash" | "video";

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
  isCircle: boolean;
}

const DIMENSIONS = [
  { icon: "🧠", label: "Cognitive Processing Speed", tag: "IQ Pattern" },
  { icon: "❤️", label: "Emotional Intelligence Quotient", tag: "EQ Score" },
  { icon: "🔮", label: "Subconscious Response Layer", tag: "Psyche Depth" },
  { icon: "💡", label: "Creative Thinking Architecture", tag: "Creativity" },
  { icon: "👥", label: "Social Interaction Dynamics", tag: "Interpersonal" },
  { icon: "⚖️", label: "Decision-Making Framework", tag: "Judgment" },
  { icon: "🌊", label: "Stress Response Calibration", tag: "Resilience" },
];

const PROGRESS_STEPS = [
  { value: 0, ms: 0 },
  { value: 15, ms: 1000 },
  { value: 31, ms: 2400 },
  { value: 47, ms: 3800 },
  { value: 63, ms: 5300 },
  { value: 81, ms: 6900 },
  { value: 95, ms: 8600 },
  { value: 99, ms: 9800 },
];

const FUNNY_RESULTS = [
  { label: "Searching for girlfriend...", result: "404 Not Found", red: true },
  { label: "Checking bank account...", result: "Critical condition detected", red: true },
  { label: "Analyzing life decisions...", result: "Results unavailable", red: false },
  { label: "Measuring rizz levels...", result: "0.00 — below detectable range", red: true },
  { label: "Evaluating sleep schedule...", result: "Catastrophic failure (3am avg)", red: true },
  { label: "Scanning social skills...", result: "Severe deficiency (0.02 units)", red: true },
  { label: "Checking diet integrity...", result: "100% instant noodles confirmed", red: false },
];

// Returns the AudioContext so caller can store it in a ref (prevents GC)
function playEmergencyAlarm(durationSec: number): AudioContext | null {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Initial white noise blast
    const bufLen = Math.floor(ctx.sampleRate * 0.5);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(1.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.5);

    // Hi-lo siren sweep
    const siren = ctx.createOscillator();
    siren.type = "sawtooth";
    const sirenGain = ctx.createGain();
    sirenGain.gain.setValueAtTime(0.45, now);
    const cycleLen = 0.55;
    const cycles = Math.ceil(durationSec / cycleLen);
    for (let i = 0; i < cycles; i++) {
      const t = now + i * cycleLen;
      siren.frequency.setValueAtTime(960, t);
      siren.frequency.linearRampToValueAtTime(640, t + cycleLen * 0.5);
      siren.frequency.linearRampToValueAtTime(960, t + cycleLen);
    }
    siren.connect(sirenGain);
    sirenGain.connect(ctx.destination);
    siren.start(now);
    siren.stop(now + durationSec);

    // Harmonic overtone for urgency
    const osc2 = ctx.createOscillator();
    osc2.type = "square";
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.12, now);
    for (let i = 0; i < cycles; i++) {
      const t = now + i * cycleLen;
      osc2.frequency.setValueAtTime(1920, t);
      osc2.frequency.linearRampToValueAtTime(1280, t + cycleLen * 0.5);
      osc2.frequency.linearRampToValueAtTime(1920, t + cycleLen);
    }
    osc2.connect(osc2Gain);
    osc2Gain.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + durationSec);

    return ctx; // caller MUST store this in a ref to prevent GC
  } catch {
    return null;
  }
}

function makeConfetti(count: number): ConfettiPiece[] {
  const colors = ["#a78bfa", "#60a5fa", "#f472b6", "#34d399", "#fbbf24", "#f87171"];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: Math.random() * 2.5,
    duration: 2.5 + Math.random() * 3,
    size: 6 + Math.random() * 10,
    isCircle: Math.random() > 0.5,
  }));
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [progress, setProgress] = useState(0);
  const [completedDims, setCompletedDims] = useState<number[]>([]);
  const [suspenseStep, setSuspenseStep] = useState(-1);
  const [shake, setShake] = useState(false);
  const [horrorPhase, setHorrorPhase] = useState<HorrorPhase>("none");
  const [videoIndex, setVideoIndex] = useState(0);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const timers = useRef<number[]>([]);
  // Stored in ref so AudioContext is never garbage-collected mid-play
  const audioCtxRef = useRef<AudioContext | null>(null);
  // Keep a ref to current screen so event listeners always read fresh value
  const screenRef = useRef<Screen>("landing");
  useEffect(() => { screenRef.current = screen; }, [screen]);

  // ── Block page close / back-navigation while experience is active ──────────
  useEffect(() => {
    const blockClose = (e: BeforeUnloadEvent) => {
      if (screenRef.current === "landing" || screenRef.current === "reveal") return;
      e.preventDefault();
      // Chrome requires returnValue to be set
      e.returnValue = "";
    };

    // Intercept back/forward button: push a dummy state then swallow popstate
    const blockBack = () => {
      if (screenRef.current !== "landing" && screenRef.current !== "reveal") {
        // Push again so there's always something to swallow
        history.pushState(null, "", window.location.href);
      }
    };

    // When the tab is hidden (phone switches app), blast the alarm if in horror
    const handleVisibility = () => {
      if (document.hidden && screenRef.current === "horror") {
        // nothing extra needed — alarm audio keeps playing
      }
    };

    // Seed the history stack so the first popstate can be swallowed
    history.pushState(null, "", window.location.href);

    window.addEventListener("beforeunload", blockClose);
    window.addEventListener("popstate", blockBack);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("beforeunload", blockClose);
      window.removeEventListener("popstate", blockBack);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const after = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  };

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const stopAlarm = () => {
    try { audioCtxRef.current?.close(); } catch { /* ok */ }
    audioCtxRef.current = null;
  };

  const goToReveal = useCallback(() => {
    clearTimers();
    stopAlarm();
    setScreen("reveal");
    setHorrorPhase("none");
    setShake(false);
    setSuspenseStep(-1);
    setConfetti(makeConfetti(90));
  }, []);

  // ── Keyboard traps: Escape to skip, Ctrl+W/F4 blocked while active ──────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const s = screenRef.current;
      const isActive = s !== "landing" && s !== "reveal";

      // Escape → skip to reveal
      if (e.key === "Escape" && isActive) {
        goToReveal();
        return;
      }

      // Block Ctrl+W (close tab) and Ctrl+F4 (close tab) while active
      if (isActive && e.ctrlKey && (e.key === "w" || e.key === "W" || e.key === "F4")) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    // useCapture=true so we intercept before the browser handles it
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [goToReveal]);

  // ── Persistent fullscreen: re-enter if user exits during active screens ─────
  useEffect(() => {
    const handleFsChange = () => {
      // If fullscreen was exited and we're still in an active screen, re-enter
      if (!document.fullscreenElement) {
        const s = screenRef.current;
        if (s !== "landing" && s !== "reveal") {
          // Small delay so the browser doesn't reject the re-request
          setTimeout(() => {
            document.documentElement.requestFullscreen?.().catch(() => {});
          }, 150);
        }
      }
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const restart = useCallback(() => {
    clearTimers();
    stopAlarm();
    setScreen("landing");
    setProgress(0);
    setCompletedDims([]);
    setSuspenseStep(-1);
    setShake(false);
    setHorrorPhase("none");
    setVideoIndex(0);
    setConfetti([]);
  }, []);

  // Scanning phase
  useEffect(() => {
    if (screen !== "scanning") return;

    PROGRESS_STEPS.forEach(({ value, ms }) => {
      after(() => setProgress(value), ms);
    });

    DIMENSIONS.forEach((_, i) => {
      after(() => setCompletedDims(prev => [...prev, i]), 900 + i * 1200);
    });

    after(() => setScreen("suspense"), 11500);
    return clearTimers;
  }, [screen]);

  // Suspense phase
  useEffect(() => {
    if (screen !== "suspense") return;

    [0, 1000, 2100, 3200, 4200].forEach((ms, i) => {
      after(() => setSuspenseStep(i), ms);
    });

    after(() => setShake(true), 3800);
    after(() => {
      setVideoIndex(0);
      setScreen("horror");
      setHorrorPhase("flash");
      audioCtxRef.current = playEmergencyAlarm(60); // 60s covers all 3 clips
    }, 5800);

    return clearTimers;
  }, [screen]);

  // Horror phase
  useEffect(() => {
    if (screen !== "horror") return;
    after(() => setHorrorPhase("video"), 300);
    after(() => goToReveal(), 90000); // safety net
    return clearTimers;
  }, [screen]);

  const handleVideoEnded = useCallback(() => {
    setVideoIndex(prev => {
      const next = prev + 1;
      if (next >= HORROR_VIDEOS.length) {
        goToReveal();
        return prev;
      }
      return next;
    });
  }, [goToReveal]);

  const startScan = () => {
    // Enter fullscreen — this also "seeds" the fullscreenchange listener
    document.documentElement.requestFullscreen?.().catch(() => {});
    setScreen("scanning");
  };

  const shareLink = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(window.location.href);
    alert("Link copied! Send it to your next victim 😈");
  };

  return (
    <div
      className="min-h-screen w-full overflow-hidden"
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        animation: shake ? "appShake 0.1s ease-in-out infinite" : "none",
        // Prevent text selection and long-press context menu on mobile
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <style>{`
        @keyframes appShake {
          0%,100% { transform: translate(0,0); }
          20%  { transform: translate(-9px, 4px); }
          40%  { transform: translate(9px, -4px); }
          60%  { transform: translate(-7px, 5px); }
          80%  { transform: translate(7px, -5px); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { left: -60%; }
          100% { left: 110%; }
        }
        @keyframes confettiFall {
          0%   { transform: translateY(-30px) rotate(0deg); opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateY(110vh) rotate(800deg); opacity: 0; }
        }
        @keyframes revealDrop {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes danceBounce {
          0%,100% { transform: translateY(0)   rotate(-5deg) scale(1);    }
          25%     { transform: translateY(-22px) rotate(5deg) scale(1.1);  }
          75%     { transform: translateY(-10px) rotate(3deg) scale(1.05); }
        }
        @keyframes scanPulse {
          0%,100% { box-shadow: 0 0 0 0   rgba(124,58,237,0.25); }
          50%     { box-shadow: 0 0 0 12px rgba(124,58,237,0);    }
        }
        @keyframes dimIn {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0);     }
        }
        @keyframes suspenseFade {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes blink {
          0%,100% { opacity: 1; }
          50%     { opacity: 0; }
        }
        @keyframes progressPulse {
          0%,100% { opacity: 1; }
          50%     { opacity: 0.55; }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ═══════════════════ LANDING ═══════════════════ */}
      {screen === "landing" && (
        <div className="min-h-screen flex flex-col" style={{ background: "#f8f9ff" }}>
          {/* Nav */}
          <nav
            className="flex items-center justify-between border-b"
            style={{
              background: "white",
              borderColor: "#e5e7eb",
              padding: "clamp(0.75rem, 2vw, 1rem) clamp(1rem, 4vw, 1.5rem)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)", flexShrink: 0 }}
              >
                🔬
              </div>
              <span className="font-semibold text-sm" style={{ color: "#1e1b4b" }}>MindPulse™</span>
            </div>
            <span
              className="text-xs font-medium px-3 py-1.5 rounded-full"
              style={{ background: "#ede9fe", color: "#7c3aed", whiteSpace: "nowrap" }}
            >
              Free Assessment
            </span>
          </nav>

          {/* Hero */}
          <div
            className="flex-1 flex flex-col items-center justify-center text-center"
            style={{
              animation: "fadeUp 0.65s ease-out",
              padding: "clamp(1.5rem, 5vw, 3rem) clamp(1rem, 5vw, 1.5rem)",
            }}
          >
            {/* Social proof badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full text-xs font-medium mb-6"
              style={{
                background: "#ede9fe",
                color: "#7c3aed",
                padding: "0.5rem clamp(0.75rem, 3vw, 1rem)",
              }}
            >
              <span>✦</span>
              <span>Trusted by 2.8 million people worldwide</span>
            </div>

            <h1
              className="font-bold mb-4 leading-tight max-w-md"
              style={{
                fontFamily: "'Lora', Georgia, serif",
                color: "#1e1b4b",
                fontSize: "clamp(1.75rem, 6vw, 3rem)",
              }}
            >
              Discover What Your<br />
              <span
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Mind Truly Reveals
              </span>
            </h1>

            <p
              className="mb-8 max-w-sm leading-relaxed"
              style={{ color: "#6b7280", fontSize: "clamp(0.875rem, 2.5vw, 1rem)" }}
            >
              Our clinically-validated engine analyzes 7 cognitive dimensions
              to produce your unique psychological profile — instantly.
            </p>

            {/* Trust pills */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {[
                { icon: "🧬", text: "Clinically Validated" },
                { icon: "⚡", text: "Instant Results" },
                { icon: "🔒", text: "100% Private" },
              ].map(({ icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border"
                  style={{ background: "white", borderColor: "#e5e7eb", color: "#374151" }}
                >
                  <span>{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={startScan}
              className="rounded-2xl text-white font-semibold transition-all duration-200 hover:opacity-90 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
                boxShadow: "0 8px 32px rgba(124,58,237,0.35)",
                fontSize: "clamp(0.9rem, 3vw, 1rem)",
                padding: "clamp(0.85rem, 3vw, 1rem) clamp(1.5rem, 6vw, 2.5rem)",
                minHeight: "48px", // touch-friendly minimum
                width: "100%",
                maxWidth: "340px",
              }}
            >
              Begin Free Assessment →
            </button>
            <p className="mt-3 text-xs" style={{ color: "#9ca3af" }}>
              No sign-up required · Takes about 3 minutes
            </p>

            {/* Stat row */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-md">
              {[
                { label: "Accuracy", value: "97.3%" },
                { label: "Dimensions", value: "7" },
                { label: "Users today", value: "3,204" },
                { label: "Minutes", value: "~3" },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-2xl p-4 text-center border"
                  style={{ background: "white", borderColor: "#e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                >
                  <div className="text-xl font-bold mb-0.5" style={{ color: "#7c3aed" }}>{value}</div>
                  <div className="text-xs" style={{ color: "#9ca3af" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="py-4 text-center text-xs border-t"
            style={{ color: "#9ca3af", borderColor: "#e5e7eb", background: "white" }}
          >
            MindPulse™ Assessment · Developed with leading cognitive psychologists
          </div>
        </div>
      )}

      {/* ═══════════════════ SCANNING ═══════════════════ */}
      {screen === "scanning" && (
        <div className="min-h-screen flex flex-col" style={{ background: "#f8f9ff" }}>
          {/* Header */}
          <div className="px-6 pt-10 pb-5 text-center">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center text-3xl"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(59,130,246,0.12))",
                animation: "scanPulse 2s ease-in-out infinite",
              }}
            >
              🧠
            </div>
            <h2
              className="text-xl font-bold mb-1"
              style={{ fontFamily: "'Lora', Georgia, serif", color: "#1e1b4b" }}
            >
              Analyzing Your Neural Profile
            </h2>
            <p className="text-sm" style={{ color: "#6b7280" }}>
              Please keep this window open while we process...
            </p>
          </div>

          {/* Progress */}
          <div className="px-6 mb-6">
            <div className="flex justify-between text-xs font-medium mb-2">
              <span style={{ color: "#6b7280" }}>Overall Progress</span>
              <span style={{ color: "#7c3aed" }}>{progress}%</span>
            </div>
            <div
              className="w-full h-2.5 rounded-full overflow-hidden relative"
              style={{ background: "#e5e7eb" }}
            >
              <div
                className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #7c3aed, #3b82f6)",
                }}
              >
                <div
                  className="absolute top-0 bottom-0 w-16 opacity-50"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)",
                    animation: "shimmer 1.5s linear infinite",
                  }}
                />
              </div>
            </div>
            <p
              className="text-xs mt-2 text-center"
              style={{
                color: progress >= 99 ? "#d97706" : "#9ca3af",
                animation: progress >= 99 ? "progressPulse 0.8s ease-in-out infinite" : "none",
              }}
            >
              {progress >= 99
                ? "⚠ Unusual pattern detected — reviewing response..."
                : "Processing your cognitive signature..."}
            </p>
          </div>

          {/* Dimension cards */}
          <div className="flex-1 px-4 pb-6 space-y-2.5 overflow-y-auto scrollbar-hide">
            {DIMENSIONS.map((dim, i) => {
              const done = completedDims.includes(i);
              const active = !done && completedDims.length === i;
              return (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-2xl p-4 border transition-all duration-500"
                  style={{
                    background: done ? "white" : active ? "#faf5ff" : "#f9fafb",
                    borderColor: done ? "#e5e7eb" : active ? "#c4b5fd" : "#f3f4f6",
                    boxShadow: done
                      ? "0 2px 10px rgba(0,0,0,0.05)"
                      : active
                      ? "0 4px 16px rgba(124,58,237,0.12)"
                      : "none",
                    animation: done ? "dimIn 0.35s ease-out" : "none",
                  }}
                >
                  <span className="text-2xl w-9 text-center">{dim.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: done ? "#1e1b4b" : "#9ca3af" }}>
                      {dim.label}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "#d1d5db" }}>{dim.tag}</div>
                  </div>
                  <div className="shrink-0">
                    {done ? (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: "#7c3aed", color: "white" }}
                      >
                        ✓
                      </div>
                    ) : active ? (
                      <div
                        className="w-5 h-5 rounded-full border-2 animate-spin"
                        style={{ borderColor: "#7c3aed", borderTopColor: "transparent" }}
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: "#e5e7eb" }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════ SUSPENSE ═══════════════════ */}
      {screen === "suspense" && (
        <div
          className="min-h-screen flex flex-col items-center justify-center p-6"
          style={{ background: "#f8f9ff" }}
        >
          <div className="w-full max-w-sm space-y-4 text-center">
            {suspenseStep >= 0 && (
              <div
                className="rounded-3xl p-6 border"
                style={{
                  background: "white",
                  borderColor: "rgba(251,191,36,0.4)",
                  boxShadow: "0 8px 32px rgba(251,191,36,0.15)",
                  animation: "suspenseFade 0.5s ease-out",
                }}
              >
                <div className="text-4xl mb-3">⚠️</div>
                <div
                  className="text-lg font-bold"
                  style={{ fontFamily: "'Lora', Georgia, serif", color: "#92400e" }}
                >
                  Unusual Pattern Detected
                </div>
                <div className="text-sm mt-1.5" style={{ color: "#a16207" }}>
                  This occurs in only 0.3% of assessments
                </div>
              </div>
            )}

            {suspenseStep >= 1 && (
              <div
                className="rounded-2xl p-4 border text-left"
                style={{
                  background: "white",
                  borderColor: "#e5e7eb",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                  animation: "suspenseFade 0.4s ease-out",
                }}
              >
                <div
                  className="text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: "#9ca3af" }}
                >
                  Finding
                </div>
                <div className="text-sm font-medium" style={{ color: "#1e1b4b" }}>
                  Anomalous subconscious signature detected in your neural response profile
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              {suspenseStep >= 2 && (
                <div
                  className="flex items-center gap-3 rounded-xl p-3"
                  style={{ background: "#fefce8", animation: "suspenseFade 0.35s ease-out" }}
                >
                  <div
                    className="w-4 h-4 rounded-full border-2 animate-spin shrink-0"
                    style={{ borderColor: "#f59e0b", borderTopColor: "transparent" }}
                  />
                  <span className="text-sm text-left" style={{ color: "#92400e" }}>
                    Cross-referencing rare pattern database...
                  </span>
                </div>
              )}
              {suspenseStep >= 3 && (
                <div
                  className="flex items-center gap-3 rounded-xl p-3"
                  style={{ background: "#fff7ed", animation: "suspenseFade 0.35s ease-out" }}
                >
                  <div
                    className="w-4 h-4 rounded-full border-2 animate-spin shrink-0"
                    style={{ borderColor: "#ea580c", borderTopColor: "transparent" }}
                  />
                  <span className="text-sm text-left" style={{ color: "#9a3412" }}>
                    Opening classified cognitive segment...
                  </span>
                </div>
              )}
              {suspenseStep >= 4 && (
                <div
                  className="flex items-center gap-3 rounded-xl p-3"
                  style={{ background: "#fef2f2", animation: "suspenseFade 0.35s ease-out" }}
                >
                  <div
                    className="w-4 h-4 rounded-full border-2 animate-spin shrink-0"
                    style={{ borderColor: "#dc2626", borderTopColor: "transparent" }}
                  />
                  <span className="text-sm font-medium text-left" style={{ color: "#991b1b" }}>
                    Rendering your result now...
                  </span>
                </div>
              )}
            </div>

            {suspenseStep >= 3 && (
              <p
                className="text-xs pt-2"
                style={{ color: "#9ca3af", animation: "blink 0.85s step-end infinite" }}
              >
                Do not close this window
              </p>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════ HORROR ═══════════════════ */}
      {screen === "horror" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
          style={{
            background: horrorPhase === "flash" ? "#ffffff" : "#000000",
            animation: "appShake 0.07s ease-in-out infinite",
          }}
        >
          {horrorPhase === "video" && (
            <video
              key={videoIndex}
              src={HORROR_VIDEOS[videoIndex]}
              autoPlay
              playsInline
              muted={false}
              onEnded={handleVideoEnded}
              // object-cover fills the whole screen on any device/orientation
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          )}
        </div>
      )}

      {/* ═══════════════════ REVEAL ═══════════════════ */}
      {screen === "reveal" && (
        <div
          className="min-h-screen relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0f0c29 0%, #1a1a4e 40%, #302b63 70%, #24243e 100%)",
          }}
        >
          {/* Confetti */}
          <div className="fixed inset-0 pointer-events-none z-0">
            {confetti.map(p => (
              <div
                key={p.id}
                style={{
                  position: "absolute",
                  left: `${p.x}%`,
                  top: "-30px",
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                  borderRadius: p.isCircle ? "50%" : "2px",
                  animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
                }}
              />
            ))}
          </div>

          <div
            className="relative z-10 min-h-screen flex flex-col items-center justify-center"
            style={{ padding: "clamp(1.5rem, 5vw, 2.5rem) clamp(1rem, 4vw, 2.5rem)" }}
          >
            <div
              style={{
                fontSize: "clamp(4rem, 15vw, 7rem)",
                marginBottom: "clamp(1rem, 3vw, 1.5rem)",
                animation: "danceBounce 0.55s ease-in-out infinite",
              }}
            >
              🤡
            </div>

            <h1
              className="font-black text-center mb-3"
              style={{
                fontSize: "clamp(2rem, 8vw, 3.75rem)",
                background: "linear-gradient(90deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #ff6bff, #ff922b)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "revealDrop 0.55s ease-out",
              }}
            >
              😂 GOTCHA! 😂
            </h1>

            <h2
              className="font-bold text-white text-center mb-3"
              style={{
                fontSize: "clamp(1.1rem, 4vw, 1.5rem)",
                animation: "revealDrop 0.55s ease-out 0.1s both",
              }}
            >
              YOU&apos;VE BEEN PRANKED
            </h2>

            <p
              className="text-blue-300 text-center max-w-sm leading-relaxed"
              style={{
                fontSize: "clamp(0.8rem, 2.5vw, 1rem)",
                marginBottom: "clamp(1.5rem, 4vw, 2.5rem)",
                animation: "revealDrop 0.55s ease-out 0.2s both",
              }}
            >
              No personality was assessed. No data was accessed.
              <br />
              &ldquo;MindPulse™&rdquo; is completely made up. 🎭
            </p>

            {/* Fake results terminal */}
            <div
              className="w-full max-w-lg rounded-2xl overflow-hidden"
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(10px)",
                marginBottom: "clamp(1.5rem, 4vw, 2.5rem)",
                animation: "revealDrop 0.55s ease-out 0.3s both",
              }}
            >
              <div
                className="px-5 py-3 flex items-center gap-2 border-b text-xs"
                style={{ borderColor: "rgba(255,255,255,0.08)" }}
              >
                <span className="w-3 h-3 rounded-full inline-block" style={{ background: "#ff5f57" }} />
                <span className="w-3 h-3 rounded-full inline-block" style={{ background: "#febc2e" }} />
                <span className="w-3 h-3 rounded-full inline-block" style={{ background: "#28c840" }} />
                <span className="ml-2 text-gray-500 tracking-widest" style={{ fontFamily: "monospace" }}>
                  YOUR_REAL_RESULTS.txt
                </span>
              </div>
              <div
                style={{
                  padding: "clamp(0.75rem, 3vw, 1.25rem)",
                  fontFamily: "monospace",
                  fontSize: "clamp(0.65rem, 2vw, 0.75rem)",
                }}
                className="space-y-3"
              >
                {FUNNY_RESULTS.map((r, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-start gap-2 pb-3 border-b last:border-0 last:pb-0"
                    style={{ borderColor: "rgba(255,255,255,0.07)" }}
                  >
                    <span className="shrink-0" style={{ color: "#9ca3af" }}>{r.label}</span>
                    <span className="font-bold text-right" style={{ color: r.red ? "#ff6b6b" : "#ffd93d" }}>
                      {r.result}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="flex flex-col sm:flex-row gap-3 w-full max-w-sm"
              style={{ animation: "revealDrop 0.55s ease-out 0.45s both" }}
            >
              <button
                onClick={shareLink}
                className="flex-1 font-bold rounded-xl active:scale-95 transition-all"
                style={{
                  background: "#fbbf24",
                  color: "#000",
                  minHeight: "48px",
                  fontSize: "clamp(0.8rem, 2.5vw, 0.875rem)",
                  padding: "0.875rem 1.5rem",
                }}
              >
                😈 Prank Another Friend
              </button>
              <button
                onClick={restart}
                className="flex-1 font-bold rounded-xl active:scale-95 transition-all"
                style={{
                  background: "transparent",
                  border: "2px solid rgba(255,255,255,0.2)",
                  color: "rgba(255,255,255,0.7)",
                  minHeight: "48px",
                  fontSize: "clamp(0.8rem, 2.5vw, 0.875rem)",
                  padding: "0.875rem 1.5rem",
                }}
              >
                ↺ Restart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
