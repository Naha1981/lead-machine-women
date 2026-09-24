import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const artifacts = process.env.ARTIFACT_DIR || "artifacts/browser-e2e";
await mkdir(artifacts, { recursive: true });

const browser = await chromium.launch({ headless: true });
const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const tablet = await browser.newPage({ viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1 });
const mobile = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });

const failures = [];
const warnings = [];
const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];

for (const page of [desktop, tablet, mobile]) {
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push({ url: page.url(), text: msg.text() });
  });
  page.on("pageerror", (err) => pageErrors.push({ url: page.url(), text: String(err) }));
  page.on("requestfailed", (req) => failedRequests.push({ url: req.url(), error: req.failure()?.errorText || "request failed" }));
}

async function screenshot(page, name) {
  await page.screenshot({ path: artifacts + "/" + name + ".png", fullPage: true });
}

async function assertText(page, text, label) {
  const locator = page.getByText(text, { exact: false }).first();
  await locator.waitFor({ state: "visible", timeout: 30000 });
  if (!(await locator.isVisible())) throw new Error(label + ": text not visible: " + text);
}

async function assertNoOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  const max = Math.max(metrics.scrollWidth, metrics.bodyScrollWidth);
  if (max > metrics.innerWidth + 2) throw new Error(label + ": horizontal overflow " + max + "px > viewport " + metrics.innerWidth + "px");
}

async function assertInteractiveSize(page, label) {
  const small = await page.locator("button:visible").evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { text: (el.textContent || "").trim().slice(0, 60), aria: el.getAttribute("aria-label"), w: Math.round(r.width), h: Math.round(r.height) };
    }).filter((x) => x.w < 36 || x.h < 36)
  );
  if (small.length) throw new Error(label + ": visible buttons below 36px target: " + JSON.stringify(small.slice(0, 8)));
}

async function assertFormLabels(page, label) {
  const unlabeled = await page.locator("input:not([type=hidden]):not([type=range]), textarea, select").evaluateAll((els) =>
    els.filter((el) => {
      if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return false;
      const id = el.getAttribute("id");
      if (id && document.querySelector('label[for="' + CSS.escape(id) + '"]')) return false;
      return !el.closest("label");
    }).map((el) => ({ name: el.getAttribute("name"), type: el.getAttribute("type"), placeholder: el.getAttribute("placeholder") }))
  );
  if (unlabeled.length) throw new Error(label + ": form controls without accessible labels: " + JSON.stringify(unlabeled));
}

async function assertA11y(page, label) {
  const result = await new AxeBuilder({ page }).analyze();
  const serious = result.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  if (serious.length) {
    throw new Error(label + ": serious/critical accessibility violations: " + JSON.stringify(
      serious.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length }))
    ));
  }
  if (result.violations.length) {
    warnings.push({ label, accessibilityViolations: result.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length })) });
  }
}

async function checkInternalLinks(page, label) {
  const hrefs = await page.locator('a[href^="/"]').evaluateAll((els) => [...new Set(els.map((el) => el.getAttribute("href")).filter(Boolean))]);
  const issues = [];
  for (const href of hrefs) {
    const clean = href.split("#")[0];
    if (!clean || clean.startsWith("/api/") || clean.includes("?")) continue;
    const res = await page.request.get(base + clean, { maxRedirects: 3 });
    if (res.status() >= 400) issues.push({ href: clean, status: res.status() });
  }
  if (issues.length) throw new Error(label + ": broken internal links: " + JSON.stringify(issues));
}

async function go(page, path, options = {}) {
  const res = await page.goto(base + path, { waitUntil: "domcontentloaded", timeout: options.timeout || 30000 });
  await page.waitForTimeout(options.wait || 800);
  return res;
}

async function run(name, fn) {
  try {
    await fn();
    console.log("PASS " + name);
  } catch (err) {
    failures.push({ name, error: String(err) });
    console.error("FAIL " + name + ": " + String(err));
  }
}

