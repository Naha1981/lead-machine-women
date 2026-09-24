import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const artifacts = process.env.ARTIFACT_DIR || "artifacts/full-e2e";
await mkdir(artifacts, { recursive: true });

const browser = await chromium.launch({ headless: true });
const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });

const failures = [];
const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];

for (const page of [desktop, mobile]) {
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push({ url: page.url(), text: msg.text() });
  });
  page.on("pageerror", (err) => pageErrors.push({ url: page.url(), text: String(err) }));
  page.on("requestfailed", (req) => {
    const url = req.url();
    if (!url.includes("favicon")) {
      failedRequests.push({ url, error: req.failure()?.errorText || "request failed" });
    }
  });
}

async function go(page, path) {
  const res = await page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(700);
  return res;
}

async function noOverflow(page, label) {
  const m = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  const max = Math.max(m.scrollWidth, m.bodyScrollWidth);
  if (max > m.innerWidth + 2) throw new Error(label + ": horizontal overflow " + max + " > " + m.innerWidth);
}

async function screenshot(page, name) {
  await page.screenshot({ path: artifacts + "/" + name + ".png", fullPage: true });
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

async function visibleText(page, text) {
  const loc = page.getByText(text, { exact: false }).first();
  await loc.waitFor({ state: "visible", timeout: 15000 });
}

await run("landing desktop", async () => {
  const res = await go(desktop, "/");
  if (res.status() !== 200) throw new Error("HTTP " + res.status());
  await visibleText(desktop, "Get 10+ Qualified Leads Per Month");
  await visibleText(desktop, "How It Works");
  await visibleText(desktop, "Pricing");
  await visibleText(desktop, "Questions, answered");
  for (const id of ["features", "how-it-works", "pricing", "faq"]) await desktop.locator("#" + id).waitFor();
  await noOverflow(desktop, "landing desktop");
  await screenshot(desktop, "01-landing-desktop");
});

await run("landing mobile navigation", async () => {
  await go(mobile, "/");
  await noOverflow(mobile, "landing mobile");
  await mobile.getByRole("button", { name: /open navigation menu/i }).click();
  await mobile.getByRole("link", { name: "Features", exact: true }).waitFor();
  await mobile.getByRole("link", { name: "Start Free Trial", exact: true }).waitFor();
  await screenshot(mobile, "02-landing-mobile-menu");
});

await run("auth pages", async () => {
  for (const [path, title] of [["/login", "Welcome back"], ["/signup", "Start your free trial"]]) {
    const res = await go(desktop, path);
    if (![200, 500].includes(res.status())) throw new Error(path + " HTTP " + res.status());
    await visibleText(desktop, title);
    await noOverflow(desktop, path + " desktop");
    await go(mobile, path);
    await noOverflow(mobile, path + " mobile");
  }
  await screenshot(desktop, "03-signup-desktop");
});

await run("revenue leak audit full journey desktop", async () => {
  const res = await go(desktop, "/audit");
  if (res.status() !== 200) throw new Error("HTTP " + res.status());
  await visibleText(desktop, "Find where your website is losing enquiries");
  await desktop.locator('input[placeholder*="yourbusiness"]').fill("https://example.com");
  await desktop.getByRole("button", { name: "Run free audit" }).click();
  await visibleText(desktop, "Here is what we found.");
  await visibleText(desktop, "Fix these first.");
  await visibleText(desktop, "Scenario calculator");
  const email = desktop.locator('input[type="email"]');
  await email.fill("full-e2e@example.com");
  await desktop.getByRole("button", { name: "Save my plan" }).click();
  await visibleText(desktop, "Saved.");
  await noOverflow(desktop, "audit desktop");
  await screenshot(desktop, "04-audit-success");
});

await run("revenue leak audit mobile layout", async () => {
  const res = await go(mobile, "/audit");
  if (res.status() !== 200) throw new Error("HTTP " + res.status());
  await noOverflow(mobile, "audit mobile");
  await mobile.locator('input[placeholder*="yourbusiness"]').fill("https://example.com");
  await mobile.getByRole("button", { name: "Run free audit" }).click();
  await visibleText(mobile, "Here is what we found.");
  await noOverflow(mobile, "audit results mobile");
  await screenshot(mobile, "05-audit-mobile");
});

await run("dentist demo lead success", async () => {
  const res = await go(desktop, "/demo/dentist");
  if (res.status() !== 200) throw new Error("HTTP " + res.status());
  await visibleText(desktop, "Sandton Smile Dental");
  await desktop.locator('input[name="name"]').fill("Full E2E Patient");
  await desktop.locator('input[name="phone"]').fill("+27825550199");
  await desktop.locator('input[name="email"]').fill("full-e2e@example.com");
  await desktop.locator('select[name="serviceNeeded"]').selectOption({ label: "Dental implants" });
  await desktop.locator('textarea[name="message"]').fill("I want an implant consultation.");
  await desktop.getByRole("button", { name: "Request consultation" }).click();
  await visibleText(desktop, "Demo lead captured. Lead ID:");
  await noOverflow(desktop, "dentist demo desktop");
  await go(mobile, "/demo/dentist");
  await noOverflow(mobile, "dentist demo mobile");
  await screenshot(desktop, "06-demo-lead-success");
});

await run("widget script and click contract", async () => {
  const res = await desktop.request.get(base + "/widget/sandton-smile-dental");
  if (!res.ok()) throw new Error("HTTP " + res.status());
  const ct = res.headers()["content-type"] || "";
  if (!ct.includes("javascript")) throw new Error("content-type " + ct);
  const script = await res.text();
  if (!script.includes("Make an enquiry") || !script.includes("/go/sandton-smile-dental")) {
    throw new Error("widget contract incomplete");
  }

  await desktop.setContent('<!doctype html><html><body><h1>Host site</h1></body></html>');
  await desktop.addScriptTag({ url: base + "/widget/sandton-smile-dental" });
  const button = desktop.getByRole("button", { name: "Make an enquiry" });
  await button.waitFor();
  await desktop.evaluate(() => {
    const open = window.open;
    window.open = function(url) { (window).__LM_TEST_OPENED = url; return null; };
    (window).__LM_TEST_ORIGINAL_OPEN = open;
  });
  await button.click();
  const opened = await desktop.evaluate(() => (window).__LM_TEST_OPENED);
  if (opened !== base + "/go/sandton-smile-dental") throw new Error("widget opened " + opened);
});

await run("unknown public routes behave safely", async () => {
  const api = await desktop.request.get(base + "/api/website/public?slug=full-e2e-no-site");
  if (api.status() !== 404) throw new Error("public API expected 404, got " + api.status());

  const goRes = await desktop.request.get(base + "/go/full-e2e-no-site");
  if (goRes.status() !== 404) throw new Error("/go expected 404, got " + goRes.status());

  const sRes = await desktop.request.get(base + "/s/full-e2e-no-site");
  if (![200, 404].includes(sRes.status())) throw new Error("/s expected safe 200/404, got " + sRes.status());
  if (sRes.status() === 200) {
    const body = await sRes.text();
    if (!body.includes("This site isn't live yet") && !body.includes("Site not live")) {
      throw new Error("/s unknown slug missing not-live UI");
    }
  }
});

await run("health and public API", async () => {
  const health = await desktop.request.get(base + "/api/health");
  if (!health.ok()) throw new Error("/api/health HTTP " + health.status());
  const body = await health.json();
  if (body.status !== "ok") throw new Error("health response " + JSON.stringify(body));
});

await run("responsive core public pages", async () => {
  for (const path of ["/", "/login", "/signup", "/audit", "/demo/dentist"]) {
    for (const vp of [
      { page: desktop, label: "desktop" },
      { page: mobile, label: "mobile" },
    ]) {
      await go(vp.page, path);
      await noOverflow(vp.page, path + " " + vp.label);
      const dims = await vp.page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
      if (dims.w < 380 && vp.label === "mobile") throw new Error("unexpected mobile viewport");
    }
  }
});

await writeFile(artifacts + "/report.json", JSON.stringify({
  base,
  failures,
  consoleErrors,
  pageErrors,
  failedRequests,
  summary: {
    passed: failures.length === 0,
    consoleErrorCount: consoleErrors.length,
    pageErrorCount: pageErrors.length,
    failedRequestCount: failedRequests.length,
  },
}, null, 2));

await browser.close();

if (consoleErrors.length || pageErrors.length) {
  console.error("Runtime errors detected: " + consoleErrors.length + " console, " + pageErrors.length + " page");
}
if (failures.length) process.exit(1);
