// server.js — Innermost 13F backend
// Pulls live 13F filings from SEC EDGAR (free, no API key), parses holdings,
// classifies each position by "innermost loop" ring, and aggregates picks.
//
// Run: npm install && npm start
// Env: SEC_USER_AGENT="Your Name your@email.com"  (required by SEC)
//      PORT=3000
//      ALLOWED_ORIGINS=https://yourapp.com,http://localhost:5173

import express from "express";
import cors from "cors";
import { XMLParser } from "fast-xml-parser";

const app = express();
const PORT = process.env.PORT || 3000;
const UA = process.env.SEC_USER_AGENT || "Innermost Research research@example.com";
const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "https://innermost-gamma.vercel.app",
  "https://innermostinvest.com",
  "https://www.innermostinvest.com",
];
const CONFIGURED_ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);
const ALLOWED_ORIGINS = new Set([
  ...DEFAULT_ALLOWED_ORIGINS,
  ...CONFIGURED_ALLOWED_ORIGINS,
]);
const ALLOW_ALL_ORIGINS = ALLOWED_ORIGINS.has("*");
const HAS_REAL_SEC_CONTACT = Boolean(process.env.SEC_USER_AGENT && /\S+@\S+\.\S+/.test(process.env.SEC_USER_AGENT));

app.use(cors({
  origin(origin, cb) {
    if (!origin || ALLOW_ALL_ORIGINS || ALLOWED_ORIGINS.has(origin)) {
      cb(null, true);
      return;
    }
    cb(new Error("Origin not allowed by CORS"));
  },
}));
app.use(express.json({ limit: "1mb" }));

// Anthropic chat proxy uses claude-sonnet-4-6 by default; override via env.
const ADVISOR_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

// ---------------------------------------------------------------------------
// FUND REGISTRY — curated cast, verified Apr 2026
// ---------------------------------------------------------------------------

const FUNDS = [
  { cik: "0002045724", name: "Situational Awareness LP", manager: "Leopold Aschenbrenner", featured: true,
    thesis: "Pure-play AGI thesis built on the 'Situational Awareness' essay. $5.5B book heavy in semis, power, and AI-hosting infrastructure — the cleanest innermost-loop roadmap in public filings." },
  { cik: "0001135730", name: "Coatue Management", manager: "Philippe Laffont",
    thesis: "Tiger Cub; ~40% tech allocation. $40B book with top positions in TSM, MSFT, META, AMZN. Vocal that AI capex pays off." },
  { cik: "0001541617", name: "Altimeter Capital", manager: "Brad Gerstner",
    thesis: "Concentrated growth-tech book led by NVDA, META, MSFT. Gerstner has become a prominent public voice on the AI capex cycle." },
  { cik: "0001387322", name: "Whale Rock Capital", manager: "Alex Sacerdote",
    thesis: "Tech-focused long/short with heavy AI infrastructure exposure." },
  { cik: "0001569049", name: "Light Street Capital", manager: "Glen Kacher",
    thesis: "Growth-tech specialist; recent top holdings TSM, NVDA, AVGO, CEG." },
  { cik: "0001167483", name: "Tiger Global Management", manager: "Chase Coleman",
    thesis: "Public book re-concentrated around AI winners post-2022 drawdown; ~41% tech allocation." },
  { cik: "0001061165", name: "Lone Pine Capital", manager: "Lone Pine team (Mandel emeritus)",
    thesis: "Tiger Cub; Mandel stepped back from day-to-day management but the book remains AI-tilted." },
  { cik: "0001697748", name: "ARK Investment Management", manager: "Cathie Wood",
    thesis: "Disruptive innovation ETFs with fully transparent daily holdings — retail-facing, high-beta AI exposure." },
  { cik: "0001423053", name: "Citadel Advisors", manager: "Ken Griffin",
    thesis: "Multi-strategy quant giant; Q3 2025 saw substantial increase in AI infrastructure + energy positions." },
  { cik: "0001037389", name: "Renaissance Technologies", manager: "Renaissance Institutional team",
    thesis: "Archetypal quant; broad book but the Institutional Equities Fund has scaled AI infrastructure exposure." },
];

// ---------------------------------------------------------------------------
// INNERMOST LOOP CLASSIFIER
// Each holding is tagged to a ring based on ticker / issuer name match.
// ---------------------------------------------------------------------------

