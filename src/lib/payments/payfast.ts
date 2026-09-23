import { createHash } from "node:crypto";

export type PayfastMode = "sandbox" | "live";

export function payfastConfigured() {
  return Boolean(
    process.env.PAYFAST_MERCHANT_ID &&
      process.env.PAYFAST_MERCHANT_KEY &&
      process.env.PAYFAST_PASSPHRASE &&
      process.env.NEXT_PUBLIC_APP_URL
  );
}

export function payfastMode(): PayfastMode {
  return process.env.PAYFAST_SANDBOX === "true" ? "sandbox" : "live";
}

export function payfastHost() {
  return payfastMode() === "sandbox" ? "sandbox.payfast.co.za" : "www.payfast.co.za";
}

export function payfastProcessUrl() {
  return `https://${payfastHost()}/eng/process`;
}

function phpUrlencode(value: string) {
  return encodeURIComponent(value)
    .replace(/%20/g, "+")
    .replace(/[!'()*~]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function payfastParamString(data: Record<string, string | number | null | undefined>) {
  return Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== null && String(value) !== "")
    .map(([key, value]) => `${key}=${phpUrlencode(String(value).trim())}`)
    .join("&");
}

export function createPayfastSignature(
  data: Record<string, string | number | null | undefined>,
  passphrase: string
) {
  const base = payfastParamString(data);
  const salted = `${base}&passphrase=${phpUrlencode(passphrase.trim())}`;
  return createHash("md5").update(salted).digest("hex");
}

export function createPayfastApiSignature(data: Record<string, string | number>, passphrase: string) {
  const sorted = Object.keys(data).sort().reduce<Record<string, string | number>>((acc, key) => {
    acc[key] = data[key];
    return acc;
  }, {});
  return createPayfastSignature(sorted, passphrase);
}

export function buildCheckoutFields(opts: {
  merchantId: string;
  merchantKey: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
  paymentId: string;
  amount: number;
  itemName: string;
  buyerEmail?: string | null;
}) {
  const data: Record<string, string | number> = {
    merchant_id: opts.merchantId,
    merchant_key: opts.merchantKey,
    return_url: opts.returnUrl,
    cancel_url: opts.cancelUrl,
    notify_url: opts.notifyUrl,
  };
  if (opts.buyerEmail) data.email_address = opts.buyerEmail;
  Object.assign(data, {
    m_payment_id: opts.paymentId,
    amount: opts.amount.toFixed(2),
    item_name: opts.itemName,
    subscription_type: "1",
    billing_date: new Date().toISOString().slice(0, 10),
    recurring_amount: opts.amount.toFixed(2),
    frequency: "3",
    cycles: "0",
  });
  return data;
}

export function signCheckoutFields(
  fields: Record<string, string | number>,
  passphrase: string
) {
  return createPayfastSignature(fields, passphrase);
}

export function rawPayfastParamString(rawBody: string) {
  const pairs = rawBody.split("&").filter(Boolean);
  return pairs
    .map((pair) => {
      const index = pair.indexOf("=");
      if (index === -1) return [pair, ""] as const;
      return [pair.slice(0, index), pair.slice(index + 1)] as const;
    })
    .filter(([key]) => key !== "signature")
    .map(([key, encodedValue]) => `${key}=${encodedValue}`)
    .join("&");
}

export function verifyPayfastSignature(rawBody: string) {
  const signature = new URLSearchParams(rawBody).get("signature");
  const passphrase = process.env.PAYFAST_PASSPHRASE || "";
  if (!signature || !passphrase) return false;
  const base = rawPayfastParamString(rawBody);
  const expected = createHash("md5")
    .update(`${base}&passphrase=${phpUrlencode(passphrase.trim())}`)
    .digest("hex");
  return signature.toLowerCase() === expected.toLowerCase();
}

export async function confirmPayfastTransaction(rawBodyWithoutSignature: string) {
  const response = await fetch(
    `https://${payfastHost()}/eng/query/validate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: rawBodyWithoutSignature,
      cache: "no-store",
    }
  );
  const text = await response.text();
  return response.ok && text.trim() === "VALID";
}

function ipv4ToInt(ip: string) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return null;
  return (((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]) >>> 0;
}

function ipInCidr(ip: string, cidr: string) {
  const [network, bitsString] = cidr.split("/");
  const addr = ipv4ToInt(ip);
  const base = ipv4ToInt(network);
  const bits = Number(bitsString);
  if (addr === null || base === null || !Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (addr & mask) === (base & mask);
}

export function isPayfastIpAllowed(ip: string | null) {
  if (!ip) return false;
  const allowed = [
    "197.97.145.144/28",
    "41.74.179.192/27",
    "102.216.36.0/28",
    "102.216.36.128/28",
    "144.126.193.139/32",
  ];
  return allowed.some((cidr) => ipInCidr(ip, cidr));
}

export async function payfastApiRequest(token: string, action: "cancel" | "pause" | "unpause") {
  const merchantId = process.env.PAYFAST_MERCHANT_ID || "";
  const passphrase = process.env.PAYFAST_PASSPHRASE || "";
  const version = "v1";
  const timestamp = new Date().toISOString();
  const body: Record<string, string> = {};
  const signatureData = {
    "merchant-id": merchantId,
    version,
    timestamp,
    ...body,
  };
  const signature = createPayfastApiSignature(signatureData, passphrase);
  const url = `https://api.payfast.co.za/subscriptions/${encodeURIComponent(token)}/${action}${payfastMode() === "sandbox" ? "?testing=true" : ""}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "merchant-id": merchantId,
      version,
      timestamp,
      signature,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.status === "failed" || data?.data?.response === false) {
    throw new Error(data?.data?.message ?? data?.status ?? `PayFast API failed (${response.status})`);
  }
  return data;
}
