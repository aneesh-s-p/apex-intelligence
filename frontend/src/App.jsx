/**
 * APEX INTELLIGENCE v3.0 — Institutional Quantitative Research Platform
 *
 * v3.0 upgrades:
 *  • ALL live data from backend — no static fallback values on screen
 *  • Scanner tab: multi-asset universe ranking with real quant scores
 *  • Portfolio tab: MPT optimization + real risk metrics from backend
 *  • Research tab: reproducible experiment tables from real backtests
 *  • "Data unavailable" shown when backend can't produce a metric
 *  • Regime, macro, news, signals all live from /market-data
 *  • All v2.1 scroll / layout / hooks fixes retained
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" && window.__APEX_API_URL) ||
  "http://localhost:8000"
).replace(/\/$/, "");

async function apiPost(path, body) {
  const r = await fetch(API_BASE + path, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    let d = r.statusText;
    try { d = (await r.json()).detail || d; } catch {}
    throw new Error(d);
  }
  return r.json();
}
async function apiGet(path) {
  const r = await fetch(API_BASE + path);
  if (!r.ok) throw new Error(r.statusText);
  return r.json();
}

// ════════════════════════════════════════════════════════════
// GLOBAL STYLES
// ════════════════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap');
:root{
  --bg:#02060f;--s1:#060d1c;--s2:#091528;--s3:#0d1e36;
  --bd:#162640;--bd2:#1e3355;
  --acc:#00d4ff;--acc2:#0099cc;
  --gold:#f0b429;--grn:#00e87a;--red:#ff3560;--amb:#ff9f0a;--pur:#9b59ff;
  --tx:#b8d4f0;--tx2:#7090b0;--tx3:#3a5570;
  --fu:'Syne',sans-serif;--fm:'IBM Plex Mono',monospace;--r:6px;
  --hdr:52px;--sb:216px;--rp:276px;
}
*{box-sizing:border-box;margin:0;padding:0}
html{height:100%}
body{min-height:100%;background:var(--bg);color:var(--tx);font-family:var(--fu);font-size:13px;}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--bd2);border-radius:2px}
::-webkit-scrollbar-thumb:hover{background:var(--acc2)}
.shell{display:flex;flex-direction:column;height:100vh;overflow:hidden}
.hdr{flex-shrink:0;height:var(--hdr);display:flex;align-items:center;justify-content:space-between;
  padding:0 20px;background:rgba(6,13,28,.98);border-bottom:1px solid var(--bd);z-index:50;position:relative}
.hdr::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,var(--acc),transparent);opacity:.3}
.logo{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:800;letter-spacing:.14em;color:var(--acc)}
.logo-ring{width:22px;height:22px;border-radius:50%;border:2px solid var(--acc);
  display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:var(--acc);
  box-shadow:0 0 10px rgba(0,212,255,.3);animation:glow 3s ease infinite}
@keyframes glow{0%,100%{box-shadow:0 0 8px rgba(0,212,255,.3)}50%{box-shadow:0 0 18px rgba(0,212,255,.6)}}
.ntabs{display:flex;gap:2px}
.nt{padding:5px 12px;background:transparent;border:none;cursor:pointer;
  font-family:var(--fu);font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
  color:var(--tx3);border-radius:var(--r);transition:all .15s}
.nt:hover{color:var(--tx);background:var(--s2)}
.nt.on{color:var(--acc);background:rgba(0,212,255,.08);border:1px solid rgba(0,212,255,.15)}
.hdr-r{display:flex;align-items:center;gap:14px;font-family:var(--fm);font-size:10px;color:var(--tx3)}
.live{display:flex;align-items:center;gap:5px;font-size:9px;font-weight:600;letter-spacing:.08em}
.dot{width:5px;height:5px;border-radius:50%;background:currentColor;animation:blink 1.4s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.15}}
.body{flex:1;min-height:0;display:grid;grid-template-columns:var(--sb) 1fr var(--rp);overflow:hidden}
.sb{background:var(--s1);border-right:1px solid var(--bd);overflow-y:auto;overflow-x:hidden;
  padding:10px 7px;display:flex;flex-direction:column;gap:8px;scrollbar-gutter:stable}
.slabel{font-size:8px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;
  color:var(--tx3);padding:2px 5px;margin-top:2px;flex-shrink:0}
.mc{padding:7px 9px;background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);
  cursor:pointer;transition:all .15s;display:flex;justify-content:space-between;align-items:flex-start;flex-shrink:0}
.mc:hover,.mc.sel{border-color:var(--acc);background:rgba(0,212,255,.05)}
.mc.sel .mn{color:var(--acc)}
.mn{font-size:11px;font-weight:700;color:var(--tx);margin-bottom:2px}
.mp{font-size:10px;color:var(--tx2);font-family:var(--fm)}
.mchg{font-size:9px;font-weight:700;font-family:var(--fm);padding:2px 5px;border-radius:3px}
.up{color:var(--grn);background:rgba(0,232,122,.08)}
.dn{color:var(--red);background:rgba(255,53,96,.08)}
.neu{color:var(--amb);background:rgba(255,159,10,.08)}
.rbadge{display:flex;align-items:flex-start;gap:6px;padding:7px 9px;
  background:var(--s3);border:1px solid var(--bd2);border-radius:var(--r);flex-shrink:0}
.ri{font-size:15px;margin-top:1px}
.rl{font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.rd{font-size:9px;color:var(--tx3);margin-top:2px;line-height:1.4}
.ctr{overflow-y:auto;overflow-x:hidden;padding:14px 16px;display:flex;flex-direction:column;
  gap:12px;min-width:0;scrollbar-gutter:stable}
.rp{background:var(--s1);border-left:1px solid var(--bd);overflow-y:auto;overflow-x:hidden;
  padding:10px 9px;display:flex;flex-direction:column;gap:9px;scrollbar-gutter:stable}
.qbox{background:var(--s1);border:1px solid var(--bd);border-radius:10px;padding:12px;flex-shrink:0}
.qt{font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--acc);margin-bottom:8px}
.chips{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:9px}
.chip{padding:3px 9px;background:var(--s2);border:1px solid var(--bd);border-radius:20px;
  cursor:pointer;font-family:var(--fu);font-size:10px;color:var(--tx2);transition:all .12s;white-space:nowrap}
.chip:hover{border-color:var(--acc);color:var(--acc)}
.qrow{display:flex;gap:7px}
.qi{flex:1;background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);padding:8px 11px;
  font-family:var(--fu);font-size:12px;color:var(--tx);outline:none;resize:none;height:42px;
  transition:border-color .2s;min-width:0}
.qi:focus{border-color:var(--acc)}
.qi::placeholder{color:var(--tx3)}
.qbtn{padding:0 16px;background:var(--acc);border:none;border-radius:var(--r);
  font-family:var(--fu);font-size:11px;font-weight:800;letter-spacing:.08em;color:#000;
  cursor:pointer;transition:all .15s;white-space:nowrap;min-width:76px;flex-shrink:0}
.qbtn:hover:not(:disabled){background:#33deff;transform:translateY(-1px)}
.qbtn:disabled{opacity:.35;cursor:not-allowed}
.ap{background:var(--s1);border:1px solid var(--bd);border-radius:10px;padding:12px;
  display:flex;flex-direction:column;gap:7px;animation:fu .3s ease;flex-shrink:0}
@keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.ar{display:flex;align-items:center;gap:8px}
.ai2{font-size:14px;width:20px;text-align:center}
.an{font-size:10px;font-weight:700;color:var(--tx2);width:148px;flex-shrink:0}
.abar{flex:1;height:4px;background:var(--bd);border-radius:2px;overflow:hidden;min-width:0}
.afill{height:100%;border-radius:2px;transition:width .5s ease}
.ast{font-size:9px;font-family:var(--fm);color:var(--tx3);width:60px;text-align:right;flex-shrink:0}
.ac{background:var(--s1);border:1px solid var(--bd);border-radius:10px;
  overflow:hidden;animation:fu .4s ease;flex-shrink:0;transition:border-color .2s}
.ac:hover{border-color:var(--bd2)}
.ac.selected{border-color:var(--acc)}
.ac-head{display:flex;align-items:center;justify-content:space-between;
  padding:10px 13px;border-bottom:1px solid var(--bd);background:var(--s2);cursor:pointer}
.ac-title{font-size:10px;font-weight:700;letter-spacing:.06em;color:var(--acc);text-transform:uppercase}
.ac-meta{font-size:9px;color:var(--tx3);font-family:var(--fm);white-space:nowrap;margin-left:8px}
.ac-body{padding:13px}
.ac-body-collapsed{padding:13px;max-height:180px;overflow:hidden;position:relative}
.ac-body-collapsed::after{content:'';position:absolute;bottom:0;left:0;right:0;height:50px;
  background:linear-gradient(transparent,var(--s1));pointer-events:none}
.sec{margin-bottom:13px;padding-bottom:13px;border-bottom:1px solid var(--bd)}
.sec:last-child{border:none;margin:0;padding:0}
.st{font-size:8px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--tx3);margin-bottom:7px}
.sbanner{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:var(--r);margin-bottom:8px}
.sbanner.BUY{background:rgba(0,232,122,.1);border:1px solid rgba(0,232,122,.25)}
.sbanner.SELL{background:rgba(255,53,96,.1);border:1px solid rgba(255,53,96,.25)}
.sbanner.HOLD{background:rgba(255,159,10,.1);border:1px solid rgba(255,159,10,.25)}
.sw{font-size:18px;font-weight:800;font-family:var(--fm);letter-spacing:.1em;flex-shrink:0}
.sbanner.BUY .sw{color:var(--grn)}.sbanner.SELL .sw{color:var(--red)}.sbanner.HOLD .sw{color:var(--amb)}
.sd{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}
.ssub{font-size:10px;color:var(--tx2)}
.cbar{height:5px;background:var(--bd);border-radius:3px;overflow:hidden}
.cfill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--acc),var(--grn));transition:width .8s ease}
.mgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
.mcell{background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);padding:7px}
.mlbl{font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:var(--tx3);margin-bottom:3px}
.mv{font-size:12px;font-weight:800;font-family:var(--fm)}
.risk-row{display:flex;gap:3px;margin-top:5px}
.rs{flex:1;height:6px;border-radius:2px;background:var(--bd)}
.rlo{background:var(--grn)}.rmd{background:var(--amb)}.rhi{background:var(--red)}
.fb-row{display:flex;align-items:center;gap:7px;margin-bottom:5px}
.fb-lbl{font-size:10px;color:var(--tx2);width:100px;flex-shrink:0}
.fb-track{flex:1;height:4px;background:var(--bd);border-radius:2px;overflow:hidden;min-width:0}
.fb-fill{height:100%;border-radius:2px;transition:width .7s ease}
.fb-val{font-size:9px;font-family:var(--fm);color:var(--tx3);width:32px;text-align:right;flex-shrink:0}
.ao{background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);padding:9px 11px;margin-bottom:5px}
.ao:last-child{margin-bottom:0}
.ao-head{display:flex;align-items:center;gap:5px;margin-bottom:5px}
.abadge{font-size:8px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:1px 6px;border-radius:3px}
.prose{font-size:12px;line-height:1.75;color:var(--tx)}
.prose strong{color:var(--acc)}
.bt-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-top:7px}
.bt-cell{background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);padding:7px;text-align:center}
.bt-lbl{font-size:8px;color:var(--tx3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px}
.bt-v{font-size:13px;font-weight:800;font-family:var(--fm)}
.bt-bars{display:flex;gap:2px;align-items:flex-end;height:42px;margin-top:8px}
.bt-b{flex:1;border-radius:1px 1px 0 0;min-height:2px;transition:height .5s}
.ni{padding:6px 0;border-bottom:1px solid var(--bd)}
.ni:last-child{border:none}
.nh{font-size:10px;color:var(--tx);line-height:1.4;display:flex;align-items:flex-start;gap:6px}
.nm{font-size:9px;color:var(--tx3);margin-top:3px;font-family:var(--fm)}
.macro-r{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--bd)}
.macro-r:last-child{border:none}
.mk{font-size:10px;color:var(--tx2)}
.mv2{font-size:11px;font-weight:700;font-family:var(--fm)}
.sp{font-size:8px;font-weight:700;padding:1px 5px;border-radius:3px;flex-shrink:0}
.sp-p{background:rgba(0,232,122,.1);color:var(--grn)}
.sp-n{background:rgba(255,53,96,.1);color:var(--red)}
.sp-u{background:rgba(255,159,10,.1);color:var(--amb)}
.hgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:3px}
.hcell{border-radius:3px;padding:5px 4px;text-align:center}
.hn{font-size:8px;color:var(--tx3);margin-bottom:2px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap}
.hv{font-size:10px;font-weight:800;font-family:var(--fm)}
.wig{background:var(--s2);border:1px solid var(--bd);border-radius:8px;overflow:hidden;flex-shrink:0}
.wh{padding:7px 11px;font-size:8px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
  color:var(--tx3);border-bottom:1px solid var(--bd);background:rgba(0,0,0,.15)}
.wb{padding:9px 11px}
.sr{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--bd)}
.sr:last-child{border:none}
.stk{font-size:11px;font-weight:700;font-family:var(--fm);color:var(--tx)}
.spr{font-size:9px;font-family:var(--fm);color:var(--tx3)}
.stg{font-size:8px;font-weight:700;padding:2px 6px;border-radius:3px;text-transform:uppercase;letter-spacing:.07em}
.spkrow{display:flex;gap:2px;align-items:flex-end;height:30px}
.spk{flex:1;border-radius:1px 1px 0 0;min-height:2px}
.hi{padding:7px 9px;background:var(--s1);border:1px solid var(--bd);border-radius:var(--r);
  cursor:pointer;transition:border-color .15s;animation:fu .2s ease}
.hi:hover{border-color:var(--acc)}
.hq{font-size:11px;color:var(--tx);margin-bottom:3px}
.hm{font-size:9px;color:var(--tx3);font-family:var(--fm)}
.empty{text-align:center;padding:50px 16px;color:var(--tx3);flex-shrink:0}
.ei{font-size:30px;margin-bottom:10px;opacity:.3}
.eh{font-size:10px;color:var(--tx3);margin-top:5px;opacity:.7}
.arch-box{background:rgba(0,212,255,.04);border:1px solid rgba(0,212,255,.15);
  border-radius:var(--r);padding:9px 11px;font-size:10px;line-height:1.7;color:var(--tx2)}
.arch-box strong{color:var(--acc)}
.tag-list{display:flex;flex-wrap:wrap;gap:4px;margin-top:7px}
.tag{font-size:8px;padding:2px 7px;background:var(--s2);border:1px solid var(--bd);
  border-radius:3px;color:var(--tx2);font-family:var(--fm)}
.cursor{display:inline-block;width:2px;height:11px;background:var(--acc);
  margin-left:2px;vertical-align:middle;animation:blink .8s infinite}
.banner-err{background:rgba(255,53,96,.08);border:1px solid rgba(255,53,96,.25);
  border-radius:var(--r);padding:9px 13px;font-size:11px;color:var(--red);
  display:flex;gap:8px;align-items:flex-start;flex-shrink:0}
.banner-warn{background:rgba(255,159,10,.08);border:1px solid rgba(255,159,10,.25);
  border-radius:var(--r);padding:8px 13px;font-size:10px;color:var(--amb);
  font-family:var(--fm);flex-shrink:0}
.banner-info{background:rgba(0,212,255,.06);border:1px solid rgba(0,212,255,.18);
  border-radius:var(--r);padding:8px 13px;font-size:10px;color:var(--acc);flex-shrink:0}
.expand-btn{display:flex;align-items:center;gap:4px;margin-top:8px;padding:4px 0;
  background:transparent;border:none;cursor:pointer;font-family:var(--fu);font-size:9px;
  font-weight:700;letter-spacing:.1em;color:var(--acc);text-transform:uppercase;opacity:.7;transition:opacity .15s}
.expand-btn:hover{opacity:1}
/* Scanner table */
.scan-table{width:100%;border-collapse:collapse;font-family:var(--fm);font-size:10px}
.scan-table th{padding:5px 8px;font-size:8px;letter-spacing:.1em;text-transform:uppercase;
  color:var(--tx3);border-bottom:1px solid var(--bd);text-align:left;font-weight:600}
