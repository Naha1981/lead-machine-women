
"use client";

import { FormEvent, useMemo, useState } from "react";

type Finding = {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  whyItMatters: string;
  fixTitle: string;
  fixAction: string;
  points: number;
};

type Fix = {
  id: string;
  title: string;
  description: string;
  modules: string[];
};

type Audit = {
  url: string;
  finalUrl: string;
  domain: string;
  score: number;
  grade: string;
  summary: string;
  findings: Finding[];
  fixPlan: Fix[];
  metrics: {
    responseMs: number;
    pageSizeKb: number;
    formCount: number;
    imageCount: number;
  };
  pagespeed: {
    performance: number | null;
    seo: number | null;
    accessibility: number | null;
    bestPractices: number | null;
  } | null;
};

const severityName: Record<Finding["severity"], string> = {
  critical: "Revenue blocker",
  high: "High impact",
  medium: "Opportunity",
  low: "Cleanup",
};

const severityStyle: Record<Finding["severity"], string> = {
  critical: "border-red-300 bg-red-50 text-red-700",
  high: "border-orange-300 bg-orange-50 text-orange-700",
  medium: "border-amber-300 bg-amber-50 text-amber-700",
  low: "border-slate-200 bg-slate-50 text-slate-600",
};

function money(value: number) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(value);
}

