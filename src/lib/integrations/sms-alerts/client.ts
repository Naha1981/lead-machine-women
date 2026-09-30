// Lead Machine — vendor-neutral SMS alert adapter.
// Configure SMS_ALERT_WEBHOOK_URL to point at a small SMS gateway/worker.
// Payload is intentionally provider-neutral so NahaLabs can swap providers.

export type SmsAlertResult = {
  ok: boolean;
  simulated: boolean;
  error?: string;
};

export function smsConfigured(): boolean {
  return Boolean(process.env.SMS_ALERT_WEBHOOK_URL);
}

export async function sendSmsAlert(opts: {
  to: string;
  text: string;
  orgId: string;
}): Promise<SmsAlertResult> {
  if (process.env.SIMULATE_SMS === "true") {
    return { ok: true, simulated: true };
  }

  const url = process.env.SMS_ALERT_WEBHOOK_URL;
  if (!url) {
    return { ok: false, simulated: false, error: "SMS_ALERT_WEBHOOK_URL not configured" };
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const secret = process.env.SMS_ALERT_WEBHOOK_SECRET;
    if (secret) headers["X-Lead-Machine-Secret"] = secret;

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        event: "lead.leakage_alert",
        orgId: opts.orgId,
        to: opts.to,
        message: opts.text,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ok: false,
        simulated: false,
        error: "SMS gateway returned HTTP " + response.status,
      };
    }

    return { ok: true, simulated: false };
  } catch (error) {
    return {
      ok: false,
      simulated: false,
      error: error instanceof Error ? error.message : "SMS gateway request failed",
    };
  }
}