const RING_META = {
  0: { code: "00", name: "Core",          label: "AI Labs & Frontier Chip Design" },
  1: { code: "01", name: "Fabrication",   label: "Foundries & Semi Equipment"      },
  2: { code: "02", name: "Power",         label: "Electricity, Nuclear, Grid"      },
  3: { code: "03", name: "Infrastructure",label: "Data Centers, Networking, Cooling"},
  4: { code: "04", name: "Application",   label: "Direct AI Revenue Capture"       },
  5: { code: "05", name: "Adjacent",      label: "AI-Adjacent / Pivoting"          },
};

// Name-fragment to { ring, ticker } map (case-insensitive substring matching).
// SEC filings use abbreviated issuer names (MATLS, MFG, CORP NEW, etc.), so we
// match on the shortest distinctive fragment rather than the full marketing name.
const CLASSIFIER = [
  // Ring 00 - CORE
  ["nvidia",                     { ring: 0, ticker: "NVDA"  }],
  ["broadcom",                   { ring: 0, ticker: "AVGO"  }],
  ["microsoft",                  { ring: 0, ticker: "MSFT"  }],
  ["meta platforms",             { ring: 0, ticker: "META"  }],
  ["alphabet",                   { ring: 0, ticker: "GOOGL" }],
  ["advanced micro",             { ring: 0, ticker: "AMD"   }],
  ["amazon",                     { ring: 0, ticker: "AMZN"  }],
  ["intel corp",                 { ring: 0, ticker: "INTC"  }],
  ["apple inc",                  { ring: 0, ticker: "AAPL"  }],
  ["oracle corp",                { ring: 0, ticker: "ORCL"  }],
  // Ring 01 - FABRICATION
  ["taiwan semi",                { ring: 1, ticker: "TSM"   }],
  ["asml",                       { ring: 1, ticker: "ASML"  }],
  ["applied mat",                { ring: 1, ticker: "AMAT"  }],   // catches "APPLIED MATLS" and "APPLIED MATERIALS"
  ["lam research",               { ring: 1, ticker: "LRCX"  }],
  ["kla corp",                   { ring: 1, ticker: "KLAC"  }],
  ["micron tech",                { ring: 1, ticker: "MU"    }],
  ["marvell tech",               { ring: 1, ticker: "MRVL"  }],
  ["vaneck semi",                { ring: 1, ticker: "SMH"   }],
  ["tower semi",                 { ring: 1, ticker: "TSEM"  }],
  ["sandisk",                    { ring: 1, ticker: "SNDK"  }],
  // Ring 02 - POWER
  ["vistra",                     { ring: 2, ticker: "VST"   }],
  ["constellation energy",       { ring: 2, ticker: "CEG"   }],
  ["talen energy",               { ring: 2, ticker: "TLN"   }],
  ["ge vernova",                 { ring: 2, ticker: "GEV"   }],
  ["nrg energy",                 { ring: 2, ticker: "NRG"   }],
  ["bloom energy",               { ring: 2, ticker: "BE"    }],
  ["public svc enterprise",      { ring: 2, ticker: "PEG"   }],
  ["public service enterprise",  { ring: 2, ticker: "PEG"   }],
  ["nextera",                    { ring: 2, ticker: "NEE"   }],
  ["eaton corp",                 { ring: 2, ticker: "ETN"   }],   // power management + electrical infra
  ["eqt corp",                   { ring: 2, ticker: "EQT"   }],   // natural gas for power gen
  // Ring 03 - INFRASTRUCTURE
  ["vertiv",                     { ring: 3, ticker: "VRT"   }],
  ["arista networks",            { ring: 3, ticker: "ANET"  }],
  ["digital realty",             { ring: 3, ticker: "DLR"   }],
  ["equinix",                    { ring: 3, ticker: "EQIX"  }],
  ["coreweave",                  { ring: 3, ticker: "CRWV"  }],
  ["super micro",                { ring: 3, ticker: "SMCI"  }],
  ["dell tech",                  { ring: 3, ticker: "DELL"  }],
  ["lumentum",                   { ring: 3, ticker: "LITE"  }],   // AI networking optics
  ["coherent corp",              { ring: 3, ticker: "COHR"  }],   // AI networking optics
  // Ring 04 - APPLICATION
  ["palantir",                   { ring: 4, ticker: "PLTR"  }],
  ["salesforce",                 { ring: 4, ticker: "CRM"   }],
  ["servicenow",                 { ring: 4, ticker: "NOW"   }],
  ["crowdstrike",                { ring: 4, ticker: "CRWD"  }],
  ["snowflake",                  { ring: 4, ticker: "SNOW"  }],
  ["datadog",                    { ring: 4, ticker: "DDOG"  }],
  // Ring 05 - ADJACENT (BTC miners pivoting to AI hosting, and related)
  ["iren limited",               { ring: 5, ticker: "IREN"  }],
  ["iris energy",                { ring: 5, ticker: "IREN"  }],
  ["cipher mining",              { ring: 5, ticker: "CIFR"  }],
  ["riot platforms",             { ring: 5, ticker: "RIOT"  }],
  ["bitdeer",                    { ring: 5, ticker: "BTDR"  }],
  ["applied digital",            { ring: 5, ticker: "APLD"  }],
  ["core scientific",            { ring: 5, ticker: "CORZ"  }],
  ["marathon digital",           { ring: 5, ticker: "MARA"  }],
];