export default function AuditPage() {
  const [url, setUrl] = useState("");
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [visitors, setVisitors] = useState(1000);
  const [conversionRate, setConversionRate] = useState(2);
  const [customerValue, setCustomerValue] = useState(2500);

  async function runAudit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setAudit(null);
    setSaved(false);
    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Audit failed.");
      setAudit(data.audit);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit failed.");
    } finally {
      setLoading(false);
    }
  }

  async function saveLead(event: FormEvent) {
    event.preventDefault();
    if (!audit) return;
    try {
      const response = await fetch("/api/audit/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          url: audit.url,
          score: audit.score,
          fixPlan: audit.fixPlan.map(function (f) { return f.title; }),
        }),
      });
      if (!response.ok) throw new Error();
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }

  const scenario = useMemo(function () {
    const currentLeads = visitors * (conversionRate / 100);
    const onePoint = visitors * 0.01;
    return {
      currentLeads,
      onePoint,
      onePointRevenue: onePoint * customerValue,
      twoPointRevenue: onePoint * 2 * customerValue,
    };
  }, [visitors, conversionRate, customerValue]);

  return (
    <main className="min-h-screen bg-[#080909] text-[#F3F0EA]">
      <header className="border-b border-[#1b1c1f]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <a href="/" className="text-[14px] font-extrabold tracking-[0.24em]">NAHALABS</a>
          <span className="hidden text-[10px] font-mono uppercase tracking-[0.18em] text-[#8f8c85] sm:inline">Revenue Leak Audit</span>
        </div>
      </header>

      <section className="border-b border-[#1b1c1f]">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="max-w-4xl">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#C8AE82]">Free website diagnosis</div>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl lg:text-7xl">Find where your website is losing enquiries.</h1>
            <p className="mt-6 max-w-3xl text-base leading-relaxed text-[#A5A29B] sm:text-xl">
              Enter a website. We inspect the public page for conversion, trust, mobile and technical leaks, then show you exactly what to fix first.
            </p>
          </div>

          <form onSubmit={runAudit} className="mt-10 max-w-3xl">
            <div className="rounded-2xl border border-[#2a2c31] bg-[#101112] p-3 sm:flex sm:items-center sm:gap-3">
              <input
                type="text"
                inputMode="url"
                autoComplete="url"
                value={url}
                onChange={function (e) { setUrl(e.target.value); }}
                placeholder="e.g. https://yourbusiness.co.za"
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-[#666]"
                required
              />
              <button type="submit" disabled={loading} className="mt-2 w-full rounded-xl bg-[#C8AE82] px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-[#080909] sm:mt-0 sm:w-auto disabled:opacity-60">
                {loading ? "Scanning..." : "Run free audit"}
              </button>
            </div>
            <div className="mt-3 text-xs text-[#777]">No login. No credit card. One public page is scanned.</div>
            {error && <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-200">{error}</div>}
          </form>
        </div>
      </section>

      {audit && (
        <>
          <section className="border-b border-[#1b1c1f]">
            <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
              <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
                <div className="rounded-2xl border border-[#2a2c31] bg-[#101112] p-6 text-center">
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8f8c85]">Revenue leak score</div>
                  <div className="mt-3 text-7xl font-semibold tracking-[-0.06em]">{audit.score}</div>
                  <div className="mt-1 text-xs text-[#777]">out of 100</div>
                  <div className="mt-4 text-xs font-mono uppercase tracking-[0.16em] text-[#C8AE82]">{audit.grade.replaceAll("-", " ")}</div>
                </div>

                <div className="rounded-2xl border border-[#2a2c31] bg-[#101112] p-6 sm:p-8">
                  <div className="text-xs font-mono text-[#8f8c85]">{audit.domain}</div>
                  <h2 className="mt-2 text-2xl font-semibold sm:text-4xl">Here is what we found.</h2>
                  <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#A5A29B] sm:text-base">{audit.summary}</p>
                  <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      ["Response", audit.metrics.responseMs + "ms"],
                      ["HTML", audit.metrics.pageSizeKb + "KB"],
                      ["Forms", String(audit.metrics.formCount)],
                      ["Images", String(audit.metrics.imageCount)],
                    ].map(function (item) {
                      return (
                        <div key={item[0]} className="rounded-xl border border-[#25272b] bg-[#0c0d0f] p-4">
                          <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#666]">{item[0]}</div>
                          <div className="mt-1 text-lg font-semibold">{item[1]}</div>
                        </div>
                      );
                    })}
                  </div>
                  {audit.pagespeed && (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        ["Performance", audit.pagespeed.performance],
                        ["SEO", audit.pagespeed.seo],
                        ["Accessibility", audit.pagespeed.accessibility],
                        ["Best practices", audit.pagespeed.bestPractices],
                      ].map(function (item) {
                        return (
                          <div key={String(item[0])} className="rounded-xl border border-[#25272b] bg-[#0c0d0f] p-4">
                            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#666]">{item[0]}</div>
                            <div className="mt-1 text-lg font-semibold">{item[1] == null ? "—" : item[1]}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="border-b border-[#1b1c1f]">
            <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#C8AE82]">Priority findings</div>
                  <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Fix these first.</h2>
                </div>
                <div className="text-xs text-[#777]">{audit.findings.length} findings detected</div>
              </div>

              <div className="mt-8 grid gap-4">
                {audit.findings.slice(0, 8).map(function (item) {
                  return (
                    <article key={item.id} className="rounded-2xl border border-[#24262b] bg-[#101112] p-5 sm:p-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={"rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider " + severityStyle[item.severity]}>
                          {severityName[item.severity]}
                        </span>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#666]">{item.category}</span>
                      </div>
                      <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-[#A5A29B]">{item.description}</p>
                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-[#222428] bg-[#0c0d0f] p-4">
                          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#666]">Why it matters</div>
                          <p className="mt-2 text-sm leading-relaxed text-[#D7D3CA]">{item.whyItMatters}</p>
                        </div>
                        <div className="rounded-xl border border-[#3a352d] bg-[#161411] p-4">
                          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#C8AE82]">Recommended fix</div>
                          <p className="mt-1 font-semibold">{item.fixTitle}</p>
                          <p className="mt-2 text-sm leading-relaxed text-[#A5A29B]">{item.fixAction}</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="border-b border-[#1b1c1f]">
            <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#C8AE82]">NahaLabs fix stack</div>
              <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">The audit turns into work.</h2>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#A5A29B] sm:text-base">
                We do not sell another report. Each finding maps to a concrete implementation layer, so the next conversation is about fixing revenue friction.
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {audit.fixPlan.map(function (fix) {
                  return (
                    <div key={fix.id} className="rounded-2xl border border-[#24262b] bg-[#101112] p-6">
                      <h3 className="text-xl font-semibold">{fix.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-[#A5A29B]">{fix.description}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {fix.modules.map(function (module) {
                          return <span key={module} className="rounded-full border border-[#3a352d] bg-[#161411] px-3 py-1.5 text-[11px] text-[#D7D3CA]">{module}</span>;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="https://nahalabs.co.za/#contact" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-full bg-[#C8AE82] px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-[#080909]">Discuss the fixes</a>
                <a href="/services/lead-follow-up-automation-johannesburg" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-full border border-[#333] px-6 py-3.5 text-xs font-mono uppercase tracking-wider text-[#D7D3CA]">See lead follow-up system</a>
              </div>

              <form onSubmit={saveLead} className="mt-8 max-w-xl rounded-2xl border border-[#24262b] bg-[#101112] p-5">
                <div className="text-sm font-semibold">Send me the fix plan</div>
                <p className="mt-1 text-xs leading-relaxed text-[#777]">Optional. We only use this to follow up on this audit.</p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input type="email" value={email} onChange={function (e) { setEmail(e.target.value); }} placeholder="you@business.co.za" className="min-w-0 flex-1 rounded-xl border border-[#303238] bg-[#0c0d0f] px-4 py-3 text-sm outline-none placeholder:text-[#666] required" required />
                  <button type="submit" disabled={saved} className="rounded-xl border border-[#3a352d] bg-[#161411] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#D7D3CA] disabled:opacity-60">{saved ? "Saved" : "Save my plan"}</button>
                </div>
                {saved && <p className="mt-2 text-xs text-[#C8AE82]">Saved. NahaLabs can follow up with this audit context.</p>}
              </form>
            </div>
          </section>

          <section>
            <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
              <div className="max-w-3xl">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#C8AE82]">ROI scenario calculator</div>
                <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Put a value on one extra percentage point.</h2>
                <p className="mt-4 text-sm leading-relaxed text-[#A5A29B]">This is a scenario calculator, not a promise. Change the inputs to see what one or two percentage points of additional conversion could be worth.</p>
              </div>

              <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-2xl border border-[#24262b] bg-[#101112] p-6 space-y-6">
                  <label className="block">
                    <div className="mb-2 flex items-center justify-between text-xs font-mono uppercase tracking-[0.12em] text-[#8f8c85]"><span>Monthly website visitors</span><span>{visitors.toLocaleString("en-ZA")}</span></div>
                    <input type="range" min="0" max="100000" step="50" value={visitors} onChange={function (e) { setVisitors(Number(e.target.value)); }} className="w-full" />
                  </label>
                  <label className="block">
                    <div className="mb-2 flex items-center justify-between text-xs font-mono uppercase tracking-[0.12em] text-[#8f8c85]"><span>Current enquiry conversion %</span><span>{conversionRate}</span></div>
                    <input type="range" min="0" max="20" step="0.1" value={conversionRate} onChange={function (e) { setConversionRate(Number(e.target.value)); }} className="w-full" />
                  </label>
                  <label className="block">
                    <div className="mb-2 flex items-center justify-between text-xs font-mono uppercase tracking-[0.12em] text-[#8f8c85]"><span>Gross profit per new customer</span><span>{money(customerValue)}</span></div>
                    <input type="range" min="0" max="100000" step="50" value={customerValue} onChange={function (e) { setCustomerValue(Number(e.target.value)); }} className="w-full" />
                  </label>
                </div>

                <div className="rounded-2xl border border-[#3a352d] bg-[#161411] p-6">
                  <div className="text-xs font-mono uppercase tracking-[0.15em] text-[#C8AE82]">Scenario output</div>
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div><div className="text-xs text-[#777]">Current monthly leads</div><div className="mt-1 text-3xl font-semibold">{scenario.currentLeads.toFixed(1)}</div></div>
                    <div><div className="text-xs text-[#777]">Leads from +1pp</div><div className="mt-1 text-3xl font-semibold">{scenario.onePoint.toFixed(0)}</div></div>
                  </div>
                  <div className="mt-6 space-y-3 border-t border-[#2a2925] pt-5">
                    <div className="flex items-center justify-between gap-4 text-sm"><span className="text-[#A5A29B]">Value of +1pp</span><strong>{money(scenario.onePointRevenue)}</strong></div>
                    <div className="flex items-center justify-between gap-4 text-sm"><span className="text-[#A5A29B]">Value of +2pp</span><strong>{money(scenario.twoPointRevenue)}</strong></div>
                  </div>
                  <p className="mt-6 text-xs leading-relaxed text-[#777]">Your actual opportunity depends on traffic quality, offer strength, sales follow-up and customer economics.</p>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