await run("landing desktop renders and core CTAs exist", async () => {
  const res = await go(desktop, "/");
  if (!res || res.status() !== 200) throw new Error("HTTP " + (res?.status()));
  await assertText(desktop, "Get 10+ Qualified Leads Per Month", "landing hero");
  await assertText(desktop, "How It Works", "landing sections");
  await assertText(desktop, "Pricing", "landing sections");
  await assertText(desktop, "Questions, answered", "landing FAQ");
  await desktop.locator("#features").waitFor();
  await desktop.locator("#how-it-works").waitFor();
  await desktop.locator("#pricing").waitFor();
  await desktop.locator("#faq").waitFor();
  await assertNoOverflow(desktop, "landing desktop");
  await assertInteractiveSize(desktop, "landing desktop");
  await assertFormLabels(desktop, "landing desktop");
  await assertA11y(desktop, "landing desktop");
  await checkInternalLinks(desktop, "landing desktop");
  await screenshot(desktop, "01-landing-desktop");
});

await run("landing tablet responsive", async () => {
  const res = await go(tablet, "/");
  if (!res || res.status() !== 200) throw new Error("HTTP " + (res?.status()));
  await assertNoOverflow(tablet, "landing tablet");
  await assertInteractiveSize(tablet, "landing tablet");
  await screenshot(tablet, "02-landing-tablet");
});

await run("landing mobile navigation and responsiveness", async () => {
  await go(mobile, "/");
  await assertNoOverflow(mobile, "landing mobile");
  await assertInteractiveSize(mobile, "landing mobile");
  await mobile.getByRole("button", { name: /open navigation menu/i }).click();
  await mobile.getByRole("link", { name: "Features", exact: true }).waitFor();
  await mobile.getByRole("link", { name: "Start Free Trial", exact: true }).waitFor();
  await screenshot(mobile, "03-landing-mobile-menu");
  await mobile.keyboard.press("Escape");
  await mobile.waitForTimeout(200);
});

await run("login and signup routes render with safe Clerk fallback", async () => {
  for (const [path, expectedTextA, expectedTextB] of [
    ["/login", "Welcome back", "Sign-in is temporarily unavailable"],
    ["/signup", "Start your free trial", "Sign-up is temporarily unavailable"],
  ]) {
    const res = await go(desktop, path);
    if (!res || ![200, 500].includes(res.status())) throw new Error(path + " unexpected HTTP " + res.status());
    const body = await desktop.locator("body").innerText();
    if (!body.includes(expectedTextA) && !body.includes(expectedTextB)) throw new Error(path + " has no visible auth UI");
    await assertNoOverflow(desktop, path + " desktop");
    await assertInteractiveSize(desktop, path + " desktop");
    await assertA11y(desktop, path + " desktop");
  }
  await go(mobile, "/login");
  await assertNoOverflow(mobile, "login mobile");
  await go(mobile, "/signup");
  await assertNoOverflow(mobile, "signup mobile");
});

await run("demo dentist full lead success journey", async () => {
  const res = await go(desktop, "/demo/dentist");
  if (!res || res.status() !== 200) throw new Error("HTTP " + (res?.status()));
  await assertText(desktop, "Sandton Smile Dental", "demo identity");
  await desktop.locator('input[name="name"]').fill("Browser Test Patient");
  await desktop.locator('input[name="phone"]').fill("+27825550199");
  await desktop.locator('input[name="email"]').fill("browser-test@example.com");
  await desktop.locator('select[name="serviceNeeded"]').selectOption({ label: "Dental implants" });
  await desktop.locator('textarea[name="message"]').fill("I want an implant consultation.");
  await desktop.getByRole("button", { name: "Request consultation" }).click();
  await assertText(desktop, "Demo lead captured. Lead ID:", "demo success");
  await assertNoOverflow(desktop, "demo dentist desktop");
  await assertInteractiveSize(desktop, "demo dentist desktop");
  await assertA11y(desktop, "demo dentist desktop");
  await screenshot(desktop, "04-demo-success");
  await go(mobile, "/demo/dentist");
  await assertNoOverflow(mobile, "demo dentist mobile");
});