function classify(issuerName) {
  const n = (issuerName || "").toLowerCase();
  for (const [frag, meta] of CLASSIFIER) {
    if (n.includes(frag)) return meta;
  }
  return null; // off-loop
}

// ---------------------------------------------------------------------------
// CACHE (in-memory, TTL'd)
// ---------------------------------------------------------------------------

const cache = new Map();
const TTL = 1000 * 60 * 60 * 6; // 6 hours — 13Fs only change quarterly

function getCached(key) {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.t > TTL) { cache.delete(key); return null; }
  return e.v;
}
function setCached(key, v) { cache.set(key, { v, t: Date.now() }); }

// ---------------------------------------------------------------------------
// SEC EDGAR CLIENT
// ---------------------------------------------------------------------------

const SEC_HEADERS = { "User-Agent": UA, "Accept-Encoding": "gzip, deflate" };

// 13Fs are due 45 days after quarter-end. Given a filing date, return the
// quarter-end it covers. Filings in Feb→Apr cover prior Dec 31; May→Jul cover
// Mar 31; Aug→Oct cover Jun 30; Nov→Jan cover Sep 30.
function derivePeriod(filingDateStr) {
  if (!filingDateStr) return "";
  const d = new Date(filingDateStr);
  if (isNaN(d)) return filingDateStr;
  const m = d.getUTCMonth();                // 0..11
  const y = d.getUTCFullYear();
  if (m >= 1 && m <= 3)  return `${y - 1}-12-31`;  // Feb-Apr → prior Q4
  if (m >= 4 && m <= 6)  return `${y}-03-31`;      // May-Jul → Q1
  if (m >= 7 && m <= 9)  return `${y}-06-30`;      // Aug-Oct → Q2
  return `${m === 0 ? y - 1 : y}-09-30`;           // Nov-Jan → Q3
}

async function secFetch(url) {
  // SEC asks for ~10 req/sec max; we are nowhere near that with caching.
  const res = await fetch(url, { headers: SEC_HEADERS });
  if (!res.ok) throw new Error(`SEC ${res.status} on ${url}`);
  return res;
}

// Get the list of 13F-HR filings for a CIK.
// We prefer the Atom feed on www.sec.gov because data.sec.gov is commonly
// blocked for datacenter IP ranges (returns 503) while www.sec.gov is not.
async function getFilings(cik) {
  const key = `filings:${cik}`;
  const hit = getCached(key);
  if (hit) return hit;

  const padded = cik.replace(/^0+/, "").padStart(10, "0");
  const url = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${padded}`
    + `&type=13F-HR&dateb=&owner=include&count=40&output=atom`;
  const xml = await (await secFetch(url)).text();

  // Parse atom entries
  const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });
  const doc = parser.parse(xml);
  const entries = doc.feed?.entry || [];
  const arr = Array.isArray(entries) ? entries : [entries];

  // Get company name too
  const companyName = doc.feed?.["company-info"]?.["conformed-name"] || null;

  const filings = arr.map(e => {
    const c = e.content || {};
    const filingDate = String(c["filing-date"] || "").trim();
    return {
      accession: String(c["accession-number"] || "").trim(),
      form:      String(c["filing-type"] || "").trim(),
      filingDate,
      reportDate: derivePeriod(filingDate),
      indexHref: String(c["filing-href"] || "").trim(),
    };
  }).filter(f => f.accession && (f.form === "13F-HR" || f.form === "13F-HR/A"));

  const result = { companyName, filings };
  setCached(key, result);
  return result;
}

// Get the index page for a specific filing to find the info table XML.
async function getFilingIndex(cik, accession) {
  const numCik = cik.replace(/^0+/, "");
  const accNoDash = accession.replace(/-/g, "");
  const base = `https://www.sec.gov/Archives/edgar/data/${numCik}/${accNoDash}/`;
  const html = await (await secFetch(base)).text();
  // All .xml hrefs on the index page.
  const links = [...html.matchAll(/href="([^"]+\.xml)"/g)].map(m => m[1]);
  // Prefer the raw infotable.xml (the one NOT under xslForm13F_X02/).
  // Fall back to any xml that isn't primary_doc.
  const raw = links.filter(l => !/xslForm/i.test(l) && !/primary_doc/i.test(l));
  const styled = links.filter(l => !/primary_doc/i.test(l));
  const chosen = raw[0] || styled[0] || links[0];
  if (!chosen) throw new Error("No XML file found in filing index");
  return { infoTableUrl: new URL(chosen, base).toString() };
}

