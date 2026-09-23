import { chromium, request } from "playwright";
import { mkdir } from "node:fs/promises";

const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const out = "qa-artifacts";
await mkdir(out, { recursive: true });

const failures = [];
const consoleErrors = [];
const pageErrors = [];

function recordFailure(name, message) {
  failures.push({ name, message });
  console.error(`[FAIL] ${name}: ${message}`);
}

async function waitStable(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1200);
}

async function assertNoHorizontalOverflow(page, name) {
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  if (metrics.scrollWidth > metrics.viewport + 2 || metrics.bodyScrollWidth > metrics.viewport + 2) {
    recordFailure(name, `Horizontal overflow: viewport=${metrics.viewport}, scrollWidth=${metrics.scrollWidth}, body=${metrics.bodyScrollWidth}`);
  }
}

async function capture(page, name) {
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
}

async function testPage(browser, path, expectations, viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
]) {
  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.on("pageerror", (err) => pageErrors.push({ path, viewport: vp.name, message: err.message }));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push({ path, viewport: vp.name, message: msg.text() });
    });

    try {
      const response = await page.goto(base + path, { waitUntil: "domcontentloaded" });
      await waitStable(page);
      const status = response?.status() ?? 0;
      if (status >= 500) recordFailure(`${path} ${vp.name}`, `HTTP ${status}`);
      const body = await page.locator("body").innerText();
      for (const expected of expectations) {
        if (!body.includes(expected)) recordFailure(`${path} ${vp.name}`, `Missing text: ${expected}`);
      }
      await assertNoHorizontalOverflow(page, `${path} ${vp.name}`);
      await capture(page, path.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") + "-" + vp.name);
    } catch (err) {
      recordFailure(`${path} ${vp.name}`, err instanceof Error ? err.message : String(err));
    } finally {
      await context.close();
    }
  }
}

const browser = await chromium.launch({ headless: true });

await testPage(browser, "/", [
  "Get 10+ Qualified Leads Per Month.",
  "Start Free Trial",
  "Built for South African SMEs",
]);

await testPage(browser, "/audit", [
  "Find where your website is losing enquiries.",
  "Run free audit",
  "ROI scenario calculator",
]);

await testPage(browser, "/login", [
  "Welcome back",
  "Sign in to manage your leads and website.",
]);

await testPage(browser, "/signup", [
  "Start your free trial",
  "7 days free. No coding needed. Cancel anytime.",
]);

await testPage(browser, "/demo/dentist", [
  "Sandton Smile Dental",
  "Book a consultation",
  "Request consultation",
]);

// Verify public dynamic fallbacks.
await testPage(browser, "/s/qa-nonexistent-slug", [
  "Site not live",
]);

// /go/[slug] calls notFound for missing published sites, so verify a real 404.
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const response = await page.goto(base + "/go/qa-nonexistent-slug", { waitUntil: "domcontentloaded" });
  const status = response?.status() ?? 0;
  if (status !== 404) recordFailure("/go/[slug]", `Expected HTTP 404, got ${status}`);
  await capture(page, "go-nonexistent-desktop");
  await page.close();
}

// Widget endpoint should return JavaScript usable cross-origin.
{
  const api = await request.newContext();
  const response = await api.get(base + "/widget/qa-demo");
  const body = await response.text();
  if (response.status() !== 200) recordFailure("/widget/[slug]", `Expected HTTP 200, got ${response.status()}`);
  if (!body.includes("Make an enquiry")) recordFailure("/widget/[slug]", "Widget script missing CTA");
  if (!body.includes("/go/qa-demo")) recordFailure("/widget/[slug]", "Widget script missing destination");
  await api.dispose();
}

// Liveness endpoint.
{
  const api = await request.newContext();
  const response = await api.get(base + "/api/health");
  const data = await response.json();
  if (response.status() !== 200 || data.status !== "ok") {
    recordFailure("/api/health", `Unexpected response: ${response.status()} ${JSON.stringify(data)}`);
  }
  await api.dispose();
}

// Actual browser success-stage test: submit demo lead on mobile and verify success UI.
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const pageConsoleErrors = [];
  const pageRuntimeErrors = [];
  page.on("console", (msg) => { if (msg.type() === "error") pageConsoleErrors.push(msg.text()); });
  page.on("pageerror", (err) => pageRuntimeErrors.push(err.message));

  await page.goto(base + "/demo/dentist", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Your name").fill("Browser QA Patient");
  await page.getByPlaceholder("+27 82 123 4567").fill("+27 82 555 0177");
  await page.getByPlaceholder("Email address").fill("browser.qa@example.com");
  await page.getByPlaceholder("Tell us briefly what you would like help with").fill("Dental implant consultation");
  await page.getByRole("button", { name: "Request consultation" }).click();
  await page.getByText(/Demo lead captured. Lead ID:/).waitFor({ timeout: 15000 });

  const body = await page.locator("body").innerText();
  if (!body.includes("Demo lead captured. Lead ID:")) recordFailure("success-stage", "Lead success status not shown");
  await assertNoHorizontalOverflow(page, "success-stage mobile");
  await capture(page, "success-stage-mobile");

  if (pageRuntimeErrors.length) pageErrors.push(...pageRuntimeErrors.map(message => ({ path: "/demo/dentist", viewport: "success-mobile", message })));
  if (pageConsoleErrors.length) consoleErrors.push(...pageConsoleErrors.map(message => ({ path: "/demo/dentist", viewport: "success-mobile", message })));
  await context.close();
}

await browser.close();

const summary = {
  ok: failures.length === 0,
  failures,
  consoleErrors,
  pageErrors,
};

console.log(JSON.stringify(summary, null, 2));

if (consoleErrors.length) {
  console.log("\nBrowser console errors observed:");
  for (const item of consoleErrors) console.log(`- [${item.path} / ${item.viewport}] ${item.message}`);
}
if (pageErrors.length) {
  console.log("\nBrowser runtime errors observed:");
  for (const item of pageErrors) console.log(`- [${item.path} / ${item.viewport}] ${item.message}`);
}

if (failures.length) process.exit(1);
