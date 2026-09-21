
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_HTML_BYTES = 1500000;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 12000;
const USER_AGENT = "NahaLabs-Revenue-Leak-Audit/1.0 (+https://nahalabs.co.za/)";

export type FindingSeverity = "critical" | "high" | "medium" | "low";
export type FindingCategory = "conversion" | "trust" | "mobile" | "technical" | "performance" | "local";

export type AuditFinding = {
  id: string;
  severity: FindingSeverity;
  category: FindingCategory;
  title: string;
  description: string;
  whyItMatters: string;
  fixTitle: string;
  fixAction: string;
  points: number;
};

export type AuditFix = {
  id: string;
  title: string;
  description: string;
  modules: string[];
  sourceFindingIds: string[];
};

export type AuditResult = {
  url: string;
  finalUrl: string;
  domain: string;
  scannedAt: string;
  score: number;
  grade: "strong" | "needs-attention" | "high-leak-risk";
  summary: string;
  findings: AuditFinding[];
  fixPlan: AuditFix[];
  metrics: {
    responseMs: number;
    pageSizeKb: number;
    status: number;
    wordCount: number;
    h1Count: number;
    formCount: number;
    firstFormFieldCount: number;
    imageCount: number;
    imagesMissingAlt: number;
    scriptCount: number;
    linkCount: number;
  };
  signals: Record<string, boolean>;
  pagespeed: {
    performance: number | null;
    seo: number | null;
    accessibility: number | null;
    bestPractices: number | null;
    lcpMs: number | null;
    cls: number | null;
    inpMs: number | null;
  } | null;
};

type PageFetch = {
  finalUrl: URL;
  html: string;
  status: number;
  bytes: number;
  elapsedMs: number;
};

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value: string) {
  return decodeEntities(
    value
      .replace(/<!--[\\s\\S]*?-->/g, " ")
      .replace(/<script\\b[^>]*>[\\s\\S]*?<\\/script>/gi, " ")
      .replace(/<style\\b[^>]*>[\\s\\S]*?<\\/style>/gi, " ")
      .replace(/<noscript\\b[^>]*>[\\s\\S]*?<\\/noscript>/gi, " ")
      .replace(/<svg\\b[^>]*>[\\s\\S]*?<\\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  const pattern = /([:\\w-]+)\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))/g;
  for (const match of tag.matchAll(pattern)) {
    out[match[1].toLowerCase()] = decodeEntities(match[2] || match[3] || match[4] || "");
  }
  return out;
}

function tags(html: string, tagName: string) {
  return Array.from(html.matchAll(new RegExp("<" + tagName + "\\b[^>]*>", "gi"))).map(function (m) {
    return m[0];
  });
}

function titleOf(html: string) {
  const match = html.match(/<title\\b[^>]*>([\\s\\S]*?)<\\/title>/i);
  return match ? stripTags(match[1]) : "";
}

function meta(html: string, name: string, property?: string) {
  for (const tag of tags(html, "meta")) {
    const a = attrs(tag);
    const n = (a.name || "").toLowerCase();
    const p = (a.property || "").toLowerCase();
    if (n === name.toLowerCase() || (!!property && p === property.toLowerCase())) {
      return a.content || "";
    }
  }
  return "";
}

function hasRel(html: string, rel: string) {
  return tags(html, "link").some(function (tag) {
    const a = attrs(tag);
    return (a.rel || "").toLowerCase().split(/\\s+/).includes(rel.toLowerCase());
  });
}

function links(html: string) {
  return Array.from(html.matchAll(/<a\\b([^>]*)>([\\s\\S]*?)<\\/a>/gi)).map(function (m) {
    const a = attrs(m[0]);
    return { href: a.href || "", text: stripTags(m[2]).toLowerCase() };
  });
}