.scan-table td{padding:6px 8px;border-bottom:1px solid rgba(22,38,64,.5);color:var(--tx2)}
.scan-table tr:hover td{background:rgba(0,212,255,.03)}
.scan-table tr:last-child td{border:none}
/* Research table */
.res-table{width:100%;border-collapse:collapse;font-size:10px;font-family:var(--fm)}
.res-table th{padding:7px 10px;font-size:8px;letter-spacing:.1em;text-transform:uppercase;
  color:var(--tx3);border-bottom:1px solid var(--bd);text-align:center;font-weight:600}
.res-table td{padding:7px 10px;border-bottom:1px solid rgba(22,38,64,.5);text-align:center;color:var(--tx2)}
.res-table tr:hover td{background:rgba(0,212,255,.03)}
.res-table tr.proposed td{background:rgba(0,212,255,.04);color:var(--acc)}
/* Alloc bars */
.alloc-bar{height:6px;border-radius:3px;margin-top:3px}
/* Btn secondary */
.btn-sec{padding:5px 12px;background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);
  cursor:pointer;font-family:var(--fu);font-size:10px;font-weight:700;color:var(--tx2);
  transition:all .15s;letter-spacing:.06em}
.btn-sec:hover:not(:disabled){border-color:var(--acc);color:var(--acc)}
.btn-sec:disabled{opacity:.4;cursor:not-allowed}
/* Loading spinner */
.spinner{width:14px;height:14px;border:2px solid var(--bd);border-top-color:var(--acc);
  border-radius:50%;animation:spin .8s linear infinite;display:inline-block;vertical-align:middle;margin-right:6px}
