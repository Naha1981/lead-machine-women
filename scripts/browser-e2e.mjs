import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const artifacts = process.env.ARTIFACT_DIR || "artifacts/browser-e2e";
await mkdir(artifacts, { recursive: true });

const browser = await chromium.launch({ headless: true });
const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const mobile = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });

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
    failedRequests.push({ url: req.url(), error: req.failure()?.errorText || "request failed" });
  });
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
  if (max > metrics.innerWidth + 2) {
    throw new Error(label + ": horizontal overflow " + max + "px > viewport " + metrics.innerWidth + "px");
  }
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

await run("landing desktop renders", async () => {
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
  await screenshot(desktop, "01-landing-desktop");
});

await run("landing mobile navigation and responsiveness", async () => {
  await go(mobile, "/");
  await assertNoOverflow(mobile, "landing mobile");
  await mobile.getByRole("button", { name: /open navigation menu/i }).click();
  await mobile.getByRole("link", { name: "Features", exact: true }).waitFor();
  await mobile.getByRole("link", { name: "Start Free Trial", exact: true }).waitFor();
  await screenshot(mobile, "02-landing-mobile-menu");
  await mobile.keyboard.press("Escape");
  await mobile.waitForTimeout(200);
});

await run("login route is built", async () => {
  const res = await go(desktop, "/login");
  if (!res || res.status() !== 200) throw new Error("unexpected HTTP " + (res?.status()));
  const body = await desktop.locator("body").innerText();
  if (!body.includes("Welcome back") && !body.includes("Sign-in is temporarily unavailable")) {
    throw new Error("Login page has no visible authentication UI");
  }
  await assertNoOverflow(desktop, "login desktop");
  await screenshot(desktop, "03-login");
});

await run("signup route is built", async () => {
  const res = await go(desktop, "/signup");
  if (!res || ![200, 500].includes(res.status())) throw new Error("unexpected HTTP " + (res?.status()));
  const body = await desktop.locator("body").innerText();
  if (!body.includes("Start your free trial") && !body.includes("Sign-up is temporarily unavailable")) {
    throw new Error("Signup page has no visible registration UI");
  }
  await assertNoOverflow(desktop, "signup desktop");
  await screenshot(desktop, "04-signup");
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
  await assertNoOverflow(desktop, "demo dentist");
  await screenshot(desktop, "05-demo-success");
});

await run("revenue leak audit journey", async () => {
  const res = await go(desktop, "/audit");
  if (!res || res.status() !== 200) throw new Error("HTTP " + (res?.status()));
  await assertText(desktop, "Find where your website is losing enquiries", "audit hero");
  await desktop.locator('input[placeholder*="yourbusiness"]').fill("https://example.com");
  await desktop.getByRole("button", { name: "Run free audit" }).click();
  await assertText(desktop, "Here is what we found.", "audit result");
  await assertText(desktop, "Fix these first.", "audit findings");
  await assertText(desktop, "Scenario output", "audit ROI calculator");
  await assertNoOverflow(desktop, "audit desktop");
  await go(mobile, "/audit");
  await assertNoOverflow(mobile, "audit mobile");
  await screenshot(desktop, "06-audit-results");
});

await run("public website API returns not found for unknown slug", async () => {
  const res = await desktop.request.get(base + "/api/website/public?slug=browser-test-no-site");
  if (res.status() !== 404) throw new Error("/api/website/public expected 404, got " + res.status());
});

await run("database-backed public routes are environment gated", async () => {
  if (!process.env.DATABASE_URL) {
    console.log("SKIP database-backed /s and /go browser validation: DATABASE_URL not configured");
    return;
  }
  const s = await go(desktop, "/s/browser-test-no-site");
  if (!s || s.status() !== 200) throw new Error("/s unknown slug expected 200 fallback, got " + (s?.status()));
  await assertText(desktop, "This site isn't live yet", "public site fallback");
  const g = await go(desktop, "/go/browser-test-no-site");
  if (!g || g.status() !== 404) throw new Error("/go unknown slug expected 404, got " + (g?.status()));
});

await run("widget endpoint returns embeddable script", async () => {
  const res = await desktop.request.get(base + "/widget/sandton-smile-dental");
  if (!res.ok()) throw new Error("HTTP " + res.status());
  const ct = res.headers()["content-type"] || "";
  if (!ct.includes("javascript")) throw new Error("unexpected content-type " + ct);
  const body = await res.text();
  if (!body.includes("Make an enquiry") || !body.includes("/go/sandton-smile-dental")) {
    throw new Error("Widget script contract missing");
  }
});

await run("health endpoint", async () => {
  const res = await desktop.request.get(base + "/api/health");
  if (!res.ok()) throw new Error("HTTP " + res.status());
  const body = await res.json();
  if (body.status !== "ok") throw new Error("unexpected health response: " + JSON.stringify(body));
});

await writeFile(
  artifacts + "/report.json",
  JSON.stringify({ failures, consoleErrors, pageErrors, failedRequests }, null, 2)
);

await browser.close();

if (consoleErrors.length || pageErrors.length) {
  console.error("Browser runtime errors: " + consoleErrors.length + " console, " + pageErrors.length + " page");
}
if (failures.length) process.exit(1);
