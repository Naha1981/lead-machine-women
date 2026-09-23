const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const cronSecret = process.env.CRON_SECRET || "smoke-secret";

async function get(path) {
  const res = await fetch(base + path, { redirect: "manual" });
  const text = await res.text();
  return { res, text };
}

const page = await get("/demo/dentist");
if (!page.res.ok || !page.text.includes("Sandton Smile Dental")) {
  throw new Error(`Dentist demo page failed: ${page.res.status}`);
}

const lead = await fetch(base + "/api/demo/dentist/lead", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    name: "Demo Patient",
    phone: "+27 82 555 0199",
    email: "demo.patient@example.com",
    serviceNeeded: "Dental implants",
    message: "I would like an implant consultation.",
    consentGiven: true,
  }),
});

const leadBody = await lead.json().catch(() => ({}));
if (!lead.ok || !leadBody.leadId) {
  throw new Error(`Demo lead failed: ${lead.status} ${JSON.stringify(leadBody)}`);
}

const cron = await fetch(base + "/api/cron/follow-ups", {
  headers: { authorization: `Bearer ${cronSecret}` },
});
const cronBody = await cron.json().catch(() => ({}));
if (!cron.ok || cronBody.ok !== true) {
  throw new Error(`Follow-up worker check failed: ${cron.status} ${JSON.stringify(cronBody)}`);
}

console.log(JSON.stringify({
  ok: true,
  dentistPage: "passed",
  leadCapture: "passed",
  leadId: leadBody.leadId,
  qualification: leadBody.temperature ?? "not scored without AI key",
  followupWorker: "passed",
}, null, 2));
