import { useState, useRef, useEffect, useCallback } from "react";
import {
  Zap, Layers, Factory, ExternalLink, Send, Loader2,
  ArrowRight, Atom, Target, AlertTriangle,
  TrendingUp, Award, Server, ChevronDown, ChevronRight,
  Compass, BookOpen, Search, MessageCircle, CheckCircle2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ============================================================================
// CONFIG — backend URL comes from Vite env var
// ============================================================================
//
// Set VITE_BACKEND_URL in:
//   - .env.local for local dev (http://localhost:3000)
//   - Vercel project Environment Variables for prod (https://your-app.up.railway.app)

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

// ============================================================================
// FRAMEWORK DATA (static — the loop doesn't change quarter-to-quarter)
// ============================================================================

const LOOP = [
  {
    ring: 0, code: "00", name: "THE CORE", label: "AI Labs & Frontier Chip Design",
    thesis: "Whoever designs the silicon that trains frontier models captures the largest share of the buildout. Duopoly economics on accelerators; oligopoly on the labs consuming them. This is the shortest path from dollar in to AGI out.",
    icon: Atom,
    color: "#f2b84b",
  },
  {
    ring: 1, code: "01", name: "FABRICATION", label: "Foundries & Semiconductor Equipment",
    thesis: "Every NVDA chip is a TSMC chip. Every TSMC chip is an ASML machine. Near-monopoly exposure to every frontier model trained on Earth — decades of replacement cost priced into new fab capacity.",
    icon: Factory,
    color: "#8fd3ff",
  },
  {
    ring: 2, code: "02", name: "POWER", label: "Electricity, Nuclear, Grid",
    thesis: "Compute scaling hits an electron wall before it hits a silicon wall. US data center load is projected to roughly double by 2030. Nuclear restarts, gas peakers, and grid equipment are the only near-term answer.",
    icon: Zap,
    color: "#7ee787",
  },
  {
    ring: 3, code: "03", name: "INFRASTRUCTURE", label: "Data Centers, Networking, Cooling",
    thesis: "Racks, optics, liquid cooling, and real estate. Less glamorous than GPUs but structurally short of supply for the entire decade. Buildout cycle is measured in years, not quarters.",
    icon: Server,
    color: "#b8a6ff",
  },
  {
    ring: 4, code: "04", name: "APPLICATION LAYER", label: "Direct AI Revenue Capture",
    thesis: "Companies whose revenue is materially AI-driven today — not AI-themed marketing. Further from the core means more execution risk, but more upside if product-market fit is real and durable.",
    icon: Target,
    color: "#ff9f7a",
  },
  {
    ring: 5, code: "05", name: "ADJACENT", label: "AI-Adjacent / Pivoting",
    thesis: "Off-the-loop businesses with credible pivots into the AI buildout — Bitcoin miners turning sites into AI hosting hubs being the canonical example. Highest variance bucket.",
    icon: Layers,
    color: "#f778ba",
  },
];

const RING_BY_NUM = Object.fromEntries(LOOP.map(l => [l.ring, l]));

// ============================================================================
// HELPERS
// ============================================================================

const fmtUsd = (v) => {
  if (v == null) return "—";
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
};

const fmtPct = (v) => v == null ? "—" : `${(v * 100).toFixed(0)}%`;

const tint = (hex, opacity) => {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

async function api(path) {
  const res = await fetch(`${BACKEND_URL}${path}`);
  if (!res.ok) throw new Error(`Backend ${res.status}`);
  return res.json();
}

// ============================================================================
// SHARED PIECES
// ============================================================================

function LoopDiagram() {
  const rings = [
    { ring: 4, r: 180, label: "04 · APPLICATION" },
    { ring: 3, r: 145, label: "03 · INFRASTRUCTURE" },
    { ring: 2, r: 110, label: "02 · POWER" },
    { ring: 1, r: 75,  label: "01 · FABRICATION" },
  ];
  return (
    <svg viewBox="-220 -220 440 440" className="w-full max-w-md mx-auto" style={{ maxHeight: 380 }}>
      {rings.map((c, i) => (
        <circle key={c.r} cx={0} cy={0} r={c.r} fill="none"
          stroke={RING_BY_NUM[c.ring].color} strokeOpacity={0.18 + i * 0.12} strokeWidth={1}
          strokeDasharray={i === 0 ? "2 4" : "0"} />
      ))}
      <circle cx={0} cy={0} r={8} fill={RING_BY_NUM[0].color} />
      <circle cx={0} cy={0} r={8} fill="none" stroke={RING_BY_NUM[0].color} strokeOpacity={0.45} strokeWidth={1}>
        <animate attributeName="r" values="8;28;8" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite" />
      </circle>
      {rings.map((c) => (
        <text key={c.r} x={0} y={-c.r - 8} textAnchor="middle"
          fill={RING_BY_NUM[c.ring].color} fontSize="9" className="i-mono" letterSpacing="2.5">
          {c.label}
        </text>
      ))}
      <text x={0} y={28} textAnchor="middle" fill="var(--fg)" fontSize="8" className="i-mono" letterSpacing="3">CORE</text>
    </svg>
  );
}

function RingPill({ ring, small = false }) {
  if (ring == null) {
    return (
      <span className="i-mono inline-block px-1.5 py-0.5 rounded"
        style={{ fontSize: small ? 9 : 10, color: "var(--muted)",
          backgroundColor: "transparent", border: "1px solid var(--border)" }}>
        OFF-LOOP
      </span>
    );
  }
  const meta = RING_BY_NUM[ring];
  return (
    <span className="i-mono inline-block px-1.5 py-0.5 rounded"
      style={{ fontSize: small ? 9 : 10, color: meta.color,
        backgroundColor: tint(meta.color, 0.09),
        border: `1px solid ${tint(meta.color, 0.3)}` }}>
      R{meta.code} · {meta.name.replace("THE ", "")}
    </span>
  );
}

function BackendBanner({ status, onRetry }) {
  if (status !== "down") return null;
  return (
    <div className="p-4 border rounded-lg flex items-start gap-3 mb-6"
      style={{ borderColor: "#8a4a4a", backgroundColor: "#1a0f0f" }}>
      <AlertTriangle size={18} style={{ color: "#d88", flexShrink: 0, marginTop: 1 }} />
      <div className="flex-1">
        <div className="i-mono text-[11px] tracking-[0.2em] mb-1" style={{ color: "#d88" }}>
          BACKEND UNREACHABLE
        </div>
        <div className="text-sm leading-relaxed" style={{ color: "var(--fg)" }}>
          Live SEC data isn't loading. Set <code className="i-mono" style={{ color: "var(--accent)" }}>VITE_BACKEND_URL</code> for the frontend and make sure the backend is running.
        </div>
      </div>
      <button onClick={onRetry}
        className="i-mono text-[11px] tracking-[0.15em] uppercase px-3 py-1.5 rounded transition hover:opacity-80"
        style={{ color: "var(--accent)", border: "1px solid var(--border)" }}>
        Retry
      </button>
    </div>
  );
}

// ============================================================================
// HEADER
// ============================================================================

function Header({ view, setView, status }) {
  const tabs = [
    { id: "start",     label: "Start Here" },
    { id: "dashboard", label: "Loop" },
    { id: "tracker",   label: "Smart Money" },
    { id: "picks",     label: "Picks" },
    { id: "advisor",   label: "Advisor" },
  ];
  const dotColor = status === "ok" ? "var(--success)" : status === "down" ? "var(--danger)" : "var(--accent)";
  return (
    <header className="border-b sticky top-0 z-40"
      style={{ borderColor: "var(--border)", backgroundColor: "rgba(9, 11, 15, 0.88)", backdropFilter: "blur(12px)" }}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: dotColor, boxShadow: `0 0 12px ${dotColor}` }} />
          <div className="min-w-0">
            <div className="i-serif text-xl leading-none italic truncate" style={{ color: "var(--fg)" }}>Innermost</div>
            <div className="i-mono text-[9px] tracking-[0.25em] mt-1" style={{ color: "var(--muted)" }}>
              AI · CAPITAL · RESEARCH
            </div>
          </div>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setView(tab.id)}
              className="px-2.5 py-1.5 rounded-md i-mono text-[10px] sm:text-[11px] tracking-[0.12em] uppercase transition flex-shrink-0"
              style={{ color: view === tab.id ? "var(--bg)" : "var(--fg)",
                backgroundColor: view === tab.id ? "var(--accent)" : "transparent" }}>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

// ============================================================================
// START HERE — investor-friendly onboarding
// ============================================================================

function StartAction({ icon: Icon, title, body, action, onClick }) {
  return (
    <button onClick={onClick}
      className="text-left border rounded-lg p-4 sm:p-5 transition hover:-translate-y-0.5"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}>
      <div className="flex items-start gap-3">
        <Icon size={18} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
        <div>
          <div className="text-base font-medium mb-1" style={{ color: "var(--fg)" }}>{title}</div>
          <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--muted)" }}>{body}</p>
          <div className="i-mono text-[10px] tracking-[0.16em] uppercase inline-flex items-center gap-2"
            style={{ color: "var(--accent)" }}>
            {action} <ArrowRight size={11} />
          </div>
        </div>
      </div>
    </button>
  );
}