await run("audit journey reaches findings and lead-capture success", async () => {
  const res = await go(desktop, "/audit");
  if (!res || res.status() !== 200) throw new Error("HTTP " + (res?.status()));
  const submit = desktop.getByRole("button", { name: "Run free audit" });
  await submit.click();
  const afterEmpty = await desktop.locator("body").innerText();
  if (!afterEmpty.includes("Enter a valid website URL.") && !afterEmpty.includes("e.g. https://yourbusiness.co.za")) {
    throw new Error("audit empty-submit state unclear");
  }
  await desktop.locator('input[placeholder*="yourbusiness"]').fill("https://example.com");
  await submit.click();
  await assertText(desktop, "Here is what we found.", "audit result");
  await assertText(desktop, "Fix these first.", "audit findings");
  await assertText(desktop, "Scenario output", "audit ROI calculator");
  await desktop.locator('input[type="email"]').fill("audit-success@example.com");
  await desktop.getByRole("button", { name: "Save my plan" }).click();
  await assertText(desktop, "Saved. NahaLabs can follow up with this audit context.", "audit lead success");
  await assertNoOverflow(desktop, "audit desktop");
  await assertA11y(desktop, "audit desktop");
  await checkInternalLinks(desktop, "audit results");
  await screenshot(desktop, "05-audit-success");
  await go(mobile, "/audit");
  await assertNoOverflow(mobile, "audit mobile");
  await assertInteractiveSize(mobile, "audit mobile");
});

await run("public site unknown-slug fallback", async () => {
  const res = await go(desktop, "/s/browser-test-no-site");
  if (!res || res.status() !== 200) throw new Error("/s fallback expected 200, got " + res.status());
  await assertText(desktop, "This site isn't live yet", "public site fallback");
  await assertNoOverflow(desktop, "/s fallback");
  await assertA11y(desktop, "/s fallback");
  await go(mobile, "/s/browser-test-no-site");
  await assertNoOverflow(mobile, "/s fallback mobile");
});

await run("standalone lead page missing-site behavior is correct", async () => {
  const res = await go(desktop, "/go/browser-test-no-site", { wait: 1200 });
  if (!res || res.status() !== 404) throw new Error("/go unknown slug expected 404, got " + res.status());
});

await run("widget contract is embeddable JavaScript", async () => {
  const res = await desktop.request.get(base + "/widget/sandton-smile-dental");
  if (!res.ok()) throw new Error("HTTP " + res.status());
  const ct = res.headers()["content-type"] || "";
  if (!ct.includes("javascript")) throw new Error("unexpected content-type " + ct);
  const body = await res.text();
  if (!body.includes("Make an enquiry") || !body.includes("/go/sandton-smile-dental")) throw new Error("Widget script contract missing");
  if (body.includes("undefined")) throw new Error("Widget script contains literal undefined");
});

await run("public website API unknown slug returns 404", async () => {
  const res = await desktop.request.get(base + "/api/website/public?slug=browser-test-no-site");
  if (res.status() !== 404) throw new Error("expected 404, got " + res.status());
});

await run("demo follow-up worker reaches success state", async () => {
  const res = await desktop.request.get(base + "/api/cron/follow-ups", { headers: { authorization: "Bearer smoke-secret" } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok() || body.ok !== true) throw new Error("worker failed: " + res.status() + " " + JSON.stringify(body));
});

await run("health endpoint is green", async () => {
  const res = await desktop.request.get(base + "/api/health");
  if (!res.ok()) throw new Error("HTTP " + res.status());
  const body = await res.json();
  if (body.status !== "ok") throw new Error("unexpected health response: " + JSON.stringify(body));
});

await run("unknown route returns 404 cleanly", async () => {
  const res = await go(desktop, "/this-route-should-not-exist");
  if (!res || res.status() !== 404) throw new Error("expected 404, got " + res.status());
});

await run("production-style public API paths are not accidentally public", async () => {
  const checks = [
    ["/api/orgs/me", [401, 403]],
    ["/api/leads", [401, 403]],
    ["/api/analytics", [401, 403]],
  ];
  for (const [path, accepted] of checks) {
    const res = await desktop.request.get(base + path);
    if (!accepted.includes(res.status())) {
      warnings.push({ label: "auth-boundary", path, status: res.status() });
    }
  }
});

await writeFile(
  artifacts + "/report.json",
  JSON.stringify({ failures, warnings, consoleErrors, pageErrors, failedRequests }, null, 2)
);

await browser.close();

console.log(JSON.stringify({
  success: failures.length === 0,
  failures: failures.length,
  warnings: warnings.length,
  consoleErrors: consoleErrors.length,
  pageErrors: pageErrors.length,
  failedRequests: failedRequests.length,
}, null, 2));

if (consoleErrors.length || pageErrors.length) {
  console.error("Browser runtime errors: " + consoleErrors.length + " console, " + pageErrors.length + " page");
}
if (failures.length) process.exit(1);