function interactiveText(html: string) {
  const results: string[] = [];
  for (const m of html.matchAll(/<button\\b[^>]*>([\\s\\S]*?)<\\/button>/gi)) results.push(stripTags(m[1]).toLowerCase());
  for (const m of html.matchAll(/<a\\b[^>]*>([\\s\\S]*?)<\\/a>/gi)) results.push(stripTags(m[1]).toLowerCase());
  return results.filter(Boolean);
}

function anyMatch(value: string, patterns: RegExp[]) {
  return patterns.some(function (pattern) { return pattern.test(value); });
}

function privateV4(ip: string) {
  const p = ip.split(".").map(Number);
  const a = p[0], b = p[1];
  if (p.length !== 4 || p.some(Number.isNaN)) return true;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
}

function privateV6(ip: string) {
  const v = ip.toLowerCase();
  if (v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("ff")) return true;
  return false;
}

async function assertSafe(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only HTTP and HTTPS URLs are supported.");
  if (url.username || url.password) throw new Error("URLs containing credentials are not supported.");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host === "metadata.google.internal") {
    throw new Error("That hostname is not publicly reachable.");
  }
  if (isIP(host)) {
    if ((isIP(host) === 4 && privateV4(host)) || (isIP(host) === 6 && privateV6(host))) {
      throw new Error("Private or local network addresses are not allowed.");
    }
    return;
  }
  const records = await lookup(host, { all: true, verbatim: true });
  if (!records.length || records.some(function (r) {
    return (isIP(r.address) === 4 && privateV4(r.address)) || (isIP(r.address) === 6 && privateV6(r.address));
  })) {
    throw new Error("The hostname resolves to a private or local network address.");
  }
}

async function readLimited(response: Response, maxBytes: number) {
  if (!response.body) return { text: await response.text(), bytes: 0 };
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new Error("The page is larger than the audit limit.");
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  return { text, bytes };
}

async function fetchPage(start: URL): Promise<PageFetch> {
  let current = new URL(start.toString());
  const started = Date.now();
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertSafe(current);
    const controller = new AbortController();
    const timeout = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);
    try {
      const response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8" },
        signal: controller.signal,
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) throw new Error("The site returned a redirect without a destination.");
        current = new URL(location, current);
        continue;
      }
      const type = (response.headers.get("content-type") || "").toLowerCase();
      if (!type.includes("text/html")) throw new Error("That URL does not appear to serve an HTML page.");
      const declared = Number(response.headers.get("content-length") || 0);
      if (declared > MAX_HTML_BYTES) throw new Error("The page is larger than the audit limit.");
      const body = await readLimited(response, MAX_HTML_BYTES);
      return { finalUrl: current, html: body.text, status: response.status, bytes: body.bytes || declared, elapsedMs: Date.now() - started };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new Error("The page took too long to respond.");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("Too many redirects.");
}

async function aux(base: URL, path: string) {
  try {
    const result = await fetchPage(new URL(path, base));
    return result.status >= 200 && result.status < 400;
  } catch {
    return false;
  }
}