// Parse info table XML into a list of holdings.
function parseInfoTable(xml) {
  const parser = new XMLParser({
    ignoreAttributes: true,
    removeNSPrefix: true,
    parseTagValue: false, // keep strings, we parse numbers ourselves
  });
  const doc = parser.parse(xml);
  // Structure: informationTable > infoTable[]
  const table = doc.informationTable || doc.infotable || doc;
  const rows = table.infoTable || table.infotable || [];
  const arr = Array.isArray(rows) ? rows : [rows];

  return arr.map(r => {
    const shares = Number(r.shrsOrPrnAmt?.sshPrnamt || 0);
    // SEC 13F information tables report value in thousands of dollars.
    const valueUsd = Number(r.value || 0) * 1000;
    return {
      issuer: String(r.nameOfIssuer || "").trim(),
      titleOfClass: String(r.titleOfClass || "").trim(),
      cusip: String(r.cusip || "").trim(),
      valueUsd,
      shares,
      putCall: r.putCall ? String(r.putCall).trim() : null,
    };
  }).filter(h => h.issuer); // drop empties
}

// Get the latest 13F holdings for a fund, classified.
async function getLatestHoldings(cik) {
  const key = `latest:${cik}`;
  const hit = getCached(key);
  if (hit) return hit;

  const { filings } = await getFilings(cik);
  if (!filings.length) return { filing: null, holdings: [], summary: null };

  const latest = filings[0];
  const { infoTableUrl } = await getFilingIndex(cik, latest.accession);
  const xml = await (await secFetch(infoTableUrl)).text();
  const raw = parseInfoTable(xml);

  // Collapse by issuer + title (positions can appear on multiple lines per manager)
  const grouped = new Map();
  for (const h of raw) {
    const k = `${h.issuer}|${h.titleOfClass}|${h.putCall || ""}`;
    const g = grouped.get(k) || { ...h, valueUsd: 0, shares: 0 };
    g.valueUsd += h.valueUsd;
    g.shares   += h.shares;
    grouped.set(k, g);
  }

  const holdings = [...grouped.values()]
    .map(h => {
      const cls = classify(h.issuer);
      return {
        ...h,
        ring: cls?.ring ?? null,
        ringName: cls ? RING_META[cls.ring].name : null,
        ticker: cls?.ticker ?? null,
      };
    })
    .sort((a, b) => b.valueUsd - a.valueUsd);

  const total = holdings.reduce((s, h) => s + h.valueUsd, 0);
  const onLoop = holdings.filter(h => h.ring !== null);
  const loopValue = onLoop.reduce((s, h) => s + h.valueUsd, 0);

  const result = {
    filing: latest,
    summary: {
      totalValueUsd: total,
      positions: holdings.length,
      onLoopPositions: onLoop.length,
      onLoopShare: total > 0 ? loopValue / total : 0,
    },
    holdings,
  };
  setCached(key, result);
  return result;
}

// ---------------------------------------------------------------------------
// PICKS AGGREGATOR
// Sums conviction across funds: for each ticker, count # of funds holding it,
// sum $ value across funds, and compute a "smart-money score".
// ---------------------------------------------------------------------------

