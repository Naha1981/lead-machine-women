// Lead Machine — Evolution API typed client (real outbound WhatsApp).
//
// The ONLY thing that talks to Evolution. No route/service imports Evolution
// directly except via this client + the notifications service.
//
// BUILD RESILIENCE: env vars are read LAZILY inside each function (never at
// module load). If unconfigured, isConfigured() returns false and callers
// fall back to simulate (log-only) — NEVER throws, NEVER breaks lead capture.
//
// Endpoints (Evolution API v2, confirmed against the live Render instance):
//   GET  /instance/connectionState/{instance}  → { instance: { state: "open"|"close"|"connecting" } }
//   POST /message/sendText/{instance}          → body { number, text }, header apikey

export type EvolutionSendResult = {
  ok: boolean;
  error?: string;
  messageId?: string;
};

export type EvolutionConnectionState = {
  configured: boolean;
  connected: boolean;
  state?: string;
  error?: string;
};

/**
 * True only if all three Evolution env vars are present.
 * Reads at call time (lazy) — safe to call with zero env vars.
 */
export function isConfigured(): boolean {
  return Boolean(
    process.env.EVOLUTION_API_URL &&
      process.env.EVOLUTION_GLOBAL_API_KEY &&
      process.env.EVOLUTION_INSTANCE_NAME
  );
}

function getConfig() {
  return {
    url: (process.env.EVOLUTION_API_URL || "").replace(/\/+$/, ""),
    key: process.env.EVOLUTION_GLOBAL_API_KEY || "",
    instance: process.env.EVOLUTION_INSTANCE_NAME || "",
  };
}

/**
 * Normalize a phone number to digits-only international format.
 * South African numbers (leading 0) → 27XXXXXXXXX.
 * Already-international (+27, 27) → digits only.
 */
export function normalizePhone(raw: string): string {
  let s = raw.replace(/[^\d]/g, "");
  // SA local format: 082... → 27 82...
  if (s.startsWith("0")) s = "27" + s.slice(1);
  // If it starts with +27 it's already 27 after digit strip
  return s;
}

/**
 * Check whether the Evolution instance is connected (WhatsApp QR scanned).
 * Returns { configured, connected, state } — never throws.
 */
export async function getConnectionStatus(): Promise<EvolutionConnectionState> {
  if (!isConfigured()) {
    return { configured: false, connected: false };
  }
  const { url, key, instance } = getConfig();
  try {
    const res = await fetch(
      `${url}/instance/connectionState/${encodeURIComponent(instance)}`,
      { method: "GET", headers: { apikey: key } }
    );
    const data = await res.json().catch(() => null);
    // Evolution v2 returns { instance: { state: "open" | "close" | "connecting" } }
    const state = data?.instance?.state ?? data?.state ?? "unknown";
    return {
      configured: true,
      connected: state === "open",
      state,
    };
  } catch (e: any) {
    return { configured: true, connected: false, error: e?.message ?? "fetch failed" };
  }
}

/**
 * Send a WhatsApp text message via Evolution. Never throws — returns a typed
 * result so callers can log success/failure without try/catch.
 */
export async function sendText(
  to: string,
  message: string
): Promise<EvolutionSendResult> {
  if (!isConfigured()) {
    return { ok: false, error: "Evolution API not configured" };
  }
  const { url, key, instance } = getConfig();
  const phone = normalizePhone(to);

  try {
    const res = await fetch(
      `${url}/message/sendText/${encodeURIComponent(instance)}`,
      {
        method: "POST",
        headers: {
          apikey: key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ number: phone, text: message }),
      }
    );
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const errMsg =
        data?.response?.message?.[0] ??
        data?.message ??
        data?.error ??
        `HTTP ${res.status}`;
      return { ok: false, error: String(errMsg) };
    }
    // Evolution returns the message key on success
    const messageId = data?.key?.id ?? data?.messageId ?? undefined;
    return { ok: true, messageId };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "fetch failed" };
  }
}
