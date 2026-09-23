// NahaLabs WhatsApp Operator client — Lead Machine transport boundary.
// The application never imports Baileys. It talks to the shared Operator over HTTPS.

import { createHmac, timingSafeEqual } from "node:crypto";

export type OperatorStatus = {
  waAccountId: string;
  status: string;
  isConnected: boolean;
  phoneNumber?: string | null;
};

export type OperatorQr = OperatorStatus & {
  qrCode?: string | null;
  qrGeneratedAt?: string | null;
  qrExpiresAt?: string | null;
  qrPollIntervalMs?: number;
};

export type OperatorPairingCode = {
  waAccountId: string;
  status: string;
  pairingCode?: string;
  pairingCodeDisplay?: string;
  expiresAt?: string;
  instructions?: string[];
};

export function operatorConfigured(): boolean {
  return Boolean(
    process.env.OPERATOR_URL &&
      process.env.OPERATOR_API_KEY &&
      process.env.WEBHOOK_SECRET &&
      process.env.NEXT_PUBLIC_APP_URL
  );
}

function config() {
  return {
    url: (process.env.OPERATOR_URL || "").replace(/\\/+$/, ""),
    apiKey: process.env.OPERATOR_API_KEY || "",
    webhookSecret: process.env.WEBHOOK_SECRET || "",
    appId: process.env.NEXT_PUBLIC_APP_ID || "lead-machine",
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "",
  };
}

async function operatorFetch<T>(path: string, init: RequestInit = {}, scope?: { tenantId: string }): Promise<T> {
  const c = config();
  if (!c.url || !c.apiKey) throw new Error("WhatsApp Operator is not configured");

  const headers = new Headers(init.headers);
  headers.set("X-API-Key", c.apiKey);
  headers.set("X-App-Id", c.appId);
  if (scope?.tenantId) headers.set("X-Tenant-Id", scope.tenantId);
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");

  const res = await fetch(`${c.url}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data as any)?.error?.message ??
      (data as any)?.message ??
      `WhatsApp Operator request failed (${res.status})`;
    throw new Error(String(message));
  }
  return data as T;
}

export async function createAccount(opts: {
  orgId: string;
  label: string;
}): Promise<{ waAccountId: string; status: string }> {
  const c = config();
  return operatorFetch("/accounts", {
    method: "POST",
    body: JSON.stringify({
      label: opts.label,
      appId: c.appId,
      tenantId: opts.orgId,
      webhookUrl: `${c.appUrl}/api/webhooks/whatsapp`,
    }),
  });
}

export async function connectAccount(waAccountId: string, orgId: string) {
  return operatorFetch<{ waAccountId: string; status: string }>(
    `/accounts/${encodeURIComponent(waAccountId)}/connect`,
    { method: "POST" },
    { tenantId: orgId }
  );
}

export async function getQr(waAccountId: string, orgId: string) {
  return operatorFetch<OperatorQr>(
    `/accounts/${encodeURIComponent(waAccountId)}/qr`,
    {},
    { tenantId: orgId }
  );
}

export async function getStatus(waAccountId: string, orgId: string) {
  return operatorFetch<OperatorStatus>(
    `/accounts/${encodeURIComponent(waAccountId)}/status`,
    {},
    { tenantId: orgId }
  );
}

export async function requestPairingCode(waAccountId: string, orgId: string, phoneNumber: string) {
  return operatorFetch<OperatorPairingCode>(
    `/accounts/${encodeURIComponent(waAccountId)}/pairing-code`,
    {
      method: "POST",
      body: JSON.stringify({ phoneNumber }),
    },
    { tenantId: orgId }
  );
}

export async function resetAccount(waAccountId: string, orgId: string) {
  return operatorFetch(
    `/accounts/${encodeURIComponent(waAccountId)}/reset`,
    { method: "POST" },
    { tenantId: orgId }
  );
}

export async function disconnectAccount(waAccountId: string, orgId: string) {
  return operatorFetch(
    `/accounts/${encodeURIComponent(waAccountId)}/disconnect`,
    { method: "POST" },
    { tenantId: orgId }
  );
}

export async function sendText(opts: {
  waAccountId: string;
  orgId: string;
  to: string;
  text: string;
}) {
  return operatorFetch<{ ok?: boolean; messageId?: string }>(
    "/send",
    {
      method: "POST",
      body: JSON.stringify({
        waAccountId: opts.waAccountId,
        to: opts.to,
        text: opts.text,
      }),
    },
    { tenantId: opts.orgId }
  );
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = config().webhookSecret;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function appId(): string {
  return config().appId;
}