function StartHere({ setView, goToAdvisor }) {
  const terms = [
    ["Innermost loop", "A map of who gets paid first if AI keeps scaling. Closer to the center means more direct exposure to compute, chips, power, and infrastructure."],
    ["13F filing", "A quarterly SEC filing that shows many large funds' long US stock positions. Useful, but delayed and incomplete."],
    ["On-loop", "A holding that maps to one of the AI buildout rings. Off-loop names may still be good businesses, just less direct to this thesis."],
    ["Conviction score", "A ranking signal that combines dollars held, number of funds holding the name, and whether the Situational Awareness fund owns it."],
  ];

  const steps = [
    ["1", "Learn the map", "Use the Loop tab to see why chips, fabs, power, infrastructure, apps, and adjacent pivots are separated."],
    ["2", "Inspect the evidence", "Use Smart Money to see real 13F holdings by fund, including position size and ring classification."],
    ["3", "Look for agreement", "Use Picks to find names where several AI-focused funds appear to cluster."],
    ["4", "Ask a plain-English question", "Use Advisor to translate a ticker, sector, or thesis into the framework."],
  ];

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
      <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-14 items-center mb-14">
        <div>
          <div className="i-mono text-[11px] tracking-[0.3em] mb-5" style={{ color: "var(--accent)" }}>
            START HERE · INVESTOR ORIENTATION
          </div>
          <h1 className="i-serif text-4xl sm:text-5xl md:text-7xl leading-[0.95] mb-7" style={{ color: "var(--fg)" }}>
            AI investing,<br />without the jargon.
          </h1>
          <p className="max-w-2xl text-base sm:text-lg leading-relaxed mb-5" style={{ color: "var(--muted)" }}>
            Innermost is a research tool for understanding which public companies sit closest to the AI buildout. It does not tell you what to buy. It helps you ask sharper questions about exposure, evidence, and risk.
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setView("dashboard")}
              className="i-mono text-[11px] tracking-[0.14em] uppercase px-4 py-2 rounded-md inline-flex items-center gap-2"
              style={{ backgroundColor: "var(--accent)", color: "var(--bg)" }}>
              Learn the loop <ArrowRight size={13} />
            </button>
            <button onClick={() => goToAdvisor("Explain the innermost loop framework for a serious investor who is new to AI infrastructure. Keep it plain-English and use one example from each ring.")}
              className="i-mono text-[11px] tracking-[0.14em] uppercase px-4 py-2 rounded-md inline-flex items-center gap-2"
              style={{ color: "var(--fg)", border: "1px solid var(--border)" }}>
              Ask Advisor <MessageCircle size={13} />
            </button>
          </div>
        </div>
        <div className="border rounded-lg p-5 sm:p-6" style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}>
          <div className="flex items-center gap-3 mb-5">
            <Compass size={18} style={{ color: "var(--accent)" }} />
            <div className="i-mono text-[11px] tracking-[0.22em]" style={{ color: "var(--accent)" }}>
              THE BASIC IDEA
            </div>
          </div>
          <p className="text-lg leading-relaxed mb-5" style={{ color: "var(--fg)" }}>
            If AI demand rises, capital tends to flow first toward the scarce inputs: advanced chips, the factories that make them, power, data centers, networking, and then the applications built on top.
          </p>
          <div className="space-y-3">
            {LOOP.slice(0, 5).map(layer => {
              const Icon = layer.icon;
              return (
                <div key={layer.code} className="flex items-center gap-3">
                  <Icon size={14} style={{ color: layer.color, flexShrink: 0 }} />
                  <div className="i-mono text-[10px] tracking-[0.14em]" style={{ color: "var(--muted)", width: 34 }}>
                    {layer.code}
                  </div>
                  <div className="text-sm" style={{ color: "var(--fg)" }}>{layer.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 mb-14">
        {terms.map(([term, definition]) => (
          <div key={term} className="border rounded-lg p-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}>
            <div className="i-mono text-[10px] tracking-[0.18em] uppercase mb-2" style={{ color: "var(--accent)" }}>
              {term}
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{definition}</p>
          </div>
        ))}
      </div>

      <div className="mb-14">
        <div className="i-mono text-[11px] tracking-[0.3em] mb-4" style={{ color: "var(--muted)" }}>
          YOUR FIRST 10 MINUTES
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {steps.map(([num, title, body]) => (
            <div key={num} className="border rounded-lg p-4 sm:p-5 flex gap-4"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}>
              <div className="i-mono text-sm flex items-center justify-center rounded-full flex-shrink-0"
                style={{ color: "var(--bg)", backgroundColor: "var(--accent)", width: 28, height: 28 }}>
                {num}
              </div>
              <div>
                <div className="text-base font-medium mb-1" style={{ color: "var(--fg)" }}>{title}</div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-10">
        <StartAction icon={BookOpen} title="Understand the framework"
          body="See the six rings and the investment logic behind each one."
          action="Open Loop" onClick={() => setView("dashboard")} />
        <StartAction icon={Search} title="Check what funds own"
          body="Review live 13F filings from the curated AI-heavy fund set."
          action="Open Smart Money" onClick={() => setView("tracker")} />
        <StartAction icon={TrendingUp} title="Find clustered conviction"
          body="Compare where multiple funds appear to agree by ring."
          action="Open Picks" onClick={() => setView("picks")} />
      </div>

      <div className="p-4 border rounded-lg flex items-start gap-3"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}>
        <CheckCircle2 size={15} style={{ color: "var(--success)", flexShrink: 0, marginTop: 2 }} />
        <div className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          A good first question for any company: is this business selling a scarce input into AI, using AI to improve an existing product, or simply benefiting from AI market enthusiasm?
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DASHBOARD (the framework — static)
// ============================================================================

function LayerCard({ layer, goToAdvisor }) {
  const [open, setOpen] = useState(layer.ring === 0);
  const Icon = layer.icon;
  return (
    <div className="border rounded-lg overflow-hidden transition"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-5 p-5 sm:p-6 text-left transition hover:opacity-95">
        <div className="i-mono text-xs tracking-widest flex-shrink-0"
          style={{ color: "var(--accent)", width: 32 }}>{layer.code}</div>
        <div className="w-px h-10 flex-shrink-0" style={{ backgroundColor: "var(--border)" }} />
        <div className="flex-1 min-w-0">
          <div className="i-serif text-2xl md:text-3xl leading-tight" style={{ color: "var(--fg)" }}>{layer.name}</div>
          <div className="i-mono text-[11px] mt-1 tracking-wider" style={{ color: "var(--muted)" }}>{layer.label}</div>
        </div>
        <Icon size={18} style={{ color: "var(--accent)" }} className="flex-shrink-0" />
      </button>
      {open && (
        <div className="px-5 sm:px-6 pb-6 animate-in">
          <div className="sm:pl-[69px]">
            <p className="leading-relaxed mb-5 max-w-3xl" style={{ color: "var(--fg)" }}>{layer.thesis}</p>
            <button onClick={() =>
                goToAdvisor(`Walk me through Ring ${layer.code} — ${layer.name} (${layer.label}). Which positions have the strongest smart-money conviction right now according to the live picks data, and what are the structural risks?`)}
              className="i-mono text-[11px] tracking-[0.15em] uppercase inline-flex items-center gap-2 transition hover:opacity-75"
              style={{ color: "var(--accent)" }}>
              Discuss with advisor <ArrowRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Dashboard({ goToAdvisor }) {
  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
      <div className="mb-16">
        <div className="i-mono text-[11px] tracking-[0.3em] mb-5" style={{ color: "var(--accent)" }}>
          ISSUE 001 · THE THESIS
        </div>
        <h1 className="i-serif text-4xl sm:text-5xl md:text-7xl leading-[0.95] mb-7" style={{ color: "var(--fg)" }}>
          Be in the <em>innermost</em><br />loop — or be out.
        </h1>
        <p className="max-w-2xl text-base sm:text-lg leading-relaxed" style={{ color: "var(--muted)" }}>
          The AI buildout has concentric rings of value capture. Closer to the core means structural exposure — fabs, accelerators, power, frontier labs. Further out means execution risk and narrative trading. This is a map, not a portfolio.
        </p>
      </div>
      <div className="mb-16 sm:mb-20 flex justify-center"><LoopDiagram /></div>
      <div className="mb-4">
        <div className="i-mono text-[11px] tracking-[0.3em]" style={{ color: "var(--muted)" }}>
          THE LAYERS — TAP TO EXPAND
        </div>
      </div>
      <div className="space-y-2">
        {LOOP.map((layer) => <LayerCard key={layer.code} layer={layer} goToAdvisor={goToAdvisor} />)}
      </div>
    </div>
  );
}

// ============================================================================
// TRACKER — live fund holdings
// ============================================================================

function FundHoldings({ cik, onError }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancel = false;
    setData(null); setErr(null);
    api(`/api/fund/${cik}/latest`)
      .then(d => { if (!cancel) setData(d); })
      .catch(e => { if (!cancel) { setErr(e.message); onError?.(); } });
    return () => { cancel = true; };
  }, [cik, onError]);

  if (err) return (
    <div className="i-mono text-[11px] py-4" style={{ color: "#d88" }}>Failed to load: {err}</div>
  );
  if (!data) return (
    <div className="flex items-center gap-2 i-mono text-[11px] py-4" style={{ color: "var(--muted)" }}>
      <Loader2 size={12} className="animate-spin" />
      <span className="tracking-[0.2em]">FETCHING FROM SEC EDGAR…</span>
    </div>
  );
  if (!data.filing) return (
    <div className="i-mono text-[11px] py-4" style={{ color: "var(--muted)" }}>No 13F filings on record.</div>
  );

  const { filing, summary, holdings } = data;
  return (
    <div className="animate-in">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 mb-5 i-mono text-[10px] tracking-[0.18em] uppercase"
        style={{ color: "var(--muted)" }}>
        <span>Period <span style={{ color: "var(--fg)" }}>{filing.reportDate}</span></span>
        <span>Filed <span style={{ color: "var(--fg)" }}>{filing.filingDate}</span></span>
        <span>{summary.positions} positions</span>
        <span>{fmtUsd(summary.totalValueUsd)} total</span>
        <span style={{ color: "var(--accent)" }}>{fmtPct(summary.onLoopShare)} on-loop</span>
      </div>
      <div className="border-t" style={{ borderColor: "var(--border)" }}>
        {holdings.slice(0, 25).map((h, i) => (
          <div key={i} className="flex items-baseline gap-3 py-2.5 border-b"
            style={{ borderColor: "var(--border)" }}>
            <div className="i-mono text-sm font-semibold flex-shrink-0"
              style={{ color: h.ring != null ? "var(--accent)" : "var(--muted)", width: 60 }}>
              {h.ticker || "—"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate" style={{ color: "var(--fg)" }}>
                {h.issuer}
                {h.putCall && (
                  <span className="i-mono text-[10px] ml-2 px-1.5 py-0.5 rounded"
                    style={{ color: h.putCall === "Put" ? "#d88" : "#7ab87a",
                      backgroundColor: h.putCall === "Put" ? "#1a0f0f" : "#0f1a0f" }}>
                    {h.putCall.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="mt-1"><RingPill ring={h.ring} small /></div>
            </div>
            <div className="i-mono text-sm flex-shrink-0 text-right" style={{ color: "var(--fg)" }}>
              {fmtUsd(h.valueUsd)}
            </div>
          </div>
        ))}
      </div>
      {holdings.length > 25 && (
        <div className="i-mono text-[10px] py-3 tracking-[0.18em]" style={{ color: "var(--muted)" }}>
          + {holdings.length - 25} more positions
        </div>
      )}
    </div>
  );
}

function FundCard({ fund, isOpen, onToggle, onError }) {
  return (
    <div className="border rounded-lg overflow-hidden transition"
      style={{ borderColor: fund.featured ? "var(--accent)" : "var(--border)",
        backgroundColor: "var(--card)",
        boxShadow: fund.featured ? "0 0 0 1px rgba(212, 165, 68, 0.12)" : "none" }}>
      <button onClick={onToggle} className="w-full p-5 sm:p-6 text-left transition hover:opacity-95">
        {fund.featured && (
          <div className="i-mono text-[10px] tracking-[0.25em] mb-2" style={{ color: "var(--accent)" }}>
            FEATURED · THE ROADMAP
          </div>
        )}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="i-serif text-2xl sm:text-3xl leading-tight" style={{ color: "var(--fg)" }}>{fund.name}</div>
          {isOpen ? <ChevronDown size={18} style={{ color: "var(--muted)", marginTop: 6 }} />
                  : <ChevronRight size={18} style={{ color: "var(--muted)", marginTop: 6 }} />}
        </div>
        <div className="i-mono text-[11px] mb-3 tracking-wider" style={{ color: "var(--muted)" }}>
          {fund.manager.toUpperCase()} · CIK {fund.cik.replace(/^0+/, "")}
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "var(--fg)" }}>{fund.thesis}</p>
      </button>
      {isOpen && (
        <div className="px-5 sm:px-6 pb-6 border-t" style={{ borderColor: "var(--border)" }}>
          <FundHoldings cik={fund.cik} onError={onError} />
          <div className="mt-4">
            <a href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${fund.cik}&type=13F-HR`}
              target="_blank" rel="noopener noreferrer"
              className="i-mono text-[10px] tracking-[0.18em] uppercase inline-flex items-center gap-2 transition hover:opacity-75"
              style={{ color: "var(--accent)" }}>
              View raw filings on SEC.gov <ExternalLink size={11} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function Tracker({ funds, status, retry, onAnyError }) {
  const [openCik, setOpenCik] = useState(funds[0]?.cik || null);
  useEffect(() => { if (!openCik && funds.length) setOpenCik(funds[0].cik); }, [funds, openCik]);

  const featured = funds.find(f => f.featured);
  const others = funds.filter(f => !f.featured);

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
      <div className="mb-12">
        <div className="i-mono text-[11px] tracking-[0.3em] mb-5" style={{ color: "var(--accent)" }}>
          ISSUE 002 · SMART MONEY
        </div>
        <h1 className="i-serif text-4xl sm:text-5xl md:text-7xl leading-[0.95] mb-6" style={{ color: "var(--fg)" }}>
          Read the filings.
        </h1>
        <p className="max-w-2xl text-base sm:text-lg leading-relaxed" style={{ color: "var(--muted)" }}>
          Funds above ~$100M in US equity AUM file 13Fs quarterly. Live data pulled directly from SEC EDGAR — every position tagged to its loop ring.
        </p>
      </div>

      <BackendBanner status={status} onRetry={retry} />

      {featured && (
        <div className="mb-8">
          <FundCard fund={featured} isOpen={openCik === featured.cik}
            onToggle={() => setOpenCik(openCik === featured.cik ? null : featured.cik)}
            onError={onAnyError} />
        </div>
      )}

      {others.length > 0 && (
        <>
          <div className="i-mono text-[11px] tracking-[0.3em] mb-3" style={{ color: "var(--muted)" }}>
            OTHER FUNDS
          </div>
          <div className="space-y-2">
            {others.map(fund => (
              <FundCard key={fund.cik} fund={fund} isOpen={openCik === fund.cik}
                onToggle={() => setOpenCik(openCik === fund.cik ? null : fund.cik)}
                onError={onAnyError} />
            ))}
          </div>
        </>
      )}

      <div className="mt-12 p-4 border rounded-lg flex items-start gap-3"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}>
        <AlertTriangle size={14} style={{ color: "var(--muted)", flexShrink: 0, marginTop: 2 }} />
        <div className="i-mono text-[10px] leading-relaxed tracking-[0.05em]" style={{ color: "var(--muted)" }}>
          13Fs are disclosed up to 45 days after quarter-end. Long US equity positions only — no shorts, no foreign listings, options shown but pair-trades obscured. Rear-view mirror, not real-time.
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PICKS — cross-fund aggregated conviction by ring
// ============================================================================

function PickRow({ pick }) {
  return (
    <div className="border rounded-lg p-4 sm:p-5 transition hover:-translate-y-0.5"
      style={{ borderColor: pick.featuredHolds ? "rgba(212, 165, 68, 0.4)" : "var(--border)",
        backgroundColor: "var(--card)" }}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 min-w-0">
          <div className="text-lg font-bold flex-shrink-0" style={{ color: "var(--accent)", letterSpacing: 0 }}>
            {pick.ticker}
          </div>
          <div className="text-base truncate" style={{ color: "var(--fg)" }}>{pick.issuer}</div>
        </div>
        {pick.featuredHolds && <Award size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />}
      </div>
      <div className="grid sm:flex sm:flex-wrap items-center gap-x-4 gap-y-1 text-sm"
        style={{ color: "var(--muted)" }}>
        <span>{fmtUsd(pick.totalValueUsd)} total</span>
        <span>{pick.fundCount} funds</span>
        <span style={{ color: "var(--accent)", fontWeight: 600 }}>Conviction {pick.convictionScore.toFixed(1)}</span>
        {pick.featuredHolds && <span style={{ color: "var(--accent)", fontWeight: 600 }}>SA holds</span>}
      </div>
      <div className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
        {pick.fundsHolding.slice(0, 4).map(f => f.name.replace(/ (Capital|Management|LP|LLC|Advisors).*$/i, "")).join(" · ")}
        {pick.fundsHolding.length > 4 && ` +${pick.fundsHolding.length - 4}`}
      </div>
    </div>
  );
}

function PicksTab({ status, retry, picks, picksLoading, picksErr }) {
  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
      <div className="mb-12">
        <div className="i-mono text-[11px] tracking-[0.3em] mb-5" style={{ color: "var(--accent)" }}>
          ISSUE 003 · CONVICTION
        </div>
        <h1 className="i-serif text-4xl sm:text-5xl md:text-7xl leading-[0.95] mb-6" style={{ color: "var(--fg)" }}>
          Where the smart<br />money agrees.
        </h1>
        <p className="max-w-2xl text-base sm:text-lg leading-relaxed mb-3" style={{ color: "var(--muted)" }}>
          Cross-fund conviction ranking. For each ring, the positions held by the most funds with the largest combined dollar value. Aschenbrenner's Situational Awareness fund amplifies the score — that's the canonical innermost-loop bet.
        </p>
        <div className="i-mono text-[10px] tracking-[0.18em] inline-flex items-center gap-2"
          style={{ color: "var(--muted)" }}>
          <span>SCORE = log₁₀($ value) + 2 × (# funds) + 3 if SA holds</span>
        </div>
      </div>

      <BackendBanner status={status} onRetry={retry} />

      {picksLoading && (
        <div className="flex items-center gap-3 i-mono text-[11px] py-8" style={{ color: "var(--muted)" }}>
          <Loader2 size={14} className="animate-spin" />
          <span className="tracking-[0.2em]">AGGREGATING ACROSS 10 FUNDS…</span>
        </div>
      )}

      {picksErr && status === "ok" && (
        <div className="i-mono text-[11px] py-4" style={{ color: "#d88" }}>
          Failed to aggregate picks: {picksErr}
        </div>
      )}

      {picks && (
        <>
          <div className="i-mono text-[10px] tracking-[0.18em] mb-6" style={{ color: "var(--muted)" }}>
            ANALYZED {picks.fundsAnalyzed} FUNDS · GENERATED {new Date(picks.generatedAt).toLocaleString()}
          </div>

          {LOOP.map(layer => {
            const ringData = picks.rings[layer.ring];
            if (!ringData?.picks?.length) return null;
            const Icon = layer.icon;
            return (
              <div key={layer.code} className="mb-10">
                <div className="flex items-center gap-3 mb-4 pb-2 border-b"
                  style={{ borderColor: "var(--border)" }}>
                  <Icon size={16} style={{ color: "var(--accent)" }} />
                  <div className="i-mono text-[11px] tracking-[0.25em]" style={{ color: "var(--accent)" }}>
                    RING {layer.code}
                  </div>
                  <div className="i-serif text-2xl" style={{ color: "var(--fg)" }}>{layer.name}</div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {ringData.picks.map(p => <PickRow key={p.ticker} pick={p} />)}
                </div>
              </div>
            );
          })}
        </>
      )}

      <div className="mt-8 p-4 border rounded-lg flex items-start gap-3"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}>
        <AlertTriangle size={14} style={{ color: "var(--muted)", flexShrink: 0, marginTop: 2 }} />
        <div className="i-mono text-[10px] leading-relaxed tracking-[0.05em]" style={{ color: "var(--muted)" }}>
          Conviction score is a research signal, not a recommendation. High score means many sophisticated investors have committed real capital to a position — it does NOT mean the position is correctly priced today, will outperform tomorrow, or fits any individual situation. Verify everything on SEC EDGAR.
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ADVISOR — chat with backend proxy (which forwards to Anthropic with system prompt)
// ============================================================================

function fmtChartValue(v) {
  const n = Number(v);
  if (!isFinite(n)) return String(v ?? "");
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (a >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(n % 1 ? 1 : 0);
}

function ChartBlock({ spec }) {
  const data = Array.isArray(spec?.data) ? spec.data.filter(d => d && d.label != null) : [];
  if (!data.length) return null;
  const values = data.map(d => Number(d.value) || 0);
  const max = Math.max(...values, 0) || 1;
  const min = Math.min(...values, 0);
  const range = max - Math.min(min, 0) || 1;
  const prefix = spec.prefix || "";
  const suffix = spec.suffix || spec.unit || "";
  const title = spec.title || "";
  return (
    <div className="my-5 p-4 border rounded-lg"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}>
      {title && (
        <div className="i-mono text-[10px] tracking-[0.25em] mb-3 uppercase break-words"
          style={{ color: "var(--accent)" }}>
          {title}
        </div>
      )}
      <div className="space-y-2">
        {data.map((d, i) => {
          const v = Number(d.value) || 0;
          const pct = ((v - Math.min(min, 0)) / range) * 100;
          return (
            <div key={i} className="flex items-center gap-3 text-xs">
              <div className="i-mono uppercase truncate w-20 sm:w-28 flex-shrink-0"
                style={{ color: "var(--muted)" }}>
                {d.label}
              </div>
              <div className="flex-1 h-5 rounded overflow-hidden min-w-0"
                style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
                <div className="h-full transition-all"
                  style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: "var(--accent)" }} />
              </div>
              <div className="i-mono tabular-nums w-16 text-right flex-shrink-0"
                style={{ color: "var(--fg)" }}>
                {prefix}{fmtChartValue(v)}{suffix}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const MARKDOWN_COMPONENTS = {
  h1: (p) => <h1 className="i-serif text-2xl mt-5 mb-3 break-words" {...p} />,
  h2: (p) => <h2 className="i-serif text-xl mt-5 mb-2 break-words" {...p} />,
  h3: (p) => <h3 className="i-mono text-[11px] tracking-[0.25em] uppercase mt-4 mb-2 break-words" style={{ color: "var(--accent)" }} {...p} />,
  h4: (p) => <h4 className="i-mono text-[11px] tracking-[0.2em] uppercase mt-3 mb-2 break-words" style={{ color: "var(--muted)" }} {...p} />,
  p: (p) => <p className="mb-3" {...p} />,
  strong: (p) => <strong style={{ color: "var(--accent)" }} {...p} />,
  em: (p) => <em className="italic" {...p} />,
  ul: (p) => <ul className="list-disc pl-5 mb-3 space-y-1" {...p} />,
  ol: (p) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...p} />,
  li: (p) => <li className="leading-relaxed" {...p} />,
  a: (p) => <a className="underline break-all" style={{ color: "var(--accent)" }} target="_blank" rel="noopener noreferrer" {...p} />,
  blockquote: (p) => <blockquote className="border-l-2 pl-3 my-3 italic" style={{ borderColor: "var(--accent)", color: "var(--muted)" }} {...p} />,
  hr: () => <hr className="my-4" style={{ borderColor: "var(--border)" }} />,
  table: (p) => (
    <div className="my-3 overflow-x-auto -mx-1">
      <table className="w-full text-xs border-collapse" {...p} />
    </div>
  ),
  tr: (p) => <tr className="border-b" style={{ borderColor: "var(--border)" }} {...p} />,
  th: (p) => <th className="i-mono text-[10px] tracking-[0.18em] uppercase text-left p-2 align-bottom" style={{ color: "var(--muted)" }} {...p} />,
  td: (p) => <td className="p-2 align-top" {...p} />,
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children, ...rest }) => {
    const match = /language-(\w+)/.exec(className || "");
    const lang = match?.[1];
    const text = String(children).replace(/\n$/, "");
    const isBlock = !!lang || text.includes("\n");
    if (isBlock && lang === "chart") {
      try {
        return <ChartBlock spec={JSON.parse(text)} />;
      } catch {
        // fall through to code rendering
      }
    }
    if (!isBlock) {
      return (
        <code className="px-1 py-0.5 rounded text-[0.85em] break-words"
          style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "var(--accent)" }} {...rest}>
          {children}
        </code>
      );
    }
    return (
      <pre className="my-3 p-3 rounded text-xs overflow-x-auto"
        style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
        <code className={className} {...rest}>{children}</code>
      </pre>
    );
  },
};

function MarkdownContent({ content }) {
  return (
    <div className="text-sm leading-relaxed break-words" style={{ color: "var(--fg)", overflowWrap: "anywhere" }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

function Message({ role, content }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-2xl px-4 py-3 rounded-lg text-sm leading-relaxed break-words"
          style={{ backgroundColor: "var(--accent)", color: "var(--bg)", overflowWrap: "anywhere" }}>
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-3xl min-w-0">
      <div className="i-mono text-[10px] tracking-[0.3em] mb-2" style={{ color: "var(--accent)" }}>
        THE ADVISOR
      </div>
      <MarkdownContent content={content} />
    </div>
  );
}

function Advisor({ prefilledQuestion, clearPrefilled, picks }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    if (prefilledQuestion) { setInput(prefilledQuestion); clearPrefilled(); }
  }, [prefilledQuestion, clearPrefilled]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const suggestions = [
    "Explain this framework to me as an investor who is new to AI infrastructure.",
    "Based on live conviction, what are the highest-signal picks in each ring right now?",
    "Where does Bloom Energy sit on the loop and why is it SA's top position?",
    "Is Palantir a real AI play or mostly narrative?",
  ];

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const newMessages = [...messages, { role: "user", content }];
    setMessages(newMessages); setInput(""); setLoading(true); setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Chat API ${res.status}: ${errText.slice(0, 200)}`);
      }
      const data = await res.json();
      const reply = data.content.filter(b => b.type === "text").map(b => b.text).join("\n");
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
      <div className="mb-10">
        <div className="i-mono text-[11px] tracking-[0.3em] mb-5" style={{ color: "var(--accent)" }}>
          ISSUE 004 · THE ADVISOR
        </div>
        <h1 className="i-serif text-4xl sm:text-5xl md:text-7xl leading-[0.95] mb-6" style={{ color: "var(--fg)" }}>
          Ask the loop.
        </h1>
        <p className="max-w-2xl text-base sm:text-lg leading-relaxed" style={{ color: "var(--muted)" }}>
          Pose a company, sector, or strategy. The advisor reasons through the innermost loop framework using live 13F conviction data — research signal, not investment advice.
        </p>
        {picks && (
          <div className="i-mono text-[10px] tracking-[0.18em] mt-4 inline-flex items-center gap-2"
            style={{ color: "var(--accent)" }}>
            <TrendingUp size={11} />
            LIVE CONVICTION DATA LOADED · {picks.fundsAnalyzed} FUNDS
          </div>
        )}
      </div>

      {messages.length === 0 && (
        <div className="mb-8">
          <div className="i-mono text-[11px] tracking-[0.25em] mb-3" style={{ color: "var(--muted)" }}>
            START HERE
          </div>
          <div className="grid md:grid-cols-2 gap-2">
            {suggestions.map(s => (
              <button key={s} onClick={() => send(s)}
                className="text-left p-4 border rounded-lg text-sm transition hover:-translate-y-0.5"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--card)", color: "var(--fg)" }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6 mb-8">
        {messages.map((m, i) => <Message key={i} role={m.role} content={m.content} />)}
        {loading && (
          <div className="flex items-center gap-3 i-mono text-[11px]" style={{ color: "var(--muted)" }}>
            <Loader2 size={14} className="animate-spin" />
            <span className="tracking-[0.25em]">ANALYZING…</span>
          </div>
        )}
        {error && (
          <div className="p-4 border rounded-lg i-mono text-xs"
            style={{ borderColor: "#8a4a4a", color: "#d88", backgroundColor: "#1a0f0f" }}>
            Error: {error}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-4">
        <div className="flex items-center gap-2 p-2 border rounded-lg"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--card)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
          <input type="text" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Ask about a company, sector, or strategy…"
            className="flex-1 bg-transparent outline-none px-3 py-2 text-sm"
            style={{ color: "var(--fg)" }} />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            aria-label="Send message"
            title="Send message"
            className="p-2.5 rounded transition disabled:opacity-40"
            style={{ backgroundColor: "var(--accent)", color: "var(--bg)" }}>
            <Send size={16} />
          </button>
        </div>
        <div className="i-mono text-[10px] text-center mt-3 tracking-[0.25em]"
          style={{ color: "var(--muted)" }}>
          RESEARCH TOOL · NOT INVESTMENT ADVICE · VERIFY ON SEC EDGAR
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// APP
// ============================================================================

export default function App() {
  const [view, setView] = useState("start");
  const [prefilledQuestion, setPrefilledQuestion] = useState(null);

  const [funds, setFunds] = useState([]);
  const [status, setStatus] = useState("loading"); // "loading" | "ok" | "down"
  const [picks, setPicks] = useState(null);
  const [picksLoading, setPicksLoading] = useState(false);
  const [picksErr, setPicksErr] = useState(null);

  const loadFunds = useCallback(async () => {
    setStatus("loading");
    try {
      const d = await api("/api/funds");
      setFunds(d.funds);
      setStatus("ok");
    } catch (e) {
      setStatus("down");
    }
  }, []);

  const loadPicks = useCallback(async () => {
    setPicksLoading(true); setPicksErr(null);
    try {
      const d = await api("/api/picks");
      setPicks(d);
    } catch (e) {
      setPicksErr(e.message);
    } finally {
      setPicksLoading(false);
    }
  }, []);

  useEffect(() => { loadFunds(); }, [loadFunds]);
  useEffect(() => {
    if (status === "ok" && !picks && !picksLoading) loadPicks();
  }, [status, picks, picksLoading, loadPicks]);

  const retryPicks = useCallback(() => {
    if (status === "down") {
      loadFunds();
      return;
    }
    loadPicks();
  }, [loadFunds, loadPicks, status]);

  const goToAdvisor = (question) => {
    setPrefilledQuestion(question);
    setView("advisor");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Source+Serif+4:opsz,wght@8..60,500;8..60,600&display=swap');
        :root {
          --bg: #090b0f;
          --fg: #f5f1e8;
          --accent: #f2b84b;
          --card: #151a22;
          --border: #3a4656;
          --muted: #b2bac7;
          --success: #6dd18a;
          --danger: #ef7d7d;
        }
        * { font-family: 'Atkinson Hyperlegible', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        html { font-size: 17px; }
        .i-serif {
          font-family: 'Source Serif 4', ui-serif, Georgia, serif;
          font-weight: 600;
          letter-spacing: 0;
        }
        .i-mono {
          font-family: 'Atkinson Hyperlegible', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          letter-spacing: 0 !important;
        }
        code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
        body { background: #090b0f; color: #f5f1e8; line-height: 1.6; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
        p { line-height: 1.7; }
        button { min-height: 40px; }
        .text-\\[9px\\] { font-size: 0.75rem !important; }
        .text-\\[10px\\] { font-size: 0.8125rem !important; }
        .text-\\[11px\\] { font-size: 0.875rem !important; }
        .text-xs { font-size: 0.875rem !important; }
        .text-sm { font-size: 0.9375rem !important; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        .animate-in { animation: fadeIn 0.25s ease-out; }
        ::selection { background: #f2b84b; color: #090b0f; }
      `}</style>
      <div className="min-h-screen" style={{ backgroundColor: "var(--bg)", color: "var(--fg)" }}>
        <Header view={view} setView={setView} status={status} />

        {view === "start"     && <StartHere setView={setView} goToAdvisor={goToAdvisor} />}
        {view === "dashboard" && <Dashboard goToAdvisor={goToAdvisor} />}
        {view === "tracker"   && <Tracker funds={funds} status={status} retry={loadFunds} onAnyError={() => {}} />}
        {view === "picks"     && <PicksTab status={status} retry={retryPicks}
                                  picks={picks} picksLoading={picksLoading} picksErr={picksErr} />}
        {view === "advisor"   && <Advisor prefilledQuestion={prefilledQuestion}
                                  clearPrefilled={() => setPrefilledQuestion(null)} picks={picks} />}

        <footer className="border-t mt-16 py-8" style={{ borderColor: "var(--border)" }}>
          <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
            <div className="i-mono text-[10px] tracking-[0.25em]" style={{ color: "var(--muted)" }}>
              INNERMOST · A RESEARCH FRAMEWORK · NOT ADVICE
            </div>
            <div className="i-mono text-[10px] tracking-[0.25em]" style={{ color: "var(--muted)" }}>
              DATA FROM SEC EDGAR · VERIFY EVERYTHING
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