@keyframes spin{to{transform:rotate(360deg)}}
/* Efficient frontier dots */
.ef-chart{display:flex;gap:2px;align-items:flex-end;height:60px;padding:4px 0;overflow:hidden}
.ef-dot{width:4px;border-radius:50%;flex-shrink:0}
@media(max-width:1100px){:root{--sb:180px;--rp:220px}}
@media(max-width:860px){.body{grid-template-columns:1fr}.sb,.rp{display:none}}
@media(max-width:600px){.hdr{padding:0 12px}.ctr{padding:10px}.bt-grid{grid-template-columns:repeat(3,1fr)}.mgrid{grid-template-columns:repeat(2,1fr)}}
`;

// ─── Helpers ────────────────────────────────────────────────────────────────
const sc  = s => s==="BUY"?"var(--grn)":s==="SELL"?"var(--red)":"var(--amb)";
const sbg = s => s==="BUY"?"rgba(0,232,122,.1)":s==="SELL"?"rgba(255,53,96,.1)":"rgba(255,159,10,.1)";
const heatBg = v => v>1.5?"rgba(0,232,122,.55)":v>.5?"rgba(0,232,122,.3)":v>0?"rgba(0,232,122,.14)":v>-.5?"rgba(255,53,96,.14)":v>-1.5?"rgba(255,53,96,.3)":"rgba(255,53,96,.55)";
const heatFg = v => v>0?"var(--grn)":"var(--red)";
const fmtPrice = (p, region) => {
  if (p == null) return "—";
  const prefix = region === "India" ? "₹"
               : region === "Crypto" ? "$"
               : region === "Europe" ? "€"
               : "$";  // US and everything else
  return prefix + Number(p).toLocaleString();
};
const NA = "Data unavailable";

function parseAI(txt) {
  if (!txt) return { raw: "" };
  const m = txt.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) { try { return JSON.parse(m[1]); } catch {} }
  const j = txt.match(/(\{[\s\S]*\})/);
  if (j) { try { return JSON.parse(j[1]); } catch {} }
  return { raw: txt };
}

// ════════════════════════════════════════════════════════════
// UI PRIMITIVES
// ════════════════════════════════════════════════════════════
function ConfBar({ pct }) {
  return <div className="cbar"><div className="cfill" style={{ width: `${pct}%` }} /></div>;
}
function RiskMeter({ score }) {
  return (
    <div className="risk-row">
      {[1,2,3,4,5].map(i => {
        const cls = score<=2?"rlo":score<=3?"rmd":"rhi";
        return <div key={i} className={`rs ${i<=score?cls:""}`}/>;
      })}
    </div>
  );
}
function FBars({ weights }) {
  if (!weights) return null;
  const pal = ["var(--acc)","var(--grn)","var(--amb)","var(--red)","var(--pur)"];
  return (
    <div>
      {Object.entries(weights).map(([k,v],i) => (
        <div key={k} className="fb-row">
          <span className="fb-lbl">{k}</span>
          <div className="fb-track"><div className="fb-fill" style={{width:`${v}%`,background:pal[i%pal.length]}}/></div>
          <span className="fb-val">{v}%</span>
        </div>
      ))}
    </div>
  );
}
function BTChart({ bars }) {
  if (!bars || !bars.length) return null;
  const mx = Math.max(...bars);
  return (
    <div className="bt-bars">
      {bars.map((h,i) => (
        <div key={i} className="bt-b" style={{
          height:`${(h/mx)*40}px`,
          background:h>bars[0]?"rgba(0,232,122,.5)":"rgba(255,53,96,.4)"
        }}/>
      ))}
    </div>
  );
}
const AG_CFG = {
  macro:{bg:"rgba(240,180,41,.12)",col:"var(--gold)",icon:"🌐"},
  sentiment:{bg:"rgba(155,89,255,.12)",col:"var(--pur)",icon:"💬"},
  technical:{bg:"rgba(0,212,255,.12)",col:"var(--acc)",icon:"📈"},
  risk:{bg:"rgba(255,53,96,.12)",col:"var(--red)",icon:"🛡️"},
  strategy:{bg:"rgba(0,232,122,.12)",col:"var(--grn)",icon:"🎯"},
};
function AgentOuts({ outputs }) {
  if (!outputs) return null;
  return (
    <div>
      {Object.entries(outputs).map(([ag,txt]) => {
        const c = AG_CFG[ag] || AG_CFG.strategy;
        return (
          <div key={ag} className="ao">
            <div className="ao-head">
              <span style={{fontSize:13}}>{c.icon}</span>
              <span className="abadge" style={{background:c.bg,color:c.col}}>{ag} agent</span>
            </div>
            <div className="prose" style={{fontSize:11}}>{txt}</div>
          </div>
        );
      })}
    </div>
  );
}

const AGENTS_LIST = [
  {key:"macro",    name:"Macro Intelligence",icon:"🌐",col:"var(--gold)"},
  {key:"sentiment",name:"Sentiment Analysis", icon:"💬",col:"var(--pur)"},
  {key:"technical",name:"Technical Signals",  icon:"📈",col:"var(--acc)"},
  {key:"risk",     name:"Risk Assessment",    icon:"🛡️",col:"var(--red)"},
  {key:"strategy", name:"Portfolio Strategy", icon:"🎯",col:"var(--grn)"},
];
function AgentProgress({ prog }) {
  return (
    <div className="ap">
      <div style={{fontSize:9,color:"var(--acc)",fontWeight:700,letterSpacing:".12em",marginBottom:3}}>
        APEX MULTI-AGENT PROCESSING<span className="cursor"/>
      </div>
      {AGENTS_LIST.map(a => {
        const pct = prog[a.key] || 0;
        return (
          <div key={a.key} className="ar">
            <span className="ai2">{a.icon}</span>
            <span className="an">{a.name}</span>
            <div className="abar"><div className="afill" style={{width:`${pct}%`,background:a.col}}/></div>
            <span className="ast">{pct<100?(pct>0?"analyzing…":"queued"):"✓ done"}</span>
          </div>
        );
      })}
    </div>
  );
}

function AnalysisCard({ item, selected, onSelect }) {
  const p  = item.parsed;
  const bt = item.backtest;
  const [expanded, setExpanded] = useState(true);

  if (p.raw != null && !p.signal) {
    return (
      <div className={`ac ${selected?"selected":""}`} onClick={() => onSelect(item.id)}>
        <div className="ac-head">
          <span className="ac-title">⚡ {item.query.slice(0,52)}{item.query.length>52?"…":""}</span>
          <span className="ac-meta">{item.ts} · {item.market}</span>
        </div>
        <div className="ac-body">
          <div className="prose" dangerouslySetInnerHTML={{__html:
            (p.raw||"").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\n/g,"<br/>")
          }}/>
        </div>
      </div>
    );
  }

  return (
    <div className={`ac ${selected?"selected":""}`}>
      <div className="ac-head" onClick={() => onSelect(item.id)}>
        <span className="ac-title">⚡ {item.query.slice(0,52)}{item.query.length>52?"…":""}</span>
        <span className="ac-meta">{item.ts} · {item.market} · {item.regime}</span>
      </div>
      <div className={expanded?"ac-body":"ac-body-collapsed"}>
        {p.signal && (
          <div className="sec">
            <div className={`sbanner ${p.signal}`}>
              <div className="sw">{p.signal}</div>
              <div className="sd">
                <span className="ssub">Multi-Agent Advisory Signal</span>
                {p.confidence && (
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"var(--tx3)",marginBottom:3}}>
                      <span>AI Confidence</span>
                      <span style={{fontFamily:"var(--fm)",color:"var(--acc)"}}>{p.confidence}%</span>
                    </div>
                    <ConfBar pct={p.confidence}/>
                  </div>
                )}
              </div>
              {p.risk_level && (
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:8,color:"var(--tx3)",marginBottom:3,letterSpacing:".1em"}}>RISK</div>
                  <div style={{fontSize:11,fontWeight:800,
                    color:p.risk_level==="LOW"?"var(--grn)":p.risk_level==="HIGH"||p.risk_level==="VERY HIGH"?"var(--red)":"var(--amb)"}}>
                    {p.risk_level}
                  </div>
                  {p.risk_score && <RiskMeter score={p.risk_score}/>}
                </div>
              )}
            </div>
          </div>
        )}
        {p.agent_outputs && (
          <div className="sec">
            <div className="st">Multi-Agent Breakdown</div>
            <AgentOuts outputs={p.agent_outputs}/>
          </div>
        )}
        {p.metrics && (
          <div className="sec">
            <div className="st">Quantitative Signals</div>
            <div className="mgrid">
              {Object.entries(p.metrics).map(([k,v]) => (
                <div key={k} className="mcell">
                  <div className="mlbl">{k.replace(/_/g," ")}</div>
                  <div className="mv" style={{color:"var(--acc)"}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {p.factor_weights && (
          <div className="sec">
            <div className="st">Factor Attribution</div>
            <FBars weights={p.factor_weights}/>
          </div>
        )}
        {p.analysis && (
          <div className="sec">
            <div className="st">Synthesis</div>
            <p className="prose">{p.analysis}</p>
          </div>
        )}
        {p.catalysts?.length > 0 && (
          <div className="sec">
            <div className="st">Key Catalysts</div>
            {p.catalysts.map((c,i) => (
              <div key={i} style={{display:"flex",gap:7,alignItems:"flex-start",marginBottom:5}}>
                <span style={{color:"var(--acc)",fontSize:10,marginTop:2}}>▸</span>
                <span className="prose" style={{fontSize:11}}>{c}</span>
              </div>
            ))}
          </div>
        )}
        {p.price_targets && (
          <div className="sec">
            <div className="st">Price Targets</div>
            <div className="mgrid">
              {Object.entries(p.price_targets).map(([k,v]) => (
                <div key={k} className="mcell">
                  <div className="mlbl">{k} case</div>
                  <div className="mv" style={{color:k==="bull"?"var(--grn)":k==="bear"?"var(--red)":"var(--amb)"}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {bt && !bt.error && (
          <div className="sec">
            <div className="st">Backtesting Engine — RSI Strategy ({bt.period || ""})</div>
            <div className="bt-grid">
              {[
                {l:"Cum. Return",  v:bt.cumRet, c:bt.cumRet?.startsWith("+")?"var(--grn)":"var(--red)"},
                {l:"Ann. Return",  v:bt.annRet,  c:"var(--tx)"},
                {l:"Sharpe",       v:bt.sharpe,  c:"var(--acc)"},
                {l:"Max Drawdown", v:bt.maxDD,   c:"var(--red)"},
                {l:"Win Rate",     v:bt.wr,      c:"var(--amb)"},
              ].map((x,i) => (
                <div key={i} className="bt-cell">
                  <div className="bt-lbl">{x.l}</div>
                  <div className="bt-v" style={{color:x.c}}>{x.v || NA}</div>
                </div>
              ))}
            </div>
            <BTChart bars={bt.bars}/>
            {bt.benchmarks && (
              <div style={{marginTop:10}}>
                <div className="st">Benchmark Comparison</div>
                <table className="res-table" style={{marginTop:4}}>
                  <thead><tr>
                    <th style={{textAlign:"left"}}>Strategy</th>
                    <th>Cum. Return</th><th>Sharpe</th><th>Max DD</th>
                  </tr></thead>
                  <tbody>
                    <tr className="proposed">
                      <td style={{textAlign:"left",color:"var(--acc)"}}>RSI Strategy ★</td>
                      <td>{bt.cumRet}</td><td>{bt.sharpe}</td><td>{bt.maxDD}</td>
                    </tr>
                    {bt.benchmarks.buy_hold && <tr>
                      <td style={{textAlign:"left"}}>{bt.benchmarks.buy_hold.label}</td>
                      <td>{bt.benchmarks.buy_hold.cumRet}</td>
                      <td>{bt.benchmarks.buy_hold.sharpe}</td>
                      <td>{bt.benchmarks.buy_hold.maxDD}</td>
                    </tr>}
                    {bt.benchmarks.macd && <tr>
                      <td style={{textAlign:"left"}}>{bt.benchmarks.macd.label}</td>
                      <td>{bt.benchmarks.macd.cumRet}</td>
                      <td>{bt.benchmarks.macd.sharpe}</td>
                      <td>{bt.benchmarks.macd.maxDD}</td>
                    </tr>}
                  </tbody>
                </table>
                {bt.out_of_sample && (
                  <div style={{marginTop:8,padding:"6px 9px",background:"rgba(0,212,255,.04)",
                    border:"1px solid rgba(0,212,255,.12)",borderRadius:"var(--r)",fontSize:10,color:"var(--tx3)"}}>
                    Walk-Forward OOS ({bt.out_of_sample.train_pct}/{bt.out_of_sample.test_pct}):&nbsp;
                    <span style={{color:"var(--acc)",fontFamily:"var(--fm)"}}>
                      {bt.out_of_sample.cumRet} · Sharpe {bt.out_of_sample.sharpe} · DD {bt.out_of_sample.maxDD}
                    </span>
                    <span style={{marginLeft:8,color:"var(--grn)",fontSize:9}}>
                      ✓ No lookahead bias · ✓ Transaction costs included
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {bt?.error && (
          <div className="sec">
            <div className="st">Backtesting</div>
            <div className="banner-warn">⚠ {bt.error}</div>
          </div>
        )}
        {p.explanation && (
          <div className="sec">
            <div className="st">Signal Reasoning</div>
            <p className="prose">{p.explanation}</p>
            {p.regime_adaptation && (
              <div style={{marginTop:7,padding:"5px 9px",background:"rgba(0,212,255,.06)",
                borderRadius:"var(--r)",fontSize:11,color:"var(--tx2)",fontStyle:"italic"}}>
                Regime note: {p.regime_adaptation}
              </div>
            )}
          </div>
        )}
        {p.portfolio_action && (
          <div className="sec">
            <div className="st">Portfolio Action</div>
            <div style={{background:"rgba(0,232,122,.06)",border:"1px solid rgba(0,232,122,.15)",
              borderRadius:"var(--r)",padding:"8px 11px"}}>
              <p className="prose" style={{fontSize:12}}>{p.portfolio_action}</p>
            </div>
          </div>
        )}
      </div>
      <div style={{padding:"0 13px 10px"}}>
        <button className="expand-btn" onClick={() => setExpanded(e => !e)}>
          {expanded?"▲ Collapse":"▼ Expand full analysis"}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SCANNER TAB
// ════════════════════════════════════════════════════════════
function ScannerTab() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const run = async () => {
    setLoading(true); setError("");
    try {
      const r = await apiPost("/scan", {});
      setData(r.results || []);
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { run(); }, []);

  const signalCol = s => s==="BUY"?"var(--grn)":s==="SELL"?"var(--red)":"var(--amb)";

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:".12em",color:"var(--acc)"}}>
          MULTI-ASSET UNIVERSE SCANNER
        </div>
        <button className="btn-sec" onClick={run} disabled={loading}>
          {loading && <span className="spinner"/>}
          {loading?"Scanning…":"Refresh"}
        </button>
      </div>
      {error && <div className="banner-warn">⚠ {error}</div>}
      <div className="banner-info" style={{fontSize:9}}>
        All scores derived from real-time yfinance data. Refresh may take 10–20s.
      </div>
      {!data && !loading && (
        <div className="empty"><div className="ei">🔭</div><div>Run scanner to rank universe</div></div>
      )}
      {loading && (
        <div className="empty"><div className="ei">🔄</div><div style={{fontSize:10}}>Fetching live data for all assets…</div></div>
      )}
      {data && data.length > 0 && (
        <div style={{background:"var(--s1)",border:"1px solid var(--bd)",borderRadius:10,overflow:"hidden"}}>
          <table className="scan-table">
            <thead>
              <tr>
                <th>#</th><th>Asset</th><th>Price</th><th>Quant Score</th>
                <th>Signal</th><th>RSI</th><th>Mom 1m</th><th>Mom 3m</th>
                <th>Trend</th><th>Real. Vol</th>
              </tr>
            </thead>
            <tbody>
              {data.map((a,i) => (
                <tr key={a.id}>
                  <td style={{color:"var(--tx3)"}}>{i+1}</td>
                  <td style={{fontWeight:700,color:"var(--tx)",fontFamily:"var(--fm)"}}>{a.id}</td>
                  <td style={{color:"var(--tx3)"}}>{a.price !== NA ? String(a.price) : "—"}</td>
                  <td>
                    {a.quant_score != null ? (
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div style={{flex:1,height:4,background:"var(--bd)",borderRadius:2,overflow:"hidden",minWidth:40}}>
                          <div style={{height:"100%",width:`${a.quant_score}%`,
                            background:a.quant_score>=65?"var(--grn)":a.quant_score<=38?"var(--red)":"var(--amb)",
                            borderRadius:2,transition:"width .5s"}}/>
                        </div>
                        <span style={{fontSize:11,fontWeight:700,color:"var(--acc)",fontFamily:"var(--fm)",minWidth:28}}>
                          {a.quant_score}
                        </span>
                      </div>
                    ) : <span style={{color:"var(--tx3)"}}>—</span>}
                  </td>
                  <td>
                    {a.signal ? (
                      <span className="stg" style={{background:sbg(a.signal),color:signalCol(a.signal)}}>
                        {a.signal}
                      </span>
                    ) : <span style={{color:"var(--tx3)"}}>—</span>}
                  </td>
                  <td style={{color:a.rsi!==NA&&a.rsi<30?"var(--grn)":a.rsi>70?"var(--red)":"var(--tx2)"}}>
                    {a.rsi !== NA ? String(a.rsi) : "—"}
                  </td>
                  <td style={{color:a.momentum_1m && a.momentum_1m.startsWith("+")?"var(--grn)":"var(--red)"}}>
                    {a.momentum_1m !== NA ? a.momentum_1m : "—"}
                  </td>
                  <td style={{color:a.momentum_3m && a.momentum_3m.startsWith("+")?"var(--grn)":"var(--red)"}}>
                    {a.momentum_3m !== NA ? a.momentum_3m : "—"}
                  </td>
                  <td style={{color:a.trend==="BULLISH"?"var(--grn)":a.trend==="BEARISH"?"var(--red)":"var(--amb)",fontSize:9}}>
                    {a.trend !== NA ? a.trend : "—"}
                  </td>
                  <td style={{color:"var(--tx3)"}}>{a.realized_vol !== NA ? a.realized_vol : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.filter(a=>a.error).length > 0 && (
        <div className="banner-warn">
          {data.filter(a=>a.error).length} asset(s) with data issues:&nbsp;
          {data.filter(a=>a.error).map(a=>`${a.id}: ${a.error}`).join(" | ")}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// PORTFOLIO OPTIMIZATION TAB
// ════════════════════════════════════════════════════════════
function PortfolioTab({ liveRisk }) {
  const [optData, setOptData]   = useState(null);
  const [optLoad, setOptLoad]   = useState(false);
  const [optErr,  setOptErr]    = useState("");
  const DEFAULT_TICKERS = ["NVDA","AAPL","MSFT","BTC-USD","TSLA","META","ETH-USD","TCS.NS"];
  const PALETTE = ["#00d4ff","#00e87a","#f0b429","#ff8c42","#9b59ff","#ff3560","#42a5ff","#7b42ff"];

  const run = async () => {
    setOptLoad(true); setOptErr("");
    try {
      const r = await apiPost("/optimize", { tickers: DEFAULT_TICKERS, lookback_days: 252 });
      setOptData(r);
    } catch(e) {
      setOptErr(e.message);
    } finally {
      setOptLoad(false);
    }
  };

  useEffect(() => { run(); }, []);

  const maxSh = optData?.max_sharpe;
  const minV  = optData?.min_vol;
  const ef    = optData?.efficient_frontier || [];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:".12em",color:"var(--acc)"}}>
          PORTFOLIO OPTIMIZATION — MODERN PORTFOLIO THEORY
        </div>
        <button className="btn-sec" onClick={run} disabled={optLoad}>
          {optLoad && <span className="spinner"/>}
          {optLoad?"Optimizing…":"Recompute"}
        </button>
      </div>
      <div className="banner-info" style={{fontSize:9}}>
        Monte Carlo simulation ({optData?.simulation_count||"5000"} portfolios) on {optData?.lookback_days||252}-day history. Data: Yahoo Finance.
      </div>
      {optErr && <div className="banner-warn">⚠ {optErr}</div>}
      {optLoad && <div className="empty"><div className="ei">⚙</div><div style={{fontSize:10}}>Running MPT optimization…</div></div>}

      {/* Live risk metrics */}
      {liveRisk && !liveRisk.error && (
        <div style={{background:"var(--s1)",border:"1px solid var(--bd)",borderRadius:10,padding:12}}>
          <div className="st" style={{marginBottom:8}}>LIVE PORTFOLIO RISK METRICS</div>
          <div className="mgrid" style={{gridTemplateColumns:"repeat(4,1fr)"}}>
            {[
              ["Beta",         liveRisk.portfolioBeta],
              ["Sharpe",       liveRisk.sharpe],
              ["Sortino",      liveRisk.sortino],
              ["Calmar",       liveRisk.calmar],
              ["Max DD",       liveRisk.maxDD],
              ["VaR 95%",      liveRisk.var95],
              ["CVaR 95%",     liveRisk.cvar95],
              ["Ann. Return",  liveRisk.annualReturn],
              ["Ann. Vol",     liveRisk.vol],
              ["Risk Level",   liveRisk.riskLevel],
            ].map(([l,v]) => (
              <div key={l} className="mcell">
                <div className="mlbl">{l}</div>
                <div className="mv" style={{
                  color: l==="Risk Level"
                    ? v==="LOW"?"var(--grn)":v==="VERY HIGH"||v==="HIGH"?"var(--red)":"var(--amb)"
                    : "var(--acc)",
                  fontSize:11
                }}>{v ?? NA}</div>
              </div>
            ))}
          </div>
          {liveRisk.riskScore && (
            <div style={{marginTop:10}}>
              <div style={{fontSize:8,color:"var(--tx3)",letterSpacing:".1em",marginBottom:5,textTransform:"uppercase"}}>
                Risk Meter — {liveRisk.riskLevel}
              </div>
              <RiskMeter score={liveRisk.riskScore}/>
            </div>
          )}
        </div>
      )}

      {maxSh && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {/* Max Sharpe */}
          <div style={{background:"var(--s1)",border:"1px solid var(--bd)",borderRadius:10,padding:12}}>
            <div className="st" style={{marginBottom:8}}>⭐ MAX SHARPE PORTFOLIO</div>
            <div style={{display:"flex",gap:16,marginBottom:12}}>
              {[["Return",maxSh.expected_return],["Vol",maxSh.volatility],["Sharpe",String(maxSh.sharpe)]].map(([l,v]) => (
                <div key={l}>
                  <div style={{fontSize:8,color:"var(--tx3)",letterSpacing:".1em",marginBottom:2}}>{l}</div>
                  <div style={{fontSize:14,fontWeight:800,fontFamily:"var(--fm)",color:"var(--acc)"}}>{v}</div>
                </div>
              ))}
            </div>
            {maxSh.allocations.map((a,i) => (
              <div key={a.ticker} style={{marginBottom:6}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:2}}>
                  <span style={{fontFamily:"var(--fm)",fontWeight:700,color:"var(--tx)"}}>{a.ticker}</span>
                  <span style={{fontFamily:"var(--fm)",color:"var(--acc)"}}>{a.weight}%</span>
                </div>
                <div className="alloc-bar" style={{
                  width:`${a.weight}%`,background:PALETTE[i%PALETTE.length],
                  maxWidth:"100%",opacity:.8
                }}/>
              </div>
            ))}
          </div>
          {/* Min Vol */}
          {minV && (
            <div style={{background:"var(--s1)",border:"1px solid var(--bd)",borderRadius:10,padding:12}}>
              <div className="st" style={{marginBottom:8}}>🛡 MIN VOLATILITY PORTFOLIO</div>
              <div style={{display:"flex",gap:16,marginBottom:12}}>
                {[["Return",minV.expected_return],["Vol",minV.volatility],["Sharpe",String(minV.sharpe)]].map(([l,v]) => (
                  <div key={l}>
                    <div style={{fontSize:8,color:"var(--tx3)",letterSpacing:".1em",marginBottom:2}}>{l}</div>
                    <div style={{fontSize:14,fontWeight:800,fontFamily:"var(--fm)",color:"var(--amb)"}}>{v}</div>
                  </div>
                ))}
              </div>
              {minV.allocations.map((a,i) => (
                <div key={a.ticker} style={{marginBottom:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:2}}>
                    <span style={{fontFamily:"var(--fm)",fontWeight:700,color:"var(--tx)"}}>{a.ticker}</span>
                    <span style={{fontFamily:"var(--fm)",color:"var(--amb)"}}>{a.weight}%</span>
                  </div>
                  <div className="alloc-bar" style={{
                    width:`${a.weight}%`,background:PALETTE[i%PALETTE.length],
                    maxWidth:"100%",opacity:.6
                  }}/>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Efficient frontier */}
      {ef.length > 0 && (
        <div style={{background:"var(--s1)",border:"1px solid var(--bd)",borderRadius:10,padding:12}}>
          <div className="st" style={{marginBottom:8}}>EFFICIENT FRONTIER</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:3,height:80}}>
            {ef.map((pt,i) => {
              const h = Math.max(4, (pt.ret / (Math.max(...ef.map(p=>p.ret))||1)) * 76);
              return (
                <div key={i} title={`Vol:${pt.vol}% Ret:${pt.ret}%`}
                  style={{flex:1,height:`${h}px`,borderRadius:"2px 2px 0 0",
                    background:`rgba(0,212,255,${0.2+i/ef.length*0.6})`}}/>
              );
            })}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:"var(--tx3)",marginTop:4}}>
            <span>Low Vol → </span><span>← High Return</span>
          </div>
        </div>
      )}

      {optData?.tickers_used && (
        <div className="banner-info" style={{fontSize:9}}>
          Tickers analyzed: {optData.tickers_used.join(", ")} · {optData.data_rows} trading days
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// RESEARCH TAB
// ════════════════════════════════════════════════════════════
function ResearchTab({ liveMacro, liveNews }) {
  const [ticker,  setTicker]  = useState("SPX");
  const [report,  setReport]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const TICKERS = ["SPX","NDX","BTC","ETH","NVDA","AAPL","MSFT","TSLA"];

  const run = async () => {
    setLoading(true); setError("");
    try {
      const r = await apiGet(`/research/${ticker}`);
      if (r.error) throw new Error(r.error);
      setReport(r);
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const typeCol = t => t==="proposed"?"var(--acc)":t==="benchmark"?"var(--gold)":t==="sanity_check"?"var(--tx3)":"var(--tx2)";
  const retCol  = v => v&&v.startsWith("+")?"var(--grn)":v&&v!==NA?"var(--red)":"var(--tx3)";

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:".12em",color:"var(--acc)"}}>
          RESEARCH MODULE — REPRODUCIBLE EXPERIMENTS
        </div>
        <select value={ticker} onChange={e=>setTicker(e.target.value)}
          style={{background:"var(--s2)",border:"1px solid var(--bd)",borderRadius:"var(--r)",
            padding:"4px 8px",color:"var(--tx)",fontFamily:"var(--fu)",fontSize:10,marginLeft:"auto"}}>
          {TICKERS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="btn-sec" onClick={run} disabled={loading}>
          {loading && <span className="spinner"/>}
          {loading?"Running…":"Run Experiment"}
        </button>
      </div>

      <div className="banner-info" style={{fontSize:9}}>
        All metrics computed from real historical data. No synthetic values.
        Walk-forward test (80/20 split). Transaction costs + slippage included.
      </div>

      {error && <div className="banner-warn">⚠ {error}</div>}
      {loading && <div className="empty"><div className="ei">🔬</div><div style={{fontSize:10}}>Running experiments on real data…</div></div>}

      {/* Live macro dashboard */}
      {liveMacro && liveMacro.length > 0 && (
        <div style={{background:"var(--s1)",border:"1px solid var(--bd)",borderRadius:10,padding:12}}>
          <div className="st" style={{marginBottom:8}}>LIVE MACROECONOMIC DASHBOARD (FRED API)</div>
          {liveMacro.map((m,i) => (
            <div key={i} className="macro-r">
              <span className="mk">{m.k}</span>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span className="mv2" style={{color:m.col}}>{m.v}</span>
                <span style={{fontSize:9,fontFamily:"var(--fm)",
                  color:m.imp==="pos"?"var(--grn)":m.imp==="neg"?"var(--red)":"var(--tx3)"}}>
                  {m.delta}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      {liveMacro?.length === 0 && (
        <div className="banner-warn">Macro data unavailable — FRED_API_KEY not configured</div>
      )}

      {/* Live news */}
      {liveNews && liveNews.length > 0 && (
        <div style={{background:"var(--s1)",border:"1px solid var(--bd)",borderRadius:10,padding:12}}>
          <div className="st" style={{marginBottom:8}}>LIVE NEWS SENTIMENT (NLP-WEIGHTED)</div>
          {liveNews.map((n,i) => (
            <div key={i} className="ni">
              <div className="nh">{n.h}
                <span className={`sp ${n.s==="pos"?"sp-p":n.s==="neg"?"sp-n":"sp-u"}`}>
                  {n.s==="pos"?"▲ Pos":n.s==="neg"?"▼ Neg":"→ Neu"}
                </span>
                {n.score != null && (
                  <span style={{fontSize:8,fontFamily:"var(--fm)",color:"var(--tx3)",marginLeft:4}}>
                    ({n.score > 0 ? "+" : ""}{Number(n.score).toFixed(2)})
                  </span>
                )}
              </div>
              <div className="nm">{n.src} · {n.t}</div>
            </div>
          ))}
        </div>
      )}

      {/* Research report */}
      {report && (
        <>
          {/* Dataset description */}
          <div style={{background:"var(--s1)",border:"1px solid var(--bd)",borderRadius:10,padding:12}}>
            <div className="st" style={{marginBottom:8}}>DATASET DESCRIPTION</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
              {[
                ["Ticker",         report.ticker],
                ["Period",         report.period],
                ["Data Points",    String(report.dataset?.price_series_length)],
                ["Ann. Return",    `${report.dataset?.annualized_return_pct}%`],
                ["Ann. Volatility",`${report.dataset?.annualized_vol_pct}%`],
                ["Skewness",       String(report.dataset?.skewness)],
                ["Kurtosis",       String(report.dataset?.kurtosis)],
                ["Autocorr (1d)",  String(report.dataset?.autocorr_lag1)],
              ].map(([l,v]) => (
                <div key={l} style={{padding:"5px 8px",background:"var(--s2)",border:"1px solid var(--bd)",borderRadius:"var(--r)"}}>
                  <div style={{fontSize:8,color:"var(--tx3)",letterSpacing:".08em",marginBottom:2}}>{l}</div>
                  <div style={{fontSize:11,fontFamily:"var(--fm)",color:"var(--acc)",fontWeight:700}}>{v ?? NA}</div>
                </div>
              ))}
            </div>
            <div style={{marginTop:8}}>
              <div style={{fontSize:8,color:"var(--tx3)",letterSpacing:".08em",marginBottom:4}}>FEATURES USED</div>
              <div className="tag-list">
                {report.dataset?.features_used?.map(f => <span key={f} className="tag">{f}</span>)}
              </div>
            </div>
          </div>

          {/* Experiment table */}
          <div style={{background:"var(--s1)",border:"1px solid var(--bd)",borderRadius:10,padding:12}}>
            <div className="st" style={{marginBottom:8}}>EXPERIMENT RESULTS TABLE</div>
            <table className="res-table">
              <thead>
                <tr>
                  <th style={{textAlign:"left"}}>Strategy</th>
                  <th>Cum. Return</th><th>Ann. Return</th><th>Sharpe</th>
                  <th>Max DD</th><th>Win Rate</th><th>Trades</th>
                </tr>
              </thead>
              <tbody>
                {report.experiment_table?.map((row,i) => (
                  <tr key={i} className={row.type==="proposed"?"proposed":""}>
                    <td style={{textAlign:"left",color:typeCol(row.type),fontWeight:row.type==="proposed"?700:400}}>
                      {row.strategy}{row.type==="proposed"?" ★":""}
                    </td>
                    <td style={{color:retCol(row.cumRet)}}>{row.cumRet ?? NA}</td>
                    <td style={{color:retCol(row.annRet)}}>{row.annRet ?? NA}</td>
                    <td style={{color:parseFloat(row.sharpe)>1?"var(--grn)":parseFloat(row.sharpe)<0?"var(--red)":"var(--tx2)"}}>
                      {row.sharpe ?? NA}
                    </td>
                    <td style={{color:"var(--red)"}}>{row.maxDD ?? NA}</td>
                    <td>{row.winRate ?? NA}</td>
                    <td style={{color:"var(--tx3)"}}>{row.nTrades ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Methodology */}
          <div style={{background:"var(--s1)",border:"1px solid var(--bd)",borderRadius:10,padding:12}}>
            <div className="st" style={{marginBottom:8}}>METHODOLOGY & BIAS CONTROLS</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6,fontSize:10}}>
              {Object.entries(report.methodology||{}).map(([k,v]) => (
                <div key={k} style={{padding:"5px 8px",background:"var(--s2)",border:"1px solid var(--bd)",borderRadius:"var(--r)"}}>
                  <div style={{fontSize:8,color:"var(--tx3)",letterSpacing:".06em",marginBottom:2,textTransform:"uppercase"}}>{k.replace(/_/g," ")}</div>
                  <div style={{color:"var(--tx2)",fontSize:10}}>
                    {Array.isArray(v) ? v.map((s,i)=><div key={i} style={{display:"flex",gap:4,alignItems:"flex-start"}}>
                      <span style={{color:"var(--grn)",marginTop:1}}>✓</span>{s}
                    </div>) : String(v)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="banner-info" style={{fontSize:9}}>
            Generated at {report.generated_at} UTC · Data source: Yahoo Finance (yfinance) · All results reproducible
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ARCHITECTURE TAB
// ════════════════════════════════════════════════════════════
const ARCH_LAYERS = [
  {icon:"📡",title:"L1 — Data Intelligence Layer",
   desc:"Live feeds: global indices (yfinance), FRED macroeconomic API (Fed Funds, CPI, yields, unemployment), NewsAPI financial headlines. All data cached to avoid throttling. Staleness check: data >7 days old is rejected.",
   tags:["yfinance OHLCV","FRED API macroeconomics","NewsAPI financial news","Staleness & spike validation"]},
  {icon:"🔧",title:"L2 — Data Preparation & Validation",
   desc:"Strict data integrity checks before any model runs: missing-value ratio, minimum row count (≥60 trading days), abnormal spike detection. Returns 'Data unavailable' instead of synthetic values when validation fails.",
   tags:["Missing value checks","Minimum length (60+ rows)","Spike detection","No synthetic fallbacks"]},
  {icon:"📐",title:"L3 — Quantitative Model (v3)",
   desc:"RSI, MACD(12,26,9), Bollinger Bands(20,2), EMA(20,50), ATR-14, Realized Volatility, Momentum(1m,3m,6m), Volume. Weighted composite score 0–100. Score ≥65 = BUY, ≤38 = SELL. Component-level attribution shown.",
   tags:["RSI · MACD · BBands · ATR","EMA crossovers","Momentum 1m/3m/6m","Realized volatility"]},
  {icon:"🧭",title:"L4 — Market Regime Detection",
   desc:"Live VIX, yield curve spread (10Y–2Y), NDX 3-month momentum. Classifies: Bull Trend, Bear Trend, High Volatility, Liquidity Stress, Sideways. Regime adapts all downstream recommendations.",
   tags:["VIX threshold logic","Yield curve shape","Price momentum","5-state regime classifier"]},
  {icon:"🤖",title:"L5 — Multi-Agent Orchestrator",
   desc:"5 AI agents: Macro (FRED data), Sentiment (NLP-weighted news), Technical (real quant indicators), Risk (veto authority, risk_score≥4 overrides BUY), Strategy (synthesizes all). Weighted composite pre-computed as anchor.",
   tags:["Macro Agent","Sentiment (NLP-weighted)","Technical Agent","Risk Agent (veto)","Strategy Agent"]},
  {icon:"🛡️",title:"L6 — Risk Intelligence Module",
   desc:"Portfolio-level: VaR 95%, CVaR 95%, Beta (vs SPX), Sharpe, Sortino, Calmar, Max Drawdown, Annualized return/vol. All from real 1-year price history. No hardcoded values.",
   tags:["VaR · CVaR (95%)","Sharpe · Sortino · Calmar","Portfolio Beta","Max Drawdown"]},
  {icon:"📊",title:"L7 — Walk-Forward Backtesting Engine",
   desc:"RSI mean-reversion strategy vs benchmarks (Buy & Hold, MACD, Random). Walk-forward OOS test (80/20 split). Includes realistic frictions: 0.10% transaction cost + 0.05% slippage. No lookahead bias.",
   tags:["RSI strategy","MACD & Buy&Hold benchmarks","Walk-forward OOS","Transaction costs + slippage"]},
  {icon:"🔬",title:"L8 — Research & Explainability Module",
   desc:"Academic-grade research output: dataset statistics, feature engineering pipeline, experiment tables with all 4 strategies, methodology report. All results reproducible (seeded random baseline). Suitable for publication.",
   tags:["Dataset statistics","Feature pipeline","Experiment tables","Bias controls & reproducibility"]},
  {icon:"⚙",title:"L9 — Portfolio Optimization (MPT)",
   desc:"Modern Portfolio Theory via Monte Carlo (5000 portfolios). Produces Max Sharpe Ratio and Min Volatility portfolios with allocation weights, expected return, volatility, and Sharpe. Real historical data only.",
   tags:["Monte Carlo simulation","Max Sharpe portfolio","Min Volatility portfolio","Efficient frontier"]},
  {icon:"🔐",title:"Security Architecture",
   desc:"No API keys in client code. All AI and data calls proxied through FastAPI backend. CORS configured for production origins. Gateway enforces rate-limiting, request sanitization.",
   tags:["No client-side keys","Backend gateway","CORS production config","Rate limiting"]},
];

function ArchitectureTab() {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:9}}>
      <div className="arch-box">
        <strong>v3.0 Data Integrity Policy:</strong> This platform never generates synthetic, placeholder, or fabricated metrics.
        If real data cannot be fetched or validated (insufficient history, stale data, API errors),
        the system returns <em>"Data unavailable"</em> or <em>"Insufficient data quality for analysis"</em>.
        All backtest metrics are derived strictly from real historical price data with realistic transaction frictions.
      </div>
      {ARCH_LAYERS.map((l,i) => (
        <div key={i} style={{background:"var(--s1)",border:"1px solid var(--bd)",borderRadius:10,padding:12}}>
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
            <span style={{fontSize:16}}>{l.icon}</span>
            <div style={{fontSize:10,fontWeight:700,color:"var(--acc)",letterSpacing:".06em"}}>{l.title}</div>
          </div>
          <p className="prose" style={{fontSize:11,marginBottom:6}}>{l.desc}</p>
          <div className="tag-list">{l.tags.map((t,j) => <span key={j} className="tag">{t}</span>)}</div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// QUICK QUERIES
// ════════════════════════════════════════════════════════════
const QUICK_Q = [
  "Analyze NVIDIA for short-term momentum",
  "Bitcoin risk assessment — next 30 days",
  "US vs India market divergence outlook",
  "Fed pause impact on global equities",
  "Best risk-adjusted plays in technology",
  "Portfolio rebalancing recommendation",
  "Which sector shows strongest momentum?",
  "Macro headwinds for emerging markets",
];

// ════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════
export default function App() {
  const [tab,      setTab]      = useState("analysis");
  const [selMkt,   setSelMkt]   = useState("SPX");
  const [query,    setQuery]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [prog,     setProg]     = useState({});
  const [analyses, setAnalyses] = useState([]);
  const [selA,     setSelA]     = useState(null);
  const [time,     setTime]     = useState(new Date());

  // Live market data from backend
  const [liveMarkets, setLiveMarkets] = useState([]);
  const [liveMacro,   setLiveMacro]   = useState([]);
  const [liveNews,    setLiveNews]    = useState([]);
  const [liveRegime,  setLiveRegime]  = useState(null);
  const [liveRisk,    setLiveRisk]    = useState(null);
  const [marketLoading, setMarketLoading] = useState(false);

  const [backendStatus, setBackendStatus] = useState("checking");
  const [runError,      setRunError]      = useState("");

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-refresh market data every 60 seconds so the "LIVE" badge is accurate
  useEffect(() => {
    if (backendStatus !== "ok") return;
    const t = setInterval(() => { loadMarketData(); }, 60_000);
    return () => clearInterval(t);
  }, [backendStatus]);

  // Health check + initial data load
  useEffect(() => {
    apiGet("/health")
      .then(() => {
        setBackendStatus("ok");
        loadMarketData();
        loadRisk();
      })
      .catch(() => setBackendStatus("offline"));
  }, []);

  const loadMarketData = async () => {
    setMarketLoading(true);
    try {
      const d = await apiGet("/market-data");
      setLiveMarkets(d.markets || []);
      setLiveMacro(d.macro || []);
      setLiveNews(d.news || []);
      setLiveRegime(d.regime || null);
    } catch(e) {
      console.warn("Market data fetch failed:", e.message);
    } finally {
      setMarketLoading(false);
    }
  };

  const loadRisk = async () => {
    try {
      const r = await apiGet("/portfolio-risk");
      setLiveRisk(r);
    } catch(e) {
      console.warn("Risk fetch failed:", e.message);
    }
  };

  const animateAgents = useCallback(() => {
    const delays = [0, 180, 380, 660, 1050];
    AGENTS_LIST.forEach((a, i) => {
      setTimeout(() => {
        let s = 0;
        const iv = setInterval(() => {
          s++;
          setProg(p => ({ ...p, [a.key]: Math.min(100, Math.round((s/12)*100)) }));
          if (s >= 12) clearInterval(iv);
        }, 75);
      }, delays[i]);
    });
  }, []);

  const run = useCallback(async (q) => {
    const fq = (q || query).trim();
    if (!fq || loading) return;
    if (backendStatus === "offline") {
      setRunError("Backend offline — start: cd backend && uvicorn main:app --reload --port 8000");
      return;
    }
    setLoading(true); setProg({}); setRunError(""); animateAgents();
    try {
      const result = await apiPost("/analyze", { query: fq, market_id: selMkt });
      const raw    = result.ai_response ?? "";
      const parsed = parseAI(raw);

      let bt = null;
      try { bt = await apiPost("/backtest", { ticker: selMkt, signal: parsed.signal ?? "BUY" }); } catch {}

      const item = {
        id:       Date.now(),
        query:    fq,
        parsed,
        backtest: bt,
        market:   result.market?.name ?? selMkt,
        regime:   result.regime?.regime ?? liveRegime?.regime ?? "UNKNOWN",
        ts:       time.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }),
      };
      setAnalyses(p => [item, ...p]);
      setSelA(item.id);
      setQuery("");
      setTab("analysis");
    } catch(e) {
      setRunError(`Analysis failed: ${e.message}`);
    } finally {
      setLoading(false);
      setProg({});
    }
  }, [query, selMkt, loading, backendStatus, animateAgents, liveRegime, time]);

  const handleKey = e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(); }
  };

  const statusCol = backendStatus==="ok"?"var(--grn)":backendStatus==="offline"?"var(--red)":"var(--amb)";
  const statusTxt = backendStatus==="ok"?"LIVE":backendStatus==="offline"?"BACKEND OFFLINE":"CONNECTING";

  // Use live data for sidebar, fall back to empty
  const markets = liveMarkets.length > 0 ? liveMarkets : [];
  const regime  = liveRegime || { regime:"LOADING…", icon:"⏳", col:"var(--tx3)", desc:"Fetching live data…" };

  const regionsOrder = ["US","India","Europe","Crypto"];

  return (
    <>
      <style>{CSS}</style>
      <div className="shell">

        {/* ── HEADER ── */}
        <header className="hdr">
          <div className="logo">
            <div className="logo-ring">A</div>
            APEX INTELLIGENCE
          </div>
          <nav className="ntabs">
            {[
              ["analysis","⚡ Analysis"],
              ["scanner","🔭 Scanner"],
              ["portfolio","📊 Portfolio"],
              ["research","🔬 Research"],
              ["architecture","🏗 Architecture"],
            ].map(([k,l]) => (
              <button key={k} className={`nt ${tab===k?"on":""}`} onClick={() => setTab(k)}>{l}</button>
            ))}
          </nav>
          <div className="hdr-r">
            <button className="btn-sec" style={{fontSize:9,padding:"3px 9px"}}
              onClick={() => { loadMarketData(); loadRisk(); }}
              disabled={marketLoading}>
              {marketLoading?"…":"⟳ Refresh"}
            </button>
            <div className="live" style={{color:statusCol}}>
              <div className="dot" style={{background:statusCol}}/>{statusTxt}
            </div>
            <span>{time.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</span>
          </div>
        </header>

        <div className="body">

          {/* ── SIDEBAR (live market data) ── */}
          <aside className="sb">
            <div className="slabel">Market Regime</div>
            <div className="rbadge">
              <span className="ri">{regime.icon}</span>
              <div>
                <div className="rl" style={{color:regime.col}}>{regime.regime}</div>
                <div className="rd">{regime.desc}</div>
                {regime.vix && regime.vix !== "Data unavailable" && (
                  <div style={{fontSize:8,color:"var(--tx3)",marginTop:3,fontFamily:"var(--fm)"}}>
                    VIX={regime.vix} · Spread={regime.spread}
                  </div>
                )}
              </div>
            </div>
            {markets.length === 0 && backendStatus !== "offline" && (
              <div style={{fontSize:9,color:"var(--tx3)",textAlign:"center",padding:"10px 0"}}>
                {marketLoading ? "Loading…" : "No data"}
              </div>
            )}
            {regionsOrder.map(region => {
              const regionMkts = markets.filter(m => m.region === region);
              if (!regionMkts.length) return null;
              return (
                <div key={region}>
                  <div className="slabel">{region}</div>
                  {regionMkts.map(m => (
                    <div key={m.id} className={`mc ${selMkt===m.id?"sel":""}`} onClick={() => setSelMkt(m.id)}>
                      <div>
                        <div className="mn">{m.name || m.id}</div>
                        <div className="mp">{fmtPrice(m.price, m.region)}</div>
                      </div>
                      {m.chg != null ? (
                        <span className={`mchg ${m.chg>=0?"up":"dn"}`}>
                          {m.chg>=0?"+":""}{m.chg}%
                        </span>
                      ) : <span className="mchg neu">—</span>}
                    </div>
                  ))}
                </div>
              );
            })}
          </aside>

          {/* ── CENTER PANEL ── */}
          <main className="ctr">

            {/* ════ ANALYSIS TAB ════ */}
            {tab === "analysis" && (
              <>
                {backendStatus === "offline" && (
                  <div className="banner-err">
                    <span>⚠</span>
                    <div>
                      <div style={{fontWeight:700,marginBottom:2}}>Backend offline — AI analysis unavailable</div>
                      <div style={{color:"var(--tx3)",fontFamily:"var(--fm)",fontSize:10}}>
                        cd backend &amp;&amp; uvicorn main:app --reload --port 8000
                      </div>
                    </div>
                  </div>
                )}
                {runError && <div className="banner-warn">⚠ {runError}</div>}
                <div className="qbox">
                  <div className="qt">⚡ Multi-Agent Intelligence Query</div>
                  <div className="chips">
                    {QUICK_Q.map((q,i) => (
                      <button key={i} className="chip" onClick={() => run(q)}>{q}</button>
                    ))}
                  </div>
                  <div className="qrow">
                    <textarea className="qi" value={query}
                      onChange={e => setQuery(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder="Ask APEX… e.g. 'Analyze BTC momentum' or 'Best tech stock now'"
                    />
                    <button className="qbtn" onClick={() => run()} disabled={loading || !query.trim()}>
                      {loading ? "…" : "ANALYZE"}
                    </button>
                  </div>
                  <div style={{marginTop:7,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                    <span style={{fontSize:9,color:"var(--tx3)"}}>Market:</span>
                    {markets.slice(0,9).map(m => (
                      <button key={m.id} className="chip" style={{padding:"2px 7px",
                        borderColor:selMkt===m.id?"var(--acc)":"",color:selMkt===m.id?"var(--acc)":""}}
                        onClick={() => setSelMkt(m.id)}>{m.id}</button>
                    ))}
                  </div>
                </div>
                {loading && Object.keys(prog).length > 0 && <AgentProgress prog={prog}/>}
                {analyses.length === 0 && !loading && (
                  <div className="empty">
                    <div className="ei">🧠</div>
                    <div>Run a query to get institutional-grade AI analysis</div>
                    <div className="eh">Real-time data · Walk-forward backtests · Explainable AI</div>
                  </div>
                )}
                {analyses.map(a => (
                  <AnalysisCard key={a.id} item={a}
                    selected={selA===a.id}
                    onSelect={id => setSelA(id===selA?null:id)}
                  />
                ))}
              </>
            )}

            {/* ════ SCANNER TAB ════ */}
            {tab === "scanner" && <ScannerTab/>}

            {/* ════ PORTFOLIO TAB ════ */}
            {tab === "portfolio" && <PortfolioTab liveRisk={liveRisk}/>}

            {/* ════ RESEARCH TAB ════ */}
            {tab === "research" && <ResearchTab liveMacro={liveMacro} liveNews={liveNews}/>}

            {/* ════ ARCHITECTURE TAB ════ */}
            {tab === "architecture" && <ArchitectureTab/>}

          </main>

          {/* ── RIGHT PANEL (live data only) ── */}
          <aside className="rp">

            {/* Selected market sparkline */}
            {(() => {
              const m = markets.find(x => x.id === selMkt);
              return m ? (
                <div className="wig">
                  <div className="wh">{m.name || m.id} · Live</div>
                  <div className="wb">
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:15,fontWeight:800,fontFamily:"var(--fm)",color:"var(--tx)"}}>
                        {fmtPrice(m.price, m.region)}
                      </span>
                      {m.chg != null ? (
                        <span className={`mchg ${m.chg>=0?"up":"dn"}`}>{m.chg>=0?"+":""}{m.chg}%</span>
                      ) : <span className="mchg neu">—</span>}
                    </div>
                    {m.error && <div style={{fontSize:9,color:"var(--amb)",marginTop:4}}>{m.error}</div>}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Market regime */}
            <div className="wig">
              <div className="wh">Market Regime</div>
              <div className="wb">
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
                  <span style={{fontSize:20}}>{regime.icon}</span>
                  <div>
                    <div style={{fontSize:11,fontWeight:800,color:regime.col,letterSpacing:".06em"}}>{regime.regime}</div>
                    <div style={{fontSize:9,color:"var(--tx3)",marginTop:1}}>Live detection</div>
                  </div>
                </div>
                <p style={{fontSize:10,color:"var(--tx2)",lineHeight:1.6}}>{regime.desc}</p>
              </div>
            </div>

            {/* Portfolio risk */}
            {liveRisk && !liveRisk.error && (
              <div className="wig">
                <div className="wh">Portfolio Risk (Live)</div>
                <div className="wb">
                  {[
                    ["Beta",    liveRisk.portfolioBeta],
                    ["Sharpe",  liveRisk.sharpe],
                    ["VaR 95%", liveRisk.var95],
                    ["Max DD",  liveRisk.maxDD],
                  ].map(([l,v]) => (
                    <div key={l} className="sr">
                      <span style={{fontSize:10,color:"var(--tx3)"}}>{l}</span>
                      <span style={{fontSize:11,fontFamily:"var(--fm)",fontWeight:700,color:"var(--tx2)"}}>{v ?? NA}</span>
                    </div>
                  ))}
                  {liveRisk.riskScore && (
                    <div style={{marginTop:7}}>
                      <div style={{fontSize:8,color:"var(--tx3)",letterSpacing:".1em",marginBottom:4,textTransform:"uppercase"}}>
                        Risk: {liveRisk.riskLevel}
                      </div>
                      <RiskMeter score={liveRisk.riskScore}/>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Live news */}
            {liveNews.length > 0 && (
              <div className="wig">
                <div className="wh">Sentiment Feed (Live NLP)</div>
                <div className="wb">
                  {liveNews.slice(0,5).map((n,i) => (
                    <div key={i} className="ni">
                      <div className="nh" style={{fontSize:10}}>{n.h.slice(0,60)}…</div>
                      <div className="nm">{n.src} · {n.t}
                        <span className={`sp ${n.s==="pos"?"sp-p":n.s==="neg"?"sp-n":"sp-u"}`}>
                          {n.s==="pos"?"+":n.s==="neg"?"-":"~"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {liveNews.length === 0 && backendStatus==="ok" && (
              <div className="wig">
                <div className="wh">News Sentiment</div>
                <div className="wb" style={{fontSize:9,color:"var(--tx3)"}}>
                  NEWS_API_KEY not configured — news unavailable
                </div>
              </div>
            )}

            {/* Macro snapshot */}
            {liveMacro.length > 0 && (
              <div className="wig">
                <div className="wh">Macro (FRED)</div>
                <div className="wb">
                  {liveMacro.slice(0,5).map((m,i) => (
                    <div key={i} className="sr">
                      <span style={{fontSize:9,color:"var(--tx3)"}}>{m.k}</span>
                      <span style={{fontSize:10,fontFamily:"var(--fm)",fontWeight:700,color:m.col}}>{m.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {liveMacro.length === 0 && backendStatus==="ok" && (
              <div className="wig">
                <div className="wh">Macro</div>
                <div className="wb" style={{fontSize:9,color:"var(--tx3)"}}>
                  FRED_API_KEY not configured — macro unavailable
                </div>
              </div>
            )}

            {/* History */}
            {analyses.length > 0 && (
              <div className="wig">
                <div className="wh">History ({analyses.length})</div>
                <div className="wb" style={{padding:"5px 7px"}}>
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    {analyses.map(a => (
                      <div key={a.id} className="hi"
                        onClick={() => { setTab("analysis"); setSelA(a.id); }}>
                        <div className="hq">{a.query.slice(0,44)}{a.query.length>44?"…":""}</div>
                        <div className="hm">{a.ts} · {a.market}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </aside>
        </div>
      </div>
    </>
  );
}