async function getPicks() {
  const key = "picks:all";
  const hit = getCached(key);
  if (hit) return hit;

  const fundResults = await Promise.allSettled(
    FUNDS.map(async f => ({ fund: f, data: await getLatestHoldings(f.cik) }))
  );

  const byTicker = new Map();
  for (const r of fundResults) {
    if (r.status !== "fulfilled") continue;
    const { fund, data } = r.value;
    const fundPositions = new Map();
    for (const h of data.holdings) {
      if (!h.ticker) continue; // only loop-classified
      const k = h.ticker;
      const existing = fundPositions.get(k) || {
        ticker: k, ring: h.ring, ringName: h.ringName,
        issuer: h.issuer, valueUsd: 0, shares: 0,
        putCall: null,
      };
      existing.valueUsd += h.valueUsd;
      existing.shares += h.shares;
      existing.putCall = existing.putCall && existing.putCall !== h.putCall
        ? "Mixed"
        : (existing.putCall || h.putCall);
      fundPositions.set(k, existing);
    }

    for (const [k, h] of fundPositions) {
      const agg = byTicker.get(k) || {
        ticker: k, ring: h.ring, ringName: h.ringName,
        issuer: h.issuer, totalValueUsd: 0, fundCount: 0,
        fundsHolding: [], featuredHolds: false,
      };
      agg.totalValueUsd += h.valueUsd;
      agg.fundCount += 1;
      agg.fundsHolding.push({
        name: fund.name, manager: fund.manager,
        valueUsd: h.valueUsd, shares: h.shares,
        putCall: h.putCall,
      });
      if (fund.featured) agg.featuredHolds = true;
      byTicker.set(k, agg);
    }
  }

  // Conviction score = log($ value) + 2 * (# funds holding) + 3 if featured (Situational Awareness) holds
  const picks = [...byTicker.values()].map(p => ({
    ...p,
    convictionScore: Math.log10(Math.max(1, p.totalValueUsd)) + 2 * p.fundCount + (p.featuredHolds ? 3 : 0),
  }));

  // Group by ring, sort by score within ring, top 5 per ring
  const byRing = {};
  for (let r = 0; r <= 5; r++) byRing[r] = { ...RING_META[r], picks: [] };
  for (const p of picks) byRing[p.ring].picks.push(p);
  for (const r of Object.keys(byRing)) {
    byRing[r].picks.sort((a, b) => b.convictionScore - a.convictionScore);
    byRing[r].picks = byRing[r].picks.slice(0, 5);
  }

  const result = {
    generatedAt: new Date().toISOString(),
    fundsAnalyzed: fundResults.filter(r => r.status === "fulfilled").length,
    fundsFailed: fundResults.filter(r => r.status === "rejected").length,
    rings: byRing,
  };
  setCached(key, result);
  return result;
}

// ---------------------------------------------------------------------------
// ADVISOR SYSTEM PROMPT (built fresh per request with live picks)
// ---------------------------------------------------------------------------