async function pageSpeed(url: string): Promise<AuditResult["pagespeed"]> {
  const key = process.env.PAGESPEED_API_KEY;
  if (!key) return null;
  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("key", key);
  endpoint.searchParams.set("strategy", "mobile");
  ["performance", "seo", "accessibility", "best-practices"].forEach(function (category) {
    endpoint.searchParams.append("category", category);
  });
  try {
    const response = await fetch(endpoint, { cache: "no-store", headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) return null;
    const data: any = await response.json();
    const categories = data && data.lighthouseResult ? data.lighthouseResult.categories || {} : {};
    const audits = data && data.lighthouseResult ? data.lighthouseResult.audits || {} : {};
    function score(name: string) {
      return typeof categories[name] && typeof categories[name].score === "number" ? Math.round(categories[name].score * 100) : null;
    }
    return {
      performance: score("performance"),
      seo: score("seo"),
      accessibility: score("accessibility"),
      bestPractices: score("best-practices"),
      lcpMs: typeof audits["largest-contentful-paint"]?.numericValue === "number" ? Math.round(audits["largest-contentful-paint"].numericValue) : null,
      cls: typeof audits["cumulative-layout-shift"]?.numericValue === "number" ? Number(audits["cumulative-layout-shift"].numericValue.toFixed(3)) : null,
      inpMs: typeof audits["interaction-to-next-paint"]?.numericValue === "number" ? Math.round(audits["interaction-to-next-paint"].numericValue) : null,
    };
  } catch {
    return null;
  }
}

function addFinding(list: AuditFinding[], item: AuditFinding) { list.push(item); }

function F(id: string, severity: FindingSeverity, category: FindingCategory, title: string, description: string, why: string, fixTitle: string, fixAction: string, points: number): AuditFinding {
  return { id, severity, category, title, description, whyItMatters: why, fixTitle, fixAction, points };
}

function buildFixes(findings: AuditFinding[]): AuditFix[] {
  const groups = [
    { id: "conversion-layer", title: "Conversion layer", description: "Make the next customer action obvious and friction-light.", modules: ["Primary CTA", "WhatsApp / click-to-call", "Short enquiry form", "Booking or quote path"], ids: ["missing-cta", "missing-contact", "missing-whatsapp", "missing-booking", "long-form"] },
    { id: "trust-layer", title: "Trust layer", description: "Put proof next to the moment where the visitor decides whether to enquire.", modules: ["Reviews / testimonials", "Proof points", "Case-study snippets"], ids: ["missing-proof"] },
    { id: "visibility-layer", title: "Visibility layer", description: "Repair the technical signals used by search engines and social previews.", modules: ["Title + meta", "H1", "Canonical", "Open Graph", "LocalBusiness schema", "Sitemap / robots"], ids: ["missing-title", "weak-title", "missing-description", "missing-h1", "multiple-h1", "missing-canonical", "missing-og", "missing-local-signal", "missing-robots", "missing-sitemap"] },
    { id: "mobile-performance", title: "Mobile performance layer", description: "Remove the friction people feel before they can even see the offer.", modules: ["Viewport", "Image alt fixes", "Script reduction", "Response-time tuning"], ids: ["missing-viewport", "missing-alt", "heavy-page", "slow-response", "js-heavy"] },
  ];
  return groups.map(function (group) {
    const matched = findings.filter(function (f) { return group.ids.includes(f.id); });
    if (!matched.length) return null;
    return { id: group.id, title: group.title, description: group.description, modules: group.modules, sourceFindingIds: matched.map(function (f) { return f.id; }) };
  }).filter(Boolean) as AuditFix[];
}

export async function auditWebsite(rawInput: string): Promise<AuditResult> {
  const input = rawInput.trim();
  const candidate = /^https?:\\/\\//i.test(input) ? input : "https://" + input;
  let requested = new URL(candidate);
  await assertSafe(requested);

  let page: PageFetch;
  try {
    page = await fetchPage(requested);
  } catch (error) {
    if (requested.protocol !== "https:") throw error;
    requested = new URL(requested.toString().replace(/^https:/i, "http:"));
    page = await fetchPage(requested);
  }

  const html = page.html;
  const hrefs = links(html);
  const clickText = interactiveText(html);
  const text = stripTags(html);
  const lower = text.toLowerCase();
  const title = titleOf(html);
  const description = meta(html, "description");
  const ogTitle = meta(html, "og:title", "og:title");
  const ogDescription = meta(html, "og:description", "og:description");
  const canonical = hasRel(html, "canonical");
  const viewport = tags(html, "meta").some(function (tag) { return (attrs(tag).name || "").toLowerCase() === "viewport"; });
  const h1s = Array.from(html.matchAll(/<h1\\b[^>]*>([\\s\\S]*?)<\\/h1>/gi)).map(function (m) { return stripTags(m[1]); }).filter(Boolean);
  const forms = (html.match(/<form\\b/gi) || []).length;
  const firstForm = html.match(/<form\\b[^>]*>[\\s\\S]*?<\\/form>/i)?.[0] || "";
  const firstFormFields = (firstForm.match(/<(?:input|select|textarea)\\b/gi) || []).length;
  const images = tags(html, "img");
  const imagesMissingAlt = images.filter(function (tag) { const a = attrs(tag); return !a.alt || !a.alt.trim(); }).length;
  const scripts = tags(html, "script").length;
  const linkCount = tags(html, "a").length;
  const linkText = hrefs.map(function (l) { return l.href + " " + l.text; }).join(" ");
  const phone = hrefs.some(function (l) { return /^tel:/i.test(l.href); }) || /(?:\\+27|0[1-9][0-9])[\\s.-]*[0-9]{3}[\\s.-]*[0-9]{4}/.test(text);
  const email = /mailto:/i.test(html) || /\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b/i.test(text);
  const whatsapp = /whatsapp|wa\\.me/i.test(linkText);
  const booking = /book|appointment|schedule|calendly|acuity|setmore|booksy|fresha|simplybook|mindbody|reserve/i.test(linkText);
  const form = forms > 0;
  const contactPath = /contact|enquir|quote|request|mailto:|tel:|whatsapp|wa\\.me/i.test(linkText) || form || phone || email;
  const cta = anyMatch(clickText.join(" "), [/book/i, /quote/i, /enquir/i, /contact/i, /call/i, /whatsapp/i, /get started/i, /request/i, /schedule/i, /appointment/i, /reserve/i, /consult/i, /order/i]);
  const proof = /testimonial|review|what (?:our|clients?) say|customer stor|case stud|five star|★★★★★/i.test(text) || /Review|AggregateRating/i.test(html) || /\\b[0-9]{2,}[+]?[\\s]*(?:clients|customers|projects|reviews|years)\\b/i.test(text);
  const localBusinessSchema = /"@type"\\s*:\\s*"(?:LocalBusiness|ProfessionalService|Restaurant|MedicalBusiness|Store)"/i.test(html);
  const localSignal = localBusinessSchema || /PostalAddress|addressLocality|areaServed/i.test(html) || /\\b(?:Johannesburg|Soweto|Sandton|Pretoria|Cape Town|Durban|Gauteng|South Africa|Midrand|Randburg|Centurion)\\b/i.test(text);
  const javascriptHeavy = text.split(/\\s+/).filter(Boolean).length < 180 && scripts >= 10;
  const robots = await aux(page.finalUrl, "/robots.txt");
  const sitemap = await aux(page.finalUrl, "/sitemap.xml");

  const findings: AuditFinding[] = [];

  if (page.finalUrl.protocol !== "https:") addFinding(findings, F("no-https", "critical", "technical", "The website is not serving securely over HTTPS.", "The final page is still using HTTP.", "A security warning or insecure URL can create trust friction before the first enquiry.", "Force HTTPS", "Redirect HTTP to HTTPS and update canonical URLs.", 10));
  if (!title) addFinding(findings, F("missing-title", "high", "technical", "The page has no title tag.", "No HTML title was detected.", "The strongest page-level search label is missing.", "Write a commercial page title", "Create a clear service + location + brand title.", 7));
  else if (title.length < 25 || title.length > 65) addFinding(findings, F("weak-title", "medium", "technical", "The page title is not well formed.", "Current title length: " + title.length + " characters.", "The title is one of the clearest signals for what the page is about.", "Rewrite the title", "Use a concise service + location + brand title.", 4));
  if (!description) addFinding(findings, F("missing-description", "medium", "technical", "There is no meta description.", "No description meta tag was detected.", "Search snippets get less controlled context about the offer.", "Write a conversion-focused description", "Add a concise description that explains the offer and next action.", 5));
  if (!h1s.length) addFinding(findings, F("missing-h1", "high", "technical", "There is no clear H1 headline.", "No H1 heading was detected.", "Visitors should understand what the business offers within seconds.", "Rewrite the hero", "Add one clear H1 that names the customer problem or outcome.", 7));
  else if (h1s.length > 1) addFinding(findings, F("multiple-h1", "low", "technical", "The page has multiple H1 headings.", "Detected " + h1s.length + " H1 headings.", "Competing primary headlines can dilute the page hierarchy.", "Simplify the heading hierarchy", "Keep one primary H1 and move secondary headings to H2/H3.", 2));
  if (!viewport) addFinding(findings, F("missing-viewport", "high", "mobile", "The page is missing a mobile viewport declaration.", "No responsive viewport declaration was detected.", "A broken mobile layout can create immediate enquiry friction.", "Fix the mobile viewport", "Add a responsive viewport declaration and validate on real phones.", 8));
  if (!canonical) addFinding(findings, F("missing-canonical", "medium", "technical", "No canonical URL was found.", "A canonical link was not detected.", "The site lacks an explicit preferred URL for the page.", "Add a canonical", "Set the canonical URL for the main commercial page.", 3));
  if (!ogTitle && !ogDescription) addFinding(findings, F("missing-og", "low", "technical", "Social sharing metadata is missing.", "No Open Graph title or description was detected.", "Shared links may have weaker previews than necessary.", "Add social preview metadata", "Add Open Graph title, description and image tags.", 2));
  if (!cta) addFinding(findings, F("missing-cta", "critical", "conversion", "There is no obvious primary call to action.", "No clear action such as WhatsApp, quote, call, booking or enquiry was detected in buttons or links.", "Traffic without a next step is traffic you may already have paid to acquire.", "Install a primary CTA", "Add one dominant action and repeat it near important decision points.", 18));
  if (!contactPath) addFinding(findings, F("missing-contact", "critical", "conversion", "The page does not expose a clear enquiry path.", "No obvious phone, email, form, WhatsApp or contact path was detected.", "High-intent visitors can leave simply because the next step is unclear.", "Create a friction-light enquiry path", "Add WhatsApp or click-to-call plus a short form or booking option.", 18));
  if (!whatsapp) addFinding(findings, F("missing-whatsapp", "high", "conversion", "No WhatsApp conversion path was detected.", "No WhatsApp action or wa.me link was found.", "A direct chat path can shorten the route from interest to an actual conversation.", "Add WhatsApp as a conversion channel", "Add a persistent WhatsApp CTA with a prefilled message and tracking.", 10));
  if (!booking && !form) addFinding(findings, F("missing-booking", "high", "conversion", "There is no obvious booking, quote or enquiry mechanism.", "No booking provider or form was detected.", "The visitor may understand the offer but still have no simple way to become a lead.", "Install a conversion path", "Use a short form, booking flow or click-to-call/WhatsApp path.", 10));
  if (form && firstFormFields > 6) addFinding(findings, F("long-form", "high", "conversion", "The first enquiry form is asking for too much.", "Detected " + firstFormFields + " fields in the first form.", "Long forms add friction before the visitor has received any value.", "Shorten the lead form", "Ask only for the minimum information needed to contact and qualify the lead.", 8));
  if (!proof) addFinding(findings, F("missing-proof", "high", "trust", "Customer proof is not clearly visible.", "No obvious testimonials, reviews, case studies or quantified proof were detected.", "People often need evidence immediately before they enquire.", "Add proof near the CTA", "Place three to six strong reviews or proof points beside the conversion path.", 8));
  if (images.length > 0 && imagesMissingAlt >= Math.max(3, Math.ceil(images.length / 2))) addFinding(findings, F("missing-alt", "medium", "technical", "Many images are missing alt text.", imagesMissingAlt + " of " + images.length + " images have no alt attribute.", "Important visual content is harder to interpret for search and accessibility tools.", "Clean up image semantics", "Give meaningful images descriptive alt text and keep decorative images empty.", 3));
  if (!localSignal) addFinding(findings, F("missing-local-signal", "medium", "local", "Local relevance is not clearly expressed.", "No LocalBusiness schema, service-area signal or obvious local address signal was detected.", "A local visitor should quickly know where the business operates.", "Add local business signals", "Add accurate service-area or address copy and LocalBusiness schema.", 5));
  if (!robots) addFinding(findings, F("missing-robots", "low", "technical", "robots.txt was not found.", "The standard crawler guidance file could not be fetched.", "This is not a conversion blocker, but it is part of a clean technical foundation.", "Add robots.txt", "Publish a simple robots.txt that points to the sitemap.", 2));
  if (!sitemap) addFinding(findings, F("missing-sitemap", "low", "technical", "sitemap.xml was not found.", "The standard sitemap endpoint could not be fetched.", "A sitemap helps crawlers discover important URLs.", "Publish a sitemap", "Add a sitemap and keep it current.", 2));
  if (page.bytes > 1500000) addFinding(findings, F("heavy-page", "high", "performance", "The HTML payload is unusually large.", "The first HTML response is about " + Math.round(page.bytes / 1024) + " KB.", "Large responses can delay meaningful content and conversion actions.", "Reduce page weight", "Remove unnecessary markup, defer non-critical assets and compress the page.", 6));
  if (page.elapsedMs > 4000) addFinding(findings, F("slow-response", "high", "performance", "The first response is slow.", "The audit server measured about " + page.elapsedMs + " ms.", "Waiting for the page is a conversion cost before the visitor sees the offer.", "Reduce response time", "Move slow server work off the request path and improve caching or hosting behaviour.", 7));
  if (javascriptHeavy) addFinding(findings, F("js-heavy", "medium", "performance", "The page looks heavily dependent on JavaScript to render its content.", "The raw HTML contains little readable content but many scripts.", "Search crawlers, previews and low-bandwidth users can get a weaker first experience.", "Improve first-content rendering", "Render the core offer, CTA and proof directly in HTML and defer non-critical JavaScript.", 6));

  const penalty = Math.min(82, findings.reduce(function (sum, item) { return sum + item.points; }, 0));
  const score = Math.max(18, 100 - penalty);
  const grade = score >= 78 ? "strong" : score >= 55 ? "needs-attention" : "high-leak-risk";
  const rank: Record<FindingSeverity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  findings.sort(function (a, b) { return rank[b.severity] - rank[a.severity] || b.points - a.points; });

  const summary = score >= 78
    ? "The core conversion foundation is present. The next gains are likely to come from tightening the highest-value leaks rather than rebuilding everything."
    : score >= 55
      ? "The website is doing some of the work, but several visible leaks can make paid and organic traffic harder to turn into enquiries."
      : "The page has multiple visible conversion leaks. Fix the enquiry path, trust signals and mobile friction before adding more traffic.";

  return {
    url: input,
    finalUrl: page.finalUrl.toString(),
    domain: page.finalUrl.hostname,
    scannedAt: new Date().toISOString(),
    score,
    grade,
    summary,
    findings,
    fixPlan: buildFixes(findings),
    metrics: {
      responseMs: page.elapsedMs,
      pageSizeKb: Math.round((page.bytes / 1024) * 10) / 10,
      status: page.status,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      h1Count: h1s.length,
      formCount: forms,
      firstFormFieldCount: firstFormFields,
      imageCount: images.length,
      imagesMissingAlt,
      scriptCount: scripts,
      linkCount,
    },
    signals: {
      https: page.finalUrl.protocol === "https:",
      title: !!title,
      metaDescription: !!description,
      h1: h1s.length > 0,
      viewport,
      canonical,
      openGraph: !!(ogTitle || ogDescription),
      cta,
      contactPath,
      phone,
      email,
      whatsapp,
      booking,
      form,
      socialProof: proof,
      localBusinessSchema,
      localSignal,
      robots,
      sitemap,
      javascriptHeavy,
    },
    pagespeed: await pageSpeed(page.finalUrl.toString()),
  };
}