function buildSystemPrompt(picks) {
  const base = `You are the Advisor — a research assistant framed around Leopold Aschenbrenner's "Situational Awareness" thesis and the "innermost loop" framework for AI investing.

THE INNERMOST LOOP — concentric rings of structural value capture in the AI buildout:

Ring 00 — CORE: AI labs + frontier chip design. Examples: NVDA, AVGO, GOOGL, MSFT, META, AMD.
Ring 01 — FABRICATION: Foundries + semi equipment. Examples: TSM, ASML, AMAT, LRCX, KLAC.
Ring 02 — POWER: Electricity, nuclear, grid. Examples: VST, CEG, TLN, GEV, NRG, BE.
Ring 03 — INFRASTRUCTURE: Data centers, networking, cooling, optics. Examples: VRT, ANET, DLR, EQIX, CRWV, LITE, COHR.
Ring 04 — APPLICATION: Direct AI revenue capture. Examples: PLTR, CRM, NOW, CRWD.
Ring 05 — ADJACENT: AI-adjacent / pivoting (e.g. BTC miners turning sites into AI hosting hubs).

CORE PRINCIPLES:
- Closer to the core = more structural exposure, more durable tailwinds.
- Distinguish structural exposure from narrative exposure. Many "AI plays" are marketing.
- Compute scaling is bottlenecked by power and fabrication — both are slow to build, hard to disrupt.
- US-aligned compute is a national security winner in the current geopolitical frame.`;

  let live = "";
  if (picks?.rings) {
    const ringNames = { 0: "CORE", 1: "FABRICATION", 2: "POWER", 3: "INFRASTRUCTURE", 4: "APPLICATION", 5: "ADJACENT" };
    live = `\n\nLIVE SMART-MONEY CONVICTION (latest 13F filings, generated ${new Date(picks.generatedAt).toISOString().slice(0,10)}):\n`;
    for (let r = 0; r <= 5; r++) {
      const ring = picks.rings[r];
      if (!ring?.picks?.length) continue;
      live += `\nRing ${String(r).padStart(2,"0")} ${ringNames[r]}:`;
      for (const p of ring.picks.slice(0, 5)) {
        const sa = p.featuredHolds ? " [SA-held]" : "";
        live += `\n  • ${p.ticker} — held by ${p.fundCount} funds, $${(p.totalValueUsd / 1e9).toFixed(2)}B aggregate, conviction ${p.convictionScore.toFixed(1)}${sa}`;
      }
    }
  }

  const advice = `

WHEN A USER ASKS ABOUT A COMPANY, SECTOR, OR FOR PICKS:
1. Locate it on the loop — which ring, or off-loop entirely.
2. Reference the LIVE conviction data above when relevant. Cite specific tickers, fund counts, and dollar exposures.
3. Distinguish structural from narrative exposure.
4. Suggest the "innermost variant" — a more direct-exposure alternative if one exists.
5. Flag the main risks honestly.
6. End with one sharp follow-up question the user could ask.

WHEN ASKED FOR "WHAT TO BUY" OR DIRECT RECOMMENDATIONS:
- Reframe as research. Reply with what the framework + live conviction data SUGGESTS as highest-signal positions in each ring, with explicit caveats.
- Always close with: "This is a research signal, not investment advice. Do your own diligence and consider your own situation."

FORMATTING:
- Responses are rendered as GitHub-flavored markdown. Use it: ## headings, **bold** for tickers and key numbers, bullet lists, and tables when comparing 2+ items across the same dimensions.
- When a comparison is fundamentally numeric (fund counts, aggregate dollar exposure, conviction scores, ring distribution, etc.), embed a bar chart instead of — or alongside — a table. Emit a fenced code block with language \`chart\` containing JSON of this exact shape:

\`\`\`chart
{"type":"bar","title":"Smart-Money Conviction · Ring 00","suffix":"B","data":[{"label":"NVDA","value":26.9},{"label":"GOOGL","value":12.4},{"label":"AVGO","value":8.1}]}
\`\`\`

  Rules for charts:
  • Keep \`data\` to 3–7 entries, sorted descending by value.
  • \`label\` should be a ticker or short tag (≤ ~10 chars).
  • \`value\` is a plain number already in the unit you want shown — use \`suffix\` ("B", "M", "%", "x") and/or \`prefix\` ("$") for unit display. Do NOT pass raw dollar amounts like 26900000000; pre-scale to 26.9 with suffix "B".
  • Only include a chart when you have real numbers from the live conviction data above (or other concrete figures). Never invent values to fill a chart.

HARD RULES:
- This is research framing, not financial advice. NEVER tell anyone to buy, sell, or hold.
- No price targets, no portfolio allocations, no timing calls.
- Be honest when something is AI-adjacent hype.
- If you don't know something specific, say so — don't invent.
- Lead with the answer. No throat-clearing.`;

  return base + live + advice;
}

// ---------------------------------------------------------------------------
// ROUTES
// ---------------------------------------------------------------------------

app.get("/", (_, res) => res.json({ ok: true, service: "innermost-backend" }));

app.get("/api/funds", (_, res) => {
  res.json({ funds: FUNDS });
});

app.get("/api/fund/:cik/filings", async (req, res) => {
  try {
    const data = await getFilings(req.params.cik);
    res.json({ cik: req.params.cik, ...data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/fund/:cik/latest", async (req, res) => {
  try {
    const data = await getLatestHoldings(req.params.cik);
    const fund = FUNDS.find(f => f.cik === req.params.cik);
    res.json({ fund, ...data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/picks", async (_, res) => {
  try {
    res.json(await getPicks());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured on backend" });
    }
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages must be a non-empty array" });
    }

    // Inject latest live picks server-side (so client can't tamper with prompt)
    const picks = await getPicks().catch(() => null);
    const system = buildSystemPrompt(picks);

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ADVISOR_MODEL,
        max_tokens: 1536,
        system,
        messages,
      }),
    });
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: `Anthropic ${r.status}: ${text}` });
    }
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/refresh", (_, res) => {
  cache.clear();
  res.json({ ok: true, cleared: true });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✦ innermost-backend listening on 0.0.0.0:${PORT}`);
  console.log(`  SEC User-Agent: ${UA}`);
  if (!HAS_REAL_SEC_CONTACT) {
    console.warn("  Set SEC_USER_AGENT to a real name and email before requesting SEC data.");
  }
});
